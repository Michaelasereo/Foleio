import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';
import {
  generateGiftCardCode,
  occasionLabel,
  parseGiftOccasion,
  type GiftOccasion,
} from '@/lib/shop/gift-cards';
import { resolveDigitalDownloadUrl } from '@/lib/shop/digital-downloads';
import {
  sendGiftCardCodeEmail,
  sendGiftOrderEmail,
  sendOrderConfirmationEmail,
} from '@/lib/email/resend';

type DeliveryAddress = {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  isGift?: boolean | string;
  occasion?: string;
  customOccasion?: string;
  recipientName?: string;
  recipientEmail?: string;
  giftMessage?: string;
  giftCardSendToEmail?: string;
};

/** Decrement stock and apply gift-card balance after an order is confirmed. */
export async function applyConfirmedShopOrderSideEffects(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    if (order.couponId && order.couponDiscountKobo > 0) {
      const coupon = await tx.coupon.findUnique({
        where: { id: order.couponId },
      });
      if (coupon) {
        const usedCount = coupon.usedCount + 1;
        const exhausted =
          coupon.maxUses != null && usedCount >= coupon.maxUses;
        await tx.coupon.update({
          where: { id: coupon.id },
          data: {
            usedCount,
            ...(exhausted ? { status: 'disabled' } : {}),
          },
        });
      }
    }

    if (order.giftCardId && order.giftCardAppliedKobo > 0) {
      const card = await tx.giftCard.findUnique({
        where: { id: order.giftCardId },
      });
      if (card && card.balanceKobo >= order.giftCardAppliedKobo) {
        const nextBalance = card.balanceKobo - order.giftCardAppliedKobo;
        await tx.giftCard.update({
          where: { id: card.id },
          data: {
            balanceKobo: nextBalance,
            status: nextBalance <= 0 ? 'depleted' : card.status,
          },
        });
      }
    }

    for (const item of order.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, stock: true, status: true, type: true },
      });
      if (!product) continue;
      if (
        (product.type === 'digital' || product.type === 'gift_card') &&
        product.stock == null
      ) {
        continue;
      }
      const nextStock = Math.max(0, (product.stock ?? 0) - item.quantity);
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: nextStock,
          ...(nextStock <= 0 && product.type !== 'gift_card'
            ? { status: 'draft' }
            : {}),
        },
      });
    }

    const address = (order.deliveryAddress || {}) as DeliveryAddress;
    const buyerEmail = String(address.email || '').trim();
    const sendToEmail =
      String(address.giftCardSendToEmail || '').trim() || buyerEmail;

    const giftCardLineItems = await tx.orderItem.findMany({
      where: { orderId: order.id },
      include: {
        product: { select: { type: true, name: true } },
      },
    });

    for (const line of giftCardLineItems) {
      if (line.product?.type !== 'gift_card') continue;
      const faceValue = line.unitPrice * line.quantity;
      if (faceValue <= 0) continue;

      let code = generateGiftCardCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const exists = await tx.giftCard.findFirst({
          where: { creatorId: order.creatorId, code },
          select: { id: true },
        });
        if (!exists) break;
        code = generateGiftCardCode();
      }

      await tx.giftCard.create({
        data: {
          id: crypto.randomUUID(),
          creatorId: order.creatorId,
          code,
          faceValueKobo: faceValue,
          balanceKobo: faceValue,
          status: 'active',
          purchasedOrderId: order.id,
          recipientEmail: sendToEmail || null,
        },
      });
    }
  });
}

/**
 * Idempotently confirm a paid shop order (stock + emails).
 * Safe to call from both Paystack webhook and the order-success page.
 */
export async function confirmPaidShopOrder(input: {
  orderId?: string | null;
  reference?: string | null;
}): Promise<{
  ok: boolean;
  status: 'confirmed' | 'already_confirmed' | 'pending' | 'not_found' | 'unpaid';
  orderId?: string;
}> {
  const orderId = String(input.orderId || '').trim() || null;
  const reference = String(input.reference || '').trim() || null;

  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          total: true,
          paystackReference: true,
        },
      })
    : reference
      ? await prisma.order.findFirst({
          where: { paystackReference: reference },
          select: {
            id: true,
            status: true,
            total: true,
            paystackReference: true,
          },
        })
      : null;

  if (!order) {
    return { ok: false, status: 'not_found' };
  }

  if (order.status === 'confirmed') {
    return { ok: true, status: 'already_confirmed', orderId: order.id };
  }

  if (order.status !== 'pending') {
    return { ok: false, status: 'pending', orderId: order.id };
  }

  const paystackRef = reference || order.paystackReference;
  if (!paystackRef) {
    return { ok: false, status: 'unpaid', orderId: order.id };
  }

  const verification = await paystack.verifyPayment(paystackRef);
  const verifiedStatus = String(verification?.data?.status || '').toLowerCase();
  if (!verification?.status || verifiedStatus !== 'success') {
    return { ok: false, status: 'unpaid', orderId: order.id };
  }

  const verifiedAmount = Number(verification?.data?.amount || 0);
  if (
    Number.isFinite(verifiedAmount) &&
    verifiedAmount > 0 &&
    Math.abs(verifiedAmount - order.total) > 1
  ) {
    console.error('[shop] Paystack amount mismatch', {
      orderId: order.id,
      expected: order.total,
      got: verifiedAmount,
    });
    return { ok: false, status: 'unpaid', orderId: order.id };
  }

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: 'pending' },
    data: {
      status: 'confirmed',
      paystackReference: paystackRef,
    },
  });

  if (claimed.count === 0) {
    return { ok: true, status: 'already_confirmed', orderId: order.id };
  }

  await applyConfirmedShopOrderSideEffects(order.id);
  try {
    await sendConfirmedShopOrderEmails(order.id);
  } catch (error) {
    console.error('[shop] confirmation email failed after payment:', order.id, error);
  }

  return { ok: true, status: 'confirmed', orderId: order.id };
}

/** Send post-confirmation emails (buyer, gift recipient, purchased gift-card codes). */
export async function sendConfirmedShopOrderEmails(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      creator: { select: { displayName: true } },
      items: {
        include: {
          product: {
            select: { name: true, type: true, digitalFileUrl: true },
          },
        },
      },
      deliveryTier: true,
    },
  });
  if (!order) {
    console.error('[shop] email skipped — order not found:', orderId);
    return { success: false, reason: 'not_found' as const };
  }

  const deliveryAddress = (order.deliveryAddress || {}) as DeliveryAddress;
  const buyerEmail = String(deliveryAddress.email || '').trim();
  if (!buyerEmail) {
    console.error('[shop] email skipped — no buyer email on order:', orderId);
    return { success: false, reason: 'no_email' as const };
  }

  const emailItems = await Promise.all(
    order.items.map(async (item) => {
      const productType =
        (item.product?.type as 'physical' | 'digital' | 'gift_card' | null) || null;
      const rawDigitalUrl = item.product?.digitalFileUrl || null;
      const digitalFileUrl =
        productType === 'digital'
          ? await resolveDigitalDownloadUrl(rawDigitalUrl)
          : null;
      return {
        name: item.product?.name || 'Product',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        type: productType,
        digitalFileUrl,
      };
    })
  );

  const isGift =
    deliveryAddress.isGift === true ||
    String(deliveryAddress.isGift || '').toLowerCase() === 'true';
  const recipientEmail = String(deliveryAddress.recipientEmail || '').trim();
  const occasion = parseGiftOccasion(deliveryAddress.occasion);
  const customOccasion = String(deliveryAddress.customOccasion || '').trim();

  if (isGift && recipientEmail) {
    await sendGiftOrderEmail({
      email: recipientEmail,
      recipientName: String(deliveryAddress.recipientName || '').trim() || 'there',
      buyerName: deliveryAddress.name || deliveryAddress.firstName || 'Someone',
      occasion,
      customOccasion: customOccasion || null,
      giftMessage: String(deliveryAddress.giftMessage || '').trim() || null,
      items: emailItems
        .filter((item) => item.type !== 'gift_card')
        .map((item) => ({ name: item.name, quantity: item.quantity })),
      creatorName: order.creator.displayName,
    });
  }

  const confirmation = await sendOrderConfirmationEmail({
    email: buyerEmail,
    fanName: deliveryAddress.name,
    orderId: order.id,
    items: emailItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      type:
        item.type === 'digital'
          ? ('digital' as const)
          : ('physical' as const),
      digitalFileUrl: item.digitalFileUrl,
    })),
    deliveryAddress: {
      address: deliveryAddress.address,
      city: deliveryAddress.city,
      state: deliveryAddress.state,
    },
    deliveryTier: order.deliveryTier
      ? {
          name: order.deliveryTier.name,
          estimatedDays: order.deliveryTier.estimatedDays || undefined,
        }
      : null,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    creatorName: order.creator.displayName,
  });

  const sendToEmail =
    String(deliveryAddress.giftCardSendToEmail || '').trim() || buyerEmail;
  const purchasedCards = await prisma.giftCard.findMany({
    where: { purchasedOrderId: order.id },
    orderBy: { createdAt: 'asc' },
  });

  for (const card of purchasedCards) {
    await sendGiftCardCodeEmail({
      email: sendToEmail,
      code: card.code,
      balanceKobo: card.balanceKobo,
      creatorName: order.creator.displayName,
    });
  }

  if (!confirmation?.success) {
    console.error('[shop] order confirmation email failed:', orderId, confirmation);
    return { success: false, reason: 'send_failed' as const, to: buyerEmail };
  }

  return { success: true, to: buyerEmail };
}

export function parseDeliveryAddressGiftFields(raw: Record<string, unknown>) {
  const isGift =
    raw.isGift === true || String(raw.isGift || '').toLowerCase() === 'true';
  const occasion = isGift ? parseGiftOccasion(raw.occasion) : null;
  const customOccasion = String(raw.customOccasion || '').trim();
  const recipientName = String(raw.recipientName || '').trim();
  const recipientEmail = String(raw.recipientEmail || '').trim();
  const giftMessage = String(raw.giftMessage || '').trim();
  const giftCardSendToEmail = String(raw.giftCardSendToEmail || '').trim();

  return {
    isGift,
    occasion,
    customOccasion,
    recipientName,
    recipientEmail,
    giftMessage,
    giftCardSendToEmail,
  };
}

export function validateGiftAddressFields(
  gift: ReturnType<typeof parseDeliveryAddressGiftFields>
): string | null {
  if (!gift.isGift) return null;
  if (!gift.recipientName) return 'Recipient name is required for gift orders';
  if (!gift.recipientEmail) return 'Recipient email is required for gift orders';
  if (!gift.occasion) return 'Select a gift occasion';
  if (gift.occasion === 'custom' && !gift.customOccasion) {
    return 'Enter a custom occasion';
  }
  return null;
}

export { occasionLabel, type GiftOccasion };

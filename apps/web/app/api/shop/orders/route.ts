import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { paystack } from '@/lib/paystack';
import { isPaymentsReady } from '@/lib/creator/payments-ready';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import {
  flattenAddonOptions,
  parseAddonCategories,
  validateRequiredAddons,
  type AddonOption,
} from '@/lib/shop/product-addons';
import { resolveProductPricing } from '@/lib/shop/preorder';
import { paystackTransactionChargeKobo, toFeePlanInput, PLATFORM_SUB_FEE_SELECT } from '@/lib/billing/platform-fee';
import {
  findUsableGiftCard,
  giftCardCreditForTotal,
} from '@/lib/shop/gift-cards';
import { findUsableCoupon } from '@/lib/shop/coupons';
import {
  applyConfirmedShopOrderSideEffects,
  parseDeliveryAddressGiftFields,
  sendConfirmedShopOrderEmails,
  validateGiftAddressFields,
} from '@/lib/shop/fulfill-order';
import {
  isBelowMinPayableKobo,
  minPayableChargeError,
} from '@/lib/payments/min-amount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OrderItemInput = {
  productId?: string;
  variantSelected?: Record<string, string>;
  addonIds?: string[];
  quantity?: number;
  giftCardSendToEmail?: string;
};

function isNonPhysicalProductType(type: string | null | undefined) {
  return type === 'digital' || type === 'gift_card';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const creatorId = String(body?.creatorId || '').trim();
    const deliveryAddress = (body?.deliveryAddress || {}) as Record<string, unknown>;
    const items = Array.isArray(body?.items) ? (body.items as OrderItemInput[]) : [];

    if (!creatorId || items.length === 0) {
      return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
    }

    const firstName = String(
      deliveryAddress.firstName || deliveryAddress.first_name || ''
    ).trim();
    const lastName = String(
      deliveryAddress.lastName || deliveryAddress.last_name || ''
    ).trim();
    const name =
      `${firstName} ${lastName}`.trim() || String(deliveryAddress.name || '').trim();
    const email = String(deliveryAddress.email || '').trim();
    const phone = String(deliveryAddress.phone || '').trim();
    const notes = String(deliveryAddress.notes || '').trim();

    const giftFields = parseDeliveryAddressGiftFields(deliveryAddress);
    const giftValidationError = validateGiftAddressFields(giftFields);
    if (giftValidationError) {
      return NextResponse.json({ error: giftValidationError }, { status: 400 });
    }

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'First name, last name, email, and phone are required' },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        bvnVerified: true,
        paystackSubaccountCode: true,
        subaccountStatus: true,
        platformPlan: true,
        platformSubscriptionActive: true,
        platformSubscriptions: {
          select: PLATFORM_SUB_FEE_SELECT,
          take: 1,
        },
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const subaccountCode = creator.paystackSubaccountCode;
    if (
      !isPaymentsReady(creator, {
        requireKyc: await isDojahKycRequired(),
      }) ||
      !subaccountCode
    ) {
      return NextResponse.json(
        {
          error:
            'This creator has not finished payment setup. Shop orders cannot be charged yet.',
        },
        { status: 400 }
      );
    }

    const existingSubaccount = await paystack.getSubaccount(subaccountCode);
    if (!existingSubaccount) {
      await prisma.creator.update({
        where: { id: creator.id },
        data: { subaccountStatus: 'INACTIVE' },
      });
      return NextResponse.json(
        {
          error:
            'This creator’s payout account is out of sync with Paystack. They need to re-save bank details.',
        },
        { status: 400 }
      );
    }

    const productIds = [
      ...new Set(items.map((item) => String(item.productId || '').trim()).filter(Boolean)),
    ];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        creatorId,
        status: 'active',
      },
      include: { variants: true },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'No valid products in cart' }, { status: 400 });
    }

    const mappedItems: Array<{
      productId: string;
      quantity: number;
      variantSelected?: Record<string, string>;
      addonsSelected: AddonOption[];
      unitPrice: number;
      giftCardSendToEmail?: string;
    }> = [];

    for (const item of items) {
      const productId = String(item.productId || '').trim();
      const product = products.find((entry) => entry.id === productId);
      if (!product) {
        return NextResponse.json({ error: 'Invalid product in cart' }, { status: 400 });
      }

      const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
      const minQty = Math.max(1, Math.floor(Number(product.minOrderQuantity) || 1));
      if (quantity < minQty) {
        return NextResponse.json(
          { error: `${product.name} requires a minimum of ${minQty}` },
          { status: 400 }
        );
      }
      const isNonPhysical = isNonPhysicalProductType(product.type);
      const stock = product.stock;
      if (!isNonPhysical || stock != null) {
        const available = isNonPhysical ? stock ?? Infinity : stock ?? 0;
        if (available < quantity) {
          return NextResponse.json(
            { error: `${product.name} does not have enough stock` },
            { status: 400 }
          );
        }
      }

      const selectedVariants = (item.variantSelected || {}) as Record<string, string>;
      if (product.type !== 'gift_card') {
        for (const variant of product.variants) {
          const chosen = selectedVariants[variant.name];
          if (!chosen || !variant.options.includes(chosen)) {
            return NextResponse.json(
              { error: `Select ${variant.name} for ${product.name}` },
              { status: 400 }
            );
          }
        }
      }

      const addonCategories = parseAddonCategories(product.addons);
      const catalogAddons = flattenAddonOptions(addonCategories);
      const requestedAddonIds = Array.isArray(item.addonIds)
        ? item.addonIds.map(String)
        : [];
      if (product.type !== 'gift_card') {
        const requiredError = validateRequiredAddons(addonCategories, requestedAddonIds);
        if (requiredError) {
          return NextResponse.json(
            { error: `${requiredError} for ${product.name}` },
            { status: 400 }
          );
        }
      }
      const addonsSelected = catalogAddons.filter((addon) =>
        requestedAddonIds.includes(addon.id)
      );
      const addonsTotal = addonsSelected.reduce((sum, addon) => sum + addon.price, 0);
      const pricing = resolveProductPricing({
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        isPreorder: Boolean(product.isPreorder),
        preorderSettings: product.preorderSettings,
        discountStartsAt: product.discountStartsAt,
        discountEndsAt: product.discountEndsAt,
      });
      const unitPrice = pricing.price + addonsTotal;

      mappedItems.push({
        productId,
        quantity,
        variantSelected:
          Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined,
        addonsSelected,
        unitPrice,
        giftCardSendToEmail:
          product.type === 'gift_card'
            ? String(item.giftCardSendToEmail || '').trim() || undefined
            : undefined,
      });
    }

    let deliveryTierId: string | null = null;
    let deliveryFee = 0;
    let deliveryType: string | null = null;
    let merchantContactPhone: string | null = null;

    const hasPhysicalProduct = products.some(
      (product) => !isNonPhysicalProductType(product.type)
    );
    const subtotal = mappedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const physicalQty = mappedItems.reduce((sum, item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product || isNonPhysicalProductType(product.type)) return sum;
      return sum + item.quantity;
    }, 0);

    if (hasPhysicalProduct) {
      const requestedDeliveryTierId = String(body?.deliveryTierId || '').trim();
      if (!requestedDeliveryTierId) {
        return NextResponse.json(
          { error: 'Delivery option is required' },
          { status: 400 }
        );
      }

      const deliveryTier = await prisma.deliveryTier.findFirst({
        where: { id: requestedDeliveryTierId, creatorId },
      });
      if (!deliveryTier) {
        return NextResponse.json({ error: 'Invalid delivery option' }, { status: 400 });
      }

      deliveryTierId = deliveryTier.id;
      deliveryType = deliveryTier.type || 'paid';
      if (deliveryType === 'customer_arranged') {
        const contactPhone = String(deliveryTier.contactPhone || '').trim();
        if (!contactPhone) {
          return NextResponse.json(
            {
              error:
                'This delivery option is missing a merchant contact phone. Please choose another option or contact the seller.',
            },
            { status: 400 }
          );
        }
        merchantContactPhone = contactPhone;
      }
      const { resolveDeliveryFeeKobo } = await import('@/lib/shop/delivery-fee');
      deliveryFee = resolveDeliveryFeeKobo(
        {
          type: deliveryType,
          flatRate: Number(deliveryTier.flatRate) || 0,
          minSubtotalKobo: deliveryTier.minSubtotalKobo,
          minItemQuantity: deliveryTier.minItemQuantity,
        },
        subtotal,
        physicalQty
      );

      const { isAddressOptionalDeliveryType } = await import('@/lib/shop/delivery-fee');
      if (!isAddressOptionalDeliveryType(deliveryType)) {
        const address = String(deliveryAddress.address || '').trim();
        const city = String(deliveryAddress.city || '').trim();
        const state = String(deliveryAddress.state || '').trim();
        if (!address || !city || !state) {
          return NextResponse.json(
            { error: 'Delivery address, city, and state are required' },
            { status: 400 }
          );
        }
      }
    } else {
      deliveryType = products.some((p) => p.type === 'gift_card') ? 'gift_card' : 'digital';
      deliveryFee = 0;
    }

    const promoCode = String(
      body?.giftCardCode ||
        body?.couponCode ||
        deliveryAddress.giftCardCode ||
        deliveryAddress.couponCode ||
        ''
    ).trim();

    let couponId: string | null = null;
    let couponDiscountKobo = 0;
    let usableGiftCard: Awaited<ReturnType<typeof findUsableGiftCard>> = null;

    if (promoCode) {
      const couponResult = await findUsableCoupon(creatorId, promoCode, subtotal);
      if (couponResult.kind === 'ok') {
        couponId = couponResult.coupon.id;
        couponDiscountKobo = couponResult.discountKobo;
      } else if (couponResult.kind === 'unusable') {
        return NextResponse.json({ error: couponResult.error }, { status: 400 });
      } else {
        usableGiftCard = await findUsableGiftCard(creatorId, promoCode);
        if (!usableGiftCard) {
          return NextResponse.json(
            { error: 'Gift card or coupon code is invalid' },
            { status: 400 }
          );
        }
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - couponDiscountKobo);
    const orderTotalBeforeCredit = discountedSubtotal + deliveryFee;

    const giftCardAppliedKobo = usableGiftCard
      ? giftCardCreditForTotal(usableGiftCard.balanceKobo, orderTotalBeforeCredit)
      : 0;
    const chargeAmount = Math.max(0, orderTotalBeforeCredit - giftCardAppliedKobo);

    if (subtotal <= 0) {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    if (chargeAmount > 0 && isBelowMinPayableKobo(chargeAmount)) {
      return NextResponse.json(
        {
          error: minPayableChargeError({ afterGiftCard: Boolean(usableGiftCard) }),
        },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const fanId = user?.id || 'guest';

    const customDeliveryRaw =
      deliveryAddress.customDelivery &&
      typeof deliveryAddress.customDelivery === 'object'
        ? (deliveryAddress.customDelivery as Record<string, unknown>)
        : null;
    const needsCustomDelivery = products.some(
      (product) =>
        !isNonPhysicalProductType(product.type) && Boolean(product.requiresCustomDelivery)
    );
    const customDelivery = needsCustomDelivery
      ? {
          phone: String(customDeliveryRaw?.phone || phone || '').trim(),
          notes: String(customDeliveryRaw?.notes || '').trim() || null,
        }
      : null;
    if (needsCustomDelivery && !customDelivery?.phone) {
      return NextResponse.json(
        { error: 'Custom delivery phone is required for one or more items' },
        { status: 400 }
      );
    }

    const giftCardSendToEmail =
      giftFields.giftCardSendToEmail ||
      mappedItems.find((item) => item.giftCardSendToEmail)?.giftCardSendToEmail ||
      '';

    const normalizedAddress = {
      firstName,
      lastName,
      name,
      email,
      phone,
      notes,
      address: String(deliveryAddress.address || '').trim(),
      city: String(deliveryAddress.city || '').trim(),
      state: String(deliveryAddress.state || '').trim(),
      fulfillment: deliveryType || 'delivery',
      isGift: giftFields.isGift,
      occasion: giftFields.occasion,
      customOccasion: giftFields.customOccasion || null,
      recipientName: giftFields.recipientName || null,
      recipientEmail: giftFields.recipientEmail || null,
      giftMessage: giftFields.giftMessage || null,
      giftCardSendToEmail: giftCardSendToEmail || null,
      ...(customDelivery ? { customDelivery } : {}),
      ...(merchantContactPhone ? { merchantContactPhone } : {}),
    };

    const orderId = crypto.randomUUID();

    if (chargeAmount === 0) {
      const order = await prisma.order.create({
        data: {
          id: orderId,
          fanId,
          creatorId,
          deliveryTierId,
          deliveryAddress: normalizedAddress,
          subtotal,
          deliveryFee,
          total: chargeAmount,
          couponId,
          couponDiscountKobo,
          giftCardId: usableGiftCard?.id || null,
          giftCardAppliedKobo,
          status: 'confirmed',
          items: {
            createMany: {
              data: mappedItems.map((item) => ({
                id: crypto.randomUUID(),
                productId: item.productId,
                variantSelected: item.variantSelected,
                addonsSelected: item.addonsSelected,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            },
          },
        },
      });

      await applyConfirmedShopOrderSideEffects(order.id);
      await sendConfirmedShopOrderEmails(order.id);

      return NextResponse.json({
        success: true,
        orderId: order.id,
        paystackUrl: null,
        couponDiscountKobo,
        giftCardAppliedKobo,
      });
    }

    const order = await prisma.order.create({
      data: {
        id: orderId,
        fanId,
        creatorId,
        deliveryTierId,
        deliveryAddress: normalizedAddress,
        subtotal,
        deliveryFee,
        total: chargeAmount,
        couponId,
        couponDiscountKobo,
        giftCardId: usableGiftCard?.id || null,
        giftCardAppliedKobo,
        status: 'pending',
        items: {
          createMany: {
            data: mappedItems.map((item) => ({
              id: crypto.randomUUID(),
              productId: item.productId,
              variantSelected: item.variantSelected,
              addonsSelected: item.addonsSelected,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      },
    });

    let paymentData;
    try {
      const transactionCharge = paystackTransactionChargeKobo(
        chargeAmount,
        toFeePlanInput(creator)
      );
      paymentData = await paystack.initializePayment({
        email,
        amount: chargeAmount,
        channels: ['card', 'bank', 'ussd', 'bank_transfer', 'qr'],
        subaccount: subaccountCode,
        transaction_charge: transactionCharge,
        metadata: {
          type: 'shop_order',
          orderId: order.id,
          creatorId,
          fanId,
          paymentType: 'DIRECT_SUBACCOUNT',
          giftCardAppliedKobo,
          couponDiscountKobo,
          ...(transactionCharge
            ? { platformFeeType: 'flat', platformFeeKobo: transactionCharge }
            : {}),
        },
        callback_url: `${
          process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'
        }/shop/order-success?orderId=${order.id}`,
      });
    } catch (initError) {
      const message = initError instanceof Error ? initError.message : String(initError);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'cancelled' },
      });
      if (/invalid subaccount/i.test(message)) {
        await prisma.creator.update({
          where: { id: creator.id },
          data: { subaccountStatus: 'INACTIVE' },
        });
        return NextResponse.json(
          {
            error:
              'Payment split failed: creator Paystack subaccount is invalid for this environment.',
          },
          { status: 400 }
        );
      }
      throw initError;
    }

    if (!paymentData?.status || !paymentData?.data) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'cancelled' },
      });
      throw new Error(paymentData?.message || 'Payment initialization failed');
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { paystackReference: paymentData.data.reference },
    });

    return NextResponse.json({
      orderId: order.id,
      paystackUrl: paymentData.data.authorization_url,
      reference: paymentData.data.reference,
      couponDiscountKobo,
      giftCardAppliedKobo,
    });
  } catch (error) {
    console.error('[shop/orders][POST] failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create order',
      },
      { status: 500 }
    );
  }
}

import { randomBytes } from 'crypto';
import { prisma } from '@foleio/database';
import { recordBookingPaymentTransaction } from '@/lib/actions/booking';
import { sendBookingConfirmationEmail } from '@/lib/actions/email';
import {
  applyConfirmedShopOrderSideEffects,
  recordShopOrderPaymentTransaction,
} from '@/lib/shop/fulfill-order';
import {
  normalizeQuoteLineItems,
  splitQuoteLineItems,
} from '@/lib/quotes/helpers';

function trackingToken() {
  return randomBytes(16).toString('hex');
}

function splitCustomerName(fullName: string) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: 'Customer', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * After Paystack succeeds for a quote:
 * - service lines (+ linked service) → Booking
 * - product lines (+ delivery) → Shop Order
 */
export async function convertPaidQuote(opts: {
  quoteId: string;
  reference: string;
  gatewayResponse?: unknown;
}) {
  const quote = await prisma.quote.findUnique({
    where: { id: opts.quoteId },
  });

  if (!quote) {
    return { error: 'Quote not found' as const };
  }

  const lineItems = normalizeQuoteLineItems(quote.lineItems);
  const { productLines, serviceLines, productSubtotalKobo, serviceSubtotalKobo } =
    splitQuoteLineItems(lineItems);
  const wantsBooking = Boolean(
    quote.linkedServiceId && quote.serviceDate && serviceSubtotalKobo > 0
  );
  const wantsOrder = productLines.length > 0;
  const deliveryFeeKobo = Math.max(0, Math.round(Number(quote.deliveryFeeKobo) || 0));

  if (
    quote.status === 'deposit_paid' &&
    (!wantsBooking || quote.convertedBookingId) &&
    (!wantsOrder || quote.convertedOrderId)
  ) {
    return {
      bookingId: quote.convertedBookingId,
      orderId: quote.convertedOrderId,
      alreadyConverted: true as const,
    };
  }

  if (!['sent', 'accepted', 'deposit_paid'].includes(quote.status)) {
    return { error: `Quote cannot be paid in status ${quote.status}` as const };
  }

  if (!wantsBooking && !wantsOrder) {
    return { error: 'Quote has nothing to convert' as const };
  }

  let bookingId = quote.convertedBookingId;
  let orderId = quote.convertedOrderId;
  let trackingTokenOut: string | undefined;

  // --- Booking (service portion) ---
  if (wantsBooking && !bookingId) {
    if (!quote.serviceDate || !quote.linkedServiceId) {
      return { error: 'Quote is missing booking service or service date' as const };
    }

    const totalAmount = serviceSubtotalKobo;
    // Deposits only apply on service-only invoices (products force full pay at save).
    const hasProducts = productLines.length > 0;
    const depositAmount = hasProducts
      ? totalAmount
      : Math.max(0, Math.round(Number(quote.depositAmount) || 0));
    const balanceAmount = hasProducts
      ? 0
      : Math.max(0, Math.round(Number(quote.balanceAmount) || 0));
    // When hybrid, quote deposit fields reflect full invoice — booking is always full for its share.
    const paymentPlan =
      !hasProducts &&
      balanceAmount > 0 &&
      depositAmount > 0 &&
      depositAmount < totalAmount
        ? 'deposit'
        : 'full';
    const amountPaid =
      paymentPlan === 'deposit'
        ? Math.min(depositAmount, totalAmount)
        : totalAmount;
    const firstPayoutAmount = Math.floor(totalAmount * 0.6);
    const secondPayoutAmount = totalAmount - firstPayoutAmount;
    const token = trackingToken();

    const booking = await prisma.booking.create({
      data: {
        creatorId: quote.creatorId,
        priceListItemId: quote.linkedServiceId,
        customerEmail: quote.customerEmail,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        customerAddress: quote.customerAddress || 'See quote',
        bookingDate: quote.serviceDate,
        notes: quote.title,
        totalAmount,
        firstPayoutAmount,
        secondPayoutAmount,
        paymentPlan,
        depositAmount: paymentPlan === 'deposit' ? depositAmount : 0,
        balanceAmount: paymentPlan === 'deposit' ? balanceAmount : 0,
        amountPaid,
        status: paymentPlan === 'deposit' ? 'deposit_paid' : 'paid',
        paymentReference: opts.reference,
        depositReference: paymentPlan === 'deposit' ? opts.reference : null,
        trackingToken: token,
        source: 'quote',
        milestones: quote.milestones ?? [],
        selectedAddons: [],
      },
    });

    bookingId = booking.id;
    trackingTokenOut = token;

    const bookingLedgerRef = wantsOrder
      ? `${opts.reference}:booking`
      : opts.reference;

    await recordBookingPaymentTransaction({
      bookingId: booking.id,
      reference: bookingLedgerRef,
      paymentType: 'DIRECT_SUBACCOUNT',
      paymentKind: paymentPlan === 'deposit' ? 'initial' : 'full',
      amount: amountPaid,
      gatewayResponse: opts.gatewayResponse,
    });

    void sendBookingConfirmationEmail(booking.id);
  }

  // --- Shop order (product portion) ---
  if (wantsOrder && !orderId) {
    const productIds = [...new Set(productLines.map((l) => String(l.productId)))];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        creatorId: quote.creatorId,
      },
      select: { id: true, name: true, type: true, stock: true, status: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    for (const line of productLines) {
      const product = byId.get(String(line.productId));
      if (!product || product.status !== 'active') {
        return { error: `Product unavailable: ${line.label}` as const };
      }
      const qty = Math.max(1, Math.round(Number(line.qty) || 1));
      const needsStock =
        product.type === 'physical' ||
        ((product.type === 'digital' || product.type === 'gift_card') &&
          product.stock != null);
      if (needsStock && (product.stock ?? 0) < qty) {
        return { error: `Not enough stock for ${product.name}` as const };
      }
    }

    const { firstName, lastName } = splitCustomerName(quote.customerName);
    const orderTotal = productSubtotalKobo + deliveryFeeKobo;

    const order = await prisma.order.create({
      data: {
        fanId: 'guest',
        creatorId: quote.creatorId,
        deliveryTierId:
          quote.deliveryFeeMode === 'tier' ? quote.deliveryTierId : null,
        deliveryAddress: {
          firstName,
          lastName,
          name: quote.customerName,
          email: quote.customerEmail,
          phone: quote.customerPhone || '',
          address: quote.customerAddress || '',
          city: '',
          state: '',
          notes: `Invoice: ${quote.title}`,
          fulfillment: 'invoice',
        },
        subtotal: productSubtotalKobo,
        deliveryFee: deliveryFeeKobo,
        total: orderTotal,
        status: 'confirmed',
        paystackReference: opts.reference,
        notes: `From invoice ${quote.publicToken}`,
        items: {
          create: productLines.map((line) => {
            const qty = Math.max(1, Math.round(Number(line.qty) || 1));
            const unitPrice = Math.round(
              Math.max(0, Math.round(Number(line.amountKobo) || 0)) / qty
            );
            return {
              product: { connect: { id: String(line.productId) } },
              quantity: qty,
              unitPrice,
              variantSelected: undefined,
              addonsSelected: [],
            };
          }),
        },
      },
    });

    orderId = order.id;

    const shopLedgerRef = wantsBooking
      ? `${opts.reference}:shop`
      : opts.reference;

    await recordShopOrderPaymentTransaction({
      orderId: order.id,
      reference: shopLedgerRef,
      gatewayResponse: opts.gatewayResponse,
    });

    await applyConfirmedShopOrderSideEffects(order.id);
  }

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: 'deposit_paid',
      convertedBookingId: bookingId,
      convertedOrderId: orderId,
      paystackReference: opts.reference,
    },
  });

  if (quote.quoteRequestId) {
    await prisma.quoteRequest.update({
      where: { id: quote.quoteRequestId },
      data: { status: 'quoted' },
    });
  }

  return {
    bookingId,
    orderId,
    trackingToken: trackingTokenOut,
    alreadyConverted: false as const,
  };
}

/** @deprecated Prefer convertPaidQuote — kept for import compatibility. */
export async function convertPaidQuoteToBooking(opts: {
  quoteId: string;
  reference: string;
  gatewayResponse?: unknown;
}) {
  const result = await convertPaidQuote(opts);
  if ('error' in result && result.error) {
    return { error: result.error };
  }
  return {
    bookingId: result.bookingId || undefined,
    trackingToken: result.trackingToken,
    alreadyConverted: result.alreadyConverted,
    orderId: result.orderId || undefined,
  };
}

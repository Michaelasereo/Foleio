import { prisma } from '@foleio/database';
import {
  feePercentForCreator,
  platformFeeFromGross,
  toFeePlanInput,
  PLATFORM_SUB_FEE_SELECT,
} from '@/lib/billing/platform-fee';

export function shopFreeOrderReference(orderId: string) {
  return `shop_free_${orderId}`;
}

/**
 * Upsert a successful shop_order ledger row (admin revenue + earnings).
 * Safe to call on webhook + order-success retries.
 */
export async function recordShopOrderPaymentTransaction(opts: {
  orderId: string;
  reference: string;
  gatewayResponse?: unknown;
}) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: opts.orderId },
      select: {
        id: true,
        creatorId: true,
        total: true,
        fanId: true,
        creator: {
          select: {
            id: true,
            paystackSubaccountCode: true,
            payoutMethod: true,
            platformPlan: true,
            platformSubscriptionActive: true,
            platformSubscriptions: {
              select: PLATFORM_SUB_FEE_SELECT,
              take: 1,
            },
          },
        },
      },
    });

    if (!order) {
      return { error: 'Order not found' as const };
    }

    const reference = String(opts.reference || '').trim();
    if (!reference) {
      return { error: 'Payment reference required' as const };
    }

    const amount = Math.max(0, Math.round(Number(order.total) || 0));
    const isSubaccount =
      order.creator.payoutMethod === 'DIRECT_SUBACCOUNT' ||
      Boolean(order.creator.paystackSubaccountCode);
    const paymentType = isSubaccount ? 'DIRECT_SUBACCOUNT' : 'PLATFORM_HELD';

    const feeInput = toFeePlanInput(order.creator);
    const feePct = feePercentForCreator(feeInput);
    const { platformFee, creatorEarnings, feeType } = platformFeeFromGross(
      amount,
      feeInput
    );

    const metadata = {
      type: 'shop_order',
      orderId: order.id,
      creatorId: order.creatorId,
      paymentType,
      platformFeePercent: feePct,
      platformFeeType: feeType,
    };

    const fanId =
      order.fanId && order.fanId !== 'guest' ? order.fanId : null;

    const transaction = await prisma.transaction.upsert({
      where: { reference },
      create: {
        reference,
        userId: fanId,
        creatorId: order.creatorId,
        amount: BigInt(amount),
        creatorEarnings: BigInt(Math.round(creatorEarnings)),
        platformFee: BigInt(Math.round(platformFee)),
        feeAmount: BigInt(Math.round(platformFee)),
        netAmount: BigInt(Math.round(creatorEarnings)),
        status: 'SUCCESS',
        paymentType,
        type: 'shop_order',
        fundsReleased: isSubaccount,
        fundsReleasedAt: isSubaccount ? new Date() : null,
        gateway: 'paystack',
        gatewayResponse: (opts.gatewayResponse as object) || {},
        metadata,
      },
      update: {
        status: 'SUCCESS',
        amount: BigInt(amount),
        creatorEarnings: BigInt(Math.round(creatorEarnings)),
        platformFee: BigInt(Math.round(platformFee)),
        feeAmount: BigInt(Math.round(platformFee)),
        netAmount: BigInt(Math.round(creatorEarnings)),
        paymentType,
        type: 'shop_order',
        fundsReleased: isSubaccount ? true : undefined,
        fundsReleasedAt: isSubaccount ? new Date() : undefined,
        gatewayResponse: (opts.gatewayResponse as object) || undefined,
        metadata,
      },
    });

    return {
      success: true as const,
      data: transaction,
      paymentType,
      creatorEarnings,
      platformFee,
    };
  } catch (error) {
    console.error('[shop] recordShopOrderPaymentTransaction failed:', error);
    return { error: 'Failed to record shop order transaction' as const };
  }
}

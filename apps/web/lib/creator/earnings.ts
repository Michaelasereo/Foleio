import { prisma } from '@foleio/database';
import {
  defaultPlatformFeePercent,
  feePercentForCreator,
  platformFeeFromGross,
  toFeePlanInput,
  PLATFORM_SUB_FEE_SELECT,
} from '@/lib/billing/platform-fee';
import { shopFreeOrderReference } from '@/lib/shop/record-shop-transaction';

export const PAID_BOOKING_STATUSES = [
  'paid',
  'first_payout_done',
  'service_day',
  'completed',
] as const;

export const DEPOSIT_BOOKING_STATUSES = [
  'deposit_paid',
  'balance_overdue',
] as const;

export const PAID_SHOP_ORDER_STATUSES = [
  'confirmed',
  'processing',
  'delivered',
  'in_progress',
  'shipped',
] as const;

const SUCCESS_TX_STATUSES = new Set([
  'SUCCESS',
  'COMPLETED',
  'PAID',
  'success',
  'completed',
  'paid',
]);

/** @deprecated Prefer feePercentForCreator for per-creator fees. */
export function platformFeePercent(): number {
  return defaultPlatformFeePercent();
}

export function creatorShareFromGross(
  grossKobo: number,
  feePct = defaultPlatformFeePercent()
) {
  const split = platformFeeFromGross(grossKobo, feePct);
  return {
    platformFee: split.platformFee,
    creatorEarnings: split.creatorEarnings,
  };
}

/**
 * Total creator earnings from paid bookings (preferred) plus successful
 * non-booking ledger rows — same basis as /api/creator/earnings.
 * Also includes confirmed shop orders missing a shop_order ledger row.
 */
export async function sumCreatorEarnings(creatorId: string): Promise<{
  totalEarnings: number;
  currentMonth: number;
  prevMonth: number;
}> {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: {
      platformPlan: true,
      platformSubscriptionActive: true,
      platformSubscriptions: {
        select: PLATFORM_SUB_FEE_SELECT,
        take: 1,
      },
    },
  });
  const feePct = feePercentForCreator(toFeePlanInput(creator || {}));
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [bookings, transactions, shopOrders] = await Promise.all([
    prisma.booking.findMany({
      where: {
        creatorId,
        status: {
          in: [...PAID_BOOKING_STATUSES, ...DEPOSIT_BOOKING_STATUSES],
        },
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        amountPaid: true,
        paymentReference: true,
        createdAt: true,
      },
    }),
    prisma.transaction
      .findMany({
        where: { creatorId },
        select: {
          status: true,
          type: true,
          creatorEarnings: true,
          reference: true,
          createdAt: true,
          metadata: true,
        },
      })
      .catch(() => [] as Array<{
        status: string | null;
        type: string | null;
        creatorEarnings: unknown;
        reference: string | null;
        createdAt: Date;
        metadata: unknown;
      }>),
    prisma.order
      .findMany({
        where: {
          creatorId,
          status: { in: [...PAID_SHOP_ORDER_STATUSES] },
        },
        select: {
          id: true,
          total: true,
          paystackReference: true,
          createdAt: true,
        },
      })
      .catch(() => [] as Array<{
        id: string;
        total: number;
        paystackReference: string | null;
        createdAt: Date;
      }>),
  ]);

  const txByBookingId = new Map<string, (typeof transactions)[number]>();
  const txByReference = new Map<string, (typeof transactions)[number]>();
  const shopOrderIdsWithTx = new Set<string>();
  const shopRefsWithTx = new Set<string>();
  for (const tx of transactions) {
    const meta = (tx.metadata || {}) as Record<string, unknown>;
    const bookingId = typeof meta.bookingId === 'string' ? meta.bookingId : null;
    if (bookingId) txByBookingId.set(bookingId, tx);
    if (tx.reference) txByReference.set(String(tx.reference), tx);
    if (String(tx.type || '') === 'shop_order') {
      if (typeof meta.orderId === 'string') shopOrderIdsWithTx.add(meta.orderId);
      if (tx.reference) shopRefsWithTx.add(String(tx.reference));
    }
  }

  let totalEarnings = 0;
  let currentMonth = 0;
  let prevMonth = 0;
  const seenBookingIds = new Set<string>();

  const addAmount = (amount: number, createdAt: Date) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    totalEarnings += amount;
    if (createdAt >= currentMonthStart && createdAt <= currentMonthEnd) {
      currentMonth += amount;
    } else if (createdAt >= prevMonthStart && createdAt <= prevMonthEnd) {
      prevMonth += amount;
    }
  };

  for (const booking of bookings) {
    seenBookingIds.add(booking.id);
    const isDepositHold = (DEPOSIT_BOOKING_STATUSES as readonly string[]).includes(
      booking.status
    );

    let creatorEarnings: number;
    if (isDepositHold) {
      const gross = Math.max(
        0,
        Number(booking.amountPaid || booking.depositAmount || 0)
      );
      creatorEarnings = creatorShareFromGross(gross, feePct).creatorEarnings;
    } else {
      const matchedTx =
        txByBookingId.get(booking.id) ||
        (booking.paymentReference
          ? txByReference.get(booking.paymentReference)
          : undefined);

      if (
        matchedTx &&
        SUCCESS_TX_STATUSES.has(String(matchedTx.status || '')) &&
        matchedTx.creatorEarnings != null
      ) {
        creatorEarnings = Number(matchedTx.creatorEarnings);
      } else {
        creatorEarnings = creatorShareFromGross(Number(booking.totalAmount), feePct)
          .creatorEarnings;
      }
    }

    addAmount(creatorEarnings, booking.createdAt);
  }

  for (const tx of transactions) {
    if (!SUCCESS_TX_STATUSES.has(String(tx.status || ''))) continue;
    const meta = (tx.metadata || {}) as Record<string, unknown>;
    const bookingId = typeof meta.bookingId === 'string' ? meta.bookingId : null;
    if (bookingId && seenBookingIds.has(bookingId)) continue;
    addAmount(Number(tx.creatorEarnings ?? 0), tx.createdAt);
  }

  for (const order of shopOrders) {
    if (shopOrderIdsWithTx.has(order.id)) continue;
    const ref = String(order.paystackReference || '').trim();
    if (ref && shopRefsWithTx.has(ref)) continue;
    if (shopRefsWithTx.has(shopFreeOrderReference(order.id))) continue;
    const amount = Math.max(0, Math.round(Number(order.total) || 0));
    addAmount(
      creatorShareFromGross(amount, feePct).creatorEarnings,
      order.createdAt
    );
  }

  return { totalEarnings, currentMonth, prevMonth };
}

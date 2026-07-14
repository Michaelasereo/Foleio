import { prisma } from '@foleio/database';
import {
  defaultPlatformFeePercent,
  feePercentForCreator,
} from '@/lib/billing/platform-fee';

export const PAID_BOOKING_STATUSES = [
  'paid',
  'first_payout_done',
  'service_day',
  'completed',
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
  const amount = Number(grossKobo) || 0;
  const platformFee = Math.round(amount * (feePct / 100));
  return {
    platformFee,
    creatorEarnings: Math.max(0, amount - platformFee),
  };
}

/**
 * Total creator earnings from paid bookings (preferred) plus successful
 * non-booking ledger rows — same basis as /api/creator/earnings.
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
    },
  });
  const feePct = feePercentForCreator(creator || {});
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

  const [bookings, transactions] = await Promise.all([
    prisma.booking.findMany({
      where: {
        creatorId,
        status: { in: [...PAID_BOOKING_STATUSES] },
      },
      select: {
        id: true,
        totalAmount: true,
        paymentReference: true,
        createdAt: true,
      },
    }),
    prisma.transaction
      .findMany({
        where: { creatorId },
        select: {
          status: true,
          creatorEarnings: true,
          reference: true,
          createdAt: true,
          metadata: true,
        },
      })
      .catch(() => [] as Array<{
        status: string | null;
        creatorEarnings: unknown;
        reference: string | null;
        createdAt: Date;
        metadata: unknown;
      }>),
  ]);

  const txByBookingId = new Map<string, (typeof transactions)[number]>();
  const txByReference = new Map<string, (typeof transactions)[number]>();
  for (const tx of transactions) {
    const meta = (tx.metadata || {}) as Record<string, unknown>;
    const bookingId = typeof meta.bookingId === 'string' ? meta.bookingId : null;
    if (bookingId) txByBookingId.set(bookingId, tx);
    if (tx.reference) txByReference.set(String(tx.reference), tx);
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
    const matchedTx =
      txByBookingId.get(booking.id) ||
      (booking.paymentReference
        ? txByReference.get(booking.paymentReference)
        : undefined);

    let creatorEarnings: number;
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

    addAmount(creatorEarnings, booking.createdAt);
  }

  for (const tx of transactions) {
    if (!SUCCESS_TX_STATUSES.has(String(tx.status || ''))) continue;
    const meta = (tx.metadata || {}) as Record<string, unknown>;
    const bookingId = typeof meta.bookingId === 'string' ? meta.bookingId : null;
    if (bookingId && seenBookingIds.has(bookingId)) continue;
    addAmount(Number(tx.creatorEarnings ?? 0), tx.createdAt);
  }

  return { totalEarnings, currentMonth, prevMonth };
}

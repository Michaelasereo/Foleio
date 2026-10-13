import { prisma } from '@foleio/database';
import { platformFeeFromGross } from '@/lib/billing/platform-fee';
import {
  e2eCreatorIds,
  withoutE2eCreator,
  withoutE2eCreatorOrUnassigned,
} from '@/lib/admin/delete-creator';

/** Successful transaction statuses as stored across legacy and current flows. */
export const ADMIN_SUCCESS_TX_STATUSES = [
  'success',
  'SUCCESS',
  'completed',
  'COMPLETED',
  'paid',
  'PAID',
] as const;

/** Transaction types counted on Admin → Revenue (all channels). */
export const ADMIN_REVENUE_TX_TYPES = [
  'shop_order',
  'booking',
  'deposit',
  'booking_deposit',
  'booking_balance',
  'subscription',
  'platform_subscription',
] as const;

export function platformFeeFromTransaction(tx: {
  platformFee?: bigint | number | string | null;
  feeAmount?: bigint | number | string | null;
}): number {
  const platform = Number(tx.platformFee ?? 0);
  if (platform > 0) return platform;
  return Number(tx.feeAmount ?? 0);
}

export function bookingAmountForAdmin(booking: {
  status: string;
  totalAmount: number;
  amountPaid: number;
  depositAmount: number;
}): number {
  const isDepositHold = ['deposit_paid', 'balance_overdue'].includes(booking.status);
  if (isDepositHold) {
    return Math.max(0, Number(booking.amountPaid || booking.depositAmount || 0));
  }
  return Math.max(0, Number(booking.totalAmount || 0));
}

/**
 * Platform / Foleio fees using the same sources as Admin → Revenue:
 * successful revenue-type ledger rows, deposit bookings that never got a
 * ledger fee row, and paid shop orders that never got a shop_order ledger row.
 * E2e creators are left out of the total.
 */
export async function sumAdminPlatformFees(options?: {
  since?: Date;
}): Promise<number> {
  const since = options?.since;
  const createdAt = since ? { gte: since } : undefined;
  const excluded = await e2eCreatorIds();
  const paidShopStatuses = [
    'confirmed',
    'processing',
    'delivered',
    'in_progress',
    'shipped',
  ] as const;

  const [transactions, depositBookings, shopOrders] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        status: { in: [...ADMIN_SUCCESS_TX_STATUSES] },
        type: { in: [...ADMIN_REVENUE_TX_TYPES] },
        ...withoutE2eCreatorOrUnassigned(excluded),
        ...(createdAt ? { createdAt } : {}),
      },
      select: {
        type: true,
        reference: true,
        platformFee: true,
        feeAmount: true,
        metadata: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ['deposit_paid', 'balance_overdue'] },
        ...withoutE2eCreator(excluded),
        ...(createdAt ? { createdAt } : {}),
      },
      select: {
        id: true,
        depositAmount: true,
        amountPaid: true,
        creator: {
          select: {
            platformPlan: true,
            platformSubscriptionActive: true,
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        status: { in: [...paidShopStatuses] },
        ...withoutE2eCreator(excluded),
        ...(createdAt ? { createdAt } : {}),
      },
      select: {
        id: true,
        total: true,
        paystackReference: true,
        creator: {
          select: {
            platformPlan: true,
            platformSubscriptionActive: true,
          },
        },
      },
    }),
  ]);

  let total = 0;
  const bookingIdsWithDepositTx = new Set<string>();
  const shopOrderIdsWithTx = new Set<string>();
  const shopRefsWithTx = new Set<string>();

  for (const tx of transactions) {
    total += platformFeeFromTransaction(tx);
    if (tx.type === 'deposit' || tx.type === 'booking_deposit') {
      const meta = (tx.metadata || {}) as Record<string, unknown>;
      if (typeof meta.bookingId === 'string') {
        bookingIdsWithDepositTx.add(meta.bookingId);
      }
    }
    if (tx.type === 'shop_order') {
      const meta = (tx.metadata || {}) as Record<string, unknown>;
      if (typeof meta.orderId === 'string') {
        shopOrderIdsWithTx.add(meta.orderId);
      }
      if (tx.reference) shopRefsWithTx.add(tx.reference);
    }
  }

  for (const booking of depositBookings) {
    if (bookingIdsWithDepositTx.has(booking.id)) continue;
    const amount = Math.max(
      0,
      Number(booking.amountPaid || booking.depositAmount || 0)
    );
    if (amount <= 0) continue;
    total += platformFeeFromGross(amount, booking.creator).platformFee;
  }

  for (const order of shopOrders) {
    if (shopOrderIdsWithTx.has(order.id)) continue;
    const ref = String(order.paystackReference || '').trim();
    if (ref && shopRefsWithTx.has(ref)) continue;
    const amount = Math.max(0, Math.round(Number(order.total) || 0));
    total += platformFeeFromGross(amount, order.creator).platformFee;
  }

  return total;
}

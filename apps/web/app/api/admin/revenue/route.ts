import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import {
  ADMIN_REVENUE_TX_TYPES,
  ADMIN_SUCCESS_TX_STATUSES,
  platformFeeFromTransaction,
} from '@/lib/admin/stats-helpers';
import { platformFeeFromGross } from '@/lib/billing/platform-fee';

type RevenueChannel = 'all' | 'shop' | 'services' | 'subscriptions';
type RevenueRange = '7d' | '30d' | '90d';

const CHANNEL_TYPES: Record<Exclude<RevenueChannel, 'all'>, string[]> = {
  shop: ['shop_order'],
  // `deposit` = booking deposit holds (historically missing from ledger)
  services: ['booking', 'deposit', 'booking_deposit', 'booking_balance'],
  subscriptions: ['subscription', 'platform_subscription'],
};

const ALL_REVENUE_TYPES = [...ADMIN_REVENUE_TX_TYPES];

function parseRange(value: string | null): RevenueRange {
  if (value === '7d' || value === '90d') return value;
  return '30d';
}

function parseChannel(value: string | null): RevenueChannel {
  if (value === 'shop' || value === 'services' || value === 'subscriptions') return value;
  return 'all';
}

function rangeDays(range: RevenueRange): number {
  if (range === '7d') return 7;
  if (range === '90d') return 90;
  return 30;
}

function channelForType(type: string): Exclude<RevenueChannel, 'all'> | null {
  if (CHANNEL_TYPES.shop.includes(type)) return 'shop';
  if (CHANNEL_TYPES.services.includes(type)) return 'services';
  if (CHANNEL_TYPES.subscriptions.includes(type)) return 'subscriptions';
  return null;
}

function emptyTotals() {
  return { gmv: 0, platformFee: 0, creatorEarnings: 0, count: 0 };
}

type LedgerRow = {
  id: string;
  type: string;
  reference: string;
  amount: number;
  platformFee: number;
  creatorEarnings: number;
  createdAt: Date;
  creator: { displayName: string | null; username: string | null } | null;
  user: { email: string | null; fullName: string | null } | null;
};

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get('range'));
  const channel = parseChannel(searchParams.get('channel'));
  const days = rangeDays(range);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const typesForQuery =
    channel === 'all' ? ALL_REVENUE_TYPES : CHANNEL_TYPES[channel];

  const includeServicesFallback = channel === 'all' || channel === 'services';
  const includeShopFallback = channel === 'all' || channel === 'shop';

  const PAID_SHOP_ORDER_STATUSES = [
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
        type: { in: typesForQuery },
        createdAt: { gte: since },
      },
      select: {
        id: true,
        type: true,
        reference: true,
        amount: true,
        platformFee: true,
        feeAmount: true,
        creatorEarnings: true,
        createdAt: true,
        metadata: true,
        creator: { select: { displayName: true, username: true } },
        user: { select: { email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    includeServicesFallback
      ? prisma.booking.findMany({
          where: {
            status: { in: ['deposit_paid', 'balance_overdue'] },
            createdAt: { gte: since },
          },
          select: {
            id: true,
            depositAmount: true,
            amountPaid: true,
            depositReference: true,
            paymentReference: true,
            customerEmail: true,
            customerName: true,
            createdAt: true,
            creator: {
              select: {
                displayName: true,
                username: true,
                platformPlan: true,
                platformSubscriptionActive: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    includeShopFallback
      ? prisma.order.findMany({
          where: {
            status: { in: [...PAID_SHOP_ORDER_STATUSES] },
            createdAt: { gte: since },
          },
          select: {
            id: true,
            total: true,
            paystackReference: true,
            deliveryAddress: true,
            createdAt: true,
            creator: {
              select: {
                displayName: true,
                username: true,
                platformPlan: true,
                platformSubscriptionActive: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  const bookingIdsWithDepositTx = new Set<string>();
  const shopOrderIdsWithTx = new Set<string>();
  const shopRefsWithTx = new Set<string>();
  for (const tx of transactions) {
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

  const rows: LedgerRow[] = transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    reference: tx.reference,
    amount: Number(tx.amount || 0),
    platformFee: platformFeeFromTransaction(tx),
    creatorEarnings: Number(tx.creatorEarnings || 0),
    createdAt: tx.createdAt,
    creator: tx.creator,
    user: tx.user,
  }));

  // Historical deposit bookings that never got a ledger row
  for (const booking of depositBookings) {
    if (bookingIdsWithDepositTx.has(booking.id)) continue;
    const amount = Math.max(
      0,
      Number(booking.amountPaid || booking.depositAmount || 0)
    );
    if (amount <= 0) continue;
    const split = platformFeeFromGross(amount, booking.creator);
    rows.push({
      id: `deposit_booking_${booking.id}`,
      type: 'deposit',
      reference:
        booking.depositReference ||
        booking.paymentReference ||
        `deposit_${booking.id}`,
      amount,
      platformFee: split.platformFee,
      creatorEarnings: split.creatorEarnings,
      createdAt: booking.createdAt,
      creator: booking.creator
        ? {
            displayName: booking.creator.displayName,
            username: booking.creator.username,
          }
        : null,
      user: {
        email: booking.customerEmail,
        fullName: booking.customerName,
      },
    });
  }

  // Historical shop orders that never got a shop_order ledger row
  for (const order of shopOrders) {
    if (shopOrderIdsWithTx.has(order.id)) continue;
    const ref = String(order.paystackReference || '').trim();
    if (ref && shopRefsWithTx.has(ref)) continue;
    const amount = Math.max(0, Math.round(Number(order.total) || 0));
    // Include zero-total (gift-card covered) for count; fee split still works.
    const split = platformFeeFromGross(amount, order.creator);
    const address = (order.deliveryAddress || {}) as {
      email?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
    };
    const fullName =
      String(address.name || '').trim() ||
      [address.firstName, address.lastName].filter(Boolean).join(' ').trim() ||
      null;
    rows.push({
      id: `shop_order_${order.id}`,
      type: 'shop_order',
      reference: ref || `shop_order_${order.id}`,
      amount,
      platformFee: split.platformFee,
      creatorEarnings: split.creatorEarnings,
      createdAt: order.createdAt,
      creator: order.creator
        ? {
            displayName: order.creator.displayName,
            username: order.creator.username,
          }
        : null,
      user: {
        email: String(address.email || '').trim() || null,
        fullName,
      },
    });
  }

  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const summary = emptyTotals();
  const byChannel = {
    shop: emptyTotals(),
    services: emptyTotals(),
    subscriptions: emptyTotals(),
  };

  const seriesMap = new Map<
    string,
    {
      shop: number;
      services: number;
      subscriptions: number;
      platformFee: number;
      gmv: number;
      creatorEarnings: number;
    }
  >();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    seriesMap.set(key, {
      shop: 0,
      services: 0,
      subscriptions: 0,
      platformFee: 0,
      gmv: 0,
      creatorEarnings: 0,
    });
  }

  for (const row of rows) {
    const ch = channelForType(row.type);
    if (channel !== 'all' && ch !== channel) continue;

    summary.gmv += row.amount;
    summary.platformFee += row.platformFee;
    summary.creatorEarnings += row.creatorEarnings;
    summary.count += 1;

    if (ch) {
      byChannel[ch].gmv += row.amount;
      byChannel[ch].platformFee += row.platformFee;
      byChannel[ch].creatorEarnings += row.creatorEarnings;
      byChannel[ch].count += 1;
    }

    const key = row.createdAt.toISOString().slice(0, 10);
    const bucket = seriesMap.get(key);
    if (!bucket) continue;

    bucket.gmv += row.amount;
    bucket.platformFee += row.platformFee;
    bucket.creatorEarnings += row.creatorEarnings;
    if (ch === 'shop') bucket.shop += row.amount;
    if (ch === 'services') bucket.services += row.amount;
    if (ch === 'subscriptions') bucket.subscriptions += row.amount;
  }

  const dailySeries = Array.from(seriesMap.entries()).map(([date, values]) => ({
    date,
    ...values,
  }));

  const recent = rows
    .filter((row) => {
      if (channel === 'all') return true;
      return channelForType(row.type) === channel;
    })
    .slice(0, 50)
    .map((row) => ({
      id: row.id,
      type: row.type,
      reference: row.reference,
      amount: row.amount,
      platformFee: row.platformFee,
      creatorEarnings: row.creatorEarnings,
      createdAt: row.createdAt.toISOString(),
      creator: row.creator,
      user: row.user,
      deletable:
        !row.id.startsWith('deposit_booking_') && !row.id.startsWith('shop_order_'),
    }));

  return Response.json({
    range,
    channel,
    since: since.toISOString(),
    summary,
    byChannel,
    dailySeries,
    recent,
  });
}

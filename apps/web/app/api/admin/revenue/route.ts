import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import {
  ADMIN_SUCCESS_TX_STATUSES,
  platformFeeFromTransaction,
} from '@/lib/admin/stats-helpers';

type RevenueChannel = 'all' | 'shop' | 'services' | 'subscriptions';
type RevenueRange = '7d' | '30d' | '90d';

const CHANNEL_TYPES: Record<Exclude<RevenueChannel, 'all'>, string[]> = {
  shop: ['shop_order'],
  services: ['booking'],
  subscriptions: ['subscription', 'platform_subscription'],
};

const ALL_REVENUE_TYPES = [
  ...CHANNEL_TYPES.shop,
  ...CHANNEL_TYPES.services,
  ...CHANNEL_TYPES.subscriptions,
];

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

  const transactions = await prisma.transaction.findMany({
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
      creator: { select: { displayName: true, username: true } },
      user: { select: { email: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

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

  for (const tx of transactions) {
    const gmv = Number(tx.amount || 0);
    const fee = platformFeeFromTransaction(tx);
    const earnings = Number(tx.creatorEarnings || 0);
    const ch = channelForType(tx.type);

    summary.gmv += gmv;
    summary.platformFee += fee;
    summary.creatorEarnings += earnings;
    summary.count += 1;

    if (ch) {
      byChannel[ch].gmv += gmv;
      byChannel[ch].platformFee += fee;
      byChannel[ch].creatorEarnings += earnings;
      byChannel[ch].count += 1;
    }

    const key = tx.createdAt.toISOString().slice(0, 10);
    const bucket = seriesMap.get(key);
    if (!bucket) continue;

    bucket.gmv += gmv;
    bucket.platformFee += fee;
    bucket.creatorEarnings += earnings;
    if (ch === 'shop') bucket.shop += gmv;
    if (ch === 'services') bucket.services += gmv;
    if (ch === 'subscriptions') bucket.subscriptions += gmv;
  }

  const dailySeries = Array.from(seriesMap.entries()).map(([date, values]) => ({
    date,
    ...values,
  }));

  const recent = transactions.slice(0, 50).map((tx) => ({
    id: tx.id,
    type: tx.type,
    reference: tx.reference,
    amount: Number(tx.amount || 0),
    platformFee: platformFeeFromTransaction(tx),
    creatorEarnings: Number(tx.creatorEarnings || 0),
    createdAt: tx.createdAt.toISOString(),
    creator: tx.creator,
    user: tx.user,
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

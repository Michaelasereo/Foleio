import { prisma } from '@foleio/database';
import { deadLetterQueue, webhookQueue } from '@/lib/queue/queue-manager';
import { isAdminAuthed } from '@/lib/admin/auth';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import { isPaymentsReady } from '@/lib/creator/payments-ready';
import {
  ADMIN_SUCCESS_TX_STATUSES,
  platformFeeFromTransaction,
  sumAdminPlatformFees,
} from '@/lib/admin/stats-helpers';

const successTxWhere = { status: { in: [...ADMIN_SUCCESS_TX_STATUSES] } };

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requireKyc = await isDojahKycRequired();

  const [
    totalCreators,
    creatorPaymentsSnap,
    totalTransactions,
    platformFeeTotal,
    totalPayouts,
    pendingPayouts,
    bookingStatusGroups,
    waitlistCount,
    mrr,
    proCreators,
    recentTransactions,
    transactionsLast30Days,
  ] = await Promise.all([
    prisma.creator.count(),
    prisma.creator.findMany({
      select: {
        bvnVerified: true,
        paystackSubaccountCode: true,
        subaccountStatus: true,
      },
    }),
    prisma.transaction.count({ where: successTxWhere }),
    // Same fee sources as Admin → Revenue (ledger + deposit booking fallback).
    sumAdminPlatformFees(),
    prisma.payout.aggregate({
      where: { status: 'success' },
      _sum: { amount: true },
    }),
    prisma.payout.aggregate({
      where: { status: { in: ['pending', 'processing'] } },
      _sum: { amount: true },
    }),
    prisma.booking.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    (async () => {
      try {
        return await prisma.waitlistEntry.count({ where: { status: 'pending' } });
      } catch {
        return 0;
      }
    })(),
    prisma.platformSubscription.aggregate({
      where: { status: { in: ['active', 'trialing'] } },
      _sum: { amount: true },
    }),
    prisma.creator.count({
      where: {
        platformPlan: { in: ['PRO', 'PREMIUM'] },
        platformSubscriptionActive: true,
      },
    }),
    prisma.transaction.findMany({
      where: successTxWhere,
      include: {
        creator: { select: { displayName: true, username: true } },
        user: { select: { email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.transaction.findMany({
      where: {
        ...successTxWhere,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        createdAt: true,
        platformFee: true,
        feeAmount: true,
        creatorEarnings: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const paymentsReadyCreators = creatorPaymentsSnap.filter((c) =>
    isPaymentsReady(
      {
        bvnVerified: c.bvnVerified,
        paystackSubaccountCode: c.paystackSubaccountCode,
        subaccountStatus: c.subaccountStatus,
      },
      { requireKyc }
    )
  ).length;

  const bookingsByStatus: Record<string, number> = {};
  let totalBookings = 0;
  for (const row of bookingStatusGroups) {
    const count = row._count._all;
    bookingsByStatus[row.status] = count;
    totalBookings += count;
  }

  let failedWebhooks = 0;
  let retryQueueSize = 0;
  let receivedToday = 0;
  let failedToday = 0;

  try {
    if (deadLetterQueue) {
      const deadJobs = await deadLetterQueue.getJobs(['completed', 'failed'], 0, 500);
      failedWebhooks = deadJobs.length;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      failedToday = deadJobs.filter((job: any) => {
        const ts = job?.data?.failedAt || job?.finishedOn || 0;
        return ts ? new Date(ts) >= todayStart : false;
      }).length;
    }
    if (webhookQueue) {
      const counts = await webhookQueue.getJobCounts('waiting', 'active', 'delayed');
      retryQueueSize = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
      receivedToday = totalTransactions + failedToday;
    }
  } catch (error) {
    console.warn('Admin stats queue inspection unavailable:', error);
  }

  const seriesMap = new Map<string, { platformRevenue: number; creatorEarnings: number }>();
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    seriesMap.set(key, { platformRevenue: 0, creatorEarnings: 0 });
  }

  for (const tx of transactionsLast30Days) {
    const key = tx.createdAt.toISOString().slice(0, 10);
    const current = seriesMap.get(key);
    if (!current) continue;
    current.platformRevenue += platformFeeFromTransaction(tx);
    current.creatorEarnings += Number(tx.creatorEarnings || 0);
  }

  const dailySeries = Array.from(seriesMap.entries()).map(([date, values]) => ({
    date,
    platformRevenue: values.platformRevenue,
    creatorEarnings: values.creatorEarnings,
  }));

  return Response.json({
    totalCreators,
    paymentsReadyCreators,
    paymentsReadyPct:
      totalCreators > 0 ? Math.round((paymentsReadyCreators / totalCreators) * 100) : 0,
    proCreators,
    totalTransactions,
    platformRevenue: platformFeeTotal,
    totalPayouts: Number(totalPayouts._sum.amount || 0),
    pendingPayouts: Number(pendingPayouts._sum.amount || 0),
    totalBookings,
    completedBookings: bookingsByStatus.completed || 0,
    disputedBookings: bookingsByStatus.disputed || 0,
    pendingBookings: bookingsByStatus.pending || 0,
    bookingsByStatus,
    waitlistCount,
    mrr: Number(mrr._sum.amount || 0),
    recentTransactions,
    dailySeries,
    webhooks: {
      receivedToday,
      failedToday,
      retryQueueSize,
      failedWebhooks,
    },
  });
}

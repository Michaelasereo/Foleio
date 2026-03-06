import { prisma } from '@foleio/database';
import { deadLetterQueue, webhookQueue } from '@/lib/queue/queue-manager';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [
    totalCreators,
    activeCreators,
    totalFans,
    totalTransactions,
    platformRevenue,
    totalPayouts,
    pendingPayouts,
    totalBookings,
    completedBookings,
    disputedBookings,
    waitlistCount,
    platformSubscriptions,
    mrr,
    recentTransactions,
    transactionsLast30Days,
  ] = await Promise.all([
    prisma.creator.count(),
    prisma.creator.count({ where: { contentCount: { gt: 0 } } }),
    prisma.user.count({ where: { isCreator: false } }),
    prisma.transaction.count({ where: { status: 'success' } }),
    prisma.transaction.aggregate({
      where: { status: 'success' },
      _sum: { feeAmount: true },
    }),
    prisma.payout.aggregate({
      where: { status: 'success' },
      _sum: { amount: true },
    }),
    prisma.payout.aggregate({
      where: { status: { in: ['pending', 'processing'] } },
      _sum: { amount: true },
    }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'completed' } }),
    prisma.booking.count({ where: { status: 'disputed' } }),
    (async () => {
      const waitlistModel = (prisma as any).waitlistEntry;
      if (!waitlistModel) return 0;
      return waitlistModel.count();
    })(),
    prisma.fanSubscription.count({ where: { status: 'active' } }),
    prisma.platformSubscription.aggregate({
      where: { status: { in: ['active', 'trialing'] } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { status: 'success' },
      include: {
        creator: { select: { displayName: true, username: true } },
        user: { select: { email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.transaction.findMany({
      where: {
        status: 'success',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        createdAt: true,
        feeAmount: true,
        creatorEarnings: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

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
    current.platformRevenue += Number(tx.feeAmount || 0);
    current.creatorEarnings += Number(tx.creatorEarnings || 0);
  }

  const dailySeries = Array.from(seriesMap.entries()).map(([date, values]) => ({
    date,
    platformRevenue: values.platformRevenue,
    creatorEarnings: values.creatorEarnings,
  }));

  return Response.json({
    totalCreators,
    activeCreators,
    totalFans,
    totalTransactions,
    platformRevenue: Number(platformRevenue._sum.feeAmount || 0),
    totalPayouts: Number(totalPayouts._sum.amount || 0),
    pendingPayouts: Number(pendingPayouts._sum.amount || 0),
    totalBookings,
    completedBookings,
    disputedBookings,
    waitlistCount,
    failedWebhooks,
    platformSubscriptions,
    mrr: Number(mrr._sum.amount || 0),
    recentTransactions,
    dailySeries,
    webhooks: {
      receivedToday,
      failedToday,
      retryQueueSize,
    },
  });
}

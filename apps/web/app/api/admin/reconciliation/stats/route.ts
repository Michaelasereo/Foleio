import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { deadLetterQueue, webhookQueue } from '@/lib/queue/queue-manager';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get failed webhooks from dead letter queue
    const failedJobs = deadLetterQueue
      ? await deadLetterQueue.getJobs(['completed', 'failed'], 0, 100)
      : [];
    const recentFailures = failedJobs.slice(0, 20).map((job: any) => ({
      id: job.id,
      event: job.data.event,
      data: job.data.data,
      attempt: job.data.attempt,
      maxAttempts: job.data.maxAttempts,
      failedAt: job.data.failedAt || job.finishedOn,
      error: job.data.error || job.failedReason,
      reference: job.data.data?.reference,
      amount: job.data.data?.amount,
    }));

    const totalFailed = recentFailures.length;

    // Get today's processed webhooks (successful transactions created today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: today,
        },
        status: 'success',
      },
      select: {
        amount: true,
      },
    });

    const totalProcessed = todaysTransactions.length;
    const totalRevenue = todaysTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    let retryQueueSize = 0;
    let receivedToday = 0;
    let failedToday = 0;
    try {
      if (webhookQueue) {
        const counts = await webhookQueue.getJobCounts('waiting', 'active', 'delayed');
        retryQueueSize = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
      }
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      failedToday = recentFailures.filter((item: { failedAt?: string }) => {
        const date = item.failedAt ? new Date(item.failedAt) : null;
        return date ? date >= todayStart : false;
      }).length;
      receivedToday = totalProcessed + failedToday;
    } catch (error) {
      console.warn('Unable to resolve webhook queue stats:', error);
    }

    return NextResponse.json({
      totalFailed,
      totalProcessed,
      totalRevenue,
      recentFailures,
      receivedToday,
      failedToday,
      retryQueueSize,
      webhookEvents: [],
      webhookLoggingAvailable: false,
    });
  } catch (error) {
    console.error('Reconciliation stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation stats' },
      { status: 500 }
    );
  }
}

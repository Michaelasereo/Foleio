import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { deadLetterQueue } from '@/lib/queue/queue-manager';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication (simplified for now)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get failed webhooks from dead letter queue
    const failedJobs = await deadLetterQueue.getJobs(['completed', 'failed'], 0, 100);
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

    // Calculate stats
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

    return NextResponse.json({
      totalFailed,
      totalProcessed,
      totalRevenue,
      recentFailures,
    });
  } catch (error) {
    console.error('Reconciliation stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation stats' },
      { status: 500 }
    );
  }
}

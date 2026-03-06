import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { getNextPayoutDate } from '@/lib/services/payout-utils';

const allowed = new Set(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'MANUAL']);

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const body = (await request.json()) as { frequency?: string };
    const frequency = String(body.frequency || '').toUpperCase();
    if (!allowed.has(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    const nextPayoutAt =
      frequency === 'MANUAL'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : getNextPayoutDate(frequency);

    const schedule = await (prisma as any).payoutSchedule.upsert({
      where: { creatorId: creator.id },
      update: {
        frequency,
        isActive: frequency !== 'MANUAL',
        nextPayoutAt,
      },
      create: {
        creatorId: creator.id,
        frequency,
        isActive: frequency !== 'MANUAL',
        nextPayoutAt,
      },
    });

    return NextResponse.json({ schedule, nextPayoutAt });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save payout schedule' },
      { status: 500 }
    );
  }
}

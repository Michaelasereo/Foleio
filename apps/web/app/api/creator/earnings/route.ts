import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { serializePrismaObject } from '@/lib/utils/serialization';

export async function GET() {
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
      select: {
        id: true,
        availableBalance: true,
        pendingBalance: true,
        totalEarned: true,
        platformPlan: true,
        bankAccount: true as any,
      } as any,
    } as any);

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const payouts = await prisma.payout.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const txns = await prisma.transaction.findMany({
      where: {
        creatorId: creator.id,
        status: 'success',
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        createdAt: true,
        creatorEarnings: true,
        type: true,
      },
    });

    const monthlyMap = new Map<string, number>();
    const streamMap = new Map<string, number>();
    for (const tx of txns) {
      const key = `${tx.createdAt.getFullYear()}-${String(tx.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(tx.creatorEarnings || 0));
      streamMap.set(tx.type, (streamMap.get(tx.type) || 0) + Number(tx.creatorEarnings || 0));
    }

    const monthlyEarnings = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));
    const byStream = Array.from(streamMap.entries()).map(([type, amount]) => ({
      type,
      amount,
    }));

    return NextResponse.json(
      serializePrismaObject({
        creator: { ...creator, payouts },
        monthlyEarnings,
        byStream,
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}

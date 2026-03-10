import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { serializePrismaObject } from '@/lib/utils/serialization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUCCESS_STATUSES = new Set(['SUCCESS', 'COMPLETED', 'PAID', 'success', 'completed', 'paid']);

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
      select: { id: true, availableBalance: true, pendingBalance: true, totalEarned: true, platformPlan: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    let transactions: any[] = [];
    try {
      transactions = await prisma.transaction.findMany({
        where: { creatorId: creator.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch (error) {
      console.error('[earnings] transactions:', error);
    }

    let payouts: any[] = [];
    try {
      payouts = await prisma.payout.findMany({
        where: { creatorId: creator.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    } catch (error) {
      console.error('[earnings] payouts:', error);
    }

    let bankAccount: any = null;
    try {
      bankAccount = await prisma.bankAccount.findFirst({
        where: { creatorId: creator.id },
      });
    } catch (error) {
      console.error('[earnings] bankAccount:', error);
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyMap = new Map<string, number>();
    const streamMap = new Map<string, number>();
    for (const tx of transactions) {
      const status = String(tx?.status || '');
      if (!SUCCESS_STATUSES.has(status)) {
        continue;
      }

      const createdAt = tx?.createdAt ? new Date(tx.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime()) || createdAt < sixMonthsAgo) {
        continue;
      }

      const rawAmount = Number(tx?.creatorEarnings ?? 0);
      if (Number.isNaN(rawAmount)) continue;
      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + rawAmount);
      const type = String(tx?.type || 'other');
      streamMap.set(type, (streamMap.get(type) || 0) + rawAmount);
    }

    const monthlyEarnings = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));
    const byStream = Array.from(streamMap.entries()).map(([type, amount]) => ({
      type,
      amount,
    }));

    const totalEarningsFromTransactions = transactions
      .filter((transaction) => SUCCESS_STATUSES.has(String(transaction?.status || '')))
      .reduce((sum, transaction) => sum + Number(transaction?.creatorEarnings ?? 0), 0);

    const totalPaidOut = payouts
      .filter((payout) => SUCCESS_STATUSES.has(String(payout?.status || '')))
      .reduce((sum, payout) => sum + Number(payout?.amount ?? 0), 0);

    const availableBalanceFromTransactions = Math.max(
      0,
      Number(totalEarningsFromTransactions) - Number(totalPaidOut)
    );

    const payload = {
      creator: {
        availableBalance: availableBalanceFromTransactions,
        pendingBalance: Number(creator.pendingBalance || 0),
        totalEarned: Number(totalEarningsFromTransactions || 0),
        platformPlan: creator.platformPlan || null,
        bankAccount,
        payouts,
      },
      transactions,
      monthlyEarnings,
      byStream,
      stats: {
        totalEarnings: Number(totalEarningsFromTransactions || 0),
        totalPaidOut,
        availableBalance: availableBalanceFromTransactions,
      },
    };

    return NextResponse.json(serializePrismaObject(payload));
  } catch (error: any) {
    console.error('[earnings] FATAL:', error);
    return NextResponse.json(
      {
        error: 'Failed to load earnings',
        details: error?.message || String(error),
        creator: {
          availableBalance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          platformPlan: null,
          bankAccount: null,
          payouts: [],
        },
        transactions: [],
        monthlyEarnings: [],
        byStream: [],
        stats: {
          totalEarnings: 0,
          totalPaidOut: 0,
          availableBalance: 0,
        },
      },
      { status: 500 }
    );
  }
}

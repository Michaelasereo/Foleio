import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payouts = await prisma.payout.findMany({
      where: {
        isManual: true,
        status: { in: ['pending', 'processing', 'PENDING', 'PROCESSING'] },
      },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            payoutMethod: true,
            paystackSubaccountCode: true,
            user: { select: { email: true } },
            bankAccount: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const pendingCount = payouts.length;
    const totalPending = payouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0);

    return NextResponse.json({
      payouts,
      pendingCount,
      totalPending,
    });
  } catch (error) {
    console.error('Admin payout queue error:', error);
    return NextResponse.json({ error: 'Failed to fetch payout queue' }, { status: 500 });
  }
}

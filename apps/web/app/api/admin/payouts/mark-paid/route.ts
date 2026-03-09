import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { sendPayoutSentEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { payoutId?: string; note?: string };
    if (!body.payoutId) {
      return NextResponse.json({ error: 'payoutId is required' }, { status: 400 });
    }

    const payout = await prisma.payout.findUnique({
      where: { id: body.payoutId },
      include: {
        creator: {
          include: {
            user: { select: { email: true } },
            bankAccount: true,
          },
        },
      },
    });
    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }
    if (!payout.creator.bankAccount) {
      return NextResponse.json({ error: 'Bank account not found for creator' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'success',
          manualNote: body.note || null,
          manualPaidAt: new Date(),
          manualPaidBy: 'admin',
          processedAt: new Date(),
        },
      }),
      prisma.creator.update({
        where: { id: payout.creatorId },
        data: {
          pendingBalance: { decrement: Number(payout.amount || 0) },
        } as any,
      }),
    ]);

    await sendPayoutSentEmail({
      creatorEmail: payout.creator.user.email,
      creatorName: payout.creator.displayName,
      amount: Number(payout.amount || 0),
      bankName: payout.creator.bankAccount.bankName,
      accountNumber: payout.creator.bankAccount.accountNumber,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark payout paid error:', error);
    return NextResponse.json({ error: 'Failed to mark payout paid' }, { status: 500 });
  }
}

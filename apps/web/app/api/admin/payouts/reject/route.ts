import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { sendPayoutRejectedEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { payoutId?: string; reason?: string };
    if (!body.payoutId) {
      return NextResponse.json({ error: 'payoutId is required' }, { status: 400 });
    }

    const payout = await prisma.payout.findUnique({
      where: { id: body.payoutId },
      include: {
        creator: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });
    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    const reason = body.reason || 'Please contact support.';

    await prisma.$transaction([
      prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'failed',
          manualNote: reason,
          failureReason: reason,
          processedAt: new Date(),
        },
      }),
      prisma.creator.update({
        where: { id: payout.creatorId },
        data: {
          availableBalance: { increment: Number(payout.amount || 0) },
          pendingBalance: { decrement: Number(payout.amount || 0) },
        } as any,
      }),
    ]);

    await sendPayoutRejectedEmail({
      creatorEmail: payout.creator.user.email,
      creatorName: payout.creator.displayName,
      amount: Number(payout.amount || 0),
      reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reject payout error:', error);
    return NextResponse.json({ error: 'Failed to reject payout' }, { status: 500 });
  }
}

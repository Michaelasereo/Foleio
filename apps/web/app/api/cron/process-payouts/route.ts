import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { initiateTransfer } from '@/lib/services/paystack';
import { getNextPayoutDate } from '@/lib/services/payout-utils';

const MIN_PAYOUT_KOBO = 100000;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const schedules = await (prisma as any).payoutSchedule.findMany({
    where: { isActive: true, nextPayoutAt: { lte: now } },
    include: {
      creator: {
        include: {
          bankAccount: true,
        },
      },
    },
  });

  let processed = 0;

  for (const schedule of schedules) {
    const creator = schedule.creator;
    if (!creator?.bankAccount?.recipientCode) {
      continue;
    }
    if (!creator?.bvnVerified) {
      continue;
    }
    if (Number(creator.availableBalance || 0) < MIN_PAYOUT_KOBO) {
      await (prisma as any).payoutSchedule.update({
        where: { id: schedule.id },
        data: {
          nextPayoutAt: getNextPayoutDate(schedule.frequency, now),
        },
      });
      continue;
    }

    const reference = `foleio_auto_${creator.id}_${Date.now()}`;
    const amount = Number(creator.availableBalance || 0);

    const payout = await prisma.payout.create({
      data: {
        creatorId: creator.id,
        amount,
        status: 'PROCESSING',
        paystackReference: reference,
        reason: `Automatic ${schedule.frequency.toLowerCase()} payout`,
      } as any,
    });

    const transfer = await initiateTransfer(
      amount,
      creator.bankAccount.recipientCode,
      reference,
      `Automatic ${schedule.frequency.toLowerCase()} payout`
    );

    await prisma.$transaction([
      prisma.payout.update({
        where: { id: payout.id },
        data: {
          paystackTransferCode: transfer?.data?.transfer_code || null,
          status: transfer?.status ? 'PROCESSING' : 'FAILED',
          failureReason: transfer?.status ? null : transfer?.message || 'Transfer failed',
        } as any,
      }),
      prisma.creator.update({
        where: { id: creator.id },
        data: {
          availableBalance: { decrement: amount },
        } as any,
      }),
      (prisma as any).payoutSchedule.update({
        where: { id: schedule.id },
        data: { nextPayoutAt: getNextPayoutDate(schedule.frequency, now) },
      }),
    ]);

    processed += 1;
  }

  return NextResponse.json({ processed });
}

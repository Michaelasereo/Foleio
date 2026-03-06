import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { initiateTransfer } from '@/lib/services/paystack';
import { getEstimatedArrival, shouldProcessImmediately } from '@/lib/services/payout-utils';

const MIN_PAYOUT_KOBO = 100000;

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
      select: {
        id: true,
        platformPlan: true,
        bvnVerified: true,
        availableBalance: true,
      },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    if (!creator.bvnVerified) {
      return NextResponse.json(
        { error: 'BVN verification required', code: 'BVN_REQUIRED' },
        { status: 403 }
      );
    }

    const bankAccount = await (prisma as any).bankAccount.findUnique({
      where: { creatorId: creator.id },
    });
    if (!bankAccount?.recipientCode) {
      return NextResponse.json({ error: 'Please set up your bank account first' }, { status: 400 });
    }

    const pendingPayout = await prisma.payout.findFirst({
      where: {
        creatorId: creator.id,
        status: { in: ['PENDING', 'PROCESSING', 'pending', 'processing'] },
      },
    });
    if (pendingPayout) {
      return NextResponse.json({ error: 'You already have a pending payout' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as { amount?: number };
    const requestedAmount = body.amount || Number(creator.availableBalance || 0);

    if (requestedAmount < MIN_PAYOUT_KOBO) {
      return NextResponse.json(
        { error: 'Minimum payout is NGN 1,000' },
        { status: 400 }
      );
    }

    if (requestedAmount > Number(creator.availableBalance || 0)) {
      return NextResponse.json({ error: 'Insufficient available balance' }, { status: 400 });
    }

    const immediate = shouldProcessImmediately(creator.platformPlan ?? null);
    const reference = `foleio_payout_${randomUUID()}`;

    const payout = await prisma.payout.create({
      data: {
        creatorId: creator.id,
        amount: requestedAmount,
        status: immediate ? 'PROCESSING' : 'PENDING',
        paystackReference: reference,
        reason: 'Creator withdrawal',
        scheduledFor: immediate ? new Date() : new Date(Date.now() + 24 * 60 * 60 * 1000),
      } as any,
    });

    await prisma.creator.update({
      where: { id: creator.id },
      data: { availableBalance: { decrement: requestedAmount } } as any,
    });

    if (immediate) {
      const transfer = await initiateTransfer(
        requestedAmount,
        bankAccount.recipientCode,
        reference,
        'Creator payout'
      );

      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          paystackTransferCode: transfer?.data?.transfer_code || null,
          status: transfer?.status ? 'PROCESSING' : 'FAILED',
          failureReason: transfer?.status ? null : transfer?.message || 'Transfer initialization failed',
        } as any,
      });
    }

    return NextResponse.json({
      payout,
      estimatedArrival: getEstimatedArrival(creator.platformPlan ?? null),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to request payout' },
      { status: 500 }
    );
  }
}

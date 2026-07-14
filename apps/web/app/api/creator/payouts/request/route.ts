import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { initiateTransfer } from '@/lib/services/paystack';
import { getEstimatedArrival, shouldProcessImmediately } from '@/lib/services/payout-utils';
import {
  sendPayoutRequestConfirmationEmail,
  sendPayoutRequestEmail,
} from '@/lib/email/send';
import { isDojahKycRequired } from '@/lib/config/platform-settings';

const MIN_PAYOUT_KOBO = 100000;
const MANUAL_MIN_PAYOUT_KOBO = 500000;

function getNextFriday(): string {
  const today = new Date();
  const day = today.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const friday = new Date(today);
  friday.setDate(today.getDate() + daysUntilFriday);
  return friday.toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

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
        displayName: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
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
      return NextResponse.json(
        { error: 'You already have a pending payout request' },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { amount?: number };
    const requestedAmount = body.amount || Number(creator.availableBalance || 0);
    const isManual = process.env.MANUAL_PAYOUTS_ENABLED === 'true';

    if (isManual) {
      if (requestedAmount < MANUAL_MIN_PAYOUT_KOBO) {
        return NextResponse.json(
          { error: 'Minimum payout amount is ₦5,000' },
          { status: 400 }
        );
      }

      if (requestedAmount > Number(creator.availableBalance || 0)) {
        return NextResponse.json({ error: 'Insufficient available balance' }, { status: 400 });
      }

      const reference = `foleio_manual_${Date.now()}`;
      const payout = await prisma.payout.create({
        data: {
          creatorId: creator.id,
          amount: requestedAmount,
          status: 'pending',
          isManual: true,
          paystackReference: reference,
          reason: 'Manual payout request',
          metadata: {
            bankAccountId: bankAccount.id,
          },
        } as any,
      });

      await prisma.creator.update({
        where: { id: creator.id },
        data: {
          pendingBalance: { increment: requestedAmount },
          availableBalance: { decrement: requestedAmount },
        } as any,
      });

      await sendPayoutRequestEmail({
        creatorName: creator.displayName,
        creatorEmail: creator.user.email,
        amount: requestedAmount,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
        payoutId: payout.id,
      });

      await sendPayoutRequestConfirmationEmail({
        creatorEmail: creator.user.email,
        creatorName: creator.displayName,
        amount: requestedAmount,
        expectedDate: getNextFriday(),
      });

      return NextResponse.json({ success: true, payout });
    }

    if ((await isDojahKycRequired()) && !creator.bvnVerified) {
      return NextResponse.json(
        { error: 'BVN verification required', code: 'BVN_REQUIRED' },
        { status: 403 }
      );
    }

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

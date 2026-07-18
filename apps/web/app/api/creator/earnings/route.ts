import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { serializePrismaObject } from '@/lib/utils/serialization';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import { feePercentForCreator, platformFeeFromGross, toFeePlanInput, PLATFORM_SUB_FEE_SELECT } from '@/lib/billing/platform-fee';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUCCESS_TX_STATUSES = new Set([
  'SUCCESS',
  'COMPLETED',
  'PAID',
  'success',
  'completed',
  'paid',
]);

const PAID_BOOKING_STATUSES = [
  'paid',
  'first_payout_done',
  'service_day',
  'completed',
];

const DEPOSIT_BOOKING_STATUSES = ['deposit_paid', 'balance_overdue'];

function creatorShareFromGross(grossKobo: number, feePct: number) {
  const split = platformFeeFromGross(grossKobo, feePct);
  return {
    platformFee: split.platformFee,
    creatorEarnings: split.creatorEarnings,
  };
}

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
        userId: true,
        platformPlan: true,
        platformSubscriptionActive: true,
        platformSubscriptions: {
          select: PLATFORM_SUB_FEE_SELECT,
          take: 1,
        },
        bvnVerified: true,
        identityVerifiedAt: true,
        displayName: true,
        paystackSubaccountCode: true,
        subaccountStatus: true,
        user: { select: { email: true } },
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const feePct = feePercentForCreator(toFeePlanInput(creator));

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

    let bookings: Array<{
      id: string;
      status: string;
      totalAmount: number;
      depositAmount: number;
      balanceAmount: number;
      amountPaid: number;
      paymentPlan: string | null;
      paymentReference: string | null;
      createdAt: Date;
      bookingDate: Date;
      customerName: string;
      priceListItem: { name: string } | null;
    }> = [];
    try {
      bookings = await prisma.booking.findMany({
        where: {
          creatorId: creator.id,
          status: {
            in: [...PAID_BOOKING_STATUSES, ...DEPOSIT_BOOKING_STATUSES],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          status: true,
          totalAmount: true,
          depositAmount: true,
          balanceAmount: true,
          amountPaid: true,
          paymentPlan: true,
          paymentReference: true,
          createdAt: true,
          bookingDate: true,
          customerName: true,
          priceListItem: { select: { name: true } },
        },
      });
    } catch (error) {
      console.error('[earnings] bookings:', error);
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

    // Prefer ledger rows when present; always include paid bookings so
    // earnings stay correct even if a transaction write failed.
    const txByBookingId = new Map<string, any>();
    const txByReference = new Map<string, any>();
    for (const tx of transactions) {
      const meta = (tx?.metadata || {}) as Record<string, unknown>;
      const bookingId = typeof meta.bookingId === 'string' ? meta.bookingId : null;
      if (bookingId) txByBookingId.set(bookingId, tx);
      if (tx?.reference) txByReference.set(String(tx.reference), tx);
    }

    let fullPayments = 0;
    let deposits = 0;
    let outstanding = 0;
    const activityRows: any[] = [];
    const monthlyMap = new Map<string, number>();
    const streamMap = new Map<string, number>();
    const seenBookingIds = new Set<string>();

    for (const booking of bookings) {
      seenBookingIds.add(booking.id);
      const isDepositHold = DEPOSIT_BOOKING_STATUSES.includes(booking.status);
      const matchedTx =
        !isDepositHold
          ? txByBookingId.get(booking.id) ||
            (booking.paymentReference
              ? txByReference.get(booking.paymentReference)
              : null)
          : null;

      let creatorEarnings: number;
      let platformFee: number;
      let amount: number;

      if (isDepositHold) {
        amount = Math.max(
          0,
          Number(booking.amountPaid || booking.depositAmount || 0)
        );
        const split = creatorShareFromGross(amount, feePct);
        creatorEarnings = split.creatorEarnings;
        platformFee = split.platformFee;

        const balanceGross = Math.max(0, Number(booking.balanceAmount || 0));
        if (balanceGross > 0) {
          outstanding += creatorShareFromGross(balanceGross, feePct).creatorEarnings;
        }
      } else if (
        matchedTx &&
        SUCCESS_TX_STATUSES.has(String(matchedTx.status || '')) &&
        matchedTx.creatorEarnings != null
      ) {
        creatorEarnings = Number(matchedTx.creatorEarnings);
        platformFee = Number(matchedTx.platformFee ?? 0);
        amount = Number(matchedTx.amount ?? booking.totalAmount);
      } else {
        amount = Number(booking.totalAmount);
        const split = creatorShareFromGross(amount, feePct);
        creatorEarnings = split.creatorEarnings;
        platformFee = split.platformFee;
      }

      if (!Number.isFinite(creatorEarnings) || creatorEarnings <= 0) continue;

      if (isDepositHold) {
        deposits += creatorEarnings;
      } else {
        fullPayments += creatorEarnings;
      }

      const createdAt = booking.createdAt;
      if (createdAt >= sixMonthsAgo) {
        const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + creatorEarnings);
        streamMap.set(
          isDepositHold ? 'deposit' : 'booking',
          (streamMap.get(isDepositHold ? 'deposit' : 'booking') || 0) +
            creatorEarnings
        );
      }

      activityRows.push({
        id: matchedTx?.id || `booking_${booking.id}`,
        createdAt: booking.createdAt,
        status: matchedTx?.status || booking.status,
        type: isDepositHold ? 'deposit' : 'booking',
        amount,
        creatorEarnings,
        platformFee,
        reference: booking.paymentReference || matchedTx?.reference || null,
        paymentType: 'DIRECT_SUBACCOUNT',
        metadata: {
          bookingId: booking.id,
          service: booking.priceListItem?.name || 'Booking',
          customerName: booking.customerName,
          bookingDate: booking.bookingDate,
          paymentPlan: booking.paymentPlan || null,
          balanceAmount: isDepositHold ? booking.balanceAmount : 0,
        },
      });
    }

    // Include non-booking successful transactions (subscriptions, etc.)
    for (const tx of transactions) {
      const status = String(tx?.status || '');
      if (!SUCCESS_TX_STATUSES.has(status)) continue;

      const meta = (tx?.metadata || {}) as Record<string, unknown>;
      const bookingId = typeof meta.bookingId === 'string' ? meta.bookingId : null;
      if (bookingId && seenBookingIds.has(bookingId)) continue;

      const rawAmount = Number(tx?.creatorEarnings ?? 0);
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) continue;

      fullPayments += rawAmount;

      const createdAt = tx?.createdAt ? new Date(tx.createdAt) : null;
      if (createdAt && !Number.isNaN(createdAt.getTime()) && createdAt >= sixMonthsAgo) {
        const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + rawAmount);
        const type = String(tx?.type || 'other');
        streamMap.set(type, (streamMap.get(type) || 0) + rawAmount);
      }

      activityRows.push({
        ...tx,
        creatorEarnings: rawAmount,
        paymentType: tx.paymentType || 'DIRECT_SUBACCOUNT',
      });
    }

    activityRows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const monthlyEarnings = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));
    const byStream = Array.from(streamMap.entries()).map(([type, amount]) => ({
      type,
      amount,
    }));

    const totalEarnings = fullPayments + deposits;
    const settledToBank = fullPayments;

    const payload = {
      creator: {
        id: creator.id,
        userId: creator.userId,
        totalEarned: totalEarnings,
        platformPlan: creator.platformPlan || null,
        bankAccount,
        bvnVerified: Boolean(creator.bvnVerified),
        identityVerifiedAt: creator.identityVerifiedAt,
        displayName: creator.displayName || null,
        email: creator.user?.email || user.email || null,
        paystackSubaccountCode: creator.paystackSubaccountCode || null,
        subaccountStatus: creator.subaccountStatus || null,
      },
      requireDojahKyc: await isDojahKycRequired(),
      transactions: activityRows.slice(0, 50),
      monthlyEarnings,
      byStream,
      stats: {
        totalEarnings,
        fullPayments,
        deposits,
        outstanding,
        settledToBank,
        platformFeePercent: feePct,
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
          id: null,
          userId: null,
          totalEarned: 0,
          platformPlan: null,
          bankAccount: null,
          bvnVerified: false,
          identityVerifiedAt: null,
          displayName: null,
          email: null,
        },
        transactions: [],
        monthlyEarnings: [],
        byStream: [],
        stats: {
          totalEarnings: 0,
          fullPayments: 0,
          deposits: 0,
          outstanding: 0,
          settledToBank: 0,
        },
      },
      { status: 500 }
    );
  }
}

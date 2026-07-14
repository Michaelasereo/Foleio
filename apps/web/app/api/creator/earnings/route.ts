import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { serializePrismaObject } from '@/lib/utils/serialization';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import { feePercentForCreator } from '@/lib/billing/platform-fee';

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

function creatorShareFromGross(grossKobo: number, feePct: number) {
  const amount = Number(grossKobo) || 0;
  const platformFee = Math.round(amount * (feePct / 100));
  return {
    platformFee,
    creatorEarnings: Math.max(0, amount - platformFee),
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

    const feePct = feePercentForCreator(creator);

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
          status: { in: PAID_BOOKING_STATUSES },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          status: true,
          totalAmount: true,
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

    let settledToBank = 0;
    const activityRows: any[] = [];
    const monthlyMap = new Map<string, number>();
    const streamMap = new Map<string, number>();
    const seenBookingIds = new Set<string>();

    for (const booking of bookings) {
      seenBookingIds.add(booking.id);
      const matchedTx =
        txByBookingId.get(booking.id) ||
        (booking.paymentReference
          ? txByReference.get(booking.paymentReference)
          : null);

      let creatorEarnings: number;
      let platformFee: number;
      let amount: number;

      if (
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

      if (!Number.isFinite(creatorEarnings)) continue;
      settledToBank += creatorEarnings;

      const createdAt = booking.createdAt;
      if (createdAt >= sixMonthsAgo) {
        const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + creatorEarnings);
        streamMap.set('booking', (streamMap.get('booking') || 0) + creatorEarnings);
      }

      activityRows.push({
        id: matchedTx?.id || `booking_${booking.id}`,
        createdAt: booking.createdAt,
        status: matchedTx?.status || booking.status,
        type: 'booking',
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

      settledToBank += rawAmount;

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

    const totalEarnings = settledToBank;

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
          settledToBank: 0,
        },
      },
      { status: 500 }
    );
  }
}

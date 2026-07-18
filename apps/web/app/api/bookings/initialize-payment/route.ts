import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';
import { isPaymentsReady } from '@/lib/creator/payments-ready';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import { paystackTransactionChargeKobo, toFeePlanInput, PLATFORM_SUB_FEE_SELECT } from '@/lib/billing/platform-fee';

const schema = z.object({
  bookingId: z.string().uuid(),
  paymentKind: z.enum(['initial', 'balance']).default('initial'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const { bookingId, paymentKind } = validation.data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        creator: {
          select: {
            id: true,
            bvnVerified: true,
            paystackSubaccountCode: true,
            subaccountStatus: true,
            platformPlan: true,
            platformSubscriptionActive: true,
            platformSubscriptions: {
              select: PLATFORM_SUB_FEE_SELECT,
              take: 1,
            },
          },
        },
        priceListItem: {
          select: { name: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (paymentKind === 'initial' && booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Booking is not awaiting payment' },
        { status: 400 }
      );
    }

    if (paymentKind === 'balance' && !['deposit_paid', 'balance_overdue'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Booking is not awaiting balance payment' },
        { status: 400 }
      );
    }

    const subaccountCode = booking.creator.paystackSubaccountCode;
    if (
      !isPaymentsReady(booking.creator, {
        requireKyc: await isDojahKycRequired(),
      }) ||
      !subaccountCode
    ) {
      return NextResponse.json(
        {
          error:
            'This creator has not finished payment setup. Bookings cannot be charged yet.',
        },
        { status: 400 }
      );
    }

    const existingSubaccount = await paystack.getSubaccount(subaccountCode);
    if (!existingSubaccount) {
      await prisma.creator.update({
        where: { id: booking.creator.id },
        data: { subaccountStatus: 'INACTIVE' },
      });
      return NextResponse.json(
        {
          error:
            'This creator’s payout account is out of sync with Paystack (often a test/live key mismatch). They need to re-save their bank details in Settings → Payouts, then try again.',
        },
        { status: 400 }
      );
    }

    const amount =
      paymentKind === 'balance'
        ? Number(booking.balanceAmount)
        : booking.paymentPlan === 'deposit' && booking.balanceAmount > 0
          ? Number(booking.depositAmount)
          : Number(booking.totalAmount);

    if (!Number.isFinite(amount) || amount < 100) {
      return NextResponse.json({ error: 'Invalid booking amount' }, { status: 400 });
    }

    let paymentData;
    try {
      const transactionCharge = paystackTransactionChargeKobo(
        amount,
        toFeePlanInput(booking.creator)
      );
      paymentData = await paystack.initializePayment({
        email: booking.customerEmail,
        amount,
        channels: ['card', 'bank', 'ussd'],
        subaccount: subaccountCode,
        transaction_charge: transactionCharge,
        metadata: {
          type: 'booking',
          bookingId: booking.id,
          creatorId: booking.creatorId,
          service: booking.priceListItem?.name || 'Booking',
          paymentType: 'DIRECT_SUBACCOUNT',
          paymentKind,
          paymentPlan: booking.paymentPlan,
          ...(transactionCharge
            ? { platformFeeType: 'flat', platformFeeKobo: transactionCharge }
            : {}),
        },
        callback_url: `${
          process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'
        }/tracking/${booking.trackingToken || ''}`,
      });
    } catch (initError) {
      const message = initError instanceof Error ? initError.message : String(initError);
      if (/invalid subaccount/i.test(message)) {
        await prisma.creator.update({
          where: { id: booking.creator.id },
          data: { subaccountStatus: 'INACTIVE' },
        });
        return NextResponse.json(
          {
            error:
              'Payment split failed: creator Paystack subaccount is invalid for this environment. Creator must re-save bank details in Settings.',
          },
          { status: 400 }
        );
      }
      throw initError;
    }

    if (!paymentData?.status || !paymentData?.data) {
      throw new Error(paymentData?.message || 'Payment initialization failed');
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentReference: paymentData.data.reference,
      },
    });

    return NextResponse.json({
      success: true,
      authorization_url: paymentData.data.authorization_url,
      access_code: paymentData.data.access_code,
      reference: paymentData.data.reference,
      subaccount: subaccountCode,
      amount,
      paymentKind,
      email: booking.customerEmail,
      publicKey: paystack.getPublicKey(),
    });
  } catch (error) {
    console.error('[bookings/initialize-payment]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to initialize payment',
      },
      { status: 500 }
    );
  }
}

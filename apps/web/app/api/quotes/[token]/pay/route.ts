import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';
import { isPaymentsReady } from '@/lib/creator/payments-ready';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import {
  paystackTransactionChargeKobo,
  toFeePlanInput,
  PLATFORM_SUB_FEE_SELECT,
} from '@/lib/billing/platform-fee';
import {
  isBelowMinPayableKobo,
  MIN_PAYABLE_NAIRA,
} from '@/lib/payments/min-amount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
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
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status === 'deposit_paid') {
      return NextResponse.json(
        { error: 'This quote has already been paid' },
        { status: 400 }
      );
    }

    if (quote.status === 'expired' || quote.status === 'declined') {
      return NextResponse.json(
        { error: `This quote is ${quote.status}` },
        { status: 400 }
      );
    }

    if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'expired' },
      });
      return NextResponse.json(
        { error: 'This quote has expired' },
        { status: 400 }
      );
    }

    if (!['sent', 'accepted'].includes(quote.status)) {
      return NextResponse.json(
        { error: 'This quote is not available for payment' },
        { status: 400 }
      );
    }

    const { resolveHybridQuoteFields } = await import(
      '@/lib/quotes/hybrid-invoice'
    );
    const hybrid = await resolveHybridQuoteFields({
      creatorId: quote.creatorId,
      lineItemsRaw: quote.lineItems,
      linkedServiceId: quote.linkedServiceId,
      serviceDateRaw: quote.serviceDate,
      delivery: {
        deliveryFeeMode: quote.deliveryFeeMode,
        deliveryTierId: quote.deliveryTierId,
        deliveryFeeKobo: quote.deliveryFeeKobo,
      },
    });
    if (!hybrid.ok) {
      return NextResponse.json({ error: hybrid.error }, { status: 400 });
    }

    const subaccountCode = quote.creator.paystackSubaccountCode;
    if (
      !isPaymentsReady(quote.creator, {
        requireKyc: await isDojahKycRequired(),
      }) ||
      !subaccountCode
    ) {
      return NextResponse.json(
        {
          error:
            'This creator has not finished payment setup. Quotes cannot be charged yet.',
        },
        { status: 400 }
      );
    }

    const amount =
      quote.balanceAmount > 0 && quote.depositAmount > 0
        ? quote.depositAmount
        : quote.totalAmount;

    if (!Number.isFinite(amount) || isBelowMinPayableKobo(amount)) {
      return NextResponse.json(
        {
          error: `Payment amount must be at least ₦${MIN_PAYABLE_NAIRA.toLocaleString('en-NG')}`,
        },
        { status: 400 }
      );
    }

    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'accepted' },
    });

    const transactionCharge = paystackTransactionChargeKobo(
      amount,
      toFeePlanInput(quote.creator)
    );

    const paymentData = await paystack.initializePayment({
      email: quote.customerEmail,
      amount,
      channels: ['card', 'bank', 'ussd', 'bank_transfer', 'qr'],
      subaccount: subaccountCode,
      transaction_charge: transactionCharge,
      metadata: {
        type: 'quote',
        quoteId: quote.id,
        creatorId: quote.creatorId,
        paymentType: 'DIRECT_SUBACCOUNT',
        ...(transactionCharge
          ? { platformFeeType: 'flat', platformFeeKobo: transactionCharge }
          : {}),
      },
      callback_url: `${APP_URL.replace(/\/$/, '')}/quote/${quote.publicToken}?paid=1`,
    });

    if (!paymentData?.status || !paymentData?.data) {
      throw new Error(paymentData?.message || 'Payment initialization failed');
    }

    await prisma.quote.update({
      where: { id: quote.id },
      data: { paystackReference: paymentData.data.reference },
    });

    return NextResponse.json({
      authorizationUrl: paymentData.data.authorization_url,
      accessCode: paymentData.data.access_code,
      reference: paymentData.data.reference,
    });
  } catch (error) {
    console.error('POST /api/quotes/[token]/pay', error);
    const message = error instanceof Error ? error.message : 'Payment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

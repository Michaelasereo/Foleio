import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';

const schema = z.object({
  bookingId: z.string().uuid(),
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

    const booking = await prisma.booking.findUnique({
      where: { id: validation.data.bookingId },
      include: {
        creator: {
          select: {
            id: true,
            paystackSubaccountCode: true,
            subaccountStatus: true,
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

    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Booking is not awaiting payment' },
        { status: 400 }
      );
    }

    const subaccountCode = booking.creator.paystackSubaccountCode;
    if (!subaccountCode || booking.creator.subaccountStatus !== 'ACTIVE') {
      return NextResponse.json(
        {
          error:
            'This creator has not finished payment setup. Bookings cannot be charged yet.',
        },
        { status: 400 }
      );
    }

    const amount = Number(booking.totalAmount);
    if (!Number.isFinite(amount) || amount < 100) {
      return NextResponse.json({ error: 'Invalid booking amount' }, { status: 400 });
    }

    const paymentData = await paystack.initializePayment({
      email: booking.customerEmail,
      amount,
      channels: ['card', 'bank', 'ussd'],
      subaccount: subaccountCode,
      metadata: {
        type: 'booking',
        bookingId: booking.id,
        creatorId: booking.creatorId,
        service: booking.priceListItem?.name || 'Booking',
        paymentType: 'DIRECT_SUBACCOUNT',
      },
      callback_url: `${
        process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'
      }/tracking/${booking.trackingToken || ''}`,
    });

    if (!paymentData?.status || !paymentData?.data) {
      throw new Error(paymentData?.message || 'Payment initialization failed');
    }

    // Persist reference early so webhook/verify can correlate
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

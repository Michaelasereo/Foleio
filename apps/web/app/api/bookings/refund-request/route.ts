import { NextRequest, NextResponse } from 'next/server';
import { requestRefund } from '@/lib/actions/booking';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { sendBookingStatusUpdate } from '@/lib/email/send';
import { formatBookingWhen } from '@/lib/booking/slots';

const refundRequestSchema = z.object({
  trackingToken: z.string(),
  email: z.string().email(),
  reason: z.string().min(10, 'Please provide a detailed reason'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = refundRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await requestRefund(
      validation.data.trackingToken,
      validation.data.email,
      validation.data.reason
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        trackingToken: validation.data.trackingToken,
        customerEmail: validation.data.email.toLowerCase(),
      },
      include: {
        creator: {
          select: {
            displayName: true,
          },
        },
        priceListItem: {
          select: {
            name: true,
          },
        },
      },
    });

    if (booking) {
      await sendBookingStatusUpdate({
        customerEmail: booking.customerEmail,
        customerName: booking.customerName,
        creatorName: booking.creator.displayName,
        serviceName: booking.priceListItem.name,
        bookingDate: formatBookingWhen(
          booking.bookingDate,
          booking.startTime,
          booking.endTime
        ),
        status: 'disputed',
        trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'}/tracking/${booking.trackingToken}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Refund request submitted. The creator will review your request.',
    });
  } catch (error) {
    console.error('Error requesting refund:', error);
    return NextResponse.json(
      { error: 'Failed to submit refund request' },
      { status: 500 }
    );
  }
}


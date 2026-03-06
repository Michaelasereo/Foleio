import { NextRequest, NextResponse } from 'next/server';
import { completeService } from '@/lib/actions/booking';
import { sendCompletionEmail } from '@/lib/actions/email';
import { sendBookingStatusUpdate } from '@/lib/email/send';
import { prisma } from '@foleio/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing booking ID' },
        { status: 400 }
      );
    }

    const result = await completeService(bookingId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Send completion email to customer
    await sendCompletionEmail(bookingId);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
        bookingDate: new Date(booking.bookingDate).toLocaleDateString(),
        status: 'completed',
        trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tracking/${booking.trackingToken}`,
      });
    }

    return NextResponse.json({
      success: true,
      booking: result.data,
      transactionId: result.transactionId,
    });
  } catch (error) {
    console.error('Error completing service:', error);
    return NextResponse.json(
      { error: 'Failed to complete service' },
      { status: 500 }
    );
  }
}


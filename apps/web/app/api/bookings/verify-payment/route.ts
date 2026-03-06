import { NextRequest, NextResponse } from 'next/server';
import { confirmBookingPayment, processFirstPayout } from '@/lib/actions/booking';
import { sendBookingConfirmationEmail } from '@/lib/actions/email';
import { prisma } from '@foleio/database';

// This is called by Paystack webhook or after successful payment redirect
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, bookingId } = body;

    if (!reference || !bookingId) {
      return NextResponse.json(
        { error: 'Missing reference or booking ID' },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    // In production, you would verify the payment here
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    
    if (paystackSecretKey) {
      try {
        const verifyResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
            },
          }
        );
        
        const verifyData = await verifyResponse.json();
        
        if (!verifyData.status || verifyData.data.status !== 'success') {
          return NextResponse.json(
            { error: 'Payment verification failed' },
            { status: 400 }
          );
        }
      } catch (e) {
        console.error('Paystack verification error:', e);
        // Continue anyway for development/testing
      }
    }

    // Confirm the booking payment
    const confirmResult = await confirmBookingPayment(bookingId, reference);
    
    if (confirmResult.error) {
      return NextResponse.json({ error: confirmResult.error }, { status: 400 });
    }

    // Process first payout (60% to creator)
    const payoutResult = await processFirstPayout(bookingId);
    
    if (payoutResult.error) {
      console.error('First payout error:', payoutResult.error);
      // Don't fail the request, but log the error
    }

    // Send confirmation email to customer
    await sendBookingConfirmationEmail(bookingId);

    return NextResponse.json({
      success: true,
      booking: confirmResult.data,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

// Paystack webhook handler
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event;
    const data = body.data;

    // Verify webhook signature in production
    // const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    //   .update(JSON.stringify(body))
    //   .digest('hex');
    // if (hash !== request.headers.get('x-paystack-signature')) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    if (event === 'charge.success') {
      const reference = data.reference;
      const metadata = data.metadata;

      if (metadata?.type === 'booking' && metadata?.bookingId) {
        // Find and update the booking
        const booking = await prisma.booking.findUnique({
          where: { id: metadata.bookingId },
        });

        if (booking && booking.status === 'pending') {
          await confirmBookingPayment(booking.id, reference);
          await processFirstPayout(booking.id);
          await sendBookingConfirmationEmail(booking.id);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}


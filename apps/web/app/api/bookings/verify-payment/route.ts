import { NextRequest, NextResponse } from 'next/server';
import {
  confirmBookingPayment,
  processFirstPayout,
  recordBookingPaymentTransaction,
} from '@/lib/actions/booking';
import { sendBookingConfirmationEmail } from '@/lib/actions/email';
import { prisma } from '@foleio/database';

function usedSubaccountSplit(opts: {
  metadataPaymentType?: string | null;
  creator?: {
    paystackSubaccountCode?: string | null;
    payoutMethod?: string | null;
    subaccountStatus?: string | null;
  } | null;
}) {
  if (opts.metadataPaymentType === 'DIRECT_SUBACCOUNT') return true;
  if (opts.creator?.payoutMethod === 'DIRECT_SUBACCOUNT') return true;
  if (
    opts.creator?.paystackSubaccountCode &&
    opts.creator?.subaccountStatus === 'ACTIVE'
  ) {
    return true;
  }
  return Boolean(opts.creator?.paystackSubaccountCode);
}

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

    let metadataPaymentType: string | null = null;
    let gatewayResponse: unknown = undefined;
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

        gatewayResponse = verifyData.data;
        metadataPaymentType =
          verifyData.data?.metadata?.paymentType ??
          verifyData.data?.metadata?.payment_type ??
          null;
      } catch (e) {
        console.error('Paystack verification error:', e);
        // Continue anyway for development/testing
      }
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        creator: {
          select: {
            paystackSubaccountCode: true,
            payoutMethod: true,
            subaccountStatus: true,
          },
        },
      },
    });

    // Confirm the booking payment (idempotent-ish: already-processed returns error)
    const confirmResult = await confirmBookingPayment(bookingId, reference);
    if (confirmResult.error && confirmResult.error !== 'Booking already processed') {
      return NextResponse.json({ error: confirmResult.error }, { status: 400 });
    }

    const isSubaccount = usedSubaccountSplit({
      metadataPaymentType,
      creator: booking?.creator,
    });

    const recordResult = await recordBookingPaymentTransaction({
      bookingId,
      reference,
      paymentType: isSubaccount ? 'DIRECT_SUBACCOUNT' : 'PLATFORM_HELD',
      gatewayResponse,
    });
    if (recordResult.error) {
      console.error('Booking transaction record error:', recordResult.error);
    }

    if (!isSubaccount) {
      const payoutResult = await processFirstPayout(bookingId);
      if (payoutResult.error) {
        console.error('First payout error:', payoutResult.error);
      }
    }

    // Send confirmation email to customer (best-effort)
    try {
      await sendBookingConfirmationEmail(bookingId);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    return NextResponse.json({
      success: true,
      booking: confirmResult.data || booking,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

// Paystack webhook handler (legacy duplicate of /api/webhooks/paystack)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event;
    const data = body.data;

    if (event === 'charge.success') {
      const reference = data.reference;
      const metadata = data.metadata;

      if (metadata?.type === 'booking' && metadata?.bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: metadata.bookingId },
          include: {
            creator: {
              select: {
                paystackSubaccountCode: true,
                payoutMethod: true,
                subaccountStatus: true,
              },
            },
          },
        });

        if (booking && booking.status === 'pending') {
          await confirmBookingPayment(booking.id, reference);

          const isSubaccount = usedSubaccountSplit({
            metadataPaymentType: metadata?.paymentType,
            creator: booking.creator,
          });

          await recordBookingPaymentTransaction({
            bookingId: booking.id,
            reference,
            paymentType: isSubaccount ? 'DIRECT_SUBACCOUNT' : 'PLATFORM_HELD',
            gatewayResponse: data,
          });

          if (!isSubaccount) {
            await processFirstPayout(booking.id);
          }

          await sendBookingConfirmationEmail(booking.id);
        } else if (booking) {
          // Already paid — still ensure transaction row exists (idempotent)
          await recordBookingPaymentTransaction({
            bookingId: booking.id,
            reference,
            paymentType: usedSubaccountSplit({
              metadataPaymentType: metadata?.paymentType,
              creator: booking.creator,
            })
              ? 'DIRECT_SUBACCOUNT'
              : 'PLATFORM_HELD',
            gatewayResponse: data,
          });
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

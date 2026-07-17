import { NextRequest, NextResponse } from 'next/server';
import {
  confirmBookingPayment,
  processFirstPayout,
  recordBookingPaymentTransaction,
} from '@/lib/actions/booking';
import { sendBookingConfirmationEmail } from '@/lib/actions/email';
import { prisma } from '@foleio/database';
import { serializeForClient } from '@/lib/utils';

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

async function finalizeFullyPaidBooking(opts: {
  bookingId: string;
  reference: string;
  metadataPaymentType: string | null;
  gatewayResponse: unknown;
  paymentKind?: 'initial' | 'balance' | 'full';
  creator: {
    paystackSubaccountCode?: string | null;
    payoutMethod?: string | null;
    subaccountStatus?: string | null;
  } | null;
}) {
  const isSubaccount = usedSubaccountSplit({
    metadataPaymentType: opts.metadataPaymentType,
    creator: opts.creator,
  });

  const recordResult = await recordBookingPaymentTransaction({
    bookingId: opts.bookingId,
    reference: opts.reference,
    paymentType: isSubaccount ? 'DIRECT_SUBACCOUNT' : 'PLATFORM_HELD',
    paymentKind: opts.paymentKind === 'balance' ? 'balance' : 'full',
    gatewayResponse: opts.gatewayResponse,
  });
  if (recordResult.error) {
    console.error('Booking transaction record error:', recordResult.error);
  }

  if (!isSubaccount) {
    const payoutResult = await processFirstPayout(opts.bookingId);
    if (payoutResult.error) {
      console.error('First payout error:', payoutResult.error);
    }
  }
}

// This is called by Paystack webhook or after successful payment redirect
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, bookingId, paymentKind: bodyKind } = body;

    if (!reference || !bookingId) {
      return NextResponse.json(
        { error: 'Missing reference or booking ID' },
        { status: 400 }
      );
    }

    let metadataPaymentType: string | null = null;
    let metadataPaymentKind: 'initial' | 'balance' | null = null;
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
        const kind =
          verifyData.data?.metadata?.paymentKind ??
          verifyData.data?.metadata?.payment_kind ??
          null;
        if (kind === 'balance' || kind === 'initial') {
          metadataPaymentKind = kind;
        }
      } catch (e) {
        console.error('Paystack verification error:', e);
      }
    }

    const paymentKind: 'initial' | 'balance' =
      bodyKind === 'balance' || metadataPaymentKind === 'balance'
        ? 'balance'
        : 'initial';

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

    const confirmResult = await confirmBookingPayment(
      bookingId,
      reference,
      paymentKind
    );
    if (
      confirmResult.error &&
      confirmResult.error !== 'Booking already processed'
    ) {
      return NextResponse.json({ error: confirmResult.error }, { status: 400 });
    }

    const completed =
      confirmResult.completedPayment === true ||
      (confirmResult.data &&
        ['paid', 'first_payout_done', 'service_day', 'completed'].includes(
          confirmResult.data.status
        ));

    if (completed) {
      await finalizeFullyPaidBooking({
        bookingId,
        reference,
        metadataPaymentType,
        gatewayResponse,
        paymentKind: paymentKind === 'balance' ? 'balance' : 'full',
        creator: booking?.creator ?? null,
      });
    } else if (confirmResult.data?.status === 'deposit_paid') {
      const isSubaccount = usedSubaccountSplit({
        metadataPaymentType,
        creator: booking?.creator ?? null,
      });
      const recordResult = await recordBookingPaymentTransaction({
        bookingId,
        reference,
        paymentType: isSubaccount ? 'DIRECT_SUBACCOUNT' : 'PLATFORM_HELD',
        paymentKind: 'initial',
        gatewayResponse,
      });
      if (recordResult.error) {
        console.error('Deposit transaction record error:', recordResult.error);
      }
    }

    try {
      await sendBookingConfirmationEmail(bookingId);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    return NextResponse.json({
      success: true,
      booking: serializeForClient(confirmResult.data || booking),
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

        const paymentKind =
          metadata?.paymentKind === 'balance' ? 'balance' : 'initial';

        if (
          booking &&
          (booking.status === 'pending' ||
            booking.status === 'deposit_paid' ||
            booking.status === 'balance_overdue')
        ) {
          const confirmResult = await confirmBookingPayment(
            booking.id,
            reference,
            paymentKind
          );

          if (confirmResult.completedPayment) {
            await finalizeFullyPaidBooking({
              bookingId: booking.id,
              reference,
              metadataPaymentType: metadata?.paymentType ?? null,
              gatewayResponse: data,
              paymentKind: paymentKind === 'balance' ? 'balance' : 'full',
              creator: booking.creator,
            });
          } else if (confirmResult.data?.status === 'deposit_paid') {
            await recordBookingPaymentTransaction({
              bookingId: booking.id,
              reference,
              paymentType: usedSubaccountSplit({
                metadataPaymentType: metadata?.paymentType,
                creator: booking.creator,
              })
                ? 'DIRECT_SUBACCOUNT'
                : 'PLATFORM_HELD',
              paymentKind: 'initial',
              gatewayResponse: data,
            });
          }

          await sendBookingConfirmationEmail(booking.id);
        } else if (booking) {
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

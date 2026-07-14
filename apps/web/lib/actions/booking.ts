'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import {
  computeDepositSplit,
  computePackageTotal,
  resolveSelectedAddons,
} from '@/lib/booking/deposit';
import { computePolicyRefundKobo } from '@/lib/booking/cancellation-policy';
import { feePercentForCreator } from '@/lib/billing/platform-fee';
import { dayBookingCapacity } from '@/lib/booking/day-capacity';

const createBookingSchema = z.object({
  creatorId: z.string().uuid(),
  priceListItemId: z.string().uuid(),
  customerEmail: z.string().email('Invalid email'),
  customerName: z.string().min(1, 'Name is required'),
  customerPhone: z.string().min(10, 'Phone number is required'),
  customerAddress: z.string().min(10, 'Address is required'),
  bookingDate: z.string().or(z.date()),
  notes: z.string().optional(),
  paymentPlan: z.enum(['full', 'deposit']).optional(),
  selectedAddonIds: z.array(z.string()).optional(),
});

type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Generate a unique tracking token
function generateTrackingToken(): string {
  return randomBytes(16).toString('hex');
}

// Create a new booking request with atomic availability checking
export async function createBookingRequest(data: CreateBookingInput) {
  console.log('📦 createBookingRequest called with:', JSON.stringify(data, null, 2));
  
  const validation = createBookingSchema.safeParse(data);
  if (!validation.success) {
    console.log('❌ Validation failed:', validation.error.errors);
    return { error: validation.error.errors[0].message };
  }

  try {
    // Always store calendar days as UTC midnight YYYY-MM-DD to match CreatorAvailability.
    const rawDate =
      typeof data.bookingDate === 'string'
        ? data.bookingDate.slice(0, 10)
        : new Date(data.bookingDate).toISOString().slice(0, 10);
    const dateOnly = new Date(`${rawDate}T00:00:00.000Z`);
    console.log('📅 Date parsing:', {
      input: data.bookingDate,
      dateOnly: dateOnly.toISOString(),
    });

    // Note: Interactive transactions don't work with Supabase connection pooler (PgBouncer)
    // Using sequential queries instead - this is acceptable for booking creation
    // as double-bookings are prevented by unique constraints and maxBookings checks
    
    // Verify the price list item exists and get the price
    const priceListItem = await prisma.priceListItem.findFirst({
      where: {
        id: data.priceListItemId,
        creatorId: data.creatorId,
        isActive: true,
      },
    });

    if (!priceListItem) {
      console.error('❌ Price list item not found. ID:', data.priceListItemId, 'Creator:', data.creatorId);
      return { error: 'Service not found or unavailable. Please refresh the page and try again.' };
    }

    // Check availability
    console.log('🔍 Looking for availability:', { creatorId: data.creatorId, date: dateOnly.toISOString() });
    
    const availability = await prisma.creatorAvailability.findUnique({
      where: {
        creatorId_date: {
          creatorId: data.creatorId,
          date: dateOnly,
        },
      },
    });

    console.log('📅 Availability found:', availability);

    if (!availability) {
      // Try to find any availability for this creator to debug
      const anyAvailability = await prisma.creatorAvailability.findFirst({
        where: { creatorId: data.creatorId },
      });
      console.error('❌ No availability record found for date:', dateOnly.toISOString());
      console.log('📋 Sample availability from this creator:', anyAvailability);
      return { error: 'This date is not available for booking. Please select a different date.' };
    }

    if (!availability.isAvailable) {
      return { error: 'Selected date is not available' };
    }

    // One booking per available day (product rule).
    const capacity = dayBookingCapacity(availability.maxBookings);

    const existingBookings = await prisma.booking.count({
      where: {
        creatorId: data.creatorId,
        bookingDate: dateOnly,
        status: {
          notIn: ['cancelled', 'canceled', 'refunded'],
        },
      },
    });

    if (existingBookings >= capacity) {
      return { error: 'This date is fully booked' };
    }

    const selectedAddons = resolveSelectedAddons(
      priceListItem.addons,
      data.selectedAddonIds
    );
    const totalAmount = computePackageTotal(priceListItem.price, selectedAddons);

    const wantsDeposit = data.paymentPlan === 'deposit';
    const depositEnabled = Boolean(priceListItem.depositType);
    if (wantsDeposit && !depositEnabled) {
      return { error: 'This service does not offer deposit payment' };
    }
    if (
      wantsDeposit &&
      depositEnabled &&
      priceListItem.allowPayInFull === false &&
      data.paymentPlan === 'full'
    ) {
      // unreachable pairing — kept for clarity
    }
    if (
      data.paymentPlan === 'full' &&
      depositEnabled &&
      priceListItem.allowPayInFull === false
    ) {
      return { error: 'This service requires a deposit; pay in full is disabled' };
    }

    const split = computeDepositSplit({
      totalAmount,
      depositType: priceListItem.depositType,
      depositValue: priceListItem.depositValue,
      paymentPlan:
        wantsDeposit && depositEnabled
          ? 'deposit'
          : 'full',
    });

    const firstPayoutAmount = Math.floor(totalAmount * 0.6);
    const secondPayoutAmount = totalAmount - firstPayoutAmount;
    const trackingToken = generateTrackingToken();

    const booking = await prisma.booking.create({
      data: {
        creatorId: data.creatorId,
        priceListItemId: data.priceListItemId,
        customerEmail: data.customerEmail.toLowerCase(),
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        bookingDate: dateOnly,
        notes: data.notes || null,
        totalAmount,
        firstPayoutAmount,
        secondPayoutAmount,
        paymentPlan: split.paymentPlan,
        depositAmount: split.depositAmount,
        balanceAmount: split.balanceAmount,
        amountPaid: 0,
        selectedAddons,
        trackingToken,
        status: 'pending',
      },
      include: {
        priceListItem: true,
        creator: true,
      },
    });

    // Close the day on the public calendar once capacity is reached.
    // Pending checkouts count so the slot can't stay selectable.
    if (existingBookings + 1 >= capacity) {
      await prisma.creatorAvailability.update({
        where: {
          creatorId_date: {
            creatorId: data.creatorId,
            date: dateOnly,
          },
        },
        data: { isAvailable: false },
      });
    }

    const username = booking.creator?.username;
    revalidatePath('/bookings');
    if (username) {
      revalidatePath(`/creator/${username}`);
    }

    return {
      success: true,
      data: booking,
      trackingToken,
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : undefined);

    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return { error: 'This booking conflicts with an existing reservation' };
      }
      if (error.message.includes('Foreign key constraint failed')) {
        return { error: 'Invalid service or date selection' };
      }
      if (error.message.includes('NOT NULL constraint')) {
        return { error: 'Required information is missing' };
      }
      if (error.message === 'Service not found or unavailable' ||
          error.message === 'Selected date is not available' ||
          error.message === 'This date is fully booked') {
        return { error: error.message };
      }
      console.error('Specific booking creation error:', error.message);
    }

    return { error: 'Failed to create booking. Please try again.' };
  }
}

/**
 * Confirm a Paystack charge against a booking.
 * paymentKind: initial (pending) | balance (deposit_paid)
 */
export async function confirmBookingPayment(
  bookingId: string,
  paymentReference: string,
  paymentKind: 'initial' | 'balance' = 'initial'
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        priceListItem: true,
        creator: true,
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    // Idempotent: already fully paid / past paid
    if (
      ['paid', 'first_payout_done', 'service_day', 'completed'].includes(
        booking.status
      )
    ) {
      return { error: 'Booking already processed', data: booking };
    }

    if (paymentKind === 'balance') {
      if (booking.status !== 'deposit_paid') {
        return { error: 'Booking is not awaiting balance payment' };
      }
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'paid',
          balanceReference: paymentReference,
          paymentReference,
          amountPaid: booking.totalAmount,
        },
        include: {
          priceListItem: true,
          creator: true,
        },
      });
      revalidatePath('/bookings');
      if (updatedBooking.creator?.username) {
        revalidatePath(`/creator/${updatedBooking.creator.username}`);
      }
      return { success: true, data: updatedBooking, completedPayment: true as const };
    }

    if (booking.status !== 'pending') {
      return { error: 'Booking already processed' };
    }

    if (booking.paymentPlan === 'deposit' && booking.balanceAmount > 0) {
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'deposit_paid',
          depositReference: paymentReference,
          paymentReference,
          amountPaid: booking.depositAmount,
        },
        include: {
          priceListItem: true,
          creator: true,
        },
      });
      revalidatePath('/bookings');
      if (updatedBooking.creator?.username) {
        revalidatePath(`/creator/${updatedBooking.creator.username}`);
      }
      return {
        success: true,
        data: updatedBooking,
        completedPayment: false as const,
      };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'paid',
        paymentReference,
        depositReference: paymentReference,
        amountPaid: booking.totalAmount,
      },
      include: {
        priceListItem: true,
        creator: true,
      },
    });

    revalidatePath('/bookings');
    if (updatedBooking.creator?.username) {
      revalidatePath(`/creator/${updatedBooking.creator.username}`);
    }

    return { success: true, data: updatedBooking, completedPayment: true as const };
  } catch (error) {
    console.error('Error confirming booking payment:', error);
    return { error: 'Failed to confirm payment' };
  }
}

/**
 * Idempotent earnings ledger row for a paid booking.
 * Subaccount path: Paystack already split funds — mark released, no Foleio balance credit.
 */
export async function recordBookingPaymentTransaction(opts: {
  bookingId: string;
  reference: string;
  paymentType?: 'DIRECT_SUBACCOUNT' | 'PLATFORM_HELD';
  gatewayResponse?: unknown;
}) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: opts.bookingId },
      include: {
        priceListItem: { select: { name: true } },
        creator: {
          select: {
            id: true,
            paystackSubaccountCode: true,
            payoutMethod: true,
            subaccountStatus: true,
            platformPlan: true,
            platformSubscriptionActive: true,
          },
        },
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    const isSubaccount =
      opts.paymentType === 'DIRECT_SUBACCOUNT' ||
      booking.creator.payoutMethod === 'DIRECT_SUBACCOUNT' ||
      Boolean(booking.creator.paystackSubaccountCode);

    const paymentType = isSubaccount ? 'DIRECT_SUBACCOUNT' : 'PLATFORM_HELD';
    const amount = Number(booking.totalAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: 'Invalid booking amount' };
    }

    const feePct = feePercentForCreator(booking.creator);
    const platformFee = Math.round(amount * (feePct / 100));
    const creatorEarnings = Math.max(0, amount - platformFee);

    const metadata = {
      type: 'booking',
      bookingId: booking.id,
      service: booking.priceListItem?.name || 'Booking',
      paymentType,
      platformFeePercent: feePct,
    };

    const transaction = await prisma.transaction.upsert({
      where: { reference: opts.reference },
      create: {
        reference: opts.reference,
        creatorId: booking.creatorId,
        amount: BigInt(Math.round(amount)),
        creatorEarnings: BigInt(Math.round(creatorEarnings)),
        platformFee: BigInt(Math.round(platformFee)),
        feeAmount: BigInt(Math.round(platformFee)),
        netAmount: BigInt(Math.round(creatorEarnings)),
        status: 'SUCCESS',
        paymentType,
        type: 'booking',
        fundsReleased: isSubaccount,
        fundsReleasedAt: isSubaccount ? new Date() : null,
        gateway: 'paystack',
        gatewayResponse: (opts.gatewayResponse as object) || {},
        metadata,
      },
      update: {
        status: 'SUCCESS',
        creatorEarnings: BigInt(Math.round(creatorEarnings)),
        platformFee: BigInt(Math.round(platformFee)),
        feeAmount: BigInt(Math.round(platformFee)),
        netAmount: BigInt(Math.round(creatorEarnings)),
        paymentType,
        fundsReleased: isSubaccount ? true : undefined,
        fundsReleasedAt: isSubaccount ? new Date() : undefined,
        gatewayResponse: (opts.gatewayResponse as object) || undefined,
        metadata,
      },
    });

    // Subaccount: advance past escrow "first payout" without crediting Foleio ledger
    if (isSubaccount && booking.status === 'paid') {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'first_payout_done',
          firstPayoutTransactionId: transaction.id,
        },
      });
    }

    return { success: true, data: transaction, paymentType, creatorEarnings, platformFee };
  } catch (error) {
    console.error('Error recording booking transaction:', error);
    return { error: 'Failed to record booking earnings' };
  }
}

// Process first payout (60%) to creator - called after payment confirmation
export async function processFirstPayout(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        creator: true,
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    if (booking.status !== 'paid') {
      return { error: 'Booking payment not confirmed' };
    }

    // TODO: Integrate with Paystack transfer API to send money to creator
    // For now, we'll just update the status
    const transactionId = `first_payout_${bookingId}_${Date.now()}`;

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'first_payout_done',
        firstPayoutTransactionId: transactionId,
      },
    });

    // Update creator balance
    await prisma.creator.update({
      where: { id: booking.creatorId },
      data: {
        currentBalance: {
          increment: booking.firstPayoutAmount,
        },
        totalEarnings: {
          increment: booking.firstPayoutAmount,
        },
      },
    });

    return { success: true, data: updatedBooking, transactionId };
  } catch (error) {
    console.error('Error processing first payout:', error);
    return { error: 'Failed to process first payout' };
  }
}

// Mark booking as service day
export async function markServiceDay(bookingId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        creatorId: creator.id,
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    if (booking.status !== 'first_payout_done') {
      return { error: 'Invalid booking status' };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'service_day',
      },
    });

    revalidatePath('/bookings');
    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error('Error marking service day:', error);
    return { error: 'Failed to mark service day' };
  }
}

// Complete service (creator marks as done, triggers second payout)
export async function completeService(bookingId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        creatorId: creator.id,
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    if (!['first_payout_done', 'service_day'].includes(booking.status)) {
      return { error: 'Invalid booking status for completion' };
    }

    // TODO: Integrate with Paystack transfer API to send second payout
    const transactionId = `second_payout_${bookingId}_${Date.now()}`;

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'completed',
        secondPayoutTransactionId: transactionId,
      },
    });

    // Update creator balance with second payout
    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        currentBalance: {
          increment: booking.secondPayoutAmount,
        },
        totalEarnings: {
          increment: booking.secondPayoutAmount,
        },
      },
    });

    revalidatePath('/bookings');
    return { success: true, data: updatedBooking, transactionId };
  } catch (error) {
    console.error('Error completing service:', error);
    return { error: 'Failed to complete service' };
  }
}

// Request refund (customer initiates)
export async function requestRefund(trackingToken: string, email: string, reason: string) {
  try {
    const booking = await prisma.booking.findFirst({
      where: { 
        trackingToken,
        customerEmail: email.toLowerCase(),
      },
    });

    if (!booking) {
      return { error: 'Booking not found or email does not match' };
    }

    if (['completed', 'refunded', 'cancelled'].includes(booking.status)) {
      return { error: 'Cannot request refund for this booking' };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'disputed',
        disputeReason: reason,
        disputeStatus: 'pending',
      },
    });

    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error('Error requesting refund:', error);
    return { error: 'Failed to request refund' };
  }
}

// Process refund (admin/creator approves)
export async function processRefund(bookingId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        creatorId: creator.id,
        status: 'disputed',
      },
    });

    if (!booking) {
      return { error: 'Disputed booking not found' };
    }

    const policyCalc = computePolicyRefundKobo({
      amountPaid: booking.amountPaid || booking.totalAmount,
      bookingDate: booking.bookingDate,
      policy: creator.cancellationPolicy,
    });

    // TODO: Integrate with Paystack to process actual refund of policyCalc.refundAmount
    const refundTransactionId = `refund_${bookingId}_${Date.now()}`;

    // Calculate amount to deduct from creator (if first payout was done)
    let deductAmount = 0;
    if (booking.firstPayoutTransactionId) {
      deductAmount = Math.min(
        booking.firstPayoutAmount,
        policyCalc.refundAmount || booking.firstPayoutAmount
      );
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'refunded',
        disputeStatus: 'approved',
        refundTransactionId,
      },
    });

    // Deduct from creator balance if first payout was done
    if (deductAmount > 0) {
      await prisma.creator.update({
        where: { id: creator.id },
        data: {
          currentBalance: {
            decrement: deductAmount,
          },
          totalEarnings: {
            decrement: deductAmount,
          },
        },
      });
    }

    revalidatePath('/bookings');
    return {
      success: true,
      data: updatedBooking,
      refundTransactionId,
      refundAmount: policyCalc.refundAmount,
      refundPercent: policyCalc.refundPercent,
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return { error: 'Failed to process refund' };
  }
}

// Reject refund request
export async function rejectRefund(bookingId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        creatorId: creator.id,
        status: 'disputed',
      },
    });

    if (!booking) {
      return { error: 'Disputed booking not found' };
    }

    // Revert to previous status based on payout state
    const previousStatus = booking.firstPayoutTransactionId 
      ? 'first_payout_done' 
      : 'paid';

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: previousStatus,
        disputeStatus: 'rejected',
      },
    });

    revalidatePath('/bookings');
    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error('Error rejecting refund:', error);
    return { error: 'Failed to reject refund' };
  }
}

// Cancel booking (before payment)
export async function cancelBooking(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    if (booking.status !== 'pending') {
      return { error: 'Can only cancel pending bookings' };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
      },
    });

    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { error: 'Failed to cancel booking' };
  }
}

// Get bookings for creator dashboard
export async function getCreatorBookings(status?: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  try {
    const whereClause: any = { creatorId: creator.id };
    
    if (status) {
      whereClause.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        priceListItem: true,
      },
      orderBy: { bookingDate: 'desc' },
    });

    return { success: true, data: bookings };
  } catch (error) {
    console.error('Error getting bookings:', error);
    return { error: 'Failed to get bookings' };
  }
}

// Get upcoming bookings for creator
export async function getUpcomingBookings() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = await prisma.booking.findMany({
      where: {
        creatorId: creator.id,
        bookingDate: {
          gte: today,
        },
        status: {
          in: ['paid', 'first_payout_done', 'service_day'],
        },
      },
      include: {
        priceListItem: true,
      },
      orderBy: { bookingDate: 'asc' },
    });

    return { success: true, data: bookings };
  } catch (error) {
    console.error('Error getting upcoming bookings:', error);
    return { error: 'Failed to get upcoming bookings' };
  }
}

// Get booking by ID (for creator)
export async function getBookingById(bookingId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        creatorId: creator.id,
      },
      include: {
        priceListItem: true,
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    return { success: true, data: booking };
  } catch (error) {
    console.error('Error getting booking:', error);
    return { error: 'Failed to get booking' };
  }
}


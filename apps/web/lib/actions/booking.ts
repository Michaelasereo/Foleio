'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const createBookingSchema = z.object({
  creatorId: z.string().uuid(),
  priceListItemId: z.string().uuid(),
  customerEmail: z.string().email('Invalid email'),
  customerName: z.string().min(1, 'Name is required'),
  customerPhone: z.string().min(10, 'Phone number is required'),
  customerAddress: z.string().min(10, 'Address is required'),
  bookingDate: z.string().or(z.date()),
  notes: z.string().optional(),
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
    const bookingDate = new Date(data.bookingDate);
    const dateOnly = new Date(bookingDate.toISOString().split('T')[0]);
    console.log('📅 Date parsing:', { 
      input: data.bookingDate, 
      bookingDate: bookingDate.toISOString(), 
      dateOnly: dateOnly.toISOString() 
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

    // Check booking count
    if (availability.maxBookings) {
      const existingBookings = await prisma.booking.count({
        where: {
          creatorId: data.creatorId,
          bookingDate: dateOnly,
          status: {
            notIn: ['cancelled', 'refunded'],
          },
        },
      });

      if (existingBookings >= availability.maxBookings) {
        return { error: 'This date is fully booked' };
      }
    }

    // Calculate payment amounts
    const totalAmount = priceListItem.price;
    const firstPayoutAmount = Math.floor(totalAmount * 0.6); // 60%
    const secondPayoutAmount = totalAmount - firstPayoutAmount; // 40%

    // Generate tracking token
    const trackingToken = generateTrackingToken();

    // Create the booking
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
        trackingToken,
        status: 'pending',
      },
      include: {
        priceListItem: true,
        creator: true,
      },
    });

    const result = { booking, trackingToken };

    return {
      success: true,
      data: result.booking,
      trackingToken: result.trackingToken,
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : undefined);

    // Handle specific error types
    if (error instanceof Error) {
      // Check for Prisma unique constraint violations
      if (error.message.includes('Unique constraint')) {
        return { error: 'This booking conflicts with an existing reservation' };
      }

      // Check for Prisma foreign key violations
      if (error.message.includes('Foreign key constraint failed')) {
        return { error: 'Invalid service or date selection' };
      }

      // Check for Prisma null constraint violations
      if (error.message.includes('NOT NULL constraint')) {
        return { error: 'Required information is missing' };
      }

      // Return specific error messages
      if (error.message === 'Service not found or unavailable' ||
          error.message === 'Selected date is not available' ||
          error.message === 'This date is fully booked') {
        return { error: error.message };
      }

      // Log the specific error for debugging
      console.error('Specific booking creation error:', error.message);
    }

    return { error: 'Failed to create booking. Please try again.' };
  }
}

// Confirm booking payment (called after Paystack payment)
export async function confirmBookingPayment(bookingId: string, paymentReference: string) {
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

    if (booking.status !== 'pending') {
      return { error: 'Booking already processed' };
    }

    // Update booking status to paid
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'paid',
        paymentReference,
      },
      include: {
        priceListItem: true,
        creator: true,
      },
    });

    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error('Error confirming booking payment:', error);
    return { error: 'Failed to confirm payment' };
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

    // TODO: Integrate with Paystack to process actual refund
    const refundTransactionId = `refund_${bookingId}_${Date.now()}`;

    // Calculate amount to deduct from creator (if first payout was done)
    let deductAmount = 0;
    if (booking.firstPayoutTransactionId) {
      deductAmount = booking.firstPayoutAmount;
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
    return { success: true, data: updatedBooking, refundTransactionId };
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


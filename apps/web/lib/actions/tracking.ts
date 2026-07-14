'use server';

import { prisma } from '@foleio/database';

// Verify email access for tracking page
export async function verifyTrackingAccess(trackingToken: string, email: string) {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        trackingToken,
        customerEmail: email.toLowerCase(),
      },
      include: {
        priceListItem: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!booking) {
      return { error: 'Invalid tracking code or email' };
    }

    return { success: true, verified: true };
  } catch (error) {
    console.error('Error verifying tracking access:', error);
    return { error: 'Failed to verify access' };
  }
}

// Get booking by tracking token (after email verification)
export async function getBookingByToken(trackingToken: string, email: string) {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        trackingToken,
        customerEmail: email.toLowerCase(),
      },
      include: {
        priceListItem: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            category: true,
          },
        },
      },
    });

    if (!booking) {
      return { error: 'Booking not found or email does not match' };
    }

    // Calculate progress steps
    const progress = getBookingProgress(booking.status);

    return { 
      success: true, 
      data: {
        ...booking,
        progress,
      },
    };
  } catch (error) {
    console.error('Error getting booking by token:', error);
    return { error: 'Failed to get booking' };
  }
}

// Get booking by token only (for public page before email verification)
export async function getBookingPreview(trackingToken: string) {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        trackingToken,
      },
      select: {
        id: true,
        status: true,
        bookingDate: true,
        creator: {
          select: {
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
        priceListItem: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    return { success: true, data: booking };
  } catch (error) {
    console.error('Error getting booking preview:', error);
    return { error: 'Failed to get booking preview' };
  }
}

// Helper function to calculate booking progress
function getBookingProgress(status: string): {
  step: number;
  steps: { name: string; status: 'completed' | 'current' | 'upcoming'; description: string }[];
} {
  const steps = [
    { 
      name: 'Deposit / payment',
      statuses: ['deposit_paid', 'paid', 'first_payout_done'],
      description: 'Payment received for your booking',
    },
    { 
      name: 'Service Day',
      statuses: ['service_day'],
      description: 'The service day has arrived',
    },
    { 
      name: 'Job Completed',
      statuses: ['completed'],
      description: 'The service has been completed successfully',
    },
  ];

  let currentStep = 0;
  
  // Handle special statuses
  if (status === 'pending') {
    return {
      step: 0,
      steps: steps.map((s, i) => ({
        name: s.name,
        status: 'upcoming' as const,
        description: i === 0 ? 'Awaiting payment confirmation' : s.description,
      })),
    };
  }

  if (status === 'disputed') {
    return {
      step: -1,
      steps: steps.map((s) => ({
        name: s.name,
        status: 'upcoming' as const,
        description: s.description,
      })),
    };
  }

  if (status === 'refunded' || status === 'cancelled') {
    return {
      step: -1,
      steps: steps.map((s) => ({
        name: s.name,
        status: 'upcoming' as const,
        description: s.description,
      })),
    };
  }

  // Determine current step based on status
  if (status === 'deposit_paid') {
    currentStep = 1;
    return {
      step: 1,
      steps: [
        {
          name: 'Deposit paid',
          status: 'completed' as const,
          description: 'Your deposit is paid and the date is held',
        },
        {
          name: 'Balance due',
          status: 'current' as const,
          description: 'Pay the remaining balance to complete payment',
        },
        {
          name: 'Service day',
          status: 'upcoming' as const,
          description: 'The service day has arrived',
        },
      ],
    };
  }

  if (['paid', 'first_payout_done'].includes(status)) {
    currentStep = 1;
  } else if (status === 'service_day') {
    currentStep = 2;
  } else if (status === 'completed') {
    currentStep = 3;
  }

  return {
    step: currentStep,
    steps: steps.map((s, i) => ({
      name: s.name,
      status: (i + 1 < currentStep ? 'completed' : i + 1 === currentStep ? 'current' : 'upcoming') as 'completed' | 'current' | 'upcoming',
      description: s.description,
    })),
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { createBookingRequest } from '@/lib/actions/booking';
import { prisma } from '@foleio/database';
import { getPlanLimits } from '@/lib/utils/plan-limits';
import { z } from 'zod';

const createBookingSchema = z.object({
  creatorId: z.string().uuid(),
  priceListItemId: z.string().uuid(),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(10, 'Phone number is required'),
  customerAddress: z.string().min(10, 'Address is required'),
  bookingDate: z.string(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = createBookingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { id: validation.data.creatorId },
      select: { id: true, platformPlan: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const limits = getPlanLimits(creator.platformPlan ?? null);
    if (Number.isFinite(limits.maxBookingsPerMonth)) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyBookings = await prisma.booking.count({
        where: {
          creatorId: creator.id,
          createdAt: { gte: startOfMonth },
          status: { notIn: ['cancelled', 'canceled'] },
        },
      });

      if (monthlyBookings >= limits.maxBookingsPerMonth) {
        return NextResponse.json(
          { error: 'Plan limit reached', limitType: 'maxBookingsPerMonth' },
          { status: 403 }
        );
      }
    }

    const result = await createBookingRequest(validation.data);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return booking details for payment initialization
    return NextResponse.json({
      success: true,
      booking: result.data,
      trackingToken: result.trackingToken,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to create booking',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    );
  }
}


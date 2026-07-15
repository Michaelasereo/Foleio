import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { BOOKINGS_PER_DAY } from '@/lib/booking/day-capacity';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: {
      creator: { userId: string };
      date?: { gte?: Date; lte?: Date };
    } = {
      creator: { userId: user.id },
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(`${startDate.slice(0, 10)}T00:00:00.000Z`),
        lte: new Date(`${endDate.slice(0, 10)}T00:00:00.000Z`),
      };
    }

    const availability = await prisma.creatorAvailability.findMany({
      where,
      include: {
        slots: {
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { date: 'asc' },
    });

    const serializedAvailability = availability.map((item) => {
      const customSlots = item.slots
        .filter((s) => s.source === 'custom')
        .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
      const disabledGeneratedStarts = item.slots
        .filter((s) => s.source === 'generated' && !s.isActive)
        .map((s) => s.startTime);

      return {
        id: item.id,
        date: item.date.toISOString().split('T')[0],
        isAvailable: item.isAvailable,
        maxBookings: item.maxBookings,
        mode: item.mode === 'hours' ? 'hours' : 'full_day',
        startTime: item.windowStart,
        endTime: item.windowEnd,
        slotIntervalMinutes:
          item.slotIntervalMinutes === 90 ? 90 : 60,
        customSlots,
        disabledGeneratedStarts,
        slots: item.slots.map((s) => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          source: s.source,
          isActive: s.isActive,
        })),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ availability: serializedAvailability });
  } catch (error: unknown) {
    console.error('Availability fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch availability',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { date, isAvailable } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const dayKey =
      typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)
        ? date.slice(0, 10)
        : new Date(date).toISOString().slice(0, 10);
    const availabilityDate = new Date(`${dayKey}T00:00:00.000Z`);
    const capacity = isAvailable ? BOOKINGS_PER_DAY : null;

    const record = await prisma.creatorAvailability.upsert({
      where: {
        creatorId_date: {
          creatorId: creator.id,
          date: availabilityDate,
        },
      },
      update: {
        isAvailable,
        maxBookings: capacity,
        mode: 'full_day',
        windowStart: null,
        windowEnd: null,
      },
      create: {
        creatorId: creator.id,
        date: availabilityDate,
        isAvailable,
        maxBookings: capacity,
        mode: 'full_day',
      },
    });

    if (!isAvailable) {
      await prisma.availabilitySlot.deleteMany({
        where: { availabilityId: record.id },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully',
      availability: {
        id: record.id,
        date: record.date.toISOString().split('T')[0],
        isAvailable: record.isAvailable,
        maxBookings: record.maxBookings,
        mode: record.mode,
      },
    });
  } catch (error: unknown) {
    console.error('Availability creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update availability',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

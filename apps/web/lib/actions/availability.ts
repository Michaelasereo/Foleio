'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { BOOKINGS_PER_DAY, dayBookingCapacity } from '@/lib/booking/day-capacity';
import { isSlotOpen } from '@/lib/booking/slots';

// Set available dates for a creator
export async function setAvailabilityDates(dates: Date[]) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

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
    const results = await Promise.all(
      dates.map(async (date) => {
        return prisma.creatorAvailability.upsert({
          where: {
            creatorId_date: {
              creatorId: creator.id,
              date: new Date(date.toISOString().split('T')[0]),
            },
          },
          update: {
            isAvailable: true,
            maxBookings: BOOKINGS_PER_DAY,
            mode: 'full_day',
          },
          create: {
            creatorId: creator.id,
            date: new Date(date.toISOString().split('T')[0]),
            isAvailable: true,
            maxBookings: BOOKINGS_PER_DAY,
            mode: 'full_day',
          },
        });
      })
    );

    revalidatePath('/settings');
    revalidatePath('/bookings');
    revalidatePath(`/creator/${creator.username}`);
    return { success: true, data: results };
  } catch (error) {
    console.error('Error setting availability:', error);
    return { error: 'Failed to set availability' };
  }
}

// Add a single available date
export async function addAvailabilityDate(date: Date, _maxBookings?: number) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

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
    const availability = await prisma.creatorAvailability.upsert({
      where: {
        creatorId_date: {
          creatorId: creator.id,
          date: new Date(date.toISOString().split('T')[0]),
        },
      },
      update: {
        isAvailable: true,
        maxBookings: BOOKINGS_PER_DAY,
        mode: 'full_day',
      },
      create: {
        creatorId: creator.id,
        date: new Date(date.toISOString().split('T')[0]),
        isAvailable: true,
        maxBookings: BOOKINGS_PER_DAY,
        mode: 'full_day',
      },
    });

    revalidatePath('/settings');
    revalidatePath('/bookings');
    revalidatePath(`/creator/${creator.username}`);
    return { success: true, data: availability };
  } catch (error) {
    console.error('Error adding availability:', error);
    return { error: 'Failed to add availability date' };
  }
}

// Remove an available date
export async function removeAvailabilityDate(date: Date) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

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
    await prisma.creatorAvailability.delete({
      where: {
        creatorId_date: {
          creatorId: creator.id,
          date: new Date(date.toISOString().split('T')[0]),
        },
      },
    });

    revalidatePath('/settings');
    revalidatePath('/bookings');
    revalidatePath(`/creator/${creator.username}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing availability:', error);
    return { error: 'Failed to remove availability date' };
  }
}

// Get availability dates for a creator
export async function getAvailabilityDates(
  creatorId: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const whereClause: {
      creatorId: string;
      isAvailable: boolean;
      date?: { gte?: Date; lte?: Date };
    } = {
      creatorId,
      isAvailable: true,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(`${startDate.toISOString().slice(0, 10)}T00:00:00.000Z`),
        lte: new Date(`${endDate.toISOString().slice(0, 10)}T00:00:00.000Z`),
      };
    } else if (startDate) {
      whereClause.date = {
        gte: new Date(`${startDate.toISOString().slice(0, 10)}T00:00:00.000Z`),
      };
    }

    const availability = await prisma.creatorAvailability.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    return { success: true, data: availability };
  } catch (error) {
    console.error('Error getting availability:', error);
    return { error: 'Failed to get availability' };
  }
}

export type PublicAvailabilitySlot = {
  startTime: string;
  endTime: string;
  isBooked: boolean;
};

export type PublicAvailabilityDay = {
  id: string;
  creatorId: string;
  date: Date;
  isAvailable: boolean;
  maxBookings: number | null;
  mode: 'full_day' | 'hours';
  bookingCount: number;
  isFullyBooked: boolean;
  slots?: PublicAvailabilitySlot[];
};

// Get availability with booking counts for a creator (public)
export async function getAvailabilityWithBookings(
  creatorId: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const whereClause: {
      creatorId: string;
      isAvailable: boolean;
      date?: { gte?: Date; lte?: Date };
    } = {
      creatorId,
      isAvailable: true,
    };

    const rangeStart = startDate
      ? new Date(`${startDate.toISOString().slice(0, 10)}T00:00:00.000Z`)
      : undefined;
    const rangeEnd = endDate
      ? new Date(`${endDate.toISOString().slice(0, 10)}T00:00:00.000Z`)
      : undefined;

    if (rangeStart && rangeEnd) {
      whereClause.date = { gte: rangeStart, lte: rangeEnd };
    } else if (rangeStart) {
      whereClause.date = { gte: rangeStart };
    }

    const availability = await prisma.creatorAvailability.findMany({
      where: whereClause,
      include: {
        slots: {
          where: { isActive: true },
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { date: 'asc' },
    });

    if (availability.length === 0) {
      return { success: true, data: [] as PublicAvailabilityDay[] };
    }

    const bookingDateFilter =
      rangeStart && rangeEnd
        ? { gte: rangeStart, lte: rangeEnd }
        : rangeStart
          ? { gte: rangeStart }
          : {
              gte: availability[0].date,
              lte: availability[availability.length - 1].date,
            };

    const bookings = await prisma.booking.findMany({
      where: {
        creatorId,
        bookingDate: bookingDateFilter,
        status: {
          notIn: ['cancelled', 'canceled', 'refunded'],
        },
      },
      select: {
        bookingDate: true,
        startTime: true,
        endTime: true,
      },
    });

    const bookingsByDate = new Map<
      string,
      Array<{ startTime: string | null; endTime: string | null }>
    >();
    for (const booking of bookings) {
      const key = booking.bookingDate.toISOString().slice(0, 10);
      const list = bookingsByDate.get(key) || [];
      list.push({ startTime: booking.startTime, endTime: booking.endTime });
      bookingsByDate.set(key, list);
    }

    const availabilityWithCounts: PublicAvailabilityDay[] = availability.map((avail) => {
      const key = avail.date.toISOString().slice(0, 10);
      const dayBookings = bookingsByDate.get(key) || [];
      const mode = avail.mode === 'hours' ? 'hours' : 'full_day';

      if (mode === 'hours') {
        const slots: PublicAvailabilitySlot[] = avail.slots.map((slot) => {
          const booked = !isSlotOpen(slot, dayBookings);
          return {
            startTime: slot.startTime,
            endTime: slot.endTime,
            isBooked: booked,
          };
        });
        const openSlots = slots.filter((s) => !s.isBooked);
        return {
          id: avail.id,
          creatorId: avail.creatorId,
          date: avail.date,
          isAvailable: avail.isAvailable,
          maxBookings: null,
          mode,
          bookingCount: dayBookings.length,
          isFullyBooked: openSlots.length === 0,
          slots: openSlots,
        };
      }

      const capacity = dayBookingCapacity(avail.maxBookings);
      const bookingCount = dayBookings.length;
      return {
        id: avail.id,
        creatorId: avail.creatorId,
        date: avail.date,
        isAvailable: avail.isAvailable,
        maxBookings: capacity,
        mode: 'full_day' as const,
        bookingCount,
        isFullyBooked: bookingCount >= capacity,
      };
    });

    const openDates = availabilityWithCounts.filter((avail) => !avail.isFullyBooked);

    return { success: true, data: openDates };
  } catch (error) {
    console.error('Error getting availability with bookings:', error);
    return { error: 'Failed to get availability' };
  }
}

// Update max bookings for a date (forced to one slot / day for full-day)
export async function updateAvailabilityMaxBookings(date: Date, _maxBookings: number | null) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

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
    const availability = await prisma.creatorAvailability.update({
      where: {
        creatorId_date: {
          creatorId: creator.id,
          date: new Date(date.toISOString().split('T')[0]),
        },
      },
      data: {
        maxBookings: BOOKINGS_PER_DAY,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/bookings');
    return { success: true, data: availability };
  } catch (error) {
    console.error('Error updating max bookings:', error);
    return { error: 'Failed to update max bookings' };
  }
}

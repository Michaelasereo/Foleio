'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { BOOKINGS_PER_DAY, dayBookingCapacity } from '@/lib/booking/day-capacity';

// Set available dates for a creator
export async function setAvailabilityDates(dates: Date[]) {
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
    // Create availability records for each date
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
          },
          create: {
            creatorId: creator.id,
            date: new Date(date.toISOString().split('T')[0]),
            isAvailable: true,
            maxBookings: BOOKINGS_PER_DAY,
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
      },
      create: {
        creatorId: creator.id,
        date: new Date(date.toISOString().split('T')[0]),
        isAvailable: true,
        maxBookings: BOOKINGS_PER_DAY,
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
    const whereClause: any = {
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

    // Two sequential queries only — never fan out under connection_limit=1.
    const availability = await prisma.creatorAvailability.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    if (availability.length === 0) {
      return { success: true, data: [] };
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

    const bookingGroups = await prisma.booking.groupBy({
      by: ['bookingDate'],
      where: {
        creatorId,
        bookingDate: bookingDateFilter,
        status: {
          notIn: ['cancelled', 'canceled', 'refunded'],
        },
      },
      _count: { _all: true },
    });

    const bookingCountByDate = new Map<string, number>();
    for (const group of bookingGroups) {
      const key = group.bookingDate.toISOString().slice(0, 10);
      bookingCountByDate.set(key, group._count._all);
    }

    const availabilityWithCounts = availability.map((avail) => {
      const key = avail.date.toISOString().slice(0, 10);
      const bookingCount = bookingCountByDate.get(key) ?? 0;
      const capacity = dayBookingCapacity(avail.maxBookings);
      const isFullyBooked = bookingCount >= capacity;

      return {
        ...avail,
        maxBookings: capacity,
        bookingCount,
        isFullyBooked,
      };
    });

    // Hide dates that are already taken so other clients can't select them.
    const openDates = availabilityWithCounts.filter((avail) => !avail.isFullyBooked);

    return { success: true, data: openDates };
  } catch (error) {
    console.error('Error getting availability with bookings:', error);
    return { error: 'Failed to get availability' };
  }
}

// Update max bookings for a date (forced to one slot / day for now)
export async function updateAvailabilityMaxBookings(date: Date, _maxBookings: number | null) {
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


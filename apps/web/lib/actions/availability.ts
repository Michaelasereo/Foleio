'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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
          },
          create: {
            creatorId: creator.id,
            date: new Date(date.toISOString().split('T')[0]),
            isAvailable: true,
          },
        });
      })
    );

    revalidatePath('/settings');
    revalidatePath('/bookings');
    return { success: true, data: results };
  } catch (error) {
    console.error('Error setting availability:', error);
    return { error: 'Failed to set availability' };
  }
}

// Add a single available date
export async function addAvailabilityDate(date: Date, maxBookings?: number) {
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
        maxBookings,
      },
      create: {
        creatorId: creator.id,
        date: new Date(date.toISOString().split('T')[0]),
        isAvailable: true,
        maxBookings,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/bookings');
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
        gte: new Date(startDate.toISOString().split('T')[0]),
        lte: new Date(endDate.toISOString().split('T')[0]),
      };
    } else if (startDate) {
      whereClause.date = {
        gte: new Date(startDate.toISOString().split('T')[0]),
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
    const whereClause: any = {
      creatorId,
      isAvailable: true,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate.toISOString().split('T')[0]),
        lte: new Date(endDate.toISOString().split('T')[0]),
      };
    } else if (startDate) {
      whereClause.date = {
        gte: new Date(startDate.toISOString().split('T')[0]),
      };
    }

    const availability = await prisma.creatorAvailability.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    // Get booking counts for each date
    // Wrap in try-catch to handle database connection errors gracefully
    const availabilityWithCounts = await Promise.all(
      availability.map(async (avail: typeof availability[0]) => {
        let bookingCount = 0;
        try {
          bookingCount = await prisma.booking.count({
            where: {
              creatorId,
              bookingDate: avail.date,
              status: {
                notIn: ['cancelled', 'refunded'],
              },
            },
          });
        } catch (dbError) {
          console.error('Error counting bookings for date:', avail.date, dbError);
          // If database query fails, assume 0 bookings to allow the page to load
          // The booking creation will still validate properly
          bookingCount = 0;
        }

        const isFullyBooked = avail.maxBookings 
          ? bookingCount >= avail.maxBookings 
          : false;

        return {
          ...avail,
          bookingCount,
          isFullyBooked,
        };
      })
    );

    return { success: true, data: availabilityWithCounts };
  } catch (error) {
    console.error('Error getting availability with bookings:', error);
    return { error: 'Failed to get availability' };
  }
}

// Update max bookings for a date
export async function updateAvailabilityMaxBookings(date: Date, maxBookings: number | null) {
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
        maxBookings,
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


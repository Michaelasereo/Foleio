import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { BOOKINGS_PER_DAY } from '@/lib/booking/day-capacity';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Bulk availability API called');

    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection OK');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('Auth check:', { user: user?.id, error: authError });

    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get creator
    console.log('Looking up creator for user:', user.id);
    const creator = await prisma.creator.findUnique({
      where: { userId: user.id }
    });

    console.log('Creator lookup result:', creator ? { id: creator.id, username: creator.username } : 'null');

    if (!creator) {
      console.log('Creator not found for user:', user.id);
      return NextResponse.json(
        { error: 'Creator profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { dates, isAvailable } = body;

    // Validate required fields
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: 'Dates array is required' },
        { status: 400 }
      );
    }

    const results = [];
    let updated = 0;

    console.log(`Processing ${dates.length} dates for creator ${creator.id}`);

    // Process each date
    for (const dateStr of dates) {
      try {
        console.log(`Processing date: ${dateStr}`);

        // Always store as UTC midnight from YYYY-MM-DD (avoid local setHours skew).
        const dayKey =
          typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)
            ? dateStr.slice(0, 10)
            : new Date(dateStr).toISOString().slice(0, 10);
        const availabilityDate = new Date(`${dayKey}T00:00:00.000Z`);
        if (isNaN(availabilityDate.getTime())) {
          console.error(`Invalid date string: ${dateStr}`);
          continue;
        }

        const capacity = isAvailable ? BOOKINGS_PER_DAY : null;

        console.log(`Normalized date: ${availabilityDate.toISOString()}`);

        // Check if availability already exists for this date
        const existingAvailability = await prisma.creatorAvailability.findUnique({
          where: {
            creatorId_date: {
              creatorId: creator.id,
              date: availabilityDate
            }
          }
        });

        console.log(`Existing availability for ${dateStr}:`, existingAvailability ? 'found' : 'not found');

        if (existingAvailability) {
          // Update existing
          const updatedRecord = await prisma.creatorAvailability.update({
            where: { id: existingAvailability.id },
            data: {
              isAvailable,
              maxBookings: capacity,
            }
          });
          results.push(updatedRecord);
          console.log(`Updated record:`, updatedRecord);
        } else {
          // Create new
          const newRecord = await prisma.creatorAvailability.create({
            data: {
              creatorId: creator.id,
              date: availabilityDate,
              isAvailable,
              maxBookings: capacity,
            }
          });
          results.push(newRecord);
          console.log(`Created record:`, newRecord);
        }
        updated++;
      } catch (dateError) {
        console.error(`Error processing date ${dateStr}:`, dateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updated} date${updated > 1 ? 's' : ''}`,
      updated,
      results
    });

  } catch (error: any) {
    console.error('Bulk availability update error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to update availability', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

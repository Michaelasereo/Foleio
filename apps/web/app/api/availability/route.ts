import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@odim/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      creator: { userId: user.id }
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    console.log('Fetching availability for user:', user.id, 'with filters:', where);

    const availability = await prisma.creatorAvailability.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    console.log(`Found ${availability.length} availability records:`, availability.map(a => ({
      date: a.date.toISOString(),
      isAvailable: a.isAvailable
    })));

    // Serialize dates
    const serializedAvailability = availability.map(item => ({
      id: item.id,
      date: item.date.toISOString().split('T')[0], // YYYY-MM-DD format
      isAvailable: item.isAvailable,
      maxBookings: item.maxBookings,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }));

    return NextResponse.json({ availability: serializedAvailability });

  } catch (error: any) {
    console.error('Availability fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get creator
    const creator = await prisma.creator.findUnique({
      where: { userId: user.id }
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { date, isAvailable, maxBookings } = body;

    // Validate required fields
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Parse date and ensure it's date-only (no time)
    const availabilityDate = new Date(date);
    availabilityDate.setHours(0, 0, 0, 0);

    // Check if availability already exists for this date
    const existingAvailability = await prisma.creatorAvailability.findUnique({
      where: {
        creatorId_date: {
          creatorId: creator.id,
          date: availabilityDate
        }
      }
    });

    if (existingAvailability) {
      // Update existing
      const updated = await prisma.creatorAvailability.update({
        where: { id: existingAvailability.id },
        data: {
          isAvailable,
          maxBookings: maxBookings || null
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Availability updated successfully',
        availability: {
          id: updated.id,
          date: updated.date.toISOString().split('T')[0],
          isAvailable: updated.isAvailable,
          maxBookings: updated.maxBookings
        }
      });
    } else {
      // Create new
      const newAvailability = await prisma.creatorAvailability.create({
        data: {
          creatorId: creator.id,
          date: availabilityDate,
          isAvailable,
          maxBookings: maxBookings || null
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Availability created successfully',
        availability: {
          id: newAvailability.id,
          date: newAvailability.date.toISOString().split('T')[0],
          isAvailable: newAvailability.isAvailable,
          maxBookings: newAvailability.maxBookings
        }
      });
    }

  } catch (error: any) {
    console.error('Availability creation error:', error);
    return NextResponse.json(
      { error: 'Failed to update availability', details: error.message },
      { status: 500 }
    );
  }
}

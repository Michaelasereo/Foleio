import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

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

    const services = await withTimeout(
      prisma.priceListItem.findMany({
        where: { creator: { userId: user.id } },
        include: {
          _count: {
            select: {
              bookings: true
            }
          }
        },
        orderBy: [
          { categoryOrderIndex: 'asc' },
          { orderIndex: 'asc' }
        ]
      }),
      3500
    );

    // Group by category
    const groupedServices = services.reduce((acc, service) => {
      const category = service.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: service.id,
        category: service.category,
        name: service.name,
        description: service.description,
        serviceType: service.serviceType,
        sessionDescription: service.sessionDescription,
        calendlyLink: service.calendlyLink,
        price: service.price,
        durationMinutes: service.durationMinutes,
        orderIndex: service.orderIndex,
        categoryOrderIndex: service.categoryOrderIndex,
        isActive: service.isActive,
        createdAt: service.createdAt.toISOString(),
        stats: {
          totalBookings: service._count.bookings
        }
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({ services: groupedServices });

  } catch (error: any) {
    console.error('Services fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services', details: error.message },
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
    const creator = await withTimeout(
      prisma.creator.findUnique({
        where: { userId: user.id }
      }),
      2500
    );

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      category,
      name,
      description,
      price,
      durationMinutes,
      serviceType,
      calendlyLink,
      sessionDescription,
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }

    if (!price || price < 1000) {
      return NextResponse.json(
        { error: 'Price must be at least ₦1,000' },
        { status: 400 }
      );
    }

    // Get the next order index for this category
    const lastItem = await withTimeout(
      prisma.priceListItem.findFirst({
        where: {
          creatorId: creator.id,
          category: category || null
        },
        orderBy: { orderIndex: 'desc' }
      }),
      2500
    );

    const orderIndex = lastItem ? lastItem.orderIndex + 1 : 0;

    // Get category order index
    const categoryOrder = await withTimeout(
      prisma.priceListItem.findFirst({
        where: { creatorId: creator.id },
        orderBy: { categoryOrderIndex: 'desc' },
        select: { categoryOrderIndex: true }
      }),
      2500
    );

    const categoryOrderIndex = category && !lastItem ? (categoryOrder?.categoryOrderIndex || 0) + 1 : 0;

    // Create service
    const service = await withTimeout(
      prisma.priceListItem.create({
        data: {
          creatorId: creator.id,
          serviceType:
            serviceType === 'coaching' || serviceType === 'consultation'
              ? serviceType
              : 'general',
          category: category?.trim() || null,
          name: name.trim(),
          description: description?.trim(),
          sessionDescription:
            serviceType === 'coaching' || serviceType === 'consultation'
              ? sessionDescription?.trim() || null
              : null,
          calendlyLink:
            serviceType === 'coaching' || serviceType === 'consultation'
              ? calendlyLink?.trim() || null
              : null,
          price: parseInt(price),
          durationMinutes:
            serviceType === 'coaching' || serviceType === 'consultation'
              ? durationMinutes
                ? parseInt(durationMinutes)
                : null
              : null,
          orderIndex,
          categoryOrderIndex,
          isActive: true
        },
        include: {
          _count: {
            select: {
              bookings: true
            }
          }
        }
      }),
      3500
    );

    // Serialize response
    const serializedService = {
      id: service.id,
      category: service.category,
      name: service.name,
      description: service.description,
      serviceType: service.serviceType,
      sessionDescription: service.sessionDescription,
      calendlyLink: service.calendlyLink,
      price: service.price,
      durationMinutes: service.durationMinutes,
      orderIndex: service.orderIndex,
      categoryOrderIndex: service.categoryOrderIndex,
      isActive: service.isActive,
      createdAt: service.createdAt.toISOString(),
      stats: {
        totalBookings: service._count.bookings
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Service created successfully',
      service: serializedService
    });

  } catch (error: any) {
    console.error('Service creation error:', error);
    const timeoutMessage = String(error?.message || '').toLowerCase().includes('timed out')
      ? 'Database is temporarily unavailable. Please retry.'
      : error.message;
    return NextResponse.json(
      { error: 'Failed to create service', details: timeoutMessage },
      { status: 500 }
    );
  }
}

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check ownership
    const existingService = await withTimeout(
      prisma.priceListItem.findUnique({
        where: { id },
        include: { creator: { select: { userId: true } } }
      }),
      3000
    );

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    if (existingService.creator.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
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
      isActive
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

    // Update service
    const updatedService = await withTimeout(
      prisma.priceListItem.update({
        where: { id },
        data: {
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
          isActive: isActive !== undefined ? isActive : existingService.isActive
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
      id: updatedService.id,
      category: updatedService.category,
      name: updatedService.name,
      description: updatedService.description,
      serviceType: updatedService.serviceType,
      sessionDescription: updatedService.sessionDescription,
      calendlyLink: updatedService.calendlyLink,
      price: updatedService.price,
      durationMinutes: updatedService.durationMinutes,
      orderIndex: updatedService.orderIndex,
      categoryOrderIndex: updatedService.categoryOrderIndex,
      isActive: updatedService.isActive,
      updatedAt: updatedService.updatedAt.toISOString(),
      stats: {
        totalBookings: updatedService._count.bookings
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Service updated successfully',
      service: serializedService
    });

  } catch (error: any) {
    console.error('Service update error:', error);
    const timeoutMessage = String(error?.message || '').toLowerCase().includes('timed out')
      ? 'Database is temporarily unavailable. Please retry.'
      : error.message;
    return NextResponse.json(
      { error: 'Failed to update service', details: timeoutMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check ownership
    const service = await withTimeout(
      prisma.priceListItem.findUnique({
        where: { id },
        include: { creator: { select: { userId: true } } }
      }),
      3000
    );

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    if (service.creator.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if service has bookings
    const bookingCount = await withTimeout(
      prisma.booking.count({
        where: { priceListItemId: id }
      }),
      3000
    );

    if (bookingCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete service with existing bookings. Deactivate it instead.' },
        { status: 400 }
      );
    }

    // Delete service
    await withTimeout(
      prisma.priceListItem.delete({
        where: { id }
      }),
      3000
    );

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error: any) {
    console.error('Service delete error:', error);
    const timeoutMessage = String(error?.message || '').toLowerCase().includes('timed out')
      ? 'Database is temporarily unavailable. Please retry.'
      : error.message;
    return NextResponse.json(
      { error: 'Failed to delete service', details: timeoutMessage },
      { status: 500 }
    );
  }
}

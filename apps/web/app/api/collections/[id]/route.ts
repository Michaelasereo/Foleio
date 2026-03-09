import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export const dynamic = 'force-dynamic';

export async function GET(
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

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            sectionContents: {
              include: {
                content: true
              },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        creator: {
          select: { id: true, userId: true }
        },
        _count: {
          select: {
            tutorialContents: true,
            subscriptions: true
          }
        }
      }
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (collection.creator.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Serialize response
    const serializedCollection = {
      id: collection.id,
      title: collection.title,
      description: collection.description,
      thumbnailUrl: collection.thumbnailUrl,
      accessType: collection.accessType,
      requiredPlanId: collection.requiredPlanId,
      price: collection.price,
      subscriptionPrice: collection.subscriptionPrice,
      subscriptionType: collection.subscriptionType,
      isPublished: collection.isPublished,
      publishedAt: collection.publishedAt?.toISOString(),
      tags: collection.tags,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      sections: collection.sections.map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        orderIndex: section.orderIndex,
        content: section.sectionContents.map(sc => ({
          id: sc.content.id,
          title: sc.content.title,
          description: sc.content.description,
          type: sc.content.type,
          thumbnailUrl: sc.content.thumbnailUrl,
          durationSeconds: sc.content.durationSeconds,
          orderIndex: sc.orderIndex
        }))
      })),
      stats: {
        totalContent: collection._count.tutorialContents,
        totalSubscriptions: collection._count.subscriptions
      }
    };

    return NextResponse.json({ collection: serializedCollection });

  } catch (error: any) {
    console.error('Collection fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection', details: error.message },
      { status: 500 }
    );
  }
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
    const existingCollection = await prisma.collection.findUnique({
      where: { id },
      include: { creator: { select: { userId: true } } }
    });

    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (existingCollection.creator.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      thumbnailUrl,
      accessType,
      requiredPlanId,
      price,
      subscriptionPrice,
      subscriptionType,
      isPublished,
      tags
    } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Update collection
    const updatedCollection = await prisma.collection.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description?.trim(),
        thumbnailUrl,
        accessType,
        requiredPlanId,
        price: price ? parseInt(price) : null,
        subscriptionPrice: subscriptionPrice ? parseInt(subscriptionPrice) : null,
        subscriptionType,
        isPublished,
        publishedAt: isPublished && !existingCollection.publishedAt ? new Date() : existingCollection.publishedAt,
        tags
      },
      include: {
        sections: {
          include: {
            sectionContents: {
              include: { content: true },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        _count: {
          select: {
            tutorialContents: true,
            subscriptions: true
          }
        }
      }
    });

    // Serialize response
    const serializedCollection = {
      id: updatedCollection.id,
      title: updatedCollection.title,
      description: updatedCollection.description,
      thumbnailUrl: updatedCollection.thumbnailUrl,
      accessType: updatedCollection.accessType,
      requiredPlanId: updatedCollection.requiredPlanId,
      price: updatedCollection.price,
      subscriptionPrice: updatedCollection.subscriptionPrice,
      subscriptionType: updatedCollection.subscriptionType,
      isPublished: updatedCollection.isPublished,
      publishedAt: updatedCollection.publishedAt?.toISOString(),
      tags: updatedCollection.tags,
      updatedAt: updatedCollection.updatedAt.toISOString(),
      sections: updatedCollection.sections.map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        orderIndex: section.orderIndex,
        content: section.sectionContents.map(sc => ({
          id: sc.content.id,
          title: sc.content.title,
          type: sc.content.type,
          thumbnailUrl: sc.content.thumbnailUrl,
          orderIndex: sc.orderIndex
        }))
      })),
      stats: {
        totalContent: updatedCollection._count.tutorialContents,
        totalSubscriptions: updatedCollection._count.subscriptions
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Collection updated successfully',
      collection: serializedCollection
    });

  } catch (error: any) {
    console.error('Collection update error:', error);
    return NextResponse.json(
      { error: 'Failed to update collection', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string | null;
      price?: number | null;
    };

    const current = await prisma.collection.findFirst({
      where: { id, creatorId: creator.id },
      select: { id: true },
    });
    if (!current) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.title === 'string' && body.title.trim()) {
      data.title = body.title.trim();
    }
    if (body.description !== undefined) {
      data.description =
        body.description === null ? null : String(body.description).trim();
    }
    if (body.price !== undefined) {
      data.price = body.price === null ? null : Number(body.price);
    }

    const collection = await prisma.collection.update({
      where: { id: current.id },
      data,
    });

    return NextResponse.json({ collection });
  } catch (error: any) {
    console.error('Collection patch error:', error);
    return NextResponse.json(
      { error: 'Failed to update collection', details: error?.message },
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
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: { creator: { select: { userId: true } } }
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (collection.creator.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete collection (cascade will handle related records)
    await prisma.collection.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Collection deleted successfully'
    });

  } catch (error: any) {
    console.error('Collection delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection', details: error.message },
      { status: 500 }
    );
  }
}

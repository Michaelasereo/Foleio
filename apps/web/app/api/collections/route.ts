import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

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

    const collections = await prisma.collection.findMany({
      where: { creatorId: user.id },
      include: {
        sections: {
          include: {
            sectionContents: {
              include: {
                content: {
                  select: {
                    id: true,
                    title: true,
                    type: true,
                    thumbnailUrl: true
                  }
                }
              },
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
      },
      orderBy: { createdAt: 'desc' }
    });

    // Serialize the data
    const serializedCollections = collections.map(collection => ({
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
          type: sc.content.type,
          thumbnailUrl: sc.content.thumbnailUrl,
          orderIndex: sc.orderIndex
        }))
      })),
      stats: {
        totalContent: collection._count.tutorialContents,
        totalSubscriptions: collection._count.subscriptions
      }
    }));

    return NextResponse.json({ collections: serializedCollections });

  } catch (error: any) {
    console.error('Collections fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections', details: error.message },
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
    const {
      title,
      description,
      accessType = 'subscription',
      requiredPlanId,
      price,
      subscriptionPrice,
      subscriptionType = 'one_time',
      tags = []
    } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create collection
    const collection = await prisma.collection.create({
      data: {
        creatorId: creator.id,
        title: title.trim(),
        description: description?.trim(),
        accessType,
        requiredPlanId,
        price: price ? parseInt(price) : null,
        subscriptionPrice: subscriptionPrice ? parseInt(subscriptionPrice) : null,
        subscriptionType,
        tags,
        isPublished: false
      },
      include: {
        sections: true,
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
      id: collection.id,
      title: collection.title,
      description: collection.description,
      accessType: collection.accessType,
      requiredPlanId: collection.requiredPlanId,
      price: collection.price,
      subscriptionPrice: collection.subscriptionPrice,
      subscriptionType: collection.subscriptionType,
      tags: collection.tags,
      isPublished: collection.isPublished,
      createdAt: collection.createdAt.toISOString(),
      sections: collection.sections,
      stats: {
        totalContent: collection._count.tutorialContents,
        totalSubscriptions: collection._count.subscriptions
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Collection created successfully',
      collection: serializedCollection
    });

  } catch (error: any) {
    console.error('Collection creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create collection', details: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isPublic: true
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch creators with stats
    const creators = await prisma.creator.findMany({
      where,
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        category: true,
        avatarUrl: true,
        bannerUrl: true,
        instagramHandle: true,
        tiktokHandle: true,
        subscriberCount: true,
        contentCount: true,
        createdAt: true,
        // Include pricing plans for discovery
        creatorPlans: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
            features: true
          },
          orderBy: { price: 'asc' },
          take: 1 // Just the cheapest plan for display
        },
        // Get sample content for preview
        content: {
          where: {
            isPublished: true,
            type: 'video'
          },
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            type: true,
            viewCount: true
          },
          orderBy: { createdAt: 'desc' },
          take: 3 // Show up to 3 recent videos
        }
      },
      orderBy: { subscriberCount: 'desc' }, // Most popular first
      skip: offset,
      take: limit
    });

    // Get total count for pagination
    const totalCount = await prisma.creator.count({ where });

    // Serialize the data
    const serializedCreators = creators.map(creator => ({
      id: creator.id,
      username: creator.username,
      displayName: creator.displayName,
      bio: creator.bio,
      category: creator.category,
      avatarUrl: creator.avatarUrl,
      bannerUrl: creator.bannerUrl,
      instagramHandle: creator.instagramHandle,
      tiktokHandle: creator.tiktokHandle,
      subscriberCount: creator.subscriberCount,
      contentCount: creator.contentCount,
      createdAt: creator.createdAt.toISOString(),
      pricing: creator.creatorPlans.length > 0 ? {
        planName: creator.creatorPlans[0].name,
        price: creator.creatorPlans[0].price,
        features: creator.creatorPlans[0].features
      } : null,
      recentContent: creator.content.map(content => ({
        id: content.id,
        title: content.title,
        thumbnailUrl: content.thumbnailUrl,
        type: content.type,
        viewCount: content.viewCount
      }))
    }));

    return NextResponse.json({
      creators: serializedCreators,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error: any) {
    console.error('Creators fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creators', details: error.message },
      { status: 500 }
    );
  }
}

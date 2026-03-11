import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function POST(request: Request) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find a creator to seed data against
    const creator = await prisma.creator.findFirst();

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // 1. Create 2 dummy price list items
    const priceListItems = await Promise.all([
      prisma.priceListItem.create({
        data: {
          creatorId: creator.id,
          category: 'HOME SERVICE',
          name: 'Full Makeup Application',
          description: 'Complete makeup application for events, photoshoots, or special occasions. Includes foundation, contour, eyeshadow, lashes, and lipstick.',
          price: 50000, // ₦500.00 in kobo
          durationMinutes: 120,
          orderIndex: 0,
          categoryOrderIndex: 0,
          isActive: true,
        },
      }),
      prisma.priceListItem.create({
        data: {
          creatorId: creator.id,
          category: 'HOME SERVICE',
          name: 'Bridal Makeup Package',
          description: 'Premium bridal makeup package with trial session. Includes full face makeup, false lashes, setting spray, and touch-up kit.',
          price: 150000, // ₦1,500.00 in kobo
          durationMinutes: 180,
          orderIndex: 1,
          categoryOrderIndex: 0,
          isActive: true,
        },
      }),
    ]);

    // 2. Create dummy creator links
    const links = await Promise.all([
      prisma.creatorLink.create({
        data: {
          creatorId: creator.id,
          label: 'Instagram',
          url: 'https://instagram.com/shosglam',
          linkType: 'instagram',
          icon: 'instagram',
          orderIndex: 0,
          isActive: true,
        },
      }),
      prisma.creatorLink.create({
        data: {
          creatorId: creator.id,
          label: 'TikTok',
          url: 'https://tiktok.com/@shosglam',
          linkType: 'tiktok',
          icon: 'music-2',
          orderIndex: 1,
          isActive: true,
        },
      }),
      prisma.creatorLink.create({
        data: {
          creatorId: creator.id,
          label: 'YouTube Channel',
          url: 'https://youtube.com/@shosglam',
          linkType: 'youtube',
          icon: 'youtube',
          orderIndex: 2,
          isActive: true,
        },
      }),
      prisma.creatorLink.create({
        data: {
          creatorId: creator.id,
          label: 'View Services',
          url: '#price-list',
          linkType: 'price_list',
          icon: 'file-text',
          orderIndex: 3,
          isActive: true,
        },
      }),
    ]);

    // 3. Create intro video (dedicated intro video with videoId)
    const introVideo = await prisma.content.create({
      data: {
        creatorId: creator.id,
        title: 'Welcome to My Makeup Journey',
        description: 'Hi! I\'m Shosglam, a professional makeup artist. Join me as I share my passion for makeup artistry, tutorials, and beauty tips. Subscribe to get access to exclusive content!',
        type: 'video',
        accessType: 'free',
        contentCategory: 'content',
        isPublished: true,
        publishedAt: new Date(),
        thumbnailUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
        viewCount: 5420,
      },
    });

    // Set intro video
    await prisma.creator.update({
      where: { id: creator.id },
      data: { introVideoId: introVideo.id },
    });

    // 4. Create tutorial content (contentCategory = 'tutorial')
    const tutorials = await Promise.all([
      prisma.content.create({
        data: {
          creatorId: creator.id,
          title: 'Beginner Makeup Tutorial: Natural Everyday Look',
          description: 'Learn how to create a natural, everyday makeup look perfect for beginners. Step-by-step guide covering foundation, concealer, eyeshadow, and more.',
          type: 'video',
          accessType: 'free',
          contentCategory: 'tutorial',
          isPublished: true,
          publishedAt: new Date(),
          thumbnailUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
          viewCount: 1250,
        },
      }),
      prisma.content.create({
        data: {
          creatorId: creator.id,
          title: 'Smokey Eye Tutorial: Step-by-Step Guide',
          description: 'Master the classic smokey eye look with this detailed tutorial. Perfect for evening events and special occasions.',
          type: 'video',
          accessType: 'subscription',
          contentCategory: 'tutorial',
          isPublished: true,
          publishedAt: new Date(),
          thumbnailUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800',
          viewCount: 890,
        },
      }),
      prisma.content.create({
        data: {
          creatorId: creator.id,
          title: 'Contouring 101: How to Sculpt Your Face',
          description: 'Learn the basics of contouring and highlighting to enhance your natural features. Includes product recommendations and techniques.',
          type: 'video',
          accessType: 'free',
          contentCategory: 'tutorial',
          isPublished: true,
          publishedAt: new Date(),
          thumbnailUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800',
          viewCount: 2100,
        },
      }),
    ]);

    // 5. Create subscription plans
    const plans = await Promise.all([
      prisma.creatorPlan.create({
        data: {
          creatorId: creator.id,
          name: 'Basic',
          description: 'Access to all tutorials and basic content',
          price: 2000, // ₦20.00 in kobo
          features: JSON.stringify(['All tutorials', 'Monthly Q&A sessions']),
          isActive: true,
          orderIndex: 0,
        },
      }),
      prisma.creatorPlan.create({
        data: {
          creatorId: creator.id,
          name: 'Premium',
          description: 'Full access to all content plus exclusive behind-the-scenes',
          price: 5000, // ₦50.00 in kobo
          features: JSON.stringify(['Everything in Basic', 'Exclusive BTS content', 'Early access to new content', 'Direct messaging']),
          isActive: true,
          orderIndex: 1,
        },
      }),
    ]);

    // 6. Create some regular content (contentCategory = 'content')
    const regularContent = await Promise.all([
      prisma.content.create({
        data: {
          creatorId: creator.id,
          title: 'My Favorite Makeup Products of 2024',
          description: 'A comprehensive review of my top makeup products this year, including foundations, lipsticks, and eyeshadow palettes.',
          type: 'video',
          accessType: 'subscription',
          contentCategory: 'content',
          isPublished: true,
          publishedAt: new Date(),
          thumbnailUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
          viewCount: 450,
        },
      }),
      prisma.content.create({
        data: {
          creatorId: creator.id,
          title: 'Behind the Scenes: Photoshoot Prep',
          description: 'Join me as I prepare for a professional photoshoot, including skincare routine and makeup application process.',
          type: 'video',
          accessType: 'subscription',
          contentCategory: 'content',
          isPublished: true,
          publishedAt: new Date(),
          thumbnailUrl: 'https://images.unsplash.com/photo-1512495856098-3c377b3e9c28?w=800',
          viewCount: 320,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Dummy data added successfully',
      data: {
        priceListItems: priceListItems.length,
        links: links.length,
        introVideo: introVideo.id,
        tutorials: tutorials.length,
        regularContent: regularContent.length,
        plans: plans.length,
      },
    });
  } catch (error) {
    console.error('Error adding dummy data:', error);
    return NextResponse.json(
      { error: 'Failed to add dummy data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


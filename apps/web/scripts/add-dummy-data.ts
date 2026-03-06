import { prisma } from '@foleio/database';

async function addDummyData() {
  try {
    // Find the creator (assuming username is 'shosglam' based on earlier context)
    const creator = await prisma.creator.findUnique({
      where: { username: 'shosglam' },
    });

    if (!creator) {
      console.error('Creator not found. Please ensure you have a creator with username "shosglam"');
      process.exit(1);
    }

    console.log(`Found creator: ${creator.displayName} (${creator.username})`);

    // 1. Create 2 dummy price list items
    console.log('Creating price list items...');
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
    console.log(`Created ${priceListItems.length} price list items`);

    // 2. Create dummy creator links
    console.log('Creating creator links...');
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
          label: 'View Price List',
          url: '#price-list',
          linkType: 'price_list',
          icon: 'file-text',
          orderIndex: 3,
          isActive: true,
        },
      }),
    ]);
    console.log(`Created ${links.length} creator links`);

    // 3. Create tutorial content (contentCategory = 'tutorial')
    console.log('Creating tutorial content...');
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
    console.log(`Created ${tutorials.length} tutorial videos`);

    // 4. Create an intro video (or use existing video content)
    console.log('Setting intro video...');
    // Use the first tutorial as intro video if no intro video exists
    if (!creator.introVideoId && tutorials.length > 0) {
      await prisma.creator.update({
        where: { id: creator.id },
        data: { introVideoId: tutorials[0].id },
      });
      console.log('Intro video set to first tutorial');
    } else if (creator.introVideoId) {
      console.log('Intro video already exists');
    }

    // 5. Create some regular content (contentCategory = 'content')
    console.log('Creating regular content...');
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
    console.log(`Created ${regularContent.length} regular content items`);

    console.log('\n✅ Dummy data added successfully!');
    console.log(`\nSummary:`);
    console.log(`- Price List Items: ${priceListItems.length}`);
    console.log(`- Creator Links: ${links.length}`);
    console.log(`- Tutorial Videos: ${tutorials.length}`);
    console.log(`- Regular Content: ${regularContent.length}`);
    console.log(`- Intro Video: ${creator.introVideoId ? 'Already set' : 'Set to first tutorial'}`);
    console.log(`\nVisit: http://localhost:3000/creator/${creator.username}`);
  } catch (error) {
    console.error('Error adding dummy data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addDummyData();


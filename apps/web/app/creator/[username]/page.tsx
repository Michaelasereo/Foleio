import { notFound } from 'next/navigation';
import { prisma } from '@odim/database';
import { PublicCreatorProfile } from '@/components/creator/PublicCreatorProfile';
import { serializeForClient } from '@/lib/utils';

export default async function CreatorPublicPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const creator = await prisma.creator.findUnique({
    where: { username, isPublic: true },
    include: {
      creatorPlans: {
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
      },
      introVideo: {
        select: {
          id: true,
          title: true,
          muxAssetId: true,
          muxPlaybackId: true,
          thumbnailUrl: true,
          description: true,
        },
      },
      creatorLinks: {
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
      },
      priceListItems: {
        where: { isActive: true },
        orderBy: [
          { categoryOrderIndex: 'asc' },
          { orderIndex: 'asc' },
        ],
      },
      availability: {
        where: {
          isAvailable: true,
          date: {
            gte: new Date(),
          },
        },
        orderBy: { date: 'asc' },
        take: 30,
      },
      content: {
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          thumbnailUrl: true,
          viewCount: true,
          createdAt: true,
          accessType: true,
          contentCategory: true,
          muxAssetId: true,
          muxPlaybackId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 24,
      },
    },
  });

  if (!creator) {
    notFound();
  }

  // Separate content by category
  const regularContent = creator.content.filter((c: typeof creator.content[0]) => c.contentCategory === 'content');
  const tutorials = creator.content.filter((c: typeof creator.content[0]) => c.contentCategory === 'tutorial');

  // Group price list items by category
  const groupedPriceList = groupPriceListByCategory(creator.priceListItems);

  // Serialize data for client component (especially dates)
  const serializedCreator = serializeForClient({
    ...creator,
    availability: creator.availability.map(avail => ({
      ...avail,
      date: avail.date.toISOString(),
    })),
  });

  return (
    <PublicCreatorProfile
      creator={serializedCreator}
      regularContent={serializeForClient(regularContent)}
      tutorials={serializeForClient(tutorials)}
      groupedPriceList={serializeForClient(groupedPriceList)}
    />
  );
}

// Helper function to group price list items by category
function groupPriceListByCategory(items: any[]) {
  const grouped: { category: string | null; items: any[] }[] = [];
  const categoryMap: { [key: string]: any[] } = {};
  const uncategorized: any[] = [];

  items.forEach((item) => {
    if (item.category) {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = [];
      }
      categoryMap[item.category].push(item);
    } else {
      uncategorized.push(item);
    }
  });

  // Add uncategorized items first
  if (uncategorized.length > 0) {
    grouped.push({ category: null, items: uncategorized });
  }

  // Add categorized items
  Object.entries(categoryMap).forEach(([category, categoryItems]) => {
    grouped.push({ category, items: categoryItems });
  });

  return grouped;
}

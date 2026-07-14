import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@foleio/database';
import { PublicCreatorProfile } from '@/components/creator/PublicCreatorProfile';
import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';
import { serializeForClient } from '@/lib/utils';
import { getAvailabilityWithBookings } from '@/lib/actions/availability';
import { isDojahKycRequired } from '@/lib/config/platform-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const creator = await prisma.creator.findUnique({
    where: { username, isPublic: true },
    select: {
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
    },
  });

  if (!creator) return {};

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const appUrl =
    envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)
      ? envAppUrl.replace(/\/+$/, '')
      : 'https://foleio.com';

  const title = `${creator.displayName} on Foleio`;
  const description =
    creator.bio || `Watch ${creator.displayName}'s videos, courses and more on Foleio.`;
  const image = creator.avatarUrl || `${appUrl}/og-default.png`;
  const url = `${appUrl}/creator/${creator.username}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Foleio',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function CreatorPublicPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  noStore();
  const { username } = await params;

  try {
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
      // Availability will be fetched separately with booking counts
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
          tutorialPrice: true,
          collectionId: true,
          collection: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      collections: {
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          price: true,
          subscriptionPrice: true,
          tutorialContents: {
            where: { isPublished: true, type: 'video' },
            select: {
              id: true,
              title: true,
              description: true,
              thumbnailUrl: true,
              muxAssetId: true,
              muxPlaybackId: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      journalEntries: {
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          coverImage: true,
          tags: true,
          readTime: true,
          viewCount: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
      },
      products: {
        where: { status: 'active' },
        select: { id: true },
      },
      },
    });

    if (!creator) {
      notFound();
    }
    let sectionsByCollectionId = new Map<string, Array<{
    id: string;
    title: string;
    orderIndex: number;
    sectionContents: Array<{
      content: {
        id: string;
        title: string;
        description: string | null;
        thumbnailUrl: string | null;
        muxAssetId: string | null;
        muxPlaybackId: string | null;
        createdAt: Date;
        isPublished: boolean;
        type: string;
      };
    }>;
    }>>();

    try {
      const collectionIds = creator.collections.map((collection) => collection.id);
      if (collectionIds.length > 0) {
        const sections = await prisma.section.findMany({
          where: { collectionId: { in: collectionIds } },
          select: {
          id: true,
          title: true,
          orderIndex: true,
          collectionId: true,
          sectionContents: {
            select: {
              content: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  thumbnailUrl: true,
                  muxAssetId: true,
                  muxPlaybackId: true,
                  createdAt: true,
                  isPublished: true,
                  type: true,
                },
              },
            },
            orderBy: { orderIndex: 'asc' },
          },
          },
          orderBy: { orderIndex: 'asc' },
        });

        sectionsByCollectionId = sections.reduce((acc, section) => {
          const list = acc.get(section.collectionId) ?? [];
          list.push({
            id: section.id,
            title: section.title,
            orderIndex: section.orderIndex,
            sectionContents: section.sectionContents,
          });
          acc.set(section.collectionId, list);
          return acc;
        }, new Map<string, Array<{
          id: string;
          title: string;
          orderIndex: number;
          sectionContents: Array<{
            content: {
              id: string;
              title: string;
              description: string | null;
              thumbnailUrl: string | null;
              muxAssetId: string | null;
              muxPlaybackId: string | null;
              createdAt: Date;
              isPublished: boolean;
              type: string;
            };
          }>;
        }>>());
      }
    } catch {
      // Keep profile visible even if section tables are unavailable.
      sectionsByCollectionId = new Map();
    }

    // Build collection videos from both direct links and section-linked content.
    const tutorialCollections = creator.collections
    .map((collection: (typeof creator.collections)[0]) => {
      const videosById = new Map<
        string,
        {
          id: string;
          title: string;
          description: string | null;
          thumbnailUrl: string | null;
          muxAssetId: string | null;
          muxPlaybackId: string | null;
          createdAt: Date;
        }
      >();

      for (const video of collection.tutorialContents) {
        videosById.set(video.id, video);
      }

      const sectionGroups = (sectionsByCollectionId.get(collection.id) ?? [])
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((section) => {
          const videos = section.sectionContents
            .map((sectionContent) => sectionContent.content)
            .filter((video) => video && video.isPublished && video.type === 'video')
            .map((video) => ({
              id: video.id,
              title: video.title,
              description: video.description,
              thumbnailUrl: video.thumbnailUrl,
              muxAssetId: video.muxAssetId,
              muxPlaybackId: video.muxPlaybackId,
              createdAt: video.createdAt,
            }));
          for (const video of videos) {
            if (!videosById.has(video.id)) {
              videosById.set(video.id, video);
            }
          }
          return {
            id: section.id,
            title: section.title,
            videos,
          };
        })
        .filter((section) => section.videos.length > 0) as Array<{
        id: string;
        title: string;
        videos: Array<{
          id: string;
          title: string;
          description: string | null;
          thumbnailUrl: string | null;
          muxAssetId: string | null;
          muxPlaybackId: string | null;
          createdAt: Date;
        }>;
      }>;

      return {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        thumbnailUrl: collection.thumbnailUrl,
        price: collection.price,
        subscriptionPrice: collection.subscriptionPrice,
        sections: sectionGroups,
        videos: Array.from(videosById.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
      };
    })
    .filter((collection: { videos: any[] }) => collection.videos.length > 0);

    const collectionVideoIds = new Set(
      tutorialCollections.flatMap((collection: { videos: Array<{ id: string }> }) =>
        collection.videos.map((video) => video.id)
      )
    );

    // Separate content by category and keep collection videos out of standalone cards.
    const regularContent = creator.content.filter(
      (c: typeof creator.content[0]) => c.contentCategory === 'content' && !c.collectionId
    );
    const tutorials = creator.content.filter(
      (c: typeof creator.content[0]) =>
        c.contentCategory === 'tutorial' &&
        !c.collectionId &&
        !collectionVideoIds.has(c.id)
    );

    // Group price list items by category
    const groupedPriceList = groupPriceListByCategory(creator.priceListItems);

    // Get availability with booking counts (for next 3 months)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    const availabilityResult = await getAvailabilityWithBookings(creator.id, startDate, endDate);
    const availabilityWithCounts = availabilityResult.success && availabilityResult.data
      ? availabilityResult.data
      : [];

    const { getPublicPortfolio } = await import('@/lib/actions/portfolio');
    const portfolioSections = await getPublicPortfolio(creator.id);

    // Serialize data for client component (especially dates)
    const serializedCreator = serializeForClient({
      ...creator,
      // Keep public stats accurate even if cached model counters drift.
      contentCount: creator.content.length,
      availability: availabilityWithCounts.map((avail) => ({
        ...avail,
        date: avail.date.toISOString(),
      })),
    });

    return (
      <PublicCreatorProfile
        creator={serializedCreator as any}
        regularContent={serializeForClient(regularContent)}
        tutorials={serializeForClient(tutorials)}
        tutorialCollections={serializeForClient(tutorialCollections)}
        journalEntries={serializeForClient(creator.journalEntries)}
        groupedPriceList={serializeForClient(groupedPriceList)}
        hasActiveProducts={creator.products.length > 0}
        portfolioSections={serializeForClient(portfolioSections)}
        requireDojahKyc={await isDojahKycRequired()}
      />
    );
  } catch (error) {
    // notFound()/redirect() throw special Next errors — must rethrow.
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      String((error as { digest: string }).digest).startsWith('NEXT_')
    ) {
      throw error;
    }
    console.error('[public-profile] failed to load:', error);
    return (
      <FoleioStatusPage
        title="Something went wrong"
        description="Could not load this profile. Please try again."
        primaryAction={{ label: 'Go home', href: '/' }}
        secondaryAction={{
          label: 'Explore creators',
          href: '/creators',
          variant: 'outline',
        }}
      />
    );
  }
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

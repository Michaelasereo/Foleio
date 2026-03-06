import { notFound } from 'next/navigation';
import { prisma } from '@foleio/database';
import { PublicCollectionPage } from '@/components/creator/PublicCollectionPage';

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ username: string; id: string }>;
}) {
  const { username, id } = await params;

  // Get creator
  const creator = await prisma.creator.findUnique({
    where: { username, isPublic: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  });

  if (!creator) {
    notFound();
  }

  // Get collection with all tutorials
  const collection = await prisma.collection.findUnique({
    where: { 
      id, 
      creatorId: creator.id,
      isPublished: true 
    },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: {
          sectionContents: {
            orderBy: { orderIndex: 'asc' },
            include: {
              content: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  thumbnailUrl: true,
                  type: true,
                  muxAssetId: true,
                  muxPlaybackId: true,
                  durationSeconds: true,
                  viewCount: true,
                  accessType: true,
                },
              },
            },
          },
          subsections: {
            orderBy: { orderIndex: 'asc' },
            include: {
              sectionContents: {
                orderBy: { orderIndex: 'asc' },
                include: {
                  content: {
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      thumbnailUrl: true,
                      type: true,
                      muxAssetId: true,
                  muxPlaybackId: true,
                      durationSeconds: true,
                      viewCount: true,
                      accessType: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      tutorialContents: {
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          type: true,
          muxAssetId: true,
                  muxPlaybackId: true,
          durationSeconds: true,
          viewCount: true,
          accessType: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  // Count total tutorials
  const tutorialCount = collection.tutorialContents.length + 
    collection.sections.reduce((count, section) => {
      return count + section.sectionContents.length + 
        section.subsections.reduce((subCount, subsection) => {
          return subCount + subsection.sectionContents.length;
        }, 0);
    }, 0);

  // Calculate total duration
  const totalDuration = collection.tutorialContents.reduce((sum, t) => sum + (t.durationSeconds || 0), 0) +
    collection.sections.reduce((sum, section) => {
      return sum + section.sectionContents.reduce((s, sc) => s + (sc.content.durationSeconds || 0), 0) +
        section.subsections.reduce((subSum, subsection) => {
          return subSum + subsection.sectionContents.reduce((ss, sc) => ss + (sc.content.durationSeconds || 0), 0);
        }, 0);
    }, 0);

  return (
    <PublicCollectionPage
      creator={creator as any}
      collection={{
        ...collection,
        tutorialCount,
        totalDuration,
      } as any}
    />
  );
}


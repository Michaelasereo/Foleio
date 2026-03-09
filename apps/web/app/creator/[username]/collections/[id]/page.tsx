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
          sectionOrder: true,
          createdAt: true,
        },
        orderBy: [{ sectionOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!collection) {
    notFound();
  }

  let sections: any[] = [];
  try {
    sections = await prisma.section.findMany({
      where: { collectionId: collection.id, parentSectionId: null },
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
    });
  } catch (error) {
    // Compatibility fallback for environments where parentSectionId/subsections are not yet available.
    try {
      sections = await prisma.section.findMany({
        where: { collectionId: collection.id },
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
      });
    } catch {
      // Keep collection page usable even if section tables are unavailable.
      sections = [];
    }
  }

  const fallbackTutorialContents = Array.from(
    new Map(
      sections
        .flatMap((section: any) => [
          ...(section.sectionContents || []).map((sc: any) => sc.content),
          ...((section.subsections || []) as any[]).flatMap((subsection: any) =>
            (subsection.sectionContents || []).map((sc: any) => sc.content)
          ),
        ])
        .filter(Boolean)
        .map((content: any) => [content.id, content])
    ).values()
  );
  const tutorialContents =
    collection.tutorialContents.length > 0 ? collection.tutorialContents : fallbackTutorialContents;

  // Count total tutorials
  const tutorialCount = tutorialContents.length +
    sections.reduce((count, section) => {
      return count + section.sectionContents.length +
        (section.subsections || []).reduce((subCount: number, subsection: any) => {
          return subCount + subsection.sectionContents.length;
        }, 0);
    }, 0);

  // Calculate total duration
  const totalDuration = tutorialContents.reduce((sum, t) => sum + (t.durationSeconds || 0), 0) +
    sections.reduce((sum, section) => {
      return sum + section.sectionContents.reduce((s: number, sc: any) => s + (sc.content.durationSeconds || 0), 0) +
        (section.subsections || []).reduce((subSum: number, subsection: any) => {
          return subSum + subsection.sectionContents.reduce((ss: number, sc: any) => ss + (sc.content.durationSeconds || 0), 0);
        }, 0);
    }, 0);

  return (
    <PublicCollectionPage
      creator={creator as any}
      collection={{
        ...collection,
        sections,
        tutorialContents,
        tutorialCount,
        totalDuration,
      } as any}
    />
  );
}


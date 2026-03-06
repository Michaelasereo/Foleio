import { notFound } from 'next/navigation';
import { prisma } from '@foleio/database';
import { TutorialsPage } from '@/components/creator/TutorialsPage';

export default async function CreatorTutorialsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;

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

  const tutorials = await prisma.content.findMany({
    where: {
      creatorId: creator.id,
      contentCategory: 'tutorial',
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      thumbnailUrl: true,
      viewCount: true,
      createdAt: true,
      accessType: true,
      muxAssetId: true,
      muxPlaybackId: true,
      tutorialPrice: true,
      collectionId: true,
      durationSeconds: true,
      collection: {
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          price: true,
          subscriptionPrice: true,
          subscriptionType: true,
          enrolledCount: true,
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  // Get all tutorial collections
  const collections = await prisma.collection.findMany({
    where: {
      creatorId: creator.id,
      isPublished: true,
      tutorialContents: { some: {} },
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      price: true,
      subscriptionPrice: true,
      subscriptionType: true,
      enrolledCount: true,
    },
  });

  // Separate by access type
  const freeTutorials = tutorials.filter((t) => t.accessType === 'free');
  const paidTutorials = tutorials.filter((t) => t.accessType !== 'free');

  return (
    <TutorialsPage
      creator={creator}
      freeTutorials={freeTutorials}
      paidTutorials={paidTutorials}
      defaultTab={tab || 'free'}
      collections={collections}
    />
  );
}


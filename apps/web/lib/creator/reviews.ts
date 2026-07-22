import { prisma } from '@foleio/database';
import { getCreatorPlanLimits } from '@/lib/utils/plan-limits';

export async function getPublicReviews(creatorId: string) {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: {
      reviewsEnabled: true,
      platformPlan: true,
      platformSubscriptionActive: true,
    },
  });

  if (
    !creator ||
    !creator.reviewsEnabled ||
    getCreatorPlanLimits(creator).maxReviews <= 0
  ) {
    return [];
  }

  return prisma.creatorReview.findMany({
    where: { creatorId, isActive: true },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      customerName: true,
      location: true,
      quote: true,
    },
  });
}

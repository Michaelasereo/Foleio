import { prisma } from '@foleio/database';

export type CreatorHealthStatus = 'healthy' | 'at_risk' | 'inactive';

export type CreatorHealthRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  category: string;
  createdAt: Date;
  contentCount: number;
  activeSubscribers: number;
  totalEarned: number;
  lastContentDate: Date | null;
  completedBookings: number;
  healthScore: number;
  healthStatus: CreatorHealthStatus;
};

function getHealthStatus(score: number): CreatorHealthStatus {
  if (score >= 80) return 'healthy';
  if (score >= 40) return 'at_risk';
  return 'inactive';
}

export async function getCreatorHealthRows(): Promise<CreatorHealthRow[]> {
  const creators = await prisma.creator.findMany({
    include: {
      user: { select: { email: true, createdAt: true } },
      content: { select: { id: true, isPublished: true, createdAt: true } },
      fanSubscriptions: {
        where: { status: 'active' },
        select: { id: true },
      },
      transactions: {
        where: { status: 'success' },
        select: { creatorEarnings: true, createdAt: true },
      },
      bookings: {
        where: { status: 'completed' },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  return creators.map((creator) => {
    const publishedContent = creator.content.filter((item) => item.isPublished);
    const contentCount = publishedContent.length;
    const activeSubscribers = creator.fanSubscriptions.length;
    const completedBookings = creator.bookings.length;
    const lastContentDate =
      publishedContent.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
        ?.createdAt ?? null;

    const totalEarnedKobo = creator.transactions.reduce((sum, tx) => {
      const value = tx.creatorEarnings;
      if (value === null || value === undefined) return sum;
      return sum + Number(value);
    }, 0);

    let healthScore = 0;
    if (contentCount > 0) healthScore += 20;
    if (activeSubscribers > 0) healthScore += 20;
    if (totalEarnedKobo > 0) healthScore += 20;
    if (lastContentDate && lastContentDate >= twoWeeksAgo) healthScore += 20;
    if (completedBookings > 0) healthScore += 20;

    return {
      id: creator.id,
      username: creator.username,
      displayName: creator.displayName,
      avatarUrl: creator.avatarUrl,
      email: creator.user.email,
      category: creator.category,
      createdAt: creator.createdAt,
      contentCount,
      activeSubscribers,
      totalEarned: totalEarnedKobo,
      lastContentDate,
      completedBookings,
      healthScore,
      healthStatus: getHealthStatus(healthScore),
    };
  });
}

import { prisma } from '@foleio/database';
import { isPaymentsReady } from '@/lib/creator/payments-ready';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import { feePercentForCreator } from '@/lib/billing/platform-fee';

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
  paystackSubaccountCode: string | null;
  subaccountStatus: string;
  payoutMethod: string;
  paymentsReady: boolean;
  hasBankAccount: boolean;
  bvnVerified: boolean;
  platformPlan: string;
  platformSubscriptionActive: boolean;
  feePercent: number;
};

function getHealthStatus(score: number): CreatorHealthStatus {
  if (score >= 80) return 'healthy';
  if (score >= 40) return 'at_risk';
  return 'inactive';
}

const SUCCESS_TX = ['success', 'SUCCESS', 'completed', 'COMPLETED', 'paid', 'PAID'];

export async function getCreatorHealthRows(): Promise<CreatorHealthRow[]> {
  const requireKyc = await isDojahKycRequired();
  const creators = await prisma.creator.findMany({
    include: {
      user: { select: { email: true, createdAt: true } },
      content: { select: { id: true, isPublished: true, createdAt: true } },
      fanSubscriptions: {
        where: { status: 'active' },
        select: { id: true },
      },
      transactions: {
        where: { status: { in: SUCCESS_TX } },
        select: { creatorEarnings: true, createdAt: true },
      },
      bookings: {
        where: {
          status: {
            in: ['paid', 'first_payout_done', 'service_day', 'completed'],
          },
        },
        select: { id: true },
      },
      bankAccount: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

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

    const subaccountStatus = String(creator.subaccountStatus || 'INACTIVE');
    const paystackSubaccountCode = creator.paystackSubaccountCode || null;
    const paymentsReady = isPaymentsReady(
      {
        bvnVerified: creator.bvnVerified,
        paystackSubaccountCode,
        subaccountStatus,
      },
      { requireKyc }
    );
    const platformPlan = String(creator.platformPlan || 'FREE');
    const platformSubscriptionActive = Boolean(creator.platformSubscriptionActive);
    const feePercent = feePercentForCreator({
      platformPlan,
      platformSubscriptionActive,
    });

    let healthScore = 0;
    if (paymentsReady) healthScore += 40;
    else if (paystackSubaccountCode) healthScore += 15;
    if (creator.bvnVerified || !requireKyc) healthScore += 15;
    if (completedBookings > 0) healthScore += 25;
    if (totalEarnedKobo > 0) healthScore += 10;
    if (platformSubscriptionActive || platformPlan === 'PRO') healthScore += 10;

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
      paystackSubaccountCode,
      subaccountStatus,
      payoutMethod: String(creator.payoutMethod || 'SCHEDULED_BULK'),
      paymentsReady,
      hasBankAccount: Boolean(creator.bankAccount),
      bvnVerified: Boolean(creator.bvnVerified),
      platformPlan,
      platformSubscriptionActive,
      feePercent,
    };
  });
}

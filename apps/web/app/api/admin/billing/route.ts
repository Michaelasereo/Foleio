import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { feePercentForCreator } from '@/lib/billing/platform-fee';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const platformSubs = await prisma.platformSubscription.findMany({
    include: {
      creator: {
        select: {
          displayName: true,
          username: true,
          platformPlan: true,
          platformSubscriptionActive: true,
          growthEligible: true,
          paystackSubaccountCode: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const enriched = platformSubs.map((sub) => {
    const platformPlan = sub.creator?.platformPlan || 'FREE';
    const platformSubscriptionActive = Boolean(
      sub.creator?.platformSubscriptionActive ||
        ['active', 'trialing'].includes(String(sub.status || '').toLowerCase())
    );
    const feePercent = feePercentForCreator({
      platformPlan,
      platformSubscriptionActive,
      platformSubscription: {
        plan: sub.plan,
        amount: sub.amount,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
    });
    return {
      ...sub,
      feePercent,
      feeSynced: Boolean(sub.creator?.paystackSubaccountCode),
    };
  });

  return Response.json({ platformSubs: enriched });
}

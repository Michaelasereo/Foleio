import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { feePercentForCreator } = await import('@/lib/billing/platform-fee');

  const platformSubs = await prisma.platformSubscription.findMany({
    include: {
      creator: {
        select: {
          displayName: true,
          username: true,
          platformPlan: true,
          platformSubscriptionActive: true,
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
    });
    return {
      ...sub,
      feePercent,
      feeSynced: Boolean(sub.creator?.paystackSubaccountCode),
    };
  });

  return Response.json({ platformSubs: enriched });
}

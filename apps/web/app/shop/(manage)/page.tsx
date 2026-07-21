import { redirect } from 'next/navigation';
import { CreatorShopManager } from '@/components/shop/CreatorShopManager';
import { getCreatorForUser, getCurrentUser } from '@/lib/creator/cached-lookups';
import { prisma } from '@foleio/database';

export default async function CreatorShopPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const creator = await getCreatorForUser(user.id);
  if (!creator) redirect('/onboarding');
  if (creator.isBanned) redirect('/dashboard');

  // Align shop Pro gates with Billing: cancelled/expired subs are Free even if
  // creator.platformSubscriptionActive was left true after cancel.
  const subscription = await prisma.platformSubscription.findUnique({
    where: { creatorId: creator.id },
    select: { status: true },
  });
  const status = (subscription?.status || '').toLowerCase();
  const subscriptionPaid = status === 'active' || status === 'trialing';
  const platformSubscriptionActive =
    subscriptionPaid && Boolean(creator.platformSubscriptionActive);

  return (
    <CreatorShopManager
      platformPlan={creator.platformPlan}
      platformSubscriptionActive={platformSubscriptionActive}
    />
  );
}

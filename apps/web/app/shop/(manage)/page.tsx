import { redirect } from 'next/navigation';
import { CreatorShopManager } from '@/components/shop/CreatorShopManager';
import { getCreatorPaidActiveForId } from '@/lib/billing/effective-plan-limits';
import { getCreatorForUser, getCurrentUser } from '@/lib/creator/cached-lookups';

export default async function CreatorShopPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const creator = await getCreatorForUser(user.id);
  if (!creator) redirect('/onboarding');
  if (creator.isBanned) redirect('/dashboard');

  const platformSubscriptionActive = await getCreatorPaidActiveForId(
    creator.id,
    creator.platformSubscriptionActive
  );

  return (
    <CreatorShopManager
      platformPlan={creator.platformPlan}
      platformSubscriptionActive={platformSubscriptionActive}
    />
  );
}

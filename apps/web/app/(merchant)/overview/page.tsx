import { redirect } from 'next/navigation';
import { CreatorOverview } from '@/components/creator/CreatorOverview';
import { getCreatorForUser, getCurrentUser } from '@/lib/creator/cached-lookups';

export default async function CreatorOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const creator = await getCreatorForUser(user.id);
  if (!creator) redirect('/onboarding');

  const publicPath = creator.username ? `/creator/${creator.username}` : '/dashboard';

  return <CreatorOverview publicPath={publicPath} />;
}

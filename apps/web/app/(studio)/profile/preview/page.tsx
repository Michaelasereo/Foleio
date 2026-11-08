import { redirect } from 'next/navigation';
import { prisma } from '@foleio/database';
import { PublicProfilePreview } from '@/components/creator/PublicProfilePreview';
import { resolveCreatorShellContext } from '@/lib/creator/shell-context';
import {
  usernameChangeAllowed,
  usernameChangeEligibleAt,
} from '@/lib/creator/username-change';

export const dynamic = 'force-dynamic';

export default async function ProfilePreviewPage() {
  const { creator, authenticated } = await resolveCreatorShellContext();

  if (!creator && !authenticated) {
    redirect('/login');
  }
  if (!creator) {
    redirect('/onboard');
  }

  const row = await prisma.creator.findUnique({
    where: { id: creator.id },
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      bannerUrl: true,
      bio: true,
      usernameChangedAt: true,
      user: { select: { createdAt: true } },
      usernameChangeRequests: {
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { requestedUsername: true },
      },
    },
  });

  if (!row) {
    redirect('/onboard');
  }

  const eligibleAt = usernameChangeEligibleAt(row.usernameChangedAt, row.user.createdAt);

  return (
    <PublicProfilePreview
      username={row.username}
      displayName={row.displayName}
      avatarUrl={row.avatarUrl}
      bannerUrl={row.bannerUrl}
      bio={row.bio ?? ''}
      eligible={usernameChangeAllowed(row.usernameChangedAt, row.user.createdAt)}
      eligibleAt={eligibleAt.toISOString()}
      pendingUsername={row.usernameChangeRequests[0]?.requestedUsername ?? null}
    />
  );
}

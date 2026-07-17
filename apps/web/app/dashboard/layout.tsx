import { redirect } from 'next/navigation';
import { serializeForClient } from '@/lib/utils';
import { CreatorAppShell } from '@/components/creator/CreatorAppShell';
import { getCreatorForUser, getCurrentUser } from '@/lib/creator/cached-lookups';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return <>{children}</>;
  }

  let creator: Awaited<ReturnType<typeof getCreatorForUser>> = null;
  let creatorLookupFailed = false;

  try {
    creator = await getCreatorForUser(user.id);
  } catch {
    console.warn('Dashboard layout creator lookup failed (non-fatal).');
    creator = null;
    creatorLookupFailed = true;
  }

  // Confirmed missing Creator (not a transient DB failure) → onboarding.
  if (!creator && !creatorLookupFailed) {
    redirect('/onboard');
  }

  if (!creator) {
    return (
      <div className="foleio-auth-root flex min-h-screen items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <h1 className="foleio-auth-title text-2xl">Loading dashboard…</h1>
          <p className="mt-3 text-sm text-[#adadad]">
            We’re having trouble reaching your account. Refresh in a moment.
          </p>
        </div>
      </div>
    );
  }

  if (creator.isBanned) {
    return (
      <div className="foleio-auth-root flex min-h-screen items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <h1 className="foleio-auth-title text-2xl">Account Suspended</h1>
          <p className="mt-3 text-sm text-[#adadad]">
            Your account has been suspended for violating our content guidelines.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CreatorAppShell creator={serializeForClient(creator)}>
      {children}
    </CreatorAppShell>
  );
}

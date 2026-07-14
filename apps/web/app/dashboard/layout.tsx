import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { serializeForClient } from '@/lib/utils';
import { CreatorAppShell } from '@/components/creator/CreatorAppShell';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  let creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    category: string;
    platformPlan: string | null;
    platformSubscriptionActive: boolean;
    isBanned: boolean;
  } | null = null;
  let creatorLookupFailed = false;

  try {
    creator = await withTimeout(
      prisma.creator.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bannerUrl: true,
          category: true,
          platformPlan: true,
          platformSubscriptionActive: true,
          isBanned: true,
        },
      }),
      12000
    );
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

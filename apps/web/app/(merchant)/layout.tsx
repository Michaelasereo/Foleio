import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { serializeForClient } from '@/lib/utils';
import { CreatorAppShell } from '@/components/creator/CreatorAppShell';
import { resolveCreatorShellContext } from '@/lib/creator/shell-context';

/**
 * Shared shell for merchant routes so sidebar/header stay mounted while
 * only the main content segment suspends into loading.tsx skeletons.
 */
export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    creator,
    supportMode,
    lookupFailed: creatorLookupFailed,
    authenticated,
  } = await resolveCreatorShellContext();

  if (!creator && !authenticated && !supportMode) {
    return <>{children}</>;
  }

  if (!creator && authenticated && !creatorLookupFailed && !supportMode) {
    redirect('/onboard');
  }

  if (!creator) {
    return (
      <div className="foleio-auth-root flex min-h-screen items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <h1 className="foleio-auth-title text-2xl">Loading…</h1>
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
    <Suspense fallback={null}>
      <CreatorAppShell
        creator={serializeForClient(creator)}
        supportMode={supportMode}
      >
        {children}
      </CreatorAppShell>
    </Suspense>
  );
}

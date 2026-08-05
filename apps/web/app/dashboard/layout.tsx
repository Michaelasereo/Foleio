import { redirect } from 'next/navigation';
import { serializeForClient } from '@/lib/utils';
import { CreatorAppShell } from '@/components/creator/CreatorAppShell';
import { resolveCreatorShellContext } from '@/lib/creator/shell-context';

export default async function DashboardLayout({
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
    <CreatorAppShell creator={serializeForClient(creator)} supportMode={supportMode}>
      {children}
    </CreatorAppShell>
  );
}

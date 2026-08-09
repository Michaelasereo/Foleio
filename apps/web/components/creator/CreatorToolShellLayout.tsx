import { Suspense } from 'react';
import { serializeForClient } from '@/lib/utils';
import { CreatorAppShell } from '@/components/creator/CreatorAppShell';
import { resolveCreatorShellContext } from '@/lib/creator/shell-context';

/** Shared shell layout for bookings / settings / analytics / earnings. */
export async function CreatorToolShellLayout({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const { creator, supportMode, lookupFailed } = await resolveCreatorShellContext();

  if (!creator && !lookupFailed && !supportMode) {
    return <>{children}</>;
  }

  if (!creator) {
    return <div className="foleio-auth-root min-h-screen">{children}</div>;
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
    <Suspense fallback={<div className="foleio-auth-root min-h-screen">{children}</div>}>
      <CreatorAppShell
        creator={serializeForClient(creator)}
        supportMode={supportMode}
        title={label}
      >
        {children}
      </CreatorAppShell>
    </Suspense>
  );
}

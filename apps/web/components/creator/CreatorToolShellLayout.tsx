import { serializeForClient } from '@/lib/utils';
import { CreatorAppShell } from '@/components/creator/CreatorAppShell';
import { getCreatorForUser, getCurrentUser } from '@/lib/creator/cached-lookups';

/** Shared shell layout for bookings / settings / analytics / earnings. */
export async function CreatorToolShellLayout({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return <>{children}</>;
  }

  let creator: Awaited<ReturnType<typeof getCreatorForUser>> = null;

  try {
    creator = await getCreatorForUser(user.id);
  } catch {
    console.warn(`${label} layout creator lookup failed (non-fatal).`);
    creator = null;
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
    <CreatorAppShell creator={serializeForClient(creator)}>
      {children}
    </CreatorAppShell>
  );
}

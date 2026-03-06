import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { serializeForClient } from '@/lib/utils';
import { CreatorSidebar } from '@/components/creator/CreatorSidebar';
import { OnboardingRequired } from '@/components/creator/OnboardingRequired';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  // Check if user is a creator. If DB is temporarily unreachable,
  // fail open to the child route instead of crashing the whole app shell.
  let creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null = null;

  try {
    creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true
      },
    });
  } catch (error) {
    // Keep this non-fatal and avoid triggering noisy dev error overlays.
    console.warn('Dashboard layout creator lookup failed (non-fatal).');
    creator = null;
  }

  if (!creator) {
    // User is logged in but not a creator - show onboarding prompt
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  // User is a creator - show the sidebar layout
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <CreatorSidebar creator={serializeForClient(creator)} />
      <main className="flex-1 lg:ml-0">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

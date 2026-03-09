import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { serializeForClient } from '@/lib/utils';
import { CreatorSidebar } from '@/components/creator/CreatorSidebar';
import { MilestoneCelebration } from '@/components/creator/MilestoneCelebration';

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Check if user is a creator
  let creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    platformPlan: string | null;
    availableBalance: number;
    isBanned: boolean;
    creatorLinks: { id: string; label: string; url: string }[];
  } | null = null;

  try {
    creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        platformPlan: true,
        availableBalance: true,
        isBanned: true,
        creatorLinks: {
          where: { isActive: true },
          select: {
            id: true,
            label: true,
            url: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  } catch {
    // Fallback for schema drift: query only legacy-safe columns.
    try {
      const legacyCreator = await prisma.creator.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      creator = legacyCreator
        ? {
            ...legacyCreator,
            platformPlan: null,
            availableBalance: 0,
            isBanned: false,
            creatorLinks: [],
          }
        : null;
    } catch {
      console.warn('Creator layout lookup failed (non-fatal).');
      creator = null;
    }
  }

  // If no creator account, allow route-level fallback UIs instead of forcing onboarding.
  if (!creator) {
    return (
      <main className="min-h-screen bg-background">
        <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    );
  }

  if (creator.isBanned) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Account Suspended</h1>
          <p className="mt-3 text-muted-foreground">
            Your account has been suspended for violating our content guidelines.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <CreatorSidebar creator={serializeForClient(creator)} />
      <main className="h-screen flex-1 overflow-y-auto lg:ml-0">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <MilestoneCelebration />
    </div>
  );
}


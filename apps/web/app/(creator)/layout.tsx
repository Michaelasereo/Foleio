import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { serializeForClient } from '@/lib/utils';
import { CreatorSidebar } from '@/components/creator/CreatorSidebar';
import { OnboardingRequired } from '@/components/creator/OnboardingRequired';

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
  } | null = null;

  try {
    creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });
  } catch {
    console.warn('Creator layout lookup failed (non-fatal).');
    creator = null;
  }

  // If no creator account, show onboarding prompt instead of redirecting
  if (!creator) {
    return (
      <OnboardingRequired
        userEmail={session.user.email || 'user'}
        pageName="Creator Dashboard"
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <CreatorSidebar creator={serializeForClient(creator)} />
      <main className="flex-1 lg:ml-0">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}


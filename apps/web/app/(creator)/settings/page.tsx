import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { AccountSettingsTabs } from '@/components/creator/AccountSettingsTabs';
import { OnboardingPrompt } from '@/components/ui/onboarding-prompt';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  let creator: Awaited<ReturnType<typeof prisma.creator.findUnique>> = null;
  try {
    creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true,
      },
    });
  } catch {
    console.warn('Settings page creator lookup failed (non-fatal).');
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <OnboardingPrompt
          userEmail={session.user.email || 'user'}
          completedSteps={0}
          totalSteps={4}
        />
      </div>
    );
  }

  // If no creator account, show onboarding prompt instead of redirecting
  if (!creator) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <OnboardingPrompt
          userEmail={session.user.email || 'user'}
          completedSteps={0}
          totalSteps={4}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, privacy and account preferences
        </p>
      </div>
      <AccountSettingsTabs
        creator={{
          id: creator.id,
          username: creator.username,
          displayName: creator.displayName,
          bio: creator.bio,
          avatarUrl: creator.avatarUrl,
          instagramHandle: creator.instagramHandle,
          tiktokHandle: creator.tiktokHandle,
        }}
      />
    </div>
  );
}

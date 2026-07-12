import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { AccountSettingsTabs } from '@/components/creator/AccountSettingsTabs';
import { OnboardingPrompt } from '@/components/ui/onboarding-prompt';
import SettingsLoading from './loading';

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
      <div>
        <h1 className="foleio-auth-title">Settings</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          We could not load your account right now. Please try again in a moment.
        </p>
        <div style={{ marginTop: 24 }}>
          <OnboardingPrompt
            userEmail={session.user.email || 'user'}
            completedSteps={0}
            totalSteps={4}
          />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div>
        <h1 className="foleio-auth-title">Settings</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          Finish setting up your creator profile to manage account settings.
        </p>
        <div style={{ marginTop: 24 }}>
          <OnboardingPrompt
            userEmail={session.user.email || 'user'}
            completedSteps={0}
            totalSteps={4}
          />
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<SettingsLoading />}>
      <AccountSettingsTabs
        creator={{
          id: creator.id,
          username: creator.username,
          displayName: creator.displayName,
          bio: creator.bio,
          category: creator.category,
          avatarUrl: creator.avatarUrl,
          instagramHandle: creator.instagramHandle,
          tiktokHandle: creator.tiktokHandle,
        }}
      />
    </Suspense>
  );
}

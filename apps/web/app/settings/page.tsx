import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { AccountSettingsTabs } from '@/components/creator/AccountSettingsTabs';
import { OnboardingPrompt } from '@/components/ui/onboarding-prompt';
import { serializeForClient } from '@/lib/utils';
import SettingsLoading from './loading';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  let creator: {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    category: string | null;
    avatarUrl: string | null;
    instagramHandle: string | null;
    tiktokHandle: string | null;
    creatorLinks: Array<{ linkType: string; url: string }>;
  } | null = null;

  try {
    creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        category: true,
        avatarUrl: true,
        instagramHandle: true,
        tiktokHandle: true,
        creatorLinks: {
          where: {
            linkType: { in: ['twitter', 'portfolio'] },
            isActive: true,
          },
          select: {
            linkType: true,
            url: true,
          },
        },
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

  const twitterUrl =
    creator.creatorLinks.find((link) => link.linkType === 'twitter')?.url || null;
  const portfolioUrl =
    creator.creatorLinks.find((link) => link.linkType === 'portfolio')?.url || null;

  let currentSubscription: unknown = null;
  let billingHistory: unknown[] = [];
  try {
    const subscriptions = await prisma.platformSubscription.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });
    currentSubscription = serializeForClient(subscriptions[0] || null);
    billingHistory = serializeForClient(subscriptions) as unknown[];
  } catch {
    console.warn('Settings billing lookup failed (non-fatal).');
  }

  let gallerySectionId: string | null = null;
  let galleryItems: Array<{
    id: string;
    imageUrl: string;
    caption: string | null;
    orderIndex: number;
  }> = [];
  try {
    const section = await prisma.portfolioSection.findFirst({
      where: { creatorId: creator.id },
      orderBy: { orderIndex: 'asc' },
      include: {
        items: { orderBy: { orderIndex: 'asc' } },
      },
    });
    if (section) {
      gallerySectionId = section.id;
      galleryItems = serializeForClient(
        section.items.map((item) => ({
          id: item.id,
          imageUrl: item.imageUrl,
          caption: item.caption,
          orderIndex: item.orderIndex,
        }))
      );
    }
  } catch {
    console.warn('Settings portfolio lookup failed (non-fatal).');
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
          twitterUrl,
          portfolioUrl,
        }}
        userEmail={session.user.email}
        billing={{
          currentSubscription: currentSubscription as any,
          billingHistory: billingHistory as any[],
        }}
        portfolio={{
          sectionId: gallerySectionId,
          items: galleryItems,
        }}
      />
    </Suspense>
  );
}

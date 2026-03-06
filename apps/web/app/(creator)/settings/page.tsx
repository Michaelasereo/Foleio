import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { SettingsForm } from '@/components/creator/SettingsForm';
import { CreatorLinksManager } from '@/components/creator/CreatorLinksManager';
import { PublicProfileCard } from '@/components/creator/PublicProfileCard';
import { LogoutButton } from '@/components/creator/LogoutButton';
import { OnboardingPrompt } from '@/components/ui/onboarding-prompt';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/creator/${creator.username}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and account settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6 space-y-6">
          {/* Public Profile Link */}
          <PublicProfileCard publicUrl={publicUrl} username={creator.username} />

          {/* Profile Settings */}
          <SettingsForm creator={creator} />

          {/* Links Management (Linktree-style) */}
          <CreatorLinksManager />
        </TabsContent>
        <TabsContent value="account" className="mt-6">
          {/* Logout */}
          <LogoutButton />
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Check, Copy, ExternalLink, Globe, Loader2, Plus, Share2, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { ProfileCardModal } from '@/components/creator/ProfileCardModal';
import { ProfileCardPreview } from '@/components/creator/ProfileCardPreview';
import { CreatorLinksManager } from '@/components/creator/CreatorLinksManager';
import { INDUSTRY_OPTIONS } from '@/lib/constants/industries';

type SettingsTab = 'profile' | 'subscription' | 'notifications' | 'billing' | 'security';

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
];

interface AccountSettingsTabsProps {
  creator: {
    id: string;
    username: string;
    displayName: string;
    bio?: string | null;
    category?: string | null;
    avatarUrl?: string | null;
    instagramHandle?: string | null;
    tiktokHandle?: string | null;
  };
}

export function AccountSettingsTabs({ creator }: AccountSettingsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [showCardModal, setShowCardModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState(2000);
  const [perks, setPerks] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(creator.avatarUrl || null);
  const [username, setUsername] = useState(creator.username || '');
  const [displayName, setDisplayName] = useState(creator.displayName || '');
  const [bio, setBio] = useState(creator.bio || '');
  const [industry, setIndustry] = useState(creator.category || '');
  const [instagramHandle, setInstagramHandle] = useState(creator.instagramHandle || '');
  const [tiktokHandle, setTiktokHandle] = useState(creator.tiktokHandle || '');

  useEffect(() => {
    if (searchParams.get('tab') === 'profile') {
      setActiveTab('profile');
    }
    if (searchParams.get('share') === 'true') {
      const timer = setTimeout(() => setShowCardModal(true), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    async function loadProfileSettings() {
      try {
        const response = await fetch('/api/creator/profile', {
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !isMounted) return;
        const profile = payload?.creator || {};
        setUsername(profile.username ?? creator.username ?? '');
        setDisplayName(profile.displayName ?? creator.displayName ?? '');
        setBio(profile.bio ?? creator.bio ?? '');
        setIndustry(profile.industry ?? creator.category ?? '');
        setInstagramHandle(profile.instagramHandle ?? creator.instagramHandle ?? '');
        setTiktokHandle(profile.tiktokHandle ?? creator.tiktokHandle ?? '');
        setAvatarUrl(profile.avatarUrl ?? creator.avatarUrl ?? null);
      } catch {
        // Keep existing server-provided values if profile fetch fails.
      }
    }
    void loadProfileSettings();
    return () => {
      isMounted = false;
    };
  }, [
    creator.avatarUrl,
    creator.bio,
    creator.category,
    creator.displayName,
    creator.instagramHandle,
    creator.tiktokHandle,
    creator.username,
  ]);

  useEffect(() => {
    let isMounted = true;
    async function loadSubscriptionSettings() {
      try {
        const response = await fetch('/api/creator/subscription-settings', {
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !isMounted) return;
        const creatorSettings = payload?.creator || {};
        setSubscriptionEnabled(Boolean(creatorSettings.subscriptionEnabled ?? false));
        setMonthlyPrice(
          Number(creatorSettings.monthlyPrice ?? 2000) > 0
            ? Number(creatorSettings.monthlyPrice)
            : 2000
        );
        setPerks(
          Array.isArray(creatorSettings.subscriptionPerks)
            ? creatorSettings.subscriptionPerks
            : []
        );
      } finally {
        if (isMounted) {
          setSubscriptionLoading(false);
        }
      }
    }
    void loadSubscriptionSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentCreator = useMemo(
    () => ({
      username: creator.username,
      displayName: displayName.trim() || creator.displayName,
      bio: bio.trim() || null,
      avatarUrl,
    }),
    [avatarUrl, bio, creator.displayName, creator.username, displayName]
  );
  const appBaseUrl = useMemo(() => {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined') {
      return window.location.origin.replace(/\/+$/, '');
    }
    return 'https://foleio.com';
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: 'Invalid image format',
        description: 'Please upload JPG, PNG or WebP',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB.',
        variant: 'destructive',
      });
      return;
    }

    const optimisticUrl = URL.createObjectURL(file);
    const previousAvatar = avatarUrl;
    setAvatarUrl(optimisticUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/creator/upload-avatar', {
        method: 'POST',
        body: formData,
      });
      let uploadData: any = {};
      try {
        uploadData = await uploadRes.json();
      } catch {
        uploadData = {};
      }

      let uploadedUrl = uploadData?.url || uploadData?.data?.url;

      if (!uploadRes.ok || !uploadedUrl) {
        // Fallback to known working profile upload API.
        const fallbackForm = new FormData();
        fallbackForm.append('file', file);
        fallbackForm.append('type', 'avatar');

        const fallbackRes = await fetch('/api/upload/profile', {
          method: 'POST',
          body: fallbackForm,
        });
        try {
          uploadData = await fallbackRes.json();
        } catch {
          uploadData = {};
        }
        uploadedUrl = uploadData?.url || uploadData?.data?.url;

        if (!fallbackRes.ok || !uploadedUrl) {
          const msg =
            uploadData?.details || uploadData?.error || 'Upload failed. Please try again.';
          console.error('[avatar-upload] Server error:', msg);
          throw new Error(msg);
        }
      }

      setAvatarUrl(uploadedUrl);

      await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: uploadedUrl }),
      });

      toast({
        title: 'Profile photo updated',
        description: 'Your avatar is live across your profile.',
      });
    } catch (error: any) {
      setAvatarUrl(previousAvatar || null);
      toast({
        title: 'Upload failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      URL.revokeObjectURL(optimisticUrl);
      setUploading(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const response = await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim(),
          bio: bio.trim(),
          industry,
          avatarUrl: avatarUrl || null,
          instagramHandle: instagramHandle.trim(),
          tiktokHandle: tiktokHandle.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save profile');
      }

      toast({
        title: 'Saved',
        description: 'Your profile updates are live.',
      });
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Could not save changes',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleSubscription(nextValue: boolean) {
    setSubscriptionEnabled(nextValue);
    setSubscriptionSaving(true);
    try {
      const response = await fetch('/api/creator/subscription-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionEnabled: nextValue }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to update subscription setting');
      }
      toast({
        title: 'Subscription updated',
        description: nextValue ? 'Fans can now subscribe to you.' : 'Fan subscriptions are turned off.',
      });
    } catch (error: any) {
      setSubscriptionEnabled(!nextValue);
      toast({
        title: 'Could not update subscription',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubscriptionSaving(false);
    }
  }

  async function handleSaveSubscriptionSettings() {
    if (subscriptionEnabled && monthlyPrice < 500) {
      toast({
        title: 'Invalid price',
        description: 'Minimum monthly subscription price is ₦500.',
        variant: 'destructive',
      });
      return;
    }

    setSubscriptionSaving(true);
    try {
      const cleanedPerks = perks.map((perk) => perk.trim()).filter(Boolean);
      const response = await fetch('/api/creator/subscription-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionEnabled,
          monthlyPrice,
          subscriptionPerks: cleanedPerks,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save subscription settings');
      }
      setPerks(cleanedPerks);
      toast({
        title: 'Saved',
        description: 'Subscription settings updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Could not save subscription settings',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubscriptionSaving(false);
    }
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="w-full">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="max-w-xl space-y-8">
            <div>
              <h3 className="mb-4 font-semibold text-foreground">Profile Photo</h3>
              <div className="flex items-center gap-6">
                <div
                  className="group relative h-24 w-24 flex-shrink-0 cursor-pointer"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl || '/placeholder-avatar.png'}
                    alt={displayName || creator.displayName}
                    className="h-24 w-24 rounded-full border-4 border-border object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <>
                        <Camera className="h-5 w-5 text-white" />
                        <span className="text-xs text-white">Change</span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="mb-1 block text-sm font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    Upload new photo
                  </button>
                  <p className="text-xs text-muted-foreground">JPG, PNG or WebP · Max 5MB</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Recommended: square image, at least 400×400px
                  </p>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>

            <div className="border-t border-border" />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Username
              </label>
              <input
                type="text"
                value={username}
                maxLength={30}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9_-]/g, '')
                  )
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Your profile URL: {appBaseUrl}/creator/{username || creator.username}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                maxLength={50}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Bio
                <span className="ml-2 font-normal text-muted-foreground">{bio.length}/150</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={150}
                rows={3}
                placeholder="Tell your audience who you are..."
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Category</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Select your category</option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                This shows on your public profile
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Instagram Handle
              </label>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="@username"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                TikTok Handle
              </label>
              <input
                type="text"
                value={tiktokHandle}
                onChange={(e) => setTiktokHandle(e.target.value)}
                placeholder="@username"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Your Public Profile
              </label>
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5">
                  <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm text-foreground">
                    {appBaseUrl}/creator/{username || creator.username}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const profileUrl = `${appBaseUrl}/creator/${username || creator.username}`;
                    void navigator.clipboard.writeText(profileUrl);
                    toast({ title: 'Link copied! 🧡' });
                  }}
                  className="flex-shrink-0 rounded-xl border border-border p-2.5 transition-colors hover:bg-muted"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
                <a
                  href={`${appBaseUrl}/creator/${username || creator.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 rounded-xl border border-border p-2.5 transition-colors hover:bg-muted"
                  title="Open profile"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving || uploading}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>

            <div className="border-t border-border" />

            <div>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Share Your Profile Card</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Download a beautiful card to share on Instagram, WhatsApp and X.
                  </p>
                </div>
              </div>

              <div
                className="group relative mt-4 cursor-pointer"
                onClick={() => setShowCardModal(true)}
              >
                <div className="aspect-[9/16] w-full max-w-[160px] overflow-hidden rounded-2xl border-2 border-border shadow-md transition-colors group-hover:border-primary">
                  <ProfileCardPreview template="world" creator={currentCreator} size="thumbnail" />
                </div>
                <div className="absolute inset-0 flex max-w-[160px] items-center justify-center rounded-2xl bg-black/0 transition-colors group-hover:bg-black/10">
                  <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    <Share2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">Customise & Share</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowCardModal(true)}
                className="mt-4 flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Create Share Card
              </Button>
            </div>

            <div className="border-t border-border" />
            <CreatorLinksManager />
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-5">
              <div>
                <h3 className="font-semibold text-foreground">Fan Subscriptions</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Allow fans to subscribe monthly for access to your content
                </p>
              </div>
              <Switch
                checked={subscriptionEnabled}
                onCheckedChange={handleToggleSubscription}
                disabled={subscriptionLoading || subscriptionSaving}
              />
            </div>

            {subscriptionEnabled ? (
              <div className="space-y-6">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Monthly Price (₦)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">₦</span>
                    <input
                      type="number"
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(Number(e.target.value) || 0)}
                      min={500}
                      step={100}
                      placeholder="2000"
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Minimum ₦500 · You keep 97% = ₦
                    {Math.floor(Math.max(monthlyPrice, 0) * 0.97).toLocaleString()}/month per
                    subscriber
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    What subscribers get
                  </label>
                  <div className="space-y-2">
                    {perks.map((perk, i) => (
                      <div key={`${i}-${perk}`} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={perk}
                          onChange={(e) => {
                            const updated = [...perks];
                            updated[i] = e.target.value;
                            setPerks(updated);
                          }}
                          placeholder="e.g. Access to all videos"
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                        <button
                          onClick={() => setPerks(perks.filter((_, pi) => pi !== i))}
                          className="rounded-lg p-2 hover:bg-red-50"
                          type="button"
                        >
                          <X className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setPerks([...perks, ''])}
                      className="flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80"
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      Add perk
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-[#FDF8F2] p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    How it looks to fans
                  </p>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-lg font-bold text-foreground">
                      ₦{Math.max(monthlyPrice, 0).toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </p>
                    <div className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                      Subscribe
                    </div>
                  </div>
                  {perks.some((perk) => perk.trim()) ? (
                    <ul className="space-y-1.5">
                      {perks
                        .filter((perk) => perk.trim())
                        .map((perk, i) => (
                          <li key={`${perk}-${i}`} className="flex items-center gap-2 text-sm text-foreground">
                            <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <Check className="h-2.5 w-2.5 text-primary" />
                            </div>
                            {perk}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>

                <Button
                  onClick={handleSaveSubscriptionSettings}
                  disabled={subscriptionSaving || subscriptionLoading}
                >
                  {subscriptionSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Subscription Settings'
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Notification controls are coming soon.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <div className="rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground">Billing</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage billing details from the billing workspace.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/billing')}>
              Go to Billing
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground">Security</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Password and account security controls will appear here.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <ProfileCardModal
        open={showCardModal}
        onOpenChange={setShowCardModal}
        onAvatarUpdated={(url) => setAvatarUrl(url)}
        creator={currentCreator}
      />
    </>
  );
}

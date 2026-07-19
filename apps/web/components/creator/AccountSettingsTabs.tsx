'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Copy, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { broadcastAvatarUpdated } from '@/lib/creator/profile-live';
import { CreatorLinksManager } from '@/components/creator/CreatorLinksManager';
import { PortfolioGallerySettings } from '@/components/creator/PortfolioGallerySettings';
import { BillingPage } from '@/components/creator/BillingPage';
import { SupportChatSettings } from '@/components/creator/SupportChatSettings';
import { BookingPolicySettings } from '@/components/booking/BookingPolicySettings';
import { BIO_MAX_WORDS, countBioWords, trimBioToMaxWords } from '@/lib/creator/bio';
import { INDUSTRY_OPTIONS } from '@/lib/constants/industries';
import { parseSocialUrl } from '@/lib/creator/social-urls';

type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'policy'
  | 'portfolio'
  | 'billing'
  | 'support';

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'billing', label: 'Billing' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'policy', label: 'Deposits & policy' },
  { id: 'support', label: 'Chat with us' },
];

type SubscriptionRecord = {
  id: string;
  plan: string;
  amount: number;
  status: string;
  billingInterval?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
};

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
    twitterUrl?: string | null;
    portfolioUrl?: string | null;
    growthEligible?: boolean;
    platformPlan?: string | null;
    platformSubscriptionActive?: boolean;
  };
  billing?: {
    currentSubscription: SubscriptionRecord | null;
    billingHistory: SubscriptionRecord[];
  };
  portfolio?: {
    sectionId: string | null;
    items: Array<{
      id: string;
      imageUrl: string;
      caption: string | null;
      orderIndex: number;
    }>;
  };
  userEmail?: string | null;
}

export function AccountSettingsTabs({
  creator,
  billing,
  portfolio,
  userEmail,
}: AccountSettingsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(creator.avatarUrl || null);
  const [username, setUsername] = useState(creator.username || '');
  const [displayName, setDisplayName] = useState(creator.displayName || '');
  const [bio, setBio] = useState(creator.bio || '');
  const [industry, setIndustry] = useState(creator.category || '');
  const [instagramUrl, setInstagramUrl] = useState(creator.instagramHandle || '');
  const [tiktokUrl, setTiktokUrl] = useState(creator.tiktokHandle || '');
  const [twitterUrl, setTwitterUrl] = useState(creator.twitterUrl || '');
  const [portfolioUrl, setPortfolioUrl] = useState(creator.portfolioUrl || '');
  const [urlErrors, setUrlErrors] = useState<{
    instagramUrl?: string;
    tiktokUrl?: string;
    twitterUrl?: string;
    portfolioUrl?: string;
  }>({});

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (
      tab === 'profile' ||
      tab === 'notifications' ||
      tab === 'policy' ||
      tab === 'portfolio' ||
      tab === 'billing' ||
      tab === 'support'
    ) {
      setActiveTab(tab);
    }
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
        setInstagramUrl(
          profile.instagramUrl ??
            profile.instagramHandle ??
            creator.instagramHandle ??
            ''
        );
        setTiktokUrl(
          profile.tiktokUrl ?? profile.tiktokHandle ?? creator.tiktokHandle ?? ''
        );
        setTwitterUrl(profile.twitterUrl ?? creator.twitterUrl ?? '');
        setPortfolioUrl(profile.portfolioUrl ?? creator.portfolioUrl ?? '');
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
    creator.portfolioUrl,
    creator.tiktokHandle,
    creator.twitterUrl,
    creator.username,
  ]);

  const appBaseUrl = useMemo(() => {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined') {
      return window.location.origin.replace(/\/+$/, '');
    }
    return 'https://foleio.com';
  }, []);

  const profileUrl = `${appBaseUrl}/creator/${username || creator.username}`;

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'profile') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    router.replace(query ? `/settings?${query}` : '/settings', { scroll: false });
  }

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

      broadcastAvatarUpdated(uploadedUrl);
      router.refresh();

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
    const fields = {
      instagramUrl,
      tiktokUrl,
      twitterUrl,
      portfolioUrl,
    } as const;

    const nextErrors: typeof urlErrors = {};
    const cleaned: Record<keyof typeof fields, string> = {
      instagramUrl: '',
      tiktokUrl: '',
      twitterUrl: '',
      portfolioUrl: '',
    };

    (Object.keys(fields) as Array<keyof typeof fields>).forEach((key) => {
      const parsed = parseSocialUrl(fields[key]);
      if (!parsed.ok) {
        nextErrors[key] = parsed.error;
        return;
      }
      cleaned[key] = parsed.url || '';
    });

    setUrlErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast({
        title: 'Check your links',
        description: 'Enter a valid URL for each filled field, or leave it blank.',
        variant: 'destructive',
      });
      return;
    }

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
          instagramUrl: cleaned.instagramUrl,
          tiktokUrl: cleaned.tiktokUrl,
          twitterUrl: cleaned.twitterUrl,
          portfolioUrl: cleaned.portfolioUrl,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save profile');
      }

      const updated = payload?.creator;
      if (updated) {
        setInstagramUrl(updated.instagramUrl ?? cleaned.instagramUrl);
        setTiktokUrl(updated.tiktokUrl ?? cleaned.tiktokUrl);
        setTwitterUrl(updated.twitterUrl ?? cleaned.twitterUrl);
        setPortfolioUrl(updated.portfolioUrl ?? cleaned.portfolioUrl);
      } else {
        setInstagramUrl(cleaned.instagramUrl);
        setTiktokUrl(cleaned.tiktokUrl);
        setTwitterUrl(cleaned.twitterUrl);
        setPortfolioUrl(cleaned.portfolioUrl);
      }
      setUrlErrors({});

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

  return (
    <>
      <div className="foleio-dash-header">
        <div>
          <h1 className="foleio-auth-title">Settings</h1>
          <p className="foleio-dash-panel-meta" style={{ marginTop: 6, marginBottom: 0 }}>
            Manage your profile, privacy and account preferences
          </p>
        </div>
      </div>

      <div className="foleio-dash-tabs" role="tablist" aria-label="Settings sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`foleio-dash-tab${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' ? (
        <div className="foleio-dash-settings">
          <div className="foleio-dash-panel">
            <h2 className="foleio-dash-panel-title">Profile photo</h2>
            <p className="foleio-dash-panel-meta">
              JPG, PNG or WebP · Max 5MB · Square, at least 400×400px
            </p>
            <div className="foleio-dash-avatar-row">
              <div
                className={`foleio-dash-avatar${uploading ? ' is-busy' : ''}`}
                onClick={() => avatarInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    avatarInputRef.current?.click();
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl || '/placeholder-avatar.png'}
                  alt={displayName || creator.displayName}
                />
                <div className="foleio-dash-avatar-overlay">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5" />
                      <span>Change</span>
                    </>
                  )}
                </div>
              </div>
              <div className="foleio-dash-avatar-meta">
                <button type="button" onClick={() => avatarInputRef.current?.click()}>
                  Upload new photo
                </button>
                <p className="foleio-dash-field-hint">Shown on your public profile and bookings</p>
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

          <div className="foleio-dash-panel">
            <h2 className="foleio-dash-panel-title">Profile details</h2>
            <p className="foleio-dash-panel-meta">How clients find and recognise you</p>

            <div className="foleio-dash-settings-stack">
              <label className="foleio-dash-field">
                Username
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
                  className="foleio-dash-input"
                />
                <p className="foleio-dash-field-hint">
                  Your profile URL: {profileUrl}
                </p>
              </label>

              <label className="foleio-dash-field">
                Display name
                <input
                  type="text"
                  value={displayName}
                  maxLength={50}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="foleio-dash-input"
                />
              </label>

              <label className="foleio-dash-field">
                Bio
                <span style={{ fontWeight: 400, color: '#828282' }}>
                  {' '}
                  {countBioWords(bio)}/{BIO_MAX_WORDS} words
                </span>
                <textarea
                  value={bio}
                  onChange={(e) =>
                    setBio(trimBioToMaxWords(e.target.value, BIO_MAX_WORDS))
                  }
                  rows={5}
                  placeholder="Tell your audience who you are..."
                  className="foleio-dash-textarea"
                  style={{ marginTop: 0 }}
                />
              </label>

              <label className="foleio-dash-field">
                Category
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="foleio-dash-select"
                >
                  <option value="">Select your category</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="foleio-dash-field-hint">This shows on your public profile</p>
              </label>

              <label className="foleio-dash-field">
                Instagram URL
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => {
                    setInstagramUrl(e.target.value);
                    if (urlErrors.instagramUrl) {
                      setUrlErrors((prev) => ({ ...prev, instagramUrl: undefined }));
                    }
                  }}
                  placeholder="https://instagram.com/yourname"
                  className="foleio-dash-input"
                  aria-invalid={Boolean(urlErrors.instagramUrl)}
                />
                {urlErrors.instagramUrl ? (
                  <p className="foleio-dash-field-hint" style={{ color: '#b42318' }}>
                    {urlErrors.instagramUrl}
                  </p>
                ) : null}
              </label>

              <label className="foleio-dash-field">
                TikTok URL
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => {
                    setTiktokUrl(e.target.value);
                    if (urlErrors.tiktokUrl) {
                      setUrlErrors((prev) => ({ ...prev, tiktokUrl: undefined }));
                    }
                  }}
                  placeholder="https://tiktok.com/@yourname"
                  className="foleio-dash-input"
                  aria-invalid={Boolean(urlErrors.tiktokUrl)}
                />
                {urlErrors.tiktokUrl ? (
                  <p className="foleio-dash-field-hint" style={{ color: '#b42318' }}>
                    {urlErrors.tiktokUrl}
                  </p>
                ) : null}
              </label>

              <label className="foleio-dash-field">
                X (formerly Twitter) URL
                <input
                  type="url"
                  value={twitterUrl}
                  onChange={(e) => {
                    setTwitterUrl(e.target.value);
                    if (urlErrors.twitterUrl) {
                      setUrlErrors((prev) => ({ ...prev, twitterUrl: undefined }));
                    }
                  }}
                  placeholder="https://x.com/yourname"
                  className="foleio-dash-input"
                  aria-invalid={Boolean(urlErrors.twitterUrl)}
                />
                {urlErrors.twitterUrl ? (
                  <p className="foleio-dash-field-hint" style={{ color: '#b42318' }}>
                    {urlErrors.twitterUrl}
                  </p>
                ) : null}
              </label>

              <label className="foleio-dash-field">
                Portfolio URL
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => {
                    setPortfolioUrl(e.target.value);
                    if (urlErrors.portfolioUrl) {
                      setUrlErrors((prev) => ({ ...prev, portfolioUrl: undefined }));
                    }
                  }}
                  placeholder="https://yourportfolio.com"
                  className="foleio-dash-input"
                  aria-invalid={Boolean(urlErrors.portfolioUrl)}
                />
                {urlErrors.portfolioUrl ? (
                  <p className="foleio-dash-field-hint" style={{ color: '#b42318' }}>
                    {urlErrors.portfolioUrl}
                  </p>
                ) : (
                  <p className="foleio-dash-field-hint">
                    Only links you fill in appear on your public page. Leave blank to hide.
                  </p>
                )}
              </label>

              <div className="foleio-dash-field">
                Your public profile
                <div className="foleio-dash-url-row">
                  <div className="foleio-dash-url-strip">
                    <Globe />
                    <span>{profileUrl}</span>
                  </div>
                  <button
                    type="button"
                    className="foleio-dash-icon-btn"
                    aria-label="Copy link"
                    title="Copy link"
                    onClick={() => {
                      void navigator.clipboard.writeText(profileUrl);
                      toast({ title: 'Link copied' });
                    }}
                  >
                    <Copy />
                  </button>
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="foleio-dash-icon-btn"
                    aria-label="Open profile"
                    title="Open profile"
                  >
                    <ExternalLink />
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="foleio-dash-btn-primary"
                  onClick={handleSaveProfile}
                  disabled={saving || uploading}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </div>
          </div>

          <CreatorLinksManager />
        </div>
      ) : null}

      {activeTab === 'portfolio' ? (
        <PortfolioGallerySettings
          initialSectionId={portfolio?.sectionId}
          initialItems={portfolio?.items || []}
          platformPlan={creator.platformPlan}
          platformSubscriptionActive={creator.platformSubscriptionActive}
        />
      ) : null}

      {activeTab === 'billing' ? (
        <BillingPage
          embedded
          creator={{
            id: creator.id,
            displayName: creator.displayName,
            growthEligible: creator.growthEligible,
          }}
          currentSubscription={billing?.currentSubscription || null}
          billingHistory={billing?.billingHistory || []}
        />
      ) : null}

      {activeTab === 'notifications' ? (
        <div className="foleio-dash-panel" style={{ maxWidth: 560 }}>
          <h2 className="foleio-dash-panel-title">Notifications</h2>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0 }}>
            Notification controls are coming soon.
          </p>
        </div>
      ) : null}

      {activeTab === 'policy' ? <BookingPolicySettings /> : null}

      {activeTab === 'support' ? (
        <SupportChatSettings
          creatorName={displayName || creator.displayName}
          creatorEmail={userEmail}
        />
      ) : null}
    </>
  );
}

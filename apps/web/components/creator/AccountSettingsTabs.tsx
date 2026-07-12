'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Copy, ExternalLink, Globe, Loader2, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ProfileCardModal } from '@/components/creator/ProfileCardModal';
import { ProfileCardPreview } from '@/components/creator/ProfileCardPreview';
import { CreatorLinksManager } from '@/components/creator/CreatorLinksManager';
import { INDUSTRY_OPTIONS } from '@/lib/constants/industries';

type SettingsTab = 'profile' | 'notifications' | 'security';

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(creator.avatarUrl || null);
  const [username, setUsername] = useState(creator.username || '');
  const [displayName, setDisplayName] = useState(creator.displayName || '');
  const [bio, setBio] = useState(creator.bio || '');
  const [industry, setIndustry] = useState(creator.category || '');
  const [instagramHandle, setInstagramHandle] = useState(creator.instagramHandle || '');
  const [tiktokHandle, setTiktokHandle] = useState(creator.tiktokHandle || '');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'profile' || tab === 'notifications' || tab === 'security') {
      setActiveTab(tab);
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
                <span style={{ fontWeight: 400, color: '#828282' }}> {bio.length}/150</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={150}
                  rows={3}
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
                Instagram handle
                <input
                  type="text"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="@username"
                  className="foleio-dash-input"
                />
              </label>

              <label className="foleio-dash-field">
                TikTok handle
                <input
                  type="text"
                  value={tiktokHandle}
                  onChange={(e) => setTiktokHandle(e.target.value)}
                  placeholder="@username"
                  className="foleio-dash-input"
                />
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

          <div className="foleio-dash-panel">
            <h2 className="foleio-dash-panel-title">Share your profile card</h2>
            <p className="foleio-dash-panel-meta">
              Download a card to share on Instagram, WhatsApp and X
            </p>
            <div
              className="foleio-dash-share-thumb"
              onClick={() => setShowCardModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowCardModal(true);
                }
              }}
            >
              <ProfileCardPreview template="world" creator={currentCreator} size="thumbnail" />
              <div className="foleio-dash-share-thumb-overlay">
                <span className="foleio-dash-share-thumb-pill">
                  <Share2 className="h-3.5 w-3.5" />
                  Customise &amp; Share
                </span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className="foleio-dash-btn-outline"
                onClick={() => setShowCardModal(true)}
              >
                <Share2 className="h-4 w-4" />
                Create share card
              </button>
            </div>
          </div>

          <CreatorLinksManager />
        </div>
      ) : null}

      {activeTab === 'notifications' ? (
        <div className="foleio-dash-panel" style={{ maxWidth: 560 }}>
          <h2 className="foleio-dash-panel-title">Notifications</h2>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0 }}>
            Notification controls are coming soon.
          </p>
        </div>
      ) : null}

      {activeTab === 'security' ? (
        <div className="foleio-dash-panel" style={{ maxWidth: 560 }}>
          <h2 className="foleio-dash-panel-title">Security</h2>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0 }}>
            Password and account security controls will appear here.
          </p>
        </div>
      ) : null}

      <ProfileCardModal
        open={showCardModal}
        onOpenChange={setShowCardModal}
        onAvatarUpdated={(url) => setAvatarUrl(url)}
        creator={currentCreator}
      />
    </>
  );
}

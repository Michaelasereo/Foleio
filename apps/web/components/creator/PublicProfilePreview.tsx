'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { BusinessCoverCard } from '@/components/creator/BusinessCoverCard';
import { useToast } from '@/components/ui/use-toast';
import { BIO_MAX_CHARS, trimBioToMaxChars } from '@/lib/creator/bio';

type Device = 'mobile' | 'tablet' | 'web';

const DEVICE_WIDTH: Record<Device, string> = {
  mobile: '390px',
  tablet: '768px',
  web: '100%',
};

export function PublicProfilePreview({
  username,
  displayName,
  avatarUrl,
  bannerUrl,
  bio,
  eligible,
  eligibleAt,
  pendingUsername,
}: {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string;
  eligible: boolean;
  eligibleAt: string;
  pendingUsername: string | null;
}) {
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [device, setDevice] = useState<Device>('web');
  const [name, setName] = useState(displayName);
  const [handle, setHandle] = useState(username);
  const [draftBio, setDraftBio] = useState(bio);
  const [photo, setPhoto] = useState(avatarUrl);
  const [cover, setCover] = useState(bannerUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [liveUsername, setLiveUsername] = useState(username);
  const [modalOpen, setModalOpen] = useState(false);
  const [requestName, setRequestName] = useState(pendingUsername || '');
  const [pending, setPending] = useState(pendingUsername);
  const [requesting, setRequesting] = useState(false);

  const unlockLabel = new Date(eligibleAt).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  async function uploadAvatar(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Use a JPG, PNG, or WebP image', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Profile photo must be under 5MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      let response = await fetch('/api/creator/upload-avatar', { method: 'POST', body: formData });
      let data = (await response.json().catch(() => ({}))) as { url?: string; data?: { url?: string } };
      let url = data.url || data.data?.url;
      if (!response.ok || !url) {
        const fallback = new FormData();
        fallback.append('file', file);
        fallback.append('type', 'avatar');
        response = await fetch('/api/upload/profile', { method: 'POST', body: fallback });
        data = (await response.json().catch(() => ({}))) as typeof data;
        url = data.url || data.data?.url;
      }
      if (!response.ok || !url) throw new Error('Upload failed');
      setPhoto(url);
      await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      });
      setFrameKey((value) => value + 1);
    } catch (error) {
      toast({
        title: 'Could not upload photo',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast({ title: 'Display name must be at least 2 characters', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {
        displayName: trimmedName,
        bio: trimBioToMaxChars(draftBio),
        ...(cover ? { bannerUrl: cover } : {}),
        ...(photo ? { avatarUrl: photo } : {}),
      };
      if (eligible && handle.trim() && handle.trim() !== liveUsername) {
        body.username = handle.trim().toLowerCase();
      }
      const response = await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.code === 'username_cooldown') {
          setModalOpen(true);
        }
        throw new Error(data.error || 'Could not save');
      }
      if (data.creator?.username) {
        setLiveUsername(data.creator.username);
        setHandle(data.creator.username);
      }
      setFrameKey((value) => value + 1);
      toast({ title: 'Public page updated' });
    } catch (error) {
      toast({
        title: 'Could not save',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function submitRequest() {
    setRequesting(true);
    try {
      const response = await fetch('/api/creator/username-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: requestName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not send request');
      setPending(data.requestedUsername || requestName);
      setModalOpen(false);
      toast({ title: 'Username request sent', description: 'An admin can approve it before the cooldown ends.' });
    } catch (error) {
      toast({
        title: 'Request failed',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="foleio-preview-page">
      <style>{previewCss}</style>
      <aside className="foleio-preview-side">
        <Link href="/settings" className="foleio-preview-back">
          <ArrowLeft size={16} aria-hidden />
          Back to profile settings
        </Link>
        <h1>Edit public page</h1>
        <p className="foleio-preview-note">Changes here show on the preview.</p>

        <section className="foleio-preview-card">
          <h2>Cover image</h2>
          <BusinessCoverCard
            bannerUrl={cover}
            editable
            onBannerChange={(url) => {
              setCover(url);
              setFrameKey((value) => value + 1);
            }}
          />
        </section>

        <section className="foleio-preview-card">
          <h2>Profile photo</h2>
          <div className="foleio-preview-photo">
            <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploading}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" />
              ) : (
                <span>Add</span>
              )}
              {uploading ? <Loader2 className="spin" size={16} /> : null}
            </button>
            <div>
              <button type="button" className="foleio-preview-text" onClick={() => avatarInputRef.current?.click()}>
                {uploading ? 'Uploading…' : 'Upload new photo'}
              </button>
              <p>JPG, PNG or WebP. Square, at least 400×400.</p>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAvatar(file);
              }}
            />
          </div>
        </section>

        <section className="foleio-preview-card">
          <h2>Name</h2>
          <label>
            Display name
            <input value={name} maxLength={50} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Username
            <input
              value={eligible ? handle : `@${liveUsername}`}
              maxLength={30}
              readOnly={!eligible}
              onChange={(event) =>
                setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
              }
            />
            <span>
              {eligible
                ? 'You can change this now. It updates your public link.'
                : `Locked until ${unlockLabel}.`}
              {pending ? ` Waiting on @${pending}.` : ''}
            </span>
          </label>
          {eligible ? null : (
            <button type="button" className="foleio-preview-text" onClick={() => setModalOpen(true)}>
              Request a username change
            </button>
          )}
          <label>
            Bio
            <textarea
              value={draftBio}
              maxLength={BIO_MAX_CHARS}
              rows={5}
              onChange={(event) => setDraftBio(trimBioToMaxChars(event.target.value))}
            />
            <span>
              {draftBio.length}/{BIO_MAX_CHARS} characters
            </span>
          </label>
          <button type="button" className="foleio-preview-save" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </section>
      </aside>
      <section className="foleio-preview-stage">
        <div className="foleio-preview-devices" role="tablist" aria-label="Preview size">
          {(
            [
              ['mobile', 'Mobile'],
              ['tablet', 'Tablet'],
              ['web', 'Web'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={device === id}
              className={device === id ? 'is-on' : ''}
              onClick={() => setDevice(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="foleio-preview-frame-wrap">
          <iframe
            key={`${liveUsername}-${frameKey}`}
            title="Public page preview"
            src={`/creator/${liveUsername}`}
            style={{ width: DEVICE_WIDTH[device] }}
          />
        </div>
      </section>
      {modalOpen ? (
        <div className="foleio-preview-modal" role="dialog" aria-modal="true" aria-labelledby="username-lock-title">
          <div>
            <h2 id="username-lock-title">Username is locked</h2>
            <p>
              You can change your username yourself on {unlockLabel}. An admin can approve a change before then.
            </p>
            <label>
              Requested username
              <input
                value={requestName}
                maxLength={30}
                onChange={(event) =>
                  setRequestName(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                }
              />
            </label>
            <div className="foleio-preview-modal-actions">
              <button type="button" onClick={() => setModalOpen(false)}>
                Close
              </button>
              <button type="button" className="foleio-preview-save" onClick={() => void submitRequest()} disabled={requesting}>
                {requesting ? 'Sending…' : 'Request approval'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const previewCss = `
body:has(.foleio-preview-page) {
  background: #141414;
}
body:has(.foleio-preview-page) footer {
  display: none !important;
}
.foleio-preview-page {
  height: 100dvh;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  background: #141414;
  color: #f4f4f5;
  font-family: var(--font-body), system-ui, sans-serif;
  overflow: hidden;
}
.foleio-preview-side {
  padding: 20px 16px 28px;
  background: #1a1816;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  overflow: auto;
}
.foleio-preview-side h1 {
  margin: 16px 0 4px;
  font-size: 22px;
  font-weight: 560;
  letter-spacing: -0.02em;
}
.foleio-preview-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  background: #f4f4f5;
  color: #1a1816;
  font-size: 14px;
  font-weight: 560;
  text-decoration: none;
}
.foleio-preview-note {
  margin: 0 0 16px;
  color: #adadad;
  font-size: 13px;
}
.foleio-preview-card {
  margin-top: 12px;
  padding: 14px;
  border-radius: 12px;
  background: #212121;
}
.foleio-preview-card h2 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 560;
}
.foleio-preview-side .foleio-auth-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 7;
  min-height: 0;
  height: auto;
  margin: 0;
  padding: 0;
  border-radius: 10px;
  background: #1a1816;
  overflow: hidden;
  box-sizing: border-box;
}
.foleio-preview-side .foleio-auth-preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.foleio-preview-side .foleio-auth-preview-upload {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: rgba(26, 24, 22, 0.86);
  color: #f4f4f5;
  cursor: pointer;
}
.foleio-preview-photo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.foleio-preview-photo > button {
  position: relative;
  width: 64px;
  height: 64px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  background: #2b2b2b;
  color: #adadad;
  cursor: pointer;
}
.foleio-preview-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.foleio-preview-photo svg {
  position: absolute;
  inset: 0;
  margin: auto;
}
.foleio-preview-photo p,
.foleio-preview-side label span {
  margin: 4px 0 0;
  color: #828282;
  font-size: 12px;
  line-height: 1.4;
}
.foleio-preview-text {
  padding: 0;
  border: 0;
  background: none;
  color: #f4f4f5;
  font: inherit;
  font-size: 13px;
  font-weight: 560;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.foleio-preview-side label {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
}
.foleio-preview-side input,
.foleio-preview-side textarea {
  width: 100%;
  border: 0;
  border-radius: 10px;
  padding: 12px;
  background: #1a1816;
  color: #f4f4f5;
  font: inherit;
  font-size: 14px;
  box-sizing: border-box;
}
.foleio-preview-side input {
  height: 42px;
  padding: 0 12px;
}
.foleio-preview-side textarea {
  min-height: 110px;
  line-height: 1.45;
  resize: vertical;
}
.foleio-preview-side input[readonly] {
  color: #adadad;
}
.foleio-preview-card .foleio-preview-text {
  margin-top: 10px;
}
.foleio-preview-save {
  width: 100%;
  margin-top: 16px;
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: #f4f4f5;
  color: #1a1816;
  font: inherit;
  font-size: 14px;
  font-weight: 560;
  cursor: pointer;
}
.foleio-preview-save:disabled {
  opacity: 0.6;
  cursor: wait;
}
.foleio-preview-stage {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.foleio-preview-devices {
  display: flex;
  gap: 6px;
  padding: 14px 16px;
}
.foleio-preview-devices button {
  height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #adadad;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.foleio-preview-devices button.is-on {
  background: #212121;
  color: #f4f4f5;
}
.foleio-preview-frame-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 16px 16px;
  min-height: 0;
}
.foleio-preview-frame-wrap iframe {
  height: 100%;
  border: 0;
  border-radius: 16px;
  background: #1a1816;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
}
.foleio-preview-modal {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.55);
  padding: 20px;
}
.foleio-preview-modal > div {
  width: min(420px, 100%);
  padding: 20px;
  border-radius: 16px;
  background: #212121;
  color: #f4f4f5;
}
.foleio-preview-modal h2 {
  margin: 0 0 8px;
  font-size: 20px;
}
.foleio-preview-modal p {
  margin: 0 0 12px;
  color: #adadad;
  font-size: 14px;
}
.foleio-preview-modal label {
  display: grid;
  gap: 6px;
  color: #adadad;
  font-size: 13px;
}
.foleio-preview-modal input {
  height: 42px;
  border: 0;
  border-radius: 10px;
  padding: 0 12px;
  background: #1a1816;
  color: #f4f4f5;
  font: inherit;
}
.foleio-preview-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}
.foleio-preview-modal-actions button {
  height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #f4f4f5;
  cursor: pointer;
}
.foleio-preview-modal-actions .foleio-preview-save {
  width: auto;
  margin-top: 0;
}
@media (max-width: 800px) {
  .foleio-preview-page {
    height: auto;
    min-height: 100dvh;
    overflow: auto;
    grid-template-columns: 1fr;
  }
  .foleio-preview-frame-wrap {
    min-height: 70vh;
  }
}
`;

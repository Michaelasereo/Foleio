'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { broadcastBannerUpdated } from '@/lib/creator/profile-live';

interface BusinessCoverCardProps {
  bannerUrl?: string | null;
  /** When true, show upload control (dashboard). Public profile is view-only. */
  editable?: boolean;
  onBannerChange?: (url: string | null) => void;
}

export function BusinessCoverCard({
  bannerUrl = null,
  editable = false,
  onBannerChange,
}: BusinessCoverCardProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(bannerUrl);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreviewUrl(bannerUrl);
  }, [bannerUrl]);

  async function uploadBanner(file: File) {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please choose a JPG, PNG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Banner images must be under 10MB.',
        variant: 'destructive',
      });
      return;
    }

    const previousUrl = bannerUrl;
    setUploading(true);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);

      let response = await fetch('/api/creator/upload-banner', {
        method: 'POST',
        body: formData,
      });
      let data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
        data?: { url?: string };
        url?: string;
      };
      let url = data.data?.url || data.url;

      // Fallback to legacy profile upload if primary route fails
      if (!response.ok || !url) {
        const fallbackForm = new FormData();
        fallbackForm.append('file', file);
        fallbackForm.append('type', 'banner');

        response = await fetch('/api/upload/profile', {
          method: 'POST',
          body: fallbackForm,
        });
        data = (await response.json().catch(() => ({}))) as typeof data;
        url = data.data?.url || data.url;

        if (!response.ok || !url) {
          throw new Error(data.details || data.error || 'Upload failed');
        }
      }

      setPreviewUrl(url);
      onBannerChange?.(url);
      broadcastBannerUpdated(url);
      toast({
        title: 'Cover updated',
        description: 'Your business cover is live on your public page.',
      });
    } catch (error) {
      setPreviewUrl(previousUrl);
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Could not upload banner.',
        variant: 'destructive',
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const hasImage = Boolean(previewUrl);

  return (
    <div
      className={`foleio-auth-preview${hasImage ? ' has-image' : ''}${
        editable ? ' is-editable' : ''
      }`}
      aria-hidden={!editable}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl!} alt="" className="foleio-auth-preview-image" />
      ) : (
        <div className="foleio-auth-preview-bars">
          <div className="foleio-auth-preview-bar" />
          <div className="foleio-auth-preview-bar" />
          <div className="foleio-auth-preview-bar" />
        </div>
      )}

      {editable ? (
        <>
          <button
            type="button"
            className="foleio-auth-preview-upload"
            aria-label={hasImage ? 'Replace business cover' : 'Upload business cover'}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadBanner(file);
            }}
          />
        </>
      ) : null}
    </div>
  );
}

/** Shared helper for profile menu — clears banner via profile API. */
export async function removeCreatorBanner(): Promise<void> {
  const response = await fetch('/api/creator/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bannerUrl: null }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error || 'Could not remove banner');
  }
  broadcastBannerUpdated(null);
}

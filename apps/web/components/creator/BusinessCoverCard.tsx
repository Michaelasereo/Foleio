'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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

    setUploading(true);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'banner');

      const response = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { url?: string };
        url?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      const url = data.data?.url || data.url;
      if (!url) throw new Error('No URL returned from upload');

      setPreviewUrl(url);
      onBannerChange?.(url);
      toast({
        title: 'Banner updated',
        description: 'Your business cover is live on your public page.',
      });
    } catch (error) {
      setPreviewUrl(bannerUrl);
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
  // Upload affordance only while empty — once set, manage via ⋮ menu
  const showUploadControl = editable && (!hasImage || uploading);

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

      {showUploadControl ? (
        <>
          <button
            type="button"
            className="foleio-auth-preview-upload"
            aria-label="Upload business cover"
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
}

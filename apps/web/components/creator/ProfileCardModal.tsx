'use client';

import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Camera, Check, Download, Link2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ProfileCardPreview } from '@/components/creator/ProfileCardPreview';
import { broadcastAvatarUpdated } from '@/lib/creator/profile-live';

type ProfileTemplate = 'world' | 'dark' | 'cobalt' | 'minimal' | 'bold';

interface ProfileCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvatarUpdated?: (url: string) => void;
  creator: {
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
  };
}

export function ProfileCardModal({
  open,
  onOpenChange,
  onAvatarUpdated,
  creator,
}: ProfileCardModalProps) {
  const cardAvatarInputRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState<ProfileTemplate>('world');
  const [cardUploading, setCardUploading] = useState(false);
  const [liveAvatarUrl, setLiveAvatarUrl] = useState<string | null>(
    creator.avatarUrl || null
  );
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLiveAvatarUrl(creator.avatarUrl || null);
  }, [creator.avatarUrl]);

  async function handleCardAvatarUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid image',
        description: 'Please upload JPG, PNG or WebP.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    const previousAvatar = liveAvatarUrl;
    const optimisticUrl = URL.createObjectURL(file);
    setLiveAvatarUrl(optimisticUrl);
    setCardUploading(true);

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

      // Fallback to legacy profile upload endpoint if primary route fails
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
          const message =
            uploadData?.details ||
            uploadData?.error ||
            'Upload failed. Please try again.';
          console.error('[avatar-upload] Server error:', message);
          throw new Error(message);
        }
      }

      setLiveAvatarUrl(uploadedUrl);
      onAvatarUpdated?.(uploadedUrl);

      await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: uploadedUrl }),
      });

      broadcastAvatarUpdated(uploadedUrl);

      toast({
        title: 'Profile photo updated',
        description: 'Your new avatar is now live on your public profile.',
      });
    } catch (error: any) {
      setLiveAvatarUrl(previousAvatar || null);
      toast({
        title: 'Upload failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      URL.revokeObjectURL(optimisticUrl);
      setCardUploading(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const element = document.getElementById('profile-card-download');
      if (!element) throw new Error('Profile card preview not found');

      const canvas = await html2canvas(element, {
        scale: 1080 / 240,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `foleio-${creator.username}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast({
        title: 'Card downloaded 🧡',
        description: 'Share it on Instagram Stories, WhatsApp Status or X',
      });
    } catch {
      toast({
        title: 'Download failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyLink() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const url = `${baseUrl}/creator/${creator.username}`;
    await navigator.clipboard.writeText(url);

    setCopied(true);
    toast({
      title: 'Link copied!',
      description: url,
    });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Share profile card</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a card style, update your profile photo, and download or copy your profile link.
        </DialogDescription>
        <h3 className="mb-1 font-display text-xl font-bold">Your Profile Card</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Share on Instagram Stories, WhatsApp Status and X
        </p>

        <div className="mt-4 flex flex-col gap-8 md:flex-row">
          <div className="w-full flex-shrink-0 space-y-5 md:w-52">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Profile Photo
              </p>
              <div
                className="group relative h-16 w-16 cursor-pointer"
                onClick={() => cardAvatarInputRef.current?.click()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={liveAvatarUrl || '/placeholder-avatar.png'}
                  alt={creator.displayName}
                  className="h-16 w-16 rounded-full border-2 border-border object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {cardUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Updates your profile globally
              </p>
              <input
                ref={cardAvatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCardAvatarUpload}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Style
              </p>
              <div className="space-y-2">
                {[
                  { id: 'world', label: 'Warm Dark' },
                  { id: 'dark', label: 'Dark' },
                  { id: 'cobalt', label: 'Cobalt' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id as ProfileTemplate)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                      template === item.id
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center">
            <div
              id="profile-card-download"
              className="overflow-hidden rounded-2xl border border-border shadow-xl"
              style={{ width: 300, height: 533 }}
            >
              <ProfileCardPreview
                template={template}
                creator={{
                  ...creator,
                  avatarUrl: liveAvatarUrl,
                }}
                size="full"
                scale={300 / 1080}
              />
            </div>

            <div className="mt-4 w-full max-w-sm rounded-xl bg-muted p-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                How it looks when shared as a link
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-white p-2">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={liveAvatarUrl || '/placeholder-avatar.png'}
                    alt={creator.displayName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    foleio.com
                  </p>
                  <p className="truncate text-xs font-semibold text-foreground">{creator.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    An invitation to my world
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-sm gap-3">
          <Button onClick={handleDownload} disabled={downloading} className="flex-1">
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleCopyLink} className="flex-1">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                {copied ? 'Copied!' : 'Copy Link'}
              </>
            )}
          </Button>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          1080×1920px · Instagram Stories · WhatsApp Status · X · TikTok
        </p>
      </DialogContent>
    </Dialog>
  );
}

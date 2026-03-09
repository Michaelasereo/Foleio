'use client';

import { useState } from 'react';
import { Lock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';

interface CollectionVideo {
  id: string;
  title: string;
  muxPlaybackId: string | null;
}

interface CollectionSection {
  id: string;
  title: string;
  videos: CollectionVideo[];
}

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    price: number | null;
    subscriptionPrice: number | null;
    videos: CollectionVideo[];
    sections?: CollectionSection[];
  } | null;
  hasAccess: boolean;
  onAccessGranted: () => void;
  onPlayVideo: (videoId: string) => void;
  onPurchaseRequired: () => void;
}

function formatNaira(priceInKobo: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(priceInKobo / 100);
}

export function CollectionModal({
  isOpen,
  onClose,
  collection,
  hasAccess,
  onAccessGranted,
  onPlayVideo,
  onPurchaseRequired,
}: CollectionModalProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!collection) return null;
  const activeCollection = collection;

  const displayPrice = activeCollection.subscriptionPrice || activeCollection.price || 0;
  const hasSections = Boolean(activeCollection.sections?.length);

  async function handleAccessRequest() {
    if (!email) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/collections/${activeCollection.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process access');
      }

      if (data.hasAccess || data.codeSent) {
        setCodeSent(true);
        return;
      }

      if (data.needsPurchase) {
        onPurchaseRequired();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process access');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!email || code.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/collections/${activeCollection.id}/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();
      if (!response.ok || !data.access) {
        throw new Error(data.error || 'Invalid access code');
      }
      onAccessGranted();
      setCode('');
      setCodeSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-hidden p-0">
        <div className="max-h-[90vh] overflow-y-auto p-6">
        <div className="relative mb-4 aspect-video overflow-hidden rounded-xl">
          {activeCollection.thumbnailUrl ? (
            <img src={activeCollection.thumbnailUrl} alt={activeCollection.title} className="h-full w-full object-cover" />
          ) : (
            <DefaultThumbnail title={activeCollection.title} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-xl font-bold text-white">{activeCollection.title}</h2>
            <p className="text-sm text-white/80">{activeCollection.videos.length} videos</p>
          </div>
        </div>

        {activeCollection.description ? (
          <p className="mb-4 text-sm text-muted-foreground">{activeCollection.description}</p>
        ) : null}

        {!hasAccess ? (
          <div className="mb-6 max-h-[38vh] overflow-y-auto pr-1">
            {hasSections
              ? activeCollection.sections?.map((section) => (
                  <div key={section.id} className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </p>
                    <div className="space-y-2">
                      {section.videos.map((video, index) => (
                        <div
                          key={video.id}
                          className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {video.title}
                            </p>
                          </div>
                          <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              : activeCollection.videos.map((video, index) => (
                  <div key={video.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
                    </div>
                    <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </div>
                ))}
          </div>
        ) : null}

        {hasAccess ? (
          <div className="max-h-[38vh] overflow-y-auto pr-1">
            {hasSections
              ? activeCollection.sections?.map((section) => (
                  <div key={section.id} className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </p>
                    <div className="space-y-2">
                      {section.videos.map((video) => (
                        <button
                          key={video.id}
                          onClick={() => onPlayVideo(video.id)}
                          className="flex w-full items-center gap-3 rounded-lg bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Play className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-sm font-medium text-foreground">{video.title}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              : activeCollection.videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => onPlayVideo(video.id)}
                    className="flex w-full items-center gap-3 rounded-lg bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Play className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{video.title}</p>
                  </button>
                ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div>
                <p className="font-semibold text-foreground">Get full access</p>
                <p className="text-sm text-muted-foreground">
                  All {activeCollection.videos.length} videos included
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">
                {displayPrice > 0 ? formatNaira(displayPrice) : 'Free'}
              </p>
            </div>

            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {codeSent ? (
                <>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <Button
                    onClick={handleVerifyCode}
                    disabled={!email || code.length !== 6 || isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Verifying...' : 'Verify code'}
                  </Button>
                </>
              ) : (
                <Button onClick={handleAccessRequest} disabled={!email || isLoading} className="w-full">
                  {isLoading ? 'Processing...' : `Continue for ${displayPrice > 0 ? formatNaira(displayPrice) : 'Free'}`}
                </Button>
              )}
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <p className="text-center text-xs text-muted-foreground">
              Already purchased? Enter your email to get your access code.
            </p>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

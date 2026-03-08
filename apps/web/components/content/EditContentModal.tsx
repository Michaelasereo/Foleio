'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';
import { MAX_THUMBNAIL_SIZE_BYTES, MAX_THUMBNAIL_SIZE_LABEL } from '@/lib/utils/constants';

type ContentItem = {
  id: string;
  title: string;
  description?: string | null;
  contentCategory?: string;
  accessType?: string;
  tutorialPrice?: number | null;
  collectionId?: string | null;
  thumbnailUrl?: string | null;
  isPublished?: boolean;
};

type CollectionItem = { id: string; title: string };

interface EditContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ContentItem | null;
  collections: CollectionItem[];
  onSaved: () => void;
}

export function EditContentModal({
  open,
  onOpenChange,
  content,
  collections,
  onSaved,
}: EditContentModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [accessType, setAccessType] = useState<'free' | 'subscription' | 'one_time' | 'collection'>('subscription');
  const [tutorialPrice, setTutorialPrice] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!content) return;
    setTitle(content.title || '');
    setDescription(content.description || '');
    setCollectionId(content.collectionId || '');
    setAccessType((content.accessType as 'free' | 'subscription' | 'one_time' | 'collection') || 'subscription');
    setTutorialPrice(content.tutorialPrice ? String(Math.round(content.tutorialPrice / 100)) : '');
    setThumbnailPreview(content.thumbnailUrl || null);
    setIsPublished(Boolean(content.isPublished));
    setError('');
  }, [content]);

  const isTutorial = content?.contentCategory === 'tutorial';
  const isInCollection = isTutorial && Boolean(collectionId);
  const showPriceInput = isTutorial && !isInCollection && accessType !== 'free';

  const clearThumbnail = () => setThumbnailPreview(null);

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
      setError(`Thumbnail must be less than ${MAX_THUMBNAIL_SIZE_LABEL}.`);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'thumbnail');

      const response = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Thumbnail upload failed');
      }
      setThumbnailPreview(data?.data?.url || null);
      setError('');
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Failed to upload thumbnail');
    }
  };

  const handleSave = async () => {
    if (!content) return;
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    const tutorialPriceKobo = tutorialPrice ? Math.round(Number(tutorialPrice) * 100) : 0;
    if (showPriceInput && tutorialPriceKobo <= 0) {
      setError('This content is now standalone — please set a price.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        isPublished,
        thumbnailUrl: thumbnailPreview,
      };

      if (isTutorial) {
        payload.collectionId = collectionId || null;
        payload.accessType = isInCollection ? 'collection' : accessType;
        payload.tutorialPrice = isInCollection ? 0 : accessType === 'free' ? 0 : tutorialPriceKobo;
      }

      const response = await fetch(`/api/content/${content.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update content');
      }
      onSaved();
      onOpenChange(false);
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to update content');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!left-auto !right-0 !top-0 !h-full !max-w-xl !translate-x-0 !translate-y-0 rounded-none">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
        </DialogHeader>

        {!content ? null : (
          <div className="space-y-4 overflow-y-auto pb-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>

            {isTutorial ? (
              <div className="space-y-2">
                <Label>Collection</Label>
                <select
                  value={collectionId || 'none'}
                  onChange={(e) => setCollectionId(e.target.value === 'none' ? '' : e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="none">Standalone (no collection)</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.title}
                    </option>
                  ))}
                </select>
                {isInCollection ? (
                  <p className="rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs text-orange-800">
                    This content is part of a collection - access is inherited from the collection.
                  </p>
                ) : null}
              </div>
            ) : null}

            {isTutorial && !isInCollection ? (
              <div className="space-y-2">
                <Label>Access</Label>
                <select
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value as 'free' | 'subscription' | 'one_time')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="free">Free</option>
                  <option value="subscription">Subscription</option>
                  <option value="one_time">One-time purchase</option>
                </select>
              </div>
            ) : null}

            {showPriceInput ? (
              <div className="space-y-2">
                <Label>Price (NGN)</Label>
                <Input
                  type="number"
                  min={1}
                  value={tutorialPrice}
                  onChange={(e) => setTutorialPrice(e.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>
                Thumbnail <span className="text-muted-foreground">(optional)</span>
              </Label>
              <div className="max-w-sm">
                {thumbnailPreview ? (
                  <div className="relative">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="aspect-video w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearThumbnail}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <DefaultThumbnail title={title || 'Untitled Video'} />
                )}
              </div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleThumbnailUpload}
              />
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="text-sm text-primary underline underline-offset-2"
              >
                Upload custom thumbnail
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Publish</Label>
                <p className="text-xs text-muted-foreground">Toggle visibility on public profile</p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

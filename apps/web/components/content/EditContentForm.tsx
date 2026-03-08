'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Trash2, AlertTriangle, Info } from 'lucide-react';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';
import { MAX_THUMBNAIL_SIZE_BYTES, MAX_THUMBNAIL_SIZE_LABEL } from '@/lib/utils/constants';

interface Content {
  id: string;
  title: string;
  description: string | null;
  type: string;
  accessType: string;
  requiredPlanId: string | null;
  contentCategory: string;
  tutorialPrice: number | null;
  collectionId: string | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  tags: string[];
}

interface CreatorPlan {
  id: string;
  name: string;
  price: number;
}

interface Collection {
  id: string;
  title: string;
}

interface EditContentFormProps {
  content: Content;
  creatorPlans: CreatorPlan[];
  collections: Collection[];
}

export function EditContentForm({ content, creatorPlans, collections }: EditContentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: content.title,
    description: content.description || '',
    accessType: content.accessType,
    requiredPlanId: content.requiredPlanId || '',
    contentCategory: content.contentCategory,
    tutorialPrice: content.tutorialPrice?.toString() || '',
    collectionId: content.collectionId || '',
    isPublished: content.isPublished,
    tags: content.tags.join(', ')
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(content.thumbnailUrl || null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [reuploadingVideo, setReuploadingVideo] = useState(false);
  const [reuploadMessage, setReuploadMessage] = useState('');
  const hasCollectionSelected =
    formData.contentCategory === 'tutorial' && Boolean(formData.collectionId);
  const wasCollectionLinked = Boolean(content.collectionId);
  const wasRemovedFromCollection =
    formData.contentCategory === 'tutorial' && wasCollectionLinked && !hasCollectionSelected;

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'collectionId' && prev.contentCategory === 'tutorial') {
        const hasCollection = Boolean(value);
        if (hasCollection) {
          next.accessType = 'subscription';
          next.tutorialPrice = '0';
        } else if (prev.tutorialPrice === '0') {
          next.tutorialPrice = '';
        }
      }

      if (field === 'contentCategory' && value !== 'tutorial') {
        next.collectionId = '';
      }

      return next;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.contentCategory === 'tutorial') {
      const hasCollection = Boolean(formData.collectionId);
      if (!hasCollection && formData.accessType !== 'free') {
        const price = parseInt(formData.tutorialPrice || '', 10);
        if (isNaN(price) || price <= 0) {
          newErrors.tutorialPrice = 'This content is now standalone — please set a price.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearThumbnail = () => {
    setThumbnailPreview(null);
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        submit: `Thumbnail must be less than ${MAX_THUMBNAIL_SIZE_LABEL}`,
      }));
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

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Thumbnail upload failed');
      }

      const data = await response.json();
      setThumbnailPreview(data?.data?.url || null);
      setErrors((prev) => ({ ...prev, submit: '' }));
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        submit: error?.message || 'Failed to upload thumbnail',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        accessType: hasCollectionSelected ? 'subscription' : formData.accessType,
        requiredPlanId: formData.requiredPlanId || null,
        contentCategory: formData.contentCategory,
        tutorialPrice:
          formData.contentCategory === 'tutorial'
            ? hasCollectionSelected
              ? 0
              : formData.accessType === 'free'
                ? 0
                : parseInt(formData.tutorialPrice || '0', 10)
            : null,
        collectionId: hasCollectionSelected ? formData.collectionId : null,
        thumbnailUrl: thumbnailPreview,
        isPublished: formData.isPublished,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      };

      const response = await fetch(`/api/content/${content.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Content update successful, redirecting to /content');
        // Use window.location for a hard redirect to ensure it works
        window.location.href = '/content';
      } else {
        setErrors({ submit: result.error || 'Failed to update content' });
      }
    } catch (error) {
      console.error('Update error:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const pollReuploadStatus = async (muxUploadId: string) => {
    const maxAttempts = 90;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(`/api/upload/status/${muxUploadId}`);
        const data = await response.json();
        if (data?.ready && data?.playbackId) {
          setReuploadMessage('Video re-upload complete. Playback is restored.');
          return true;
        }
        if (data?.error) {
          throw new Error(data.error);
        }
      } catch (error: any) {
        setErrors((prev) => ({
          ...prev,
          submit: error?.message || 'Video processing failed',
        }));
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    setReuploadMessage('Video is still processing. Please refresh shortly.');
    return false;
  };

  const handleVideoReupload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setReuploadingVideo(true);
    setReuploadMessage('Uploading replacement video...');
    setErrors((prev) => ({ ...prev, submit: '' }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/content/${content.id}/reupload`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to re-upload video');
      }

      setReuploadMessage('Upload complete. Processing video...');
      const isReady = await pollReuploadStatus(result?.data?.muxUploadId);
      if (isReady) {
        router.refresh();
      }
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        submit: error?.message || 'Failed to re-upload video',
      }));
      setReuploadMessage('');
    } finally {
      setReuploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/content/${content.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Use window.location for a hard redirect to ensure it works
        window.location.href = '/content';
      } else {
        const result = await response.json();
        setErrors({ submit: result.error || 'Failed to delete content' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Details</CardTitle>
          <CardDescription>
            Update your content information and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter content title"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your content..."
              rows={4}
            />
          </div>

          {/* Content Category */}
          <div>
            <Label htmlFor="contentCategory">Content Type</Label>
            <Select
              value={formData.contentCategory}
              onValueChange={(value) => handleInputChange('contentCategory', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="content">Regular Content</SelectItem>
                <SelectItem value="tutorial">Tutorial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tutorial-specific fields */}
          {formData.contentCategory === 'tutorial' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Tutorial Settings</h4>

              {hasCollectionSelected && (
                <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <Info className="h-4 w-4 flex-shrink-0 text-orange-600" />
                  <p className="text-sm text-orange-800">
                    This content is part of a collection - access is included automatically for collection subscribers. No individual price needed.
                  </p>
                </div>
              )}

              {wasRemovedFromCollection && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This content is now standalone - please set a price.
                  </AlertDescription>
                </Alert>
              )}

              {/* Tutorial Price */}
              {!hasCollectionSelected && (
                <div>
                  <Label htmlFor="tutorialPrice">Individual Purchase Price</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                      ₦
                    </span>
                    <Input
                      id="tutorialPrice"
                      type="number"
                      value={formData.tutorialPrice}
                      onChange={(e) => handleInputChange('tutorialPrice', e.target.value)}
                      placeholder="5000"
                      className={`rounded-l-none ${errors.tutorialPrice ? 'border-red-500' : ''}`}
                      min="1"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Set a price for individual purchase of this tutorial
                  </p>
                  {errors.tutorialPrice && (
                    <p className="text-sm text-red-500 mt-1">{errors.tutorialPrice}</p>
                  )}
                </div>
              )}

              {/* Collection */}
              {collections.length > 0 && (
                <div>
                  <Label htmlFor="collectionId">Add to Collection (Optional)</Label>
                  <Select
                    value={formData.collectionId || 'none'}
                    onValueChange={(value) => handleInputChange('collectionId', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No collection</SelectItem>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id}>
                          {collection.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Access Control */}
          <div>
            <Label>Access Control</Label>
            <Select
              value={formData.accessType}
              onValueChange={(value) => handleInputChange('accessType', value)}
              disabled={hasCollectionSelected}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select access type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free - Available to all</SelectItem>
                <SelectItem value="subscription">Subscription Required</SelectItem>
                {formData.contentCategory === 'tutorial' && (
                  <SelectItem value="one_time">One-time Purchase</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Required Plan (for subscription access) */}
          {formData.accessType === 'subscription' && creatorPlans.length > 0 && (
            <div>
              <Label htmlFor="requiredPlanId">Required Subscription Plan</Label>
              <Select
                value={formData.requiredPlanId}
                onValueChange={(value) => handleInputChange('requiredPlanId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select required plan" />
                </SelectTrigger>
                <SelectContent>
                  {creatorPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ₦{(plan.price / 100).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="beauty, makeup, tutorial (comma-separated)"
            />
            <p className="text-sm text-gray-500 mt-1">
              Separate tags with commas
            </p>
          </div>

          {(content.type === 'video' || content.type === 'image') && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Thumbnail
                <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
              </Label>
              <div className="w-full max-w-xs">
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
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <DefaultThumbnail title={formData.title || 'Your video title'} />
                    <div
                      className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity hover:opacity-100"
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      <p className="text-sm font-medium text-white">Upload custom thumbnail</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleThumbnailUpload}
              />
              {!thumbnailPreview && (
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Upload custom thumbnail
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                Auto-generated from your video title if not uploaded. Recommended: 1280x720px, JPG or PNG.
              </p>
            </div>
          )}

          {content.type === 'video' ? (
            <div className="space-y-2 rounded-lg border border-border p-4">
              <Label className="text-sm font-medium">Video File</Label>
              <p className="text-xs text-muted-foreground">
                If playback is broken (missing/invalid playback ID), upload a fresh video file here.
              </p>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                className="hidden"
                onChange={handleVideoReupload}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                disabled={reuploadingVideo}
              >
                {reuploadingVideo ? 'Re-uploading...' : 'Re-upload Video'}
              </Button>
              {reuploadMessage ? (
                <p className="text-xs text-muted-foreground">{reuploadMessage}</p>
              ) : null}
            </div>
          ) : null}

          {/* Publish Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isPublished" className="text-base">
                Publish Content
              </Label>
              <p className="text-sm text-gray-500">
                Make this content visible to your fans
              </p>
            </div>
            <Switch
              id="isPublished"
              checked={formData.isPublished}
              onCheckedChange={(checked) => handleInputChange('isPublished', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Error */}
      {errors.submit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errors.submit}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {deleting ? 'Deleting...' : 'Delete Content'}
        </Button>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

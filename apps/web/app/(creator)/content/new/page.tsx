'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X, BookOpen, Info } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import { getCreatorPlan, getPlanLimits, type PlatformPlan } from '@/lib/utils/plan-limits';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';
import { UploadProgress } from '@/components/content/UploadProgress';
import { ContentGuidelinesModal } from '@/components/content/ContentGuidelinesModal';
import {
  MAX_THUMBNAIL_SIZE_BYTES,
  MAX_THUMBNAIL_SIZE_LABEL,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
} from '@/lib/utils/constants';

const contentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['video', 'image', 'pdf', 'text']),
  accessType: z.enum(['free', 'subscription', 'one_time']).default('subscription'),
  isPublished: z.boolean().default(false),
  contentCategory: z.enum(['content', 'tutorial']).default('content'),
  collectionId: z.string().optional(),
  tutorialPrice: z.string().optional(),
});

type ContentFormValues = z.infer<typeof contentSchema>;

interface Collection {
  id: string;
  title: string;
}

function uploadVideoWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void,
  onComplete: () => void,
  onError: (error: string) => void
) {
  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener('progress', (event) => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    }
  });

  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      onComplete();
      return;
    }
    onError(`Upload failed with status ${xhr.status}`);
  });

  xhr.addEventListener('error', () => {
    onError('Network error - check your connection');
  });

  xhr.addEventListener('abort', () => {
    onError('Upload cancelled');
  });

  xhr.open('PUT', uploadUrl);
  xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
  xhr.send(file);

  return xhr;
}

export default function NewContentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isPublished, setIsPublished] = useState(true); // Default to published
  const [uploadedFile, setUploadedFile] = useState<{
    url?: string;
    muxAssetId?: string;
    muxPlaybackId?: string;
    uploadUrl?: string;
    thumbnail?: string;
    fileName?: string;
    muxUploadId?: string;
    status?: string;
    estimatedReadyTime?: string;
  } | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [currentPlan, setCurrentPlan] = useState<PlatformPlan>('STARTER');
  const [isHardBlocked, setIsHardBlocked] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [guidelinesRequireAcceptance, setGuidelinesRequireAcceptance] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(true);
  const [acceptingGuidelines, setAcceptingGuidelines] = useState(false);
  const [uploadState, setUploadState] = useState<
    'idle' | 'uploading' | 'processing' | 'complete' | 'error'
  >('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [xhrRef, setXhrRef] = useState<XMLHttpRequest | null>(null);
  const uploadStartTime = useRef<number>(0);
  const lastLoadedRef = useRef<number>(0);
  const { isOpen, limitType, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'video',
      accessType: 'subscription',
      isPublished: false,
      contentCategory: 'content',
      collectionId: '',
      tutorialPrice: '',
    },
  });

  const contentType = form.watch('type');
  const contentCategory = form.watch('contentCategory');
  const accessType = form.watch('accessType');
  const collectionId = form.watch('collectionId');
  const contentTitle = form.watch('title');
  const hasCollectionSelected = contentCategory === 'tutorial' && Boolean(collectionId);
  const isFileBusy = uploadState === 'uploading' || uploadState === 'processing';
  const showUploadProgress =
    contentType === 'video' &&
    (uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'error');

  // Fetch collections when component mounts
  useEffect(() => {
    async function fetchCollections() {
      try {
        const response = await fetch('/api/creator/me');
        if (response.ok) {
          const data = await response.json();
          const plan = getCreatorPlan(data.platformPlan ?? null);
          const limits = getPlanLimits(data.platformPlan ?? null);
          const publishedCount = Number(data.contentCount || 0);
          setCurrentPlan(plan);
          if (publishedCount >= limits.maxContent) {
            setIsHardBlocked(true);
            showUpgradeModal('maxContent');
          }
          if (data.collections) {
            setCollections(data.collections);
          }
          const hasAcceptedGuidelines = Boolean(data.contentGuidelinesAccepted);
          setGuidelinesAccepted(hasAcceptedGuidelines);
          if (!hasAcceptedGuidelines) {
            setGuidelinesRequireAcceptance(true);
            setShowGuidelinesModal(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch collections:', error);
      }
    }
    fetchCollections();
  }, []);

  useEffect(() => {
    if (contentCategory !== 'tutorial') {
      return;
    }

    if (collectionId) {
      form.setValue('accessType', 'subscription');
      form.setValue('tutorialPrice', '0');
      return;
    }

    if (form.getValues('tutorialPrice') === '0') {
      form.setValue('tutorialPrice', '');
    }
  }, [collectionId, contentCategory, form]);

  function formatSpeed(bytesPerSec: number): string {
    if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '';
    if (bytesPerSec >= 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    return `${Math.max(1, Math.round(bytesPerSec / 1024))} KB/s`;
  }

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '';
    if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s left`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s left`;
  }

  function handleCancelUpload() {
    if (xhrRef && uploadState === 'uploading') {
      xhrRef.abort();
    }
    setUploadState('idle');
    setUploadProgress(0);
    setUploadSpeed('');
    setTimeRemaining('');
    setUploadError('');
    setSelectedUploadFile(null);
    setXhrRef(null);
  }

  async function handleFileUpload(file: File) {
    if (!guidelinesAccepted) {
      toast({
        title: 'Content guidelines required',
        description: 'Please accept the content guidelines before uploading.',
        variant: 'destructive',
      });
      return;
    }
    try {
      if (file.size === 0) {
        throw new Error('File is empty');
      }

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        throw new Error(
          `File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB (max: ${MAX_UPLOAD_SIZE_LABEL})`
        );
      }

      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}. Allowed: MP4, WebM, MOV, MKV`);
      }

      if (contentType === 'video') {
        setSelectedUploadFile(file);
        setUploadState('uploading');
        setUploadProgress(0);
        setUploadSpeed('');
        setTimeRemaining('');
        setUploadError('');
        uploadStartTime.current = Date.now();
        lastLoadedRef.current = 0;

        const uploadUrlResponse = await fetch('/api/content/mux-upload-url');
        const uploadUrlData = await uploadUrlResponse.json();

        if (!uploadUrlResponse.ok || !uploadUrlData.uploadUrl || !uploadUrlData.uploadId) {
          throw new Error(uploadUrlData.error || 'Failed to create Mux upload URL');
        }

        const xhr = uploadVideoWithProgress(
          uploadUrlData.uploadUrl,
          file,
          (percent) => {
            setUploadProgress((prev) => Math.max(prev, percent));
            const elapsed = (Date.now() - uploadStartTime.current) / 1000;
            const loaded = (Math.max(percent, 1) / 100) * file.size;
            const speed = loaded / Math.max(elapsed, 0.1);
            const remaining = (file.size - loaded) / Math.max(speed, 1);
            setUploadSpeed(formatSpeed(speed));
            setTimeRemaining(formatTime(remaining));
            lastLoadedRef.current = loaded;
          },
          async () => {
            setUploadState('processing');
            setUploadProgress(100);
            setUploadedFile({
              muxUploadId: uploadUrlData.uploadId,
              fileName: file.name,
              status: 'processing',
            });
            await pollMuxProcessing(uploadUrlData.uploadId);
          },
          (errorMessage) => {
            setUploadState('error');
            setUploadError(errorMessage);
            toast({
              title: 'Upload failed',
              description: errorMessage,
              variant: 'destructive',
            });
          }
        );

        setXhrRef(xhr);
        return;
      }

      // Non-video uploads keep existing server upload path.
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = '/api/upload/r2';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || responseData.details || 'Upload failed');
      }

      setUploadedFile({
        url: responseData.data?.url || responseData.url,
        fileName: responseData.data?.path || responseData.fileName,
      });

      toast({
        title: 'Success',
        description: 'File uploaded successfully!',
      });

    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    }
  }

  async function pollMuxProcessing(uploadId: string) {
    const maxAttempts = 120;
    const pollInterval = 3000;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const statusResponse = await fetch(`/api/content/mux-status/${uploadId}`);
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(statusData.error || 'Failed to check video status');
        }

        if (statusData.status === 'ready') {
          const muxThumbnailUrl = statusData.playbackId
            ? `https://image.mux.com/${statusData.playbackId}/thumbnail.jpg`
            : undefined;
          setUploadedFile((prev) => ({
            ...prev,
            muxUploadId: uploadId,
            muxAssetId: statusData.assetId,
            muxPlaybackId: statusData.playbackId,
            uploadUrl: statusData.playbackUrl,
            thumbnail: muxThumbnailUrl,
            fileName: selectedUploadFile?.name ?? prev?.fileName,
            status: 'ready',
          }));
          setUploadState('complete');
          setXhrRef(null);
          toast({
            title: 'Video Ready!',
            description: 'Your video has finished processing and is now ready to view.',
          });
          return;
        }

        if (statusData.status === 'errored') {
          throw new Error('Video processing failed');
        }
      } catch (error) {
        setUploadState('error');
        setUploadError(error instanceof Error ? error.message : 'Video processing failed');
        setXhrRef(null);
        toast({
          title: 'Processing Error',
          description: error instanceof Error ? error.message : 'Video processing failed',
          variant: 'destructive',
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    setUploadState('error');
    setUploadError('Video processing is taking longer than expected');
    setXhrRef(null);
    toast({
      title: 'Still Processing',
      description: 'Your video is taking longer than expected to process. Please check back later.',
    });
  }

  function clearThumbnail() {
    setThumbnailPreview(null);
    setThumbnailFile(null);
  }

  async function onSubmit(data: ContentFormValues) {
    if (!guidelinesAccepted) {
      toast({
        title: 'Content guidelines required',
        description: 'Please accept the content guidelines before publishing.',
        variant: 'destructive',
      });
      return;
    }
    if (!uploadedFile && contentType !== 'text') {
      toast({
        title: 'File required',
        description: 'Please upload a file before creating content',
        variant: 'destructive',
      });
      return;
    }

    const isTutorial = data.contentCategory === 'tutorial';
    const isInCollection = isTutorial && Boolean(data.collectionId);
    const parsedTutorialPrice = data.tutorialPrice
      ? Math.round(parseFloat(data.tutorialPrice) * 100)
      : 0;

    if (isTutorial && !isInCollection && data.accessType !== 'free' && parsedTutorialPrice <= 0) {
      toast({
        title: 'Price required',
        description: 'This content is now standalone — please set a price.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append('file', thumbnailFile);
        formData.append('type', 'thumbnail');

        const thumbResponse = await fetch('/api/upload/profile', {
          method: 'POST',
          body: formData,
        });

        if (thumbResponse.ok) {
          const thumbData = await thumbResponse.json();
          thumbnailUrl = thumbData.data.url;
        }
      } else if (uploadedFile?.thumbnail && contentType === 'video') {
        // Use Mux thumbnail if no custom thumbnail uploaded
        thumbnailUrl = uploadedFile.thumbnail;
      }

      const normalizedAccessType =
        isTutorial && isInCollection
          ? 'subscription'
          : data.accessType;

      const tutorialPriceKobo =
        isTutorial && isInCollection
          ? 0
          : isTutorial
            ? parsedTutorialPrice
            : undefined;

      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          isPublished: isPublished,
          tags: [],
          requiredPlanId: undefined,
          muxAssetId: uploadedFile?.muxAssetId,
          muxPlaybackId: uploadedFile?.muxPlaybackId,
          thumbnailUrl: thumbnailUrl,
          contentCategory: data.contentCategory,
          accessType: normalizedAccessType,
          collectionId: data.collectionId || undefined,
          tutorialPrice: tutorialPriceKobo,
        }),
      });

      if (response.status === 403) {
        const blockedData = await response.json();
        showUpgradeModal((blockedData.limitType || 'maxContent') as any);
        setIsHardBlocked(true);
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create content',
          variant: 'destructive',
        });
        return;
      }

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create content',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Content created successfully!',
      });

      router.push('/content');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const showCollectionField = contentCategory === 'tutorial';
  const showPriceField =
    contentCategory === 'tutorial' &&
    !hasCollectionSelected &&
    accessType !== 'free';

  async function handleAcceptGuidelines() {
    setAcceptingGuidelines(true);
    try {
      const response = await fetch('/api/creator/accept-guidelines', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to save acceptance');
      }
      setGuidelinesAccepted(true);
      setGuidelinesRequireAcceptance(false);
      setShowGuidelinesModal(false);
    } catch (error) {
      toast({
        title: 'Unable to continue',
        description: 'Please try again to accept content guidelines.',
        variant: 'destructive',
      });
    } finally {
      setAcceptingGuidelines(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      {isHardBlocked ? (
        <Card className="border-orange-200 bg-orange-50/60">
          <CardHeader>
            <CardTitle>Content uploads are currently locked</CardTitle>
            <CardDescription>
              You have reached your plan limit. Upgrade to continue publishing new content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => showUpgradeModal('maxContent')} className="bg-orange-600 text-white hover:bg-orange-700">
              Upgrade to continue
            </Button>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>Create New Content</CardTitle>
          <CardDescription>
            Add a new piece of content to your creator profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter content title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter content description (optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contentCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="content">Regular Content</SelectItem>
                        <SelectItem value="tutorial">Tutorial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select access type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="one_time">One-time Payment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Collection Selection for Tutorials */}
              {showCollectionField && (
                <FormField
                  control={form.control}
                  name="collectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Add to Collection (Optional)
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a collection" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None (Standalone Tutorial)</SelectItem>
                          {collections.map((collection) => (
                            <SelectItem key={collection.id} value={collection.id}>
                              {collection.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {collectionId 
                          ? 'Tutorial will be part of this collection. Users subscribe to the collection for access.'
                          : 'Leave empty to sell as a standalone tutorial.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {hasCollectionSelected && (
                <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <Info className="h-4 w-4 flex-shrink-0 text-orange-600" />
                  <p className="text-sm text-orange-800">
                    This content is part of a collection - access is included automatically for collection subscribers. No individual price needed.
                  </p>
                </div>
              )}

              {/* Individual Tutorial Price */}
              {showPriceField && (
                <FormField
                  control={form.control}
                  name="tutorialPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tutorial Price (₦)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            ₦
                          </span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Set a price for individual purchase of this tutorial
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* File Upload Section */}
              {contentType !== 'text' && (
                <FormItem>
                  <FormLabel>
                    {contentType === 'video' ? 'Video File' : contentType === 'image' ? 'Image File' : 'PDF File'}
                  </FormLabel>
                  <div className="space-y-4">
                    {showUploadProgress ? (
                      <UploadProgress
                        state={uploadState === 'error' ? 'error' : uploadState}
                        progress={uploadProgress}
                        speed={uploadSpeed}
                        timeRemaining={timeRemaining}
                        fileName={selectedUploadFile?.name || 'Uploading video'}
                        fileSize={selectedUploadFile?.size || 0}
                        error={uploadError}
                        onCancel={handleCancelUpload}
                      />
                    ) : !uploadedFile ? (
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <Upload className="h-10 w-10 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {contentType === 'video' && `MP4, MOV, AVI (max ${MAX_UPLOAD_SIZE_LABEL})`}
                              {contentType === 'image' && 'JPG, PNG, GIF (max 10MB)'}
                              {contentType === 'pdf' && 'PDF (max 50MB)'}
                            </p>
                          </div>
                          <Input
                            type="file"
                            accept={
                              contentType === 'video'
                                ? 'video/*'
                                : contentType === 'image'
                                ? 'image/*'
                                : 'application/pdf'
                            }
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(file);
                              }
                            }}
                            disabled={isFileBusy}
                            className="hidden"
                            id="file-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('file-upload')?.click()}
                            disabled={isFileBusy}
                          >
                            {isFileBusy ? 'Uploading...' : 'Select File'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {uploadedFile.fileName || 'Video uploaded'}
                              </p>
                              {uploadedFile.muxUploadId && (
                                <p className="text-xs text-muted-foreground">
                                  Upload ID: {uploadedFile.muxUploadId}
                                </p>
                              )}
                              {uploadedFile.status && (
                                <p className="text-xs text-muted-foreground">
                                  Status: {uploadedFile.status === 'processing' ? 'Processing video...' :
                                           uploadedFile.status === 'ready' ? 'Ready to stream!' :
                                           uploadedFile.status}
                                </p>
                              )}
                              {uploadedFile.estimatedReadyTime && uploadedFile.status === 'processing' && (
                                <p className="text-xs text-muted-foreground">
                                  Estimated ready: {new Date(uploadedFile.estimatedReadyTime).toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedFile(null);
                              setUploadState('idle');
                              setUploadProgress(0);
                              setUploadSpeed('');
                              setTimeRemaining('');
                              setUploadError('');
                              setSelectedUploadFile(null);
                              setXhrRef(null);
                            }}
                            disabled={isFileBusy}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Processing Progress Bar */}
                        {uploadedFile.status === 'processing' && (
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Processing your video... This usually takes 1-3 minutes.
                            </p>
                          </div>
                        )}

                        {/* Ready Status */}
                        {uploadedFile.status === 'ready' && uploadedFile.uploadUrl && (
                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-xs text-green-700">
                              ✅ Video ready! Playback URL: {uploadedFile.uploadUrl}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </FormItem>
              )}

              {/* Thumbnail Upload (for videos and images) */}
              {(contentType === 'video' || contentType === 'image') && (
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
                        <DefaultThumbnail title={contentTitle || 'Your video title'} />
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
                          toast({
                            title: 'File too large',
                            description: `Thumbnail must be less than ${MAX_THUMBNAIL_SIZE_LABEL}`,
                            variant: 'destructive',
                          });
                          return;
                        }
                        setThumbnailFile(file);
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setThumbnailPreview(evt.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
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

              {/* Publish/Draft Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="space-y-1">
                  <Label htmlFor="publish-toggle" className="text-sm font-medium">
                    Publish Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Choose whether to publish immediately or save as draft
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="publish-toggle" className="text-sm">
                    {isPublished ? 'Published' : 'Draft'}
                  </Label>
                  <Switch
                    id="publish-toggle"
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading || isFileBusy}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || isFileBusy}>
                  {isLoading
                    ? 'Creating...'
                    : isPublished
                      ? 'Publish Content'
                      : 'Save as Draft'
                  }
                </Button>
              </div>

              <div className="mt-6 flex items-center justify-center border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setGuidelinesRequireAcceptance(false);
                    setShowGuidelinesModal(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Content Guidelines
                </button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      )}

      {limitType ? (
        <UpgradeModal
          isOpen={isOpen}
          onClose={closeUpgradeModal}
          limitType={limitType}
          currentPlan={currentPlan}
        />
      ) : null}

      <ContentGuidelinesModal
        open={showGuidelinesModal}
        onClose={() => setShowGuidelinesModal(false)}
        requireAcceptance={guidelinesRequireAcceptance}
        onAccepted={handleAcceptGuidelines}
        loading={acceptingGuidelines}
      />
    </div>
  );
}

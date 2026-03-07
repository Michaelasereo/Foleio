'use client';

import { useState, useEffect } from 'react';
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
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import { getCreatorPlan, getPlanLimits, type PlatformPlan } from '@/lib/utils/plan-limits';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';
import { useRef } from 'react';

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

export default function NewContentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  async function handleFileUpload(file: File) {
    console.log('🚀 VIDEO UPLOAD DEBUG - START');
    console.log('📁 File Details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2) + 'MB'
    });

    setUploading(true);

    try {
      // 🔍 STEP 1: File Validation
      console.log('🔍 STEP 1: File Validation');
      if (file.size === 0) {
        console.error('❌ File is empty!');
        throw new Error('File is empty');
      }

      if (file.size > 100 * 1024 * 1024) {
        console.error('❌ File too large:', file.size, 'bytes (max: 100MB)');
        throw new Error(`File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB (max: 100MB)`);
      }

      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
      if (!allowedTypes.includes(file.type)) {
        console.error('❌ Invalid file type:', file.type, '- Allowed:', allowedTypes);
        throw new Error(`Unsupported file type: ${file.type}. Allowed: MP4, WebM, MOV, MKV`);
      }

      console.log('✅ File validation passed');

      // 📦 STEP 2: Prepare FormData
      console.log('📦 STEP 2: Prepare FormData');
      const formData = new FormData();
      formData.append('file', file);
      console.log('📦 FormData prepared, file appended');

      // 🌐 STEP 3: Determine endpoint
      const endpoint = contentType === 'video' ? '/api/upload/stream' : '/api/upload/r2';
      console.log('🌐 STEP 3: Upload endpoint:', endpoint);
      console.log('   Content type:', contentType);

      // 🔐 STEP 4: Check authentication
      console.log('🔐 STEP 4: Checking authentication...');
      try {
        const authCheck = await fetch('/api/creator/me');
        console.log('   Auth check response:', authCheck.status);
        if (authCheck.status === 401) {
          console.log('   ⚠️ User not authenticated');
        } else if (authCheck.status === 200) {
          console.log('   ✅ User authenticated');
        }
      } catch (authError) {
        console.error('   ❌ Auth check failed:', authError);
      }

      // 📤 STEP 5: Start upload
      console.log('📤 STEP 5: Starting upload...');
      const uploadStart = Date.now();

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const uploadTime = Date.now() - uploadStart;
      console.log('⏱️ Upload response time:', uploadTime + 'ms');
      console.log('📊 Response status:', response.status, response.statusText);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

      // 📄 STEP 6: Process response
      console.log('📄 STEP 6: Processing response...');
      const responseText = await response.text();
      console.log('📄 Raw response:', responseText.substring(0, 500));

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('📋 Parsed response:', responseData);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        console.error('❌ Upload failed with status:', response.status);
        console.error('❌ Error details:', responseData);

        // Provide specific error messages
        if (responseData.error?.includes('Authentication')) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (responseData.error?.includes('File too large')) {
          throw new Error('File is too large. Maximum size is 100MB.');
        } else if (responseData.error?.includes('Unsupported file type')) {
          throw new Error('Unsupported file type. Please use MP4, WebM, MOV, or MKV.');
        } else if (
          responseData.details?.includes('Video upload limit reached on the current Mux account') ||
          responseData.details?.includes('Free plan is limited to 10 assets')
        ) {
          throw new Error(
            'Video hosting limit reached (Mux free plan). Please upgrade Mux or remove old hosted videos, then retry.'
          );
        } else if (responseData.error?.includes('Mux')) {
          throw new Error('Video processing service error. Please try again.');
        } else {
          throw new Error(responseData.error || responseData.details || 'Upload failed');
        }
      }

      console.log('✅ Upload successful!');
      console.log('🎬 Processing response data...');

      // 🎯 STEP 7: Handle success response
      console.log('🎉 Upload response received:', JSON.stringify(responseData, null, 2));

      if (contentType === 'video') {
        console.log('🎬 Video upload - processing async response...');
        const videoData = responseData.data;

        // Video is processing asynchronously
        setUploadedFile({
          muxUploadId: videoData.muxUploadId,
          status: videoData.status,
          uploadUrl: videoData.playbackUrl, // Will be null until processing complete
          estimatedReadyTime: videoData.estimatedReadyTime,
        });

        // Start polling for video processing status
        console.log('⏳ Starting video processing status polling...');
        pollVideoStatus(videoData.muxUploadId);

        toast({
          title: 'Video Uploaded!',
          description: videoData.message || 'Your video is being processed. This usually takes 1-3 minutes.',
        });
      } else {
        console.log('📁 Other file upload - extracting file data...');
        setUploadedFile({
          url: responseData.data?.url || responseData.url,
          fileName: responseData.data?.path || responseData.fileName,
        });

        toast({
          title: 'Success',
          description: 'File uploaded successfully!',
        });
      }

      console.log('🎉 Upload process initiated successfully!');

    } catch (error) {
      console.error('💥 UPLOAD ERROR:', error);
      const err = error as Error;
      console.error('Error stack:', err.stack);
      console.error('Error message:', err.message);

      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 UPLOAD DEBUG - END');
      setUploading(false);
    }
  }

  // Poll for video processing status
  async function pollVideoStatus(muxUploadId: string) {
    console.log('🔄 Starting video status polling for:', muxUploadId);

    const maxAttempts = 60; // 60 attempts = ~2 minutes
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Polling attempt ${attempt}/${maxAttempts}...`);

        const statusResponse = await fetch(`/api/upload/status/${muxUploadId}`);
        const statusData = await statusResponse.json();

        console.log('📊 Video status response:', statusResponse.status);
        console.log('📊 Video status data:', JSON.stringify(statusData, null, 2));

        // Check for successful processing
        if (statusData.ready && statusData.playbackUrl && statusData.playbackId) {
          console.log('✅ Video processing complete!');
          console.log('🎬 Playback URL:', statusData.playbackUrl);

          // Generate Mux thumbnail URL if available
          const muxThumbnailUrl = statusData.playbackId 
            ? `https://image.mux.com/${statusData.playbackId}/thumbnail.jpg`
            : null;

          // Update the uploaded file with the real data
          setUploadedFile(prev => ({
            ...prev,
            muxAssetId: statusData.assetId,
            muxPlaybackId: statusData.playbackId,
            uploadUrl: statusData.playbackUrl,
            thumbnail: muxThumbnailUrl || undefined,
            status: 'ready',
          }));

          toast({
            title: 'Video Ready!',
            description: 'Your video has finished processing and is now ready to view.',
          });

          return; // Stop polling
        }

        if (statusData.error) {
          console.error('❌ Video processing error:', statusData.error);
          toast({
            title: 'Processing Error',
            description: `Video processing failed: ${statusData.error}`,
            variant: 'destructive',
          });
          return; // Stop polling
        }

        // Video still processing - wait before next poll
        console.log(`⏳ Video still processing (status: ${statusData.assetStatus || 'unknown'})...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        console.error('❌ Polling error:', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    console.log('⏰ Polling timeout - video may still be processing');
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
                    {!uploadedFile ? (
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <Upload className="h-10 w-10 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {contentType === 'video' && 'MP4, MOV, AVI (max 500MB)'}
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
                            disabled={uploading}
                            className="hidden"
                            id="file-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('file-upload')?.click()}
                            disabled={uploading}
                          >
                            {uploading ? 'Uploading...' : 'Select File'}
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
                            onClick={() => setUploadedFile(null)}
                            disabled={uploading}
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
                        if (file.size > 10 * 1024 * 1024) {
                          toast({
                            title: 'File too large',
                            description: 'Thumbnail must be less than 10MB',
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
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? 'Creating...'
                    : isPublished
                      ? 'Publish Content'
                      : 'Save as Draft'
                  }
                </Button>
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
    </div>
  );
}

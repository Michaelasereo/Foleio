'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Video, Check, Upload, Loader2 } from 'lucide-react';
import { setIntroVideo } from '@/lib/actions/creator';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface IntroVideoTabProps {
  creatorId: string;
  currentIntroVideo: {
    id: string;
    title: string;
    videoId: string | null;
    thumbnailUrl: string | null;
  } | null;
  videoOptions: Array<{
    id: string;
    title: string;
    videoId: string | null;
    thumbnailUrl: string | null;
  }>;
}

export function IntroVideoTab({
  creatorId,
  currentIntroVideo,
  videoOptions,
}: IntroVideoTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(
    currentIntroVideo?.id || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await setIntroVideo(selectedVideoId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Intro video updated successfully',
        });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update intro video',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error setting intro video:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Video must be less than 100MB',
        variant: 'destructive',
      });
      return;
    }

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload MP4, WebM, MOV, or MKV files',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      
      // Poll for video processing
      if (data.muxUploadId) {
        let attempts = 0;
        const maxAttempts = 60;
        
        const pollStatus = async () => {
          const statusResponse = await fetch(`/api/upload/status/${data.muxUploadId}`);
          const statusData = await statusResponse.json();
          
          if (statusData.ready && statusData.contentId) {
            // Video is ready, set it as intro video
            const result = await setIntroVideo(statusData.contentId);
            if (result.success) {
              toast({
                title: 'Success',
                description: 'Video uploaded and set as intro video',
              });
              router.refresh();
            }
            setIsUploading(false);
          } else if (statusData.error) {
            toast({
              title: 'Error',
              description: statusData.error,
              variant: 'destructive',
            });
            setIsUploading(false);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(pollStatus, 2000);
          } else {
            toast({
              title: 'Timeout',
              description: 'Video processing is taking longer than expected',
              variant: 'destructive',
            });
            setIsUploading(false);
          }
        };
        
        setTimeout(pollStatus, 2000);
      } else {
        throw new Error('Upload response missing muxUploadId');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred during upload',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Intro Video</h2>
        <p className="text-muted-foreground">
          Select a video to display as your introduction on your public profile
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New Video</CardTitle>
          <CardDescription>
            Upload a new video to use as your intro video
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Video
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Max file size: 100MB. Supported formats: MP4, WebM, MOV, MKV
          </p>
        </CardContent>
      </Card>

      {/* Select from Existing */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Or Select from Existing Videos</h3>
        {videoOptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No video content available. Upload a video above or create one in Content.
              </p>
              <Button onClick={() => router.push('/content/new')} variant="outline">
                Go to Content
              </Button>
            </CardContent>
          </Card>
        ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {videoOptions.map((video) => {
              const isSelected = selectedVideoId === video.id;
              return (
                <Card
                  key={video.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedVideoId(video.id)}
                >
                  <div className="aspect-video bg-muted relative">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="text-sm">{video.title}</CardTitle>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedVideoId(null)}
              disabled={selectedVideoId === null}
            >
              Clear Selection
            </Button>
            <Button onClick={handleSave} disabled={isSaving || selectedVideoId === currentIntroVideo?.id}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </>
        )}
      </div>
    </div>
  );
}


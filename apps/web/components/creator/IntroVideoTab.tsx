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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Video, Check, Upload, Loader2, Play, Edit3 } from 'lucide-react';
import { setIntroVideo, updateContentTitle } from '@/lib/actions/creator';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { MuxVideoPlayer } from '@/components/ui/mux-player';
import { Input } from '@/components/ui/input';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL } from '@/lib/utils/constants';

interface IntroVideoTabProps {
  creatorId: string;
  currentIntroVideo: {
    id: string;
    title: string;
    muxPlaybackId: string | null;
    muxAssetId: string | null;
    thumbnailUrl: string | null;
  } | null;
  videoOptions: Array<{
    id: string;
    title: string;
    muxPlaybackId: string | null;
    muxAssetId: string | null;
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
  const [previewVideo, setPreviewVideo] = useState<{
    id: string;
    title: string;
    muxPlaybackId: string;
    muxAssetId: string | null;
  } | null>(null);
  const [renamingVideo, setRenamingVideo] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the selected video details for preview
  const selectedVideo = videoOptions.find(v => v.id === selectedVideoId);

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

  const handleStartRename = (videoId: string, currentTitle: string) => {
    setRenamingVideo(videoId);
    setRenameValue(currentTitle);
  };

  const handleCancelRename = () => {
    setRenamingVideo(null);
    setRenameValue('');
  };

  const handleConfirmRename = async (videoId: string) => {
    if (!renameValue.trim()) {
      toast({
        title: 'Error',
        description: 'Title cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await updateContentTitle(videoId, renameValue.trim());
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Video title updated successfully',
        });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update video title',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error renaming video:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setRenamingVideo(null);
      setRenameValue('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast({
        title: 'File too large',
        description: `Video must be less than ${MAX_UPLOAD_SIZE_LABEL}`,
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
      if (data.data?.muxUploadId) {
        let attempts = 0;
        const maxAttempts = 60;
        
        const pollStatus = async () => {
          const statusResponse = await fetch(`/api/upload/status/${data.data.muxUploadId}`);
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

      {/* Current Intro Video Preview */}
      {currentIntroVideo && currentIntroVideo.muxPlaybackId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Current Intro Video
            </CardTitle>
            <CardDescription>
              This video is currently displayed on your public profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <MuxVideoPlayer
                playbackId={currentIntroVideo.muxPlaybackId}
                assetId={currentIntroVideo.muxAssetId || undefined}
                title={currentIntroVideo.title}
                className="w-full h-full"
              />
            </div>
            <h3 className="mt-4 font-semibold">{currentIntroVideo.title}</h3>
          </CardContent>
        </Card>
      )}

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
                Uploading & Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Video
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Max file size: {MAX_UPLOAD_SIZE_LABEL}. Supported formats: MP4, WebM, MOV, MKV
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
              const isCurrent = currentIntroVideo?.id === video.id;
              return (
                <Card
                  key={video.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedVideoId(video.id)}
                >
                  <div className="aspect-video bg-muted relative group">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <DefaultThumbnail title={video.title} />
                    )}
                    {/* Play preview button */}
                    {video.muxPlaybackId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewVideo({
                            id: video.id,
                            title: video.title,
                            muxPlaybackId: video.muxPlaybackId!,
                            muxAssetId: video.muxAssetId,
                          });
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <div className="bg-white/90 rounded-full p-3">
                          <Play className="h-8 w-8 text-primary" />
                        </div>
                      </button>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    {isCurrent && !isSelected && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Current
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-3">
                    {renamingVideo === video.id ? (
                      <div className="space-y-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleConfirmRename(video.id);
                            } else if (e.key === 'Escape') {
                              handleCancelRename();
                            }
                          }}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmRename(video.id)}
                            className="h-6 px-2 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelRename}
                            className="h-6 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm line-clamp-1">{video.title}</CardTitle>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(video.id, video.title);
                          }}
                          className="ml-2 opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                          title="Rename video"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {!video.muxPlaybackId && (
                      <p className="text-xs text-amber-600">Processing...</p>
                    )}
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 mt-4">
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

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{previewVideo?.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Preview this intro video in a modal player.
            </DialogDescription>
          </DialogHeader>
          {previewVideo && (
            <div className="p-4 pt-2">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <MuxVideoPlayer
                  playbackId={previewVideo.muxPlaybackId}
                  assetId={previewVideo.muxAssetId || undefined}
                  title={previewVideo.title}
                  className="w-full h-full"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setPreviewVideo(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setSelectedVideoId(previewVideo.id);
                    setPreviewVideo(null);
                  }}
                >
                  Select This Video
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


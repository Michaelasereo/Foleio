'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Video, X } from 'lucide-react';
import { setIntroVideo } from '@/lib/actions/creator';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';

interface VideoOption {
  id: string;
  title: string;
  videoId: string | null;
  thumbnailUrl: string | null;
}

interface IntroVideoSelectorProps {
  currentVideoId: string | null;
  videoOptions: VideoOption[];
}

export function IntroVideoSelector({
  currentVideoId,
  videoOptions,
}: IntroVideoSelectorProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(currentVideoId);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await setIntroVideo(selectedVideoId);
    } catch (error) {
      console.error('Error setting intro video:', error);
    }
    setIsSaving(false);
  }

  async function handleRemove() {
    setIsSaving(true);
    try {
      await setIntroVideo(null);
      setSelectedVideoId(null);
    } catch (error) {
      console.error('Error removing intro video:', error);
    }
    setIsSaving(false);
  }

  const currentVideo = videoOptions.find((v) => v.id === selectedVideoId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Introduction Video
        </CardTitle>
        <CardDescription>
          Select a video to display as your introduction on your public profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {videoOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t uploaded any videos yet. Upload a video in Content
            to set it as your intro video.
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <Select
                value={selectedVideoId || 'none'}
                onValueChange={(value) =>
                  setSelectedVideoId(value === 'none' ? null : value)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a video" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No intro video</SelectItem>
                  {videoOptions.map((video) => (
                    <SelectItem key={video.id} value={video.id}>
                      {video.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSave}
                disabled={isSaving || selectedVideoId === currentVideoId}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>

            {currentVideo && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                {currentVideo.thumbnailUrl ? (
                  <img
                    src={currentVideo.thumbnailUrl}
                    alt={currentVideo.title}
                    className="w-20 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 overflow-hidden rounded">
                    <DefaultThumbnail title={currentVideo.title} size="sm" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{currentVideo.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Currently set as intro video
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemove}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}


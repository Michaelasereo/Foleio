'use client';

import { FolderMinus, GripVertical, Pencil } from 'lucide-react';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';

interface SectionOption {
  id: string;
  title: string;
}

interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  isPublished: boolean;
  sectionId?: string | null;
}

interface VideoRowProps {
  video: VideoItem;
  index: number;
  sections: SectionOption[];
  isReorderEnabled?: boolean;
  onMoveToSection: (videoId: string, sectionId: string | null) => void;
  onEditVideo: (videoId: string) => void;
  onRemoveFromCollection: (videoId: string) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoRow({
  video,
  index,
  sections,
  isReorderEnabled = false,
  onMoveToSection,
  onEditVideo,
  onRemoveFromCollection,
}: VideoRowProps) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 transition-colors hover:border-primary/30">
      {isReorderEnabled ? (
        <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-muted-foreground" />
      ) : null}
      <span className="w-5 flex-shrink-0 text-center text-xs text-muted-foreground">
        {index + 1}
      </span>

      <div className="h-9 w-14 flex-shrink-0 overflow-hidden rounded-lg">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <DefaultThumbnail title={video.title || 'Untitled Video'} size="sm" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{video.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {video.durationSeconds ? (
            <span className="text-xs text-muted-foreground">
              {formatDuration(video.durationSeconds)}
            </span>
          ) : null}
          <span
            className={`rounded-full px-1.5 py-0.5 text-xs ${
              video.isPublished
                ? 'bg-green-100 text-green-700'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {video.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>
      </div>

      <select
        value={video.sectionId || ''}
        onChange={(e) => onMoveToSection(video.id, e.target.value || null)}
        className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
        aria-label={video.sectionId ? 'Move video section' : 'Add video to section'}
      >
        <option value="">
          {video.sectionId ? 'Unsectioned' : 'Add to section'}
        </option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.title}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onEditVideo(video.id)}
          className="rounded-lg p-1.5 hover:bg-muted"
          type="button"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={() => onRemoveFromCollection(video.id)}
          className="rounded-lg p-1.5 hover:bg-red-50"
          type="button"
        >
          <FolderMinus className="h-3.5 w-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}

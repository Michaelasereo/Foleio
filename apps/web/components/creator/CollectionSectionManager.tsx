'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Package,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { VideoRow } from '@/components/collection/VideoRow';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';
import { useRouter } from 'next/navigation';

interface Section {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  sectionContents: Array<{
    id: string;
    orderIndex: number;
    content: {
      id: string;
      title: string;
      type: string;
      thumbnailUrl: string | null;
      durationSeconds: number | null;
      isPublished: boolean;
    };
  }>;
}

interface CollectionSectionManagerProps {
  collectionId: string;
  sections: Section[];
  collectionContent: Array<{
    id: string;
    title: string;
    type: string;
    thumbnailUrl: string | null;
    durationSeconds: number | null;
    isPublished: boolean;
  }>;
  allContent: Array<{
    id: string;
    title: string;
    type: string;
    thumbnailUrl?: string | null;
    durationSeconds?: number | null;
    isPublished?: boolean;
    collectionId?: string | null;
  }>;
}

export function CollectionSectionManager({
  collectionId,
  sections: initialSections,
  collectionContent,
  allContent,
}: CollectionSectionManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [sections, setSections] = useState(initialSections);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(initialSections.map((section) => section.id))
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [addingVideoId, setAddingVideoId] = useState<string | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [draggedVideoSectionId, setDraggedVideoSectionId] = useState<string | null>(null);
  const [draggedUnsectionedVideoId, setDraggedUnsectionedVideoId] = useState<string | null>(
    null
  );
  const [unsectionedOrderIds, setUnsectionedOrderIds] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const allVideosInCollection = useMemo(() => {
    return new Set(
      sections.flatMap((section) =>
        section.sectionContents.map((item) => item.content.id)
      )
    );
  }, [sections]);

  const currentSection = sections.find((section) => section.id === currentSectionId) ?? null;

  const availableVideos = useMemo(
    () =>
      allContent.filter(
        (video) =>
          video.type === 'video' &&
          !allVideosInCollection.has(video.id) &&
          (!video.collectionId || video.collectionId !== collectionId)
      ),
    [allContent, allVideosInCollection, collectionId]
  );

  const unsectionedVideos = useMemo(
    () =>
      collectionContent.filter((video) => !allVideosInCollection.has(video.id)),
    [collectionContent, allVideosInCollection]
  );

  const unsectionedOrderStorageKey = `collection:${collectionId}:unsectioned-order`;

  useEffect(() => {
    const stored = window.localStorage.getItem(unsectionedOrderStorageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) {
        setUnsectionedOrderIds(parsed);
      }
    } catch {
      // Ignore invalid local storage values.
    }
  }, [unsectionedOrderStorageKey]);

  useEffect(() => {
    const currentIds = unsectionedVideos.map((video) => video.id);
    if (currentIds.length === 0) {
      setUnsectionedOrderIds([]);
      window.localStorage.removeItem(unsectionedOrderStorageKey);
      return;
    }

    setUnsectionedOrderIds((prev) => {
      const validPrev = prev.filter((id) => currentIds.includes(id));
      const missing = currentIds.filter((id) => !validPrev.includes(id));
      const next = [...validPrev, ...missing];
      window.localStorage.setItem(unsectionedOrderStorageKey, JSON.stringify(next));
      return next;
    });
  }, [unsectionedVideos, unsectionedOrderStorageKey]);

  const orderedUnsectionedVideos = useMemo(() => {
    if (unsectionedOrderIds.length === 0) return unsectionedVideos;
    const videoMap = new Map(unsectionedVideos.map((video) => [video.id, video]));
    const ordered = unsectionedOrderIds
      .map((id) => videoMap.get(id))
      .filter(Boolean) as typeof unsectionedVideos;
    const leftovers = unsectionedVideos.filter(
      (video) => !unsectionedOrderIds.includes(video.id)
    );
    return [...ordered, ...leftovers];
  }, [unsectionedVideos, unsectionedOrderIds]);

  const reorderUnsectioned = (orderedIds: string[]) => {
    setUnsectionedOrderIds(orderedIds);
    window.localStorage.setItem(
      unsectionedOrderStorageKey,
      JSON.stringify(orderedIds)
    );
  };

  const handleCreateSection = async () => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create section',
          variant: 'destructive',
        });
        return;
      }

      const createdSection: Section = {
        ...result.section,
        sectionContents: [],
      };
      setSections((prev) => [...prev, createdSection]);
      setExpandedSections((prev) => new Set([...prev, createdSection.id]));
      setEditingSectionId(createdSection.id);
      setSectionTitle(createdSection.title);
      toast({
        title: 'Success',
        description: 'Section added',
      });
      router.refresh();
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const saveSectionTitle = async (sectionId: string) => {
    if (!sectionTitle.trim()) {
      setEditingSectionId(null);
      return;
    }
    try {
      const response = await fetch(
        `/api/collections/${collectionId}/sections/${sectionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: sectionTitle.trim() }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to rename section');
      }
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId
            ? { ...section, title: result.section.title }
            : section
        )
      );
      setEditingSectionId(null);
      toast({ title: 'Saved', description: 'Saved ✓' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to rename section',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    const confirmed = window.confirm(
      "Delete this section? The videos inside will move to unsectioned but won't be deleted."
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/collections/${collectionId}/sections/${sectionId}`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete section');
      }
      setSections((prev) => prev.filter((section) => section.id !== sectionId));
      toast({ title: 'Success', description: 'Section deleted' });
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete section',
        variant: 'destructive',
      });
    }
  };

  const handleAddVideo = async (videoId: string, sectionId: string | null) => {
    if (addingVideoId) return;
    setAddingVideoId(videoId);
    try {
      const response = await fetch(`/api/content/${videoId}/move-section`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, collectionId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add video');
      }
      toast({
        title: 'Success',
        description: sectionId
          ? 'Video added to section'
          : 'Video added to collection',
      });
      setShowAddVideoModal(false);
      setSearch('');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add video',
        variant: 'destructive',
      });
    } finally {
      setAddingVideoId(null);
    }
  };

  const handleMoveToSection = async (videoId: string, sectionId: string | null) => {
    try {
      const response = await fetch(`/api/content/${videoId}/move-section`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, collectionId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to move video');
      }
      toast({ title: 'Saved', description: 'Saved ✓' });
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to move video',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveFromCollection = async (videoId: string) => {
    try {
      const response = await fetch(`/api/content/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:
            allContent.find((content) => content.id === videoId)?.title ??
            'Untitled Video',
          collectionId: null,
          contentCategory: 'tutorial',
          accessType: 'free',
          tutorialPrice: 0,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove from collection');
      }
      toast({ title: 'Success', description: 'Removed from collection' });
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to remove from collection',
        variant: 'destructive',
      });
    }
  };

  const reorderSections = async (orderedIds: string[]) => {
    setSections((prev) => {
      const map = new Map(prev.map((section) => [section.id, section]));
      return orderedIds.map((id, index) => ({
        ...(map.get(id) as Section),
        orderIndex: index,
      }));
    });
    try {
      const response = await fetch(
        `/api/collections/${collectionId}/sections/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionIds: orderedIds }),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to reorder sections');
      }
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to reorder sections',
        variant: 'destructive',
      });
      router.refresh();
    }
  };

  const reorderVideos = async (
    sectionId: string,
    videoIds: string[],
    sectionContentIdsByVideoId: Map<string, string>
  ) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const map = new Map(section.sectionContents.map((item) => [item.content.id, item]));
        return {
          ...section,
          sectionContents: videoIds.map((videoId, index) => ({
            ...(map.get(videoId) as Section['sectionContents'][number]),
            id: sectionContentIdsByVideoId.get(videoId) || map.get(videoId)?.id || videoId,
            orderIndex: index,
          })),
        };
      })
    );

    try {
      const response = await fetch(
        `/api/collections/${collectionId}/videos/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoIds, sectionId }),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to reorder videos');
      }
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to reorder videos',
        variant: 'destructive',
      });
      router.refresh();
    }
  };

  const sectionOptions = sections.map((section) => ({
    id: section.id,
    title: section.title,
  }));

  const startEditSection = (sectionId: string, title: string) => {
    setEditingSectionId(sectionId);
    setSectionTitle(title);
  };

  const filteredAvailableVideos = availableVideos.filter((video) =>
    video.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => {
            setCurrentSectionId(null);
            setShowAddVideoModal(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          type="button"
        >
          <Plus className="h-4 w-4" />
          Add Video to Collection
        </button>
        <button
          onClick={handleCreateSection}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          type="button"
        >
          <Plus className="h-4 w-4" />
          Add Section
        </button>
      </div>

      {unsectionedVideos.length > 0 ? (
        <div className="mb-4 space-y-1 rounded-xl border border-border/80 bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Unsectioned
          </p>
          <p className="pb-1 text-xs text-muted-foreground">
            Use the section dropdown on each row to add videos into a section.
          </p>
          {orderedUnsectionedVideos.map((video, index) => (
            <div
              key={video.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', video.id);
                setDraggedUnsectionedVideoId(video.id);
              }}
              onDragEnd={() => setDraggedUnsectionedVideoId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (
                  !draggedUnsectionedVideoId ||
                  draggedUnsectionedVideoId === video.id
                ) {
                  return;
                }
                const next = orderedUnsectionedVideos.map((v) => v.id);
                const fromIndex = next.indexOf(draggedUnsectionedVideoId);
                const toIndex = next.indexOf(video.id);
                if (fromIndex === -1 || toIndex === -1) return;
                const [moved] = next.splice(fromIndex, 1);
                next.splice(toIndex, 0, moved);
                reorderUnsectioned(next);
                setDraggedUnsectionedVideoId(null);
              }}
            >
              <VideoRow
                key={video.id}
                index={index}
                sections={sectionOptions}
                isReorderEnabled
                video={{
                  id: video.id,
                  title: video.title,
                  thumbnailUrl: video.thumbnailUrl,
                  durationSeconds: video.durationSeconds,
                  isPublished: video.isPublished,
                  sectionId: null,
                }}
                onMoveToSection={handleMoveToSection}
                onEditVideo={() => router.push('/content')}
                onRemoveFromCollection={handleRemoveFromCollection}
              />
            </div>
          ))}
        </div>
      ) : null}

      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        const sectionVideoIds = section.sectionContents
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((item) => item.content.id);
        const sectionContentIdsByVideoId = new Map(
          section.sectionContents.map((item) => [item.content.id, item.id])
        );

        return (
          <div key={section.id} className="mb-4">
            <div
              className="group mb-1 flex items-center gap-3 rounded-xl bg-muted/50 p-3"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', section.id);
                setDraggedSectionId(section.id);
              }}
              onDragEnd={() => setDraggedSectionId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggedSectionId || draggedSectionId === section.id) return;
                const next = sections.map((s) => s.id);
                const fromIndex = next.indexOf(draggedSectionId);
                const toIndex = next.indexOf(section.id);
                if (fromIndex === -1 || toIndex === -1) return;
                const [moved] = next.splice(fromIndex, 1);
                next.splice(toIndex, 0, moved);
                void reorderSections(next);
                setDraggedSectionId(null);
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="rounded p-1 hover:bg-muted"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              <Package className="h-4 w-4 flex-shrink-0 text-primary" />

              {editingSectionId === section.id ? (
                <input
                  autoFocus
                  value={sectionTitle}
                  onChange={(event) => setSectionTitle(event.target.value)}
                  onBlur={() => void saveSectionTitle(section.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void saveSectionTitle(section.id);
                    }
                  }}
                  className="flex-1 border-b border-primary bg-transparent text-sm font-semibold outline-none"
                />
              ) : (
                <span className="flex-1 text-sm font-semibold">{section.title}</span>
              )}

              <span className="text-xs text-muted-foreground">
                {section.sectionContents.length} videos
              </span>

              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => startEditSection(section.id, section.title)}
                  className="rounded-lg p-1.5 hover:bg-muted"
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => void handleDeleteSection(section.id)}
                  className="rounded-lg p-1.5 hover:bg-red-50"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>

            {isExpanded ? (
              <div className="space-y-1 pl-4">
                {section.sectionContents
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((sectionContent, videoIndex) => (
                    <div
                      key={sectionContent.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData(
                          'text/plain',
                          sectionContent.content.id
                        );
                        setDraggedVideoId(sectionContent.content.id);
                        setDraggedVideoSectionId(section.id);
                      }}
                      onDragEnd={() => {
                        setDraggedVideoId(null);
                        setDraggedVideoSectionId(null);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (
                          !draggedVideoId ||
                          draggedVideoSectionId !== section.id ||
                          draggedVideoId === sectionContent.content.id
                        ) {
                          return;
                        }
                        const next = [...sectionVideoIds];
                        const fromIndex = next.indexOf(draggedVideoId);
                        const toIndex = next.indexOf(sectionContent.content.id);
                        if (fromIndex === -1 || toIndex === -1) return;
                        const [moved] = next.splice(fromIndex, 1);
                        next.splice(toIndex, 0, moved);
                        void reorderVideos(section.id, next, sectionContentIdsByVideoId);
                        setDraggedVideoId(null);
                        setDraggedVideoSectionId(null);
                      }}
                    >
                      <VideoRow
                        index={videoIndex}
                        sections={sectionOptions}
                        isReorderEnabled
                        video={{
                          id: sectionContent.content.id,
                          title: sectionContent.content.title,
                          thumbnailUrl: sectionContent.content.thumbnailUrl,
                          durationSeconds: sectionContent.content.durationSeconds,
                          isPublished: sectionContent.content.isPublished,
                          sectionId: section.id,
                        }}
                        onMoveToSection={handleMoveToSection}
                        onEditVideo={() => router.push('/content')}
                        onRemoveFromCollection={handleRemoveFromCollection}
                      />
                    </div>
                  ))}

                <button
                  onClick={() => {
                    setCurrentSectionId(section.id);
                    setShowAddVideoModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add video to this section
                </button>
              </div>
            ) : null}
          </div>
        );
      })}

      <Dialog open={showAddVideoModal} onOpenChange={setShowAddVideoModal}>
        <DialogContent className="max-w-md">
          <h3 className="mb-4 font-semibold">
            Add video to {currentSection ? currentSection.title : 'collection'}
          </h3>
          <input
            placeholder="Search your videos..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
          />
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {filteredAvailableVideos.map((video) => (
              <button
                key={video.id}
                onClick={() => void handleAddVideo(video.id, currentSectionId)}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted"
                type="button"
                disabled={Boolean(addingVideoId)}
              >
                <div className="h-8 w-12 flex-shrink-0 overflow-hidden rounded-lg">
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
                  <p className="text-xs text-muted-foreground">
                    {addingVideoId === video.id
                      ? 'Adding...'
                      : video.durationSeconds
                        ? `${Math.floor(video.durationSeconds / 60)} min`
                        : 'No duration'}
                  </p>
                </div>
                <Plus className="h-4 w-4 flex-shrink-0 text-primary" />
              </button>
            ))}
            {filteredAvailableVideos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
                No videos available to add.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

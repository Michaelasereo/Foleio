'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@foleio/utils';
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import { getCreatorPlan, getPlanLimits } from '@/lib/utils/plan-limits';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';
import { getThumbnailUrl } from '@/lib/utils/generate-thumbnail';
import {
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Eye,
  EyeOff,
  FolderInput,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EditContentModal } from '@/components/content/EditContentModal';

interface ContentListProps {
  content: any[];
  creator: any;
  collections?: Array<{ id: string; title: string }>;
}

function sortContent(items: any[], sortBy: string) {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name_asc':
        return a.title.localeCompare(b.title);
      case 'name_desc':
        return b.title.localeCompare(a.title);
      case 'price_high':
        return (b.tutorialPrice ?? 0) - (a.tutorialPrice ?? 0);
      case 'price_low':
        return (a.tutorialPrice ?? 0) - (b.tutorialPrice ?? 0);
      case 'views':
        return (b.viewCount ?? 0) - (a.viewCount ?? 0);
      default:
        return 0;
    }
  });
}

export function ContentList({ content, creator, collections = [] }: ContentListProps) {
  const router = useRouter();
  const { isOpen, limitType, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();
  const currentPlan = getCreatorPlan(creator.platformPlan ?? null);
  const limits = getPlanLimits(creator.platformPlan ?? null);
  const [items, setItems] = useState(content);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingContent, setEditingContent] = useState<any | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    setItems(content);
  }, [content]);

  useEffect(() => {
    const handler = () => setOpenMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  function handleNewContent() {
    if (items.length >= limits.maxContent) {
      showUpgradeModal('maxContent');
      return;
    }
    router.push('/content/new');
  }

  const formatNaira = (amountInKobo: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amountInKobo / 100);

  const getPriceLabel = (item: any) => {
    if (item.collectionId) {
      return 'Inherited';
    }
    if (item.accessType === 'free' || item.tutorialPrice === 0) {
      return 'Free';
    }
    if (item.tutorialPrice && item.tutorialPrice > 0) {
      return formatNaira(item.tutorialPrice);
    }
    return 'N/A';
  };

  const filteredContent = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchSearch =
        !normalizedSearch ||
        item.title?.toLowerCase().includes(normalizedSearch) ||
        item.description?.toLowerCase().includes(normalizedSearch);

      const matchType =
        filterType === 'all' ||
        (filterType === 'standalone' && !item.collectionId) ||
        (filterType === 'in_collection' && Boolean(item.collectionId)) ||
        (filterType === 'free' &&
          (item.accessType === 'free' || item.tutorialPrice === 0)) ||
        (filterType === 'paid' &&
          item.accessType !== 'free' &&
          (item.tutorialPrice ?? 0) > 0);

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'published' && item.isPublished) ||
        (filterStatus === 'draft' && !item.isPublished);

      return matchSearch && matchType && matchStatus;
    });
    return sortContent(filtered, sortBy);
  }, [items, search, filterType, filterStatus, sortBy]);

  async function handleTogglePublish(item: any) {
    setOpenMenu(null);
    const response = await fetch(`/api/content/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.title,
        description: item.description || '',
        contentCategory: item.contentCategory,
        accessType: item.accessType,
        tutorialPrice: item.tutorialPrice,
        collectionId: item.collectionId,
        isPublished: !item.isPublished,
        tags: item.tags || [],
      }),
    });

    if (response.ok) {
      setItems((prev: any[]) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, isPublished: !entry.isPublished } : entry
        )
      );
    }
  }

  function handleMoveToCollection(item: any) {
    setOpenMenu(null);
    setEditingContent(item);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/content/${deleteTarget.id}`, { method: 'DELETE' });
      if (response.ok) {
        setItems((prev: any[]) => prev.filter((entry) => entry.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function persistOrder(updatedItems: any[]) {
    await fetch('/api/content/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: updatedItems.map((entry, index) => ({ id: entry.id, sortOrder: index })),
      }),
    });
  }

  function moveItem(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    setItems((prev: any[]) => {
      const fromIndex = prev.findIndex((entry) => entry.id === dragId);
      const toIndex = prev.findIndex((entry) => entry.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      persistOrder(next);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Content</h1>
          <p className="text-muted-foreground">
            Manage your content and track performance
          </p>
        </div>
        <Button onClick={handleNewContent}>
          Create New Content
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search your content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="price_high">Price: High to Low</option>
          <option value="price_low">Price: Low to High</option>
          <option value="views">Most viewed</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All content</option>
          <option value="standalone">Standalone only</option>
          <option value="in_collection">In a collection</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Published & Draft</option>
          <option value="published">Published only</option>
          <option value="draft">Drafts only</option>
        </select>

        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => setView('grid')}
            className={`rounded p-1.5 ${view === 'grid' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`rounded p-1.5 ${view === 'list' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {filteredContent.length} of {items.length} videos
        {search ? ` matching "${search}"` : ''}
      </p>

      <div className={view === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
        {filteredContent.map((item) => (
          <Card
            key={item.id}
            className={`overflow-hidden ${view === 'list' ? 'p-0' : ''}`}
            draggable={view === 'list'}
            onDragStart={() => setDraggedId(item.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedId) {
                moveItem(draggedId, item.id);
                setDraggedId(null);
              }
            }}
          >
            <div className={view === 'list' ? 'flex items-start gap-3 p-3' : ''}>
              {view === 'list' ? (
                <button
                  type="button"
                  className="mt-2 rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              ) : null}
              <div className={view === 'list' ? 'w-40 flex-shrink-0' : ''}>
            <div className="aspect-video bg-muted">
              {getThumbnailUrl(item) ? (
                <img
                  src={getThumbnailUrl(item) || ''}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <DefaultThumbnail title={item.title} />
              )}
            </div>
              </div>
              <div className={view === 'list' ? 'flex-1' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenu((prev) => (prev === item.id ? null : item.id));
                    }}
                    className="rounded-lg p-1.5 transition-colors hover:bg-black/10"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenu === item.id ? (
                    <div
                      className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-border bg-white py-1 text-sm shadow-lg"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setOpenMenu(null);
                          setEditingContent(item);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit details
                      </button>
                      <button
                        onClick={() => handleTogglePublish(item)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted"
                      >
                        {item.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {item.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleMoveToCollection(item)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted"
                      >
                        <FolderInput className="h-4 w-4" />
                        Move to collection
                      </button>
                      <div className="my-1 border-t border-border" />
                      <button
                        onClick={() => {
                          setOpenMenu(null);
                          setDeleteTarget(item);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm mb-2">
                <Badge variant="outline">{item.type}</Badge>
                <Badge variant={item.isPublished ? 'default' : 'secondary'}>
                  {item.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>{item.viewCount} views</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
              <div className="mb-4 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>Price</span>
                  <span className={item.collectionId ? 'text-muted-foreground' : 'font-medium text-foreground'}>
                    {getPriceLabel(item)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Collection</span>
                  {item.collection ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/collections/${item.collection.id}`)}
                      className="text-primary underline underline-offset-2"
                    >
                      {item.collection.title}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Standalone</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`/creator/${creator.username}/content/${item.id}`, '_blank')}
                >
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditingContent(item)}
                >
                  Edit
                </Button>
              </div>
            </CardContent>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No content yet. Create your first piece of content!
            </p>
            <Button onClick={handleNewContent}>
              Create Content
            </Button>
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

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-2 text-lg font-bold">
              Delete "{deleteTarget?.title}"?
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              This will permanently delete the video and remove access for anyone who has purchased it. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="flex-1">
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditContentModal
        open={Boolean(editingContent)}
        onOpenChange={(open) => !open && setEditingContent(null)}
        content={editingContent}
        collections={collections}
        onSaved={() => {
          router.refresh();
          setEditingContent(null);
        }}
      />
    </div>
  );
}


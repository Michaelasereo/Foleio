'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/journal/RichTextEditor';
import { ShareCardModal } from '@/components/journal/ShareCardModal';
import { Save, Send, Share2, Upload } from 'lucide-react';

type Entry = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  coverImage: string | null;
  tags: string[];
  readTime: number;
  isPublished: boolean;
};

export function JournalEditor({
  creator,
  initialEntry,
}: {
  creator: { displayName: string; username: string; avatarUrl: string | null };
  initialEntry?: Entry | null;
}) {
  const router = useRouter();
  const [entryId, setEntryId] = useState(initialEntry?.id || '');
  const [entrySlug, setEntrySlug] = useState(initialEntry?.slug || '');
  const [title, setTitle] = useState(initialEntry?.title || '');
  const [subtitle, setSubtitle] = useState(initialEntry?.subtitle || '');
  const [content, setContent] = useState(initialEntry?.content || '<p></p>');
  const [tagsText, setTagsText] = useState((initialEntry?.tags || []).join(', '));
  const [coverImage, setCoverImage] = useState(initialEntry?.coverImage || '');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const readTime = useMemo(() => {
    const stripped = content.replace(/<[^>]*>/g, ' ');
    const words = stripped.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 220));
  }, [content]);

  useEffect(() => {
    setIsDirty(true);
  }, [title, subtitle, content, tagsText, coverImage]);

  async function saveDraft() {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const tags = tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (!entryId) {
        const response = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, subtitle, content, coverImage: coverImage || null, tags }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create draft');
        setEntryId(result.entry.id);
        setEntrySlug(result.entry.slug);
        setIsDirty(false);
        router.refresh();
        return result.entry.id as string;
      } else {
        const response = await fetch(`/api/journal/${entryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            subtitle,
            content,
            coverImage: coverImage || null,
            tags,
            status: 'draft',
            isPublished: false,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to save draft');
        setEntrySlug(result.entry.slug);
        setIsDirty(false);
        router.refresh();
        return entryId;
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function publish() {
    if (!title.trim()) return;
    setIsPublishing(true);
    try {
      const id = entryId || (await saveDraft());
      if (!id) return;
      const response = await fetch(`/api/journal/${id}/publish`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to publish');
      setEntrySlug(result.entry.slug);
      setIsDirty(false);
      router.push('/journal');
      router.refresh();
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleUploadCover(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/journal/upload-image', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Image upload failed');
    setCoverImage(result.url);
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      if (isDirty && title.trim()) {
        await saveDraft();
        setIsDirty(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isDirty, title, content, subtitle, tagsText, coverImage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => void saveDraft()} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save draft'}
        </Button>
        <Button onClick={() => void publish()} disabled={isPublishing}>
          <Send className="mr-2 h-4 w-4" />
          {isPublishing ? 'Publishing...' : 'Publish'}
        </Button>
        {entryId ? (
          <Button variant="outline" onClick={() => setIsShareOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Entry title"
          className="text-2xl font-bold"
        />
        <Textarea
          value={subtitle}
          onChange={(event) => setSubtitle(event.target.value)}
          placeholder="Subtitle (optional)"
          rows={2}
        />
        <Input
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
          placeholder="Tags (comma separated)"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Cover image</label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="journal-cover-input"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUploadCover(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('journal-cover-input')?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload cover
          </Button>
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt="cover" className="h-20 w-32 rounded-lg object-cover" />
          ) : null}
        </div>
      </div>

      <RichTextEditor
        content={content}
        onChange={(value) => setContent(value)}
        placeholder="Write your story..."
      />

      <p className="text-xs text-muted-foreground">
        {readTime} min read {isDirty ? '· Unsaved changes' : '· Saved'}
      </p>

      {entryId ? (
        <ShareCardModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          entry={{
            id: entryId,
            slug: entrySlug,
            title,
            subtitle,
            coverImage,
            readTime,
            tags: tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
          }}
          creator={creator}
        />
      ) : null}
    </div>
  );
}

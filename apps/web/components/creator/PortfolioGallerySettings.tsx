'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Lock, Trash2, X } from 'lucide-react';
import {
  createPortfolioItem,
  deletePortfolioItem,
  ensureGallerySection,
  getMyPortfolio,
} from '@/lib/actions/portfolio';
import { MAX_GALLERY_ITEMS } from '@/lib/creator/portfolio-gallery';

type GalleryItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
  orderIndex: number;
};

const SLOT_COUNT = MAX_GALLERY_ITEMS;

function flattenItems(
  sections: Array<{
    items: Array<{
      id: string;
      imageUrl: string;
      caption: string | null;
      orderIndex: number;
    }>;
  }>
): GalleryItem[] {
  return sections
    .flatMap((section) =>
      section.items.map((item) => ({
        id: item.id,
        imageUrl: item.imageUrl,
        caption: item.caption,
        orderIndex: item.orderIndex,
      }))
    )
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .slice(0, SLOT_COUNT);
}

export function PortfolioGallerySettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sectionId, setSectionId] = useState('');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filledCount = items.length;
  const row2Unlocked = filledCount >= 3;
  const galleryLive = filledCount >= 3;

  async function loadGallery(opts?: { initial?: boolean }) {
    const isInitial = Boolean(opts?.initial);
    if (isInitial) setLoading(true);
    setError('');
    try {
      const ensured = await ensureGallerySection();
      if (ensured.error || !ensured.data) {
        setError(ensured.error || 'Could not load gallery');
        return;
      }
      setSectionId(ensured.data.id);

      const result = await getMyPortfolio();
      if (result.error || !result.data) {
        setError(result.error || 'Could not load gallery');
        return;
      }

      setItems(flattenItems(result.data));
    } finally {
      if (isInitial) setLoading(false);
    }
  }

  useEffect(() => {
    void loadGallery({ initial: true });
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  function slotState(index: number): 'filled' | 'empty' | 'locked' {
    if (index < filledCount) return 'filled';
    if (index >= 3 && !row2Unlocked) return 'locked';
    if (index === filledCount && filledCount < SLOT_COUNT) return 'empty';
    return 'locked';
  }

  function openFilePicker(slotIndex: number) {
    if (slotState(slotIndex) !== 'empty' || !sectionId) return;
    setPendingSlot(slotIndex);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const slot = pendingSlot;
    setPendingSlot(null);
    if (!file || slot === null || !sectionId) return;

    setUploadingSlot(slot);
    setError('');

    // Show local preview in the slot while upload finishes
    const previewUrl = URL.createObjectURL(file);
    const tempId = `temp-${slot}`;
    setItems((prev) => {
      if (prev.length !== slot) return prev;
      return [
        ...prev,
        {
          id: tempId,
          imageUrl: previewUrl,
          caption: null,
          orderIndex: slot + 1,
        },
      ];
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'portfolio');
      const response = await fetch('/api/creator/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Upload failed');
      }
      const url = payload.url as string;
      const result = await createPortfolioItem({
        sectionId,
        imageUrl: url,
        caption: null,
        priceListItemId: null,
      });
      if (result.error || !result.data) {
        throw new Error(result.error || 'Could not save image');
      }

      const saved = result.data;
      setItems((prev) => {
        const withoutTemp = prev.filter((item) => item.id !== tempId);
        return [
          ...withoutTemp,
          {
            id: saved.id,
            imageUrl: saved.imageUrl,
            caption: saved.caption,
            orderIndex: saved.orderIndex,
          },
        ]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .slice(0, SLOT_COUNT);
      });
    } catch (err) {
      setItems((prev) => prev.filter((item) => item.id !== tempId));
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploadingSlot(null);
    }
  }

  async function handleDelete(item: GalleryItem) {
    if (!confirm('Remove this photo from your gallery?')) return;
    setDeleting(true);
    setError('');
    const previous = items;
    setLightbox(null);
    setItems((prev) => prev.filter((row) => row.id !== item.id));
    try {
      const result = await deletePortfolioItem(item.id);
      if (result.error) {
        throw new Error(result.error);
      }
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="foleio-dash-panel">
        <p className="foleio-dash-empty">Loading gallery…</p>
      </div>
    );
  }

  return (
    <div className="foleio-dash-panel">
      <h2 className="foleio-dash-panel-title">Portfolio gallery</h2>
      <p className="foleio-dash-panel-meta">
        {galleryLive
          ? filledCount === 6
            ? 'Your full gallery (6 photos) is live on your public page.'
            : `Gallery is live with ${filledCount} photo${filledCount === 1 ? '' : 's'}. Add all 6 for the second public row.`
          : `Add at least 3 photos to show your gallery. ${filledCount}/3 so far.`}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => void handleFileSelected(e)}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
          marginTop: 16,
        }}
      >
        {Array.from({ length: SLOT_COUNT }).map((_, index) => {
          const state = slotState(index);
          const item = state === 'filled' ? items[index] : null;
          const busy = uploadingSlot === index;

          return (
            <button
              key={index}
              type="button"
              disabled={state === 'locked' || busy}
              onClick={() => {
                if (item) setLightbox(item);
                else if (state === 'empty') openFilePicker(index);
              }}
              aria-label={
                item
                  ? `View photo ${index + 1}`
                  : state === 'locked'
                    ? `Slot ${index + 1} locked`
                    : `Upload photo ${index + 1}`
              }
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 12,
                border:
                  state === 'locked'
                    ? '1px dashed rgba(255,255,255,0.08)'
                    : '1px dashed rgba(255,255,255,0.18)',
                background: state === 'locked' ? '#1a1a1a' : '#2b2b2b',
                overflow: 'hidden',
                cursor: state === 'locked' ? 'not-allowed' : 'pointer',
                padding: 0,
                opacity: state === 'locked' ? 0.55 : 1,
              }}
            >
              {item ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.caption || `Gallery photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : busy ? (
                <span
                  style={{
                    display: 'flex',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#adadad',
                  }}
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                </span>
              ) : state === 'locked' ? (
                <span
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: '#828282',
                    fontSize: 12,
                  }}
                >
                  <Lock className="h-4 w-4" />
                  {index >= 3 ? 'Unlock with 3' : '—'}
                </span>
              ) : (
                <span
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: '#adadad',
                    fontSize: 12,
                  }}
                >
                  <ImagePlus className="h-5 w-5" />
                  Add
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="foleio-dash-panel-meta" style={{ color: '#fca5a5', marginTop: 12 }}>
          {error}
        </p>
      ) : null}

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo"
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: 560,
              width: '100%',
              background: '#212121',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="foleio-dash-btn-outline"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1,
                padding: 8,
              }}
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.imageUrl}
              alt={lightbox.caption || 'Gallery photo'}
              style={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 10,
                background: '#111',
              }}
            />
            {lightbox.caption ? (
              <p className="foleio-dash-panel-meta" style={{ marginTop: 12 }}>
                {lightbox.caption}
              </p>
            ) : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                className="foleio-dash-btn-danger"
                disabled={deleting}
                onClick={() => void handleDelete(lightbox)}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remove
              </button>
              <button
                type="button"
                className="foleio-dash-btn-outline"
                onClick={() => setLightbox(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

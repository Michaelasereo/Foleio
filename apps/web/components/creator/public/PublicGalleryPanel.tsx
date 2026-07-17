'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { RemoteImage } from '@/components/creator/RemoteImage';
import { publicGalleryItems } from '@/lib/creator/portfolio-gallery';

type PortfolioSectionPublic = {
  id: string;
  name: string;
  description: string | null;
  items: Array<{
    id: string;
    imageUrl: string;
    caption: string | null;
    priceListItemId: string | null;
    orderIndex?: number;
  }>;
};

export function PublicGalleryPanel({
  username,
  initialSections,
}: {
  username: string;
  initialSections: PortfolioSectionPublic[];
}) {
  const [liveSections, setLiveSections] = useState(initialSections);
  const [galleryLightbox, setGalleryLightbox] = useState<{
    id: string;
    imageUrl: string;
    caption: string | null;
  } | null>(null);

  useEffect(() => {
    setLiveSections(initialSections);
  }, [initialSections]);

  useEffect(() => {
    let cancelled = false;
    if (!username) return;

    void (async () => {
      try {
        const res = await fetch(`/api/public/creators/${encodeURIComponent(username)}/gallery`, {
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { sections?: PortfolioSectionPublic[] };
        if (!cancelled && Array.isArray(data.sections)) {
          setLiveSections(data.sections);
        }
      } catch {
        // Keep SSR sections.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (!galleryLightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGalleryLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [galleryLightbox]);

  const galleryItems = publicGalleryItems(liveSections);
  if (galleryItems.length === 0) return null;

  return (
    <>
      <section className="foleio-public-panel">
        <h2 className="foleio-public-panel-title">Gallery</h2>
        <p className="foleio-public-panel-meta">Selected work</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
            marginTop: 12,
          }}
        >
          {galleryItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGalleryLightbox(item)}
              style={{
                padding: 0,
                border: 'none',
                background: '#2b2b2b',
                cursor: 'pointer',
                borderRadius: 10,
                overflow: 'hidden',
                aspectRatio: '1',
              }}
              aria-label={item.caption || 'View gallery photo'}
            >
              <RemoteImage
                src={item.imageUrl}
                alt={item.caption || 'Gallery photo'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
      </section>

      {galleryLightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo"
          onClick={() => setGalleryLightbox(null)}
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
              maxWidth: 640,
              width: '100%',
              background: '#212121',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setGalleryLightbox(null)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.35)',
                color: '#fafafa',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
              }}
            >
              <X className="h-4 w-4" />
            </button>
            <RemoteImage
              src={galleryLightbox.imageUrl}
              alt={galleryLightbox.caption || 'Gallery photo'}
              style={{
                width: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: 10,
                background: '#111',
              }}
            />
            {galleryLightbox.caption ? (
              <p className="foleio-public-panel-meta" style={{ marginTop: 12 }}>
                {galleryLightbox.caption}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

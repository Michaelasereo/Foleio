'use client';

import { PublicCreatorProfile } from '@/components/creator/PublicCreatorProfile';
import type { PublicLinkPreview } from '@/lib/landing/amata-preview';
import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import styles from './landing.module.css';

const SOURCE_WIDTH = 1120;
const MAX_PREVIEW_HEIGHT = 640;

export function PublicLinkShot({ preview }: { preview: PublicLinkPreview }) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useLayoutEffect(() => {
    const node = frame.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = width > 0 ? width / SOURCE_WIDTH : 1;

  useLayoutEffect(() => {
    if (width === 0) return;
    const node = canvas.current?.firstElementChild;
    if (!node) return;
    const measure = () => {
      const next = node.scrollHeight;
      setNaturalHeight((current) => (current === next ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div
      ref={frame}
      className={`${styles.publicLink} relative overflow-hidden bg-[#1a1816]`}
      style={
        naturalHeight > 0
          ? { height: Math.min(Math.ceil(naturalHeight * scale), MAX_PREVIEW_HEIGHT) }
          : { height: MAX_PREVIEW_HEIGHT }
      }
      role="img"
      aria-label="amatathelabel public link"
    >
      {width > 0 ? (
        <div
          ref={canvas}
          className="pointer-events-none absolute top-0 left-0"
          style={{
            width: SOURCE_WIDTH,
            height: naturalHeight || undefined,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <PublicCreatorProfile
            creator={preview.creator}
            reviews={preview.reviews}
            portfolioSections={preview.gallery}
            galleryRefresh={false}
            shopCatalog={preview.shop}
            hasActiveProducts={preview.shop.products.length > 0}
            requireDojahKyc={false}
          />
        </div>
      ) : null}
      <Link
        href="/signup"
        className="absolute right-5 bottom-4 z-10 text-[13px] underline underline-offset-[3px]"
        style={{ color: '#adadad', textDecorationColor: '#adadad' }}
      >
        Try Foleio today!
      </Link>
    </div>
  );
}

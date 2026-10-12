'use client';

import { DemoDashboard } from '@/components/demo/DemoDashboard';
import { useLayoutEffect, useRef, useState } from 'react';

const SOURCE_WIDTH = { app: 1280, page: 1040, full: 1280 } as const;
const MAX_PREVIEW_HEIGHT = 640;

export function DemoShot({
  section,
  embed,
  label,
  className,
}: {
  section: string;
  embed: 'app' | 'page' | 'full';
  label: string;
  className?: string;
}) {
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

  const sourceWidth = SOURCE_WIDTH[embed];
  const scale = width > 0 ? width / sourceWidth : 1;

  useLayoutEffect(() => {
    if (embed !== 'full' || width === 0) return;
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
  }, [embed, width]);

  const sliceHeight = frame.current?.clientHeight ?? 0;
  const canvasHeight =
    embed === 'full'
      ? naturalHeight || undefined
      : sliceHeight > 0
        ? Math.ceil(sliceHeight / scale)
        : undefined;

  return (
    <div
      ref={frame}
      className={`overflow-hidden ${className ?? ''}`}
      style={
        embed === 'full' && naturalHeight > 0
          ? { height: Math.min(Math.ceil(naturalHeight * scale), MAX_PREVIEW_HEIGHT) }
          : undefined
      }
      role="img"
      aria-label={label}
    >
      {width > 0 ? (
        <div
          ref={canvas}
          className="pointer-events-none absolute top-0 left-0"
          style={{
            width: sourceWidth,
            height: canvasHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <div className={embed === 'full' ? undefined : 'h-full'}>
            <DemoDashboard initialSection={section} embedded={embed} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type RemoteImageProps = {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
};

/**
 * Gallery/public img with placeholder, remount retries, and no opacity gating.
 * Transient R2 failures often resolve on a second request — hard reloads looked like "the fix".
 */
export function RemoteImage({
  src,
  alt,
  className,
  style,
  referrerPolicy = 'no-referrer',
}: RemoteImageProps) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
  }, [src]);

  const resolvedSrc =
    attempt > 0 ? `${src}${src.includes('?') ? '&' : '?'}r=${attempt}` : src;

  if (failed) {
    return (
      <span
        aria-label={alt}
        className={cn('block bg-[#2b2b2b]', className)}
        style={style}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${resolvedSrc}-${attempt}`}
      src={resolvedSrc}
      alt={alt}
      referrerPolicy={referrerPolicy}
      decoding="async"
      loading="eager"
      fetchPriority={attempt === 0 ? 'high' : 'auto'}
      onError={() => {
        if (attempt < 3) {
          window.setTimeout(() => setAttempt((n) => n + 1), 150 * (attempt + 1));
          return;
        }
        setFailed(true);
      }}
      className={cn('block bg-[#2b2b2b]', className)}
      style={style}
    />
  );
}

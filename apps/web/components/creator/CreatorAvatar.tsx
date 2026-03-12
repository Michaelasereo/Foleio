'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function CreatorAvatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [src]);

  const showImage = Boolean(src) && !imgError;
  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100',
        className
      )}
      style={{ width: size, height: size }}
    >
      <span className="select-none font-bold text-orange-600" style={{ fontSize: size * 0.35 }}>
        {initials}
      </span>
      {showImage ? (
        <img
          src={src || ''}
          alt={name || 'Avatar'}
          onError={() => setImgError(true)}
          onLoad={() => setImgLoaded(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
            imgLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCountProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
}

export function AnimatedCount({ value, format, className }: AnimatedCountProps) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (value > prevRef.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 900);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
    return undefined;
  }, [value]);

  return (
    <span
      className={cn(
        'transition-colors duration-700',
        flash ? 'text-primary' : '',
        className
      )}
    >
      {format ? format(value) : value.toLocaleString()}
    </span>
  );
}

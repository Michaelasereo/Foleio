import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './landing.module.css';

export const frame = 'mx-auto box-border w-full max-w-[1168px] px-6';

export function Italic({
  children,
  block = false,
}: {
  children: ReactNode;
  block?: boolean;
}) {
  return <span className={`${styles.italic} ${block ? 'block' : ''}`}>{children}</span>;
}

export function Serif({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`${styles.serif} ${className}`}>{children}</span>;
}

export function LogoMark({ className }: { className: string }) {
  return (
    <img
      src="/Foleio-logo.svg"
      alt=""
      width={553}
      height={553}
      className={`inline-block shrink-0 object-contain ${className}`}
    />
  );
}

const pillTone = {
  dark: `bg-[#131210] ${styles.pillDark}`,
  light: `bg-[#f2f1ec] ${styles.pillLight}`,
} as const;

export function Pill({
  href,
  children,
  tone = 'dark',
  className = '',
}: {
  href: string;
  children: ReactNode;
  tone?: keyof typeof pillTone;
  className?: string;
}) {
  const classes = `inline-flex items-center justify-center rounded-full font-medium ${pillTone[tone]} ${className}`;
  if (href.startsWith('#')) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export function ArrowLink({
  href,
  children,
  className,
  external = false,
}: {
  href: string;
  children: ReactNode;
  className: string;
  external?: boolean;
}) {
  if (href.startsWith('#') || href.startsWith('mailto:') || external) {
    return (
      <a
        href={href}
        className={className}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function StatusChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[17px] shrink-0 items-center rounded-[5px] bg-[#0b8043] px-[6px] text-[9.5px] font-semibold tracking-[0.06em] text-white">
      {children}
    </span>
  );
}

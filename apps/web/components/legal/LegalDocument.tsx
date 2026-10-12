import type { ReactNode } from 'react';
import Link from 'next/link';
import { Reveal } from '@/components/landing/Reveal';
import styles from '@/components/landing/landing.module.css';
import { frame } from '@/components/landing/ui';

const DOCS = [
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/data-policy', label: 'Data Policy' },
  { href: '/legal/creator-agreement', label: 'Creator Agreement' },
] as const;

export function LegalDocument({
  title,
  effective,
  active,
  children,
}: {
  title: ReactNode;
  effective: string;
  active: (typeof DOCS)[number]['href'];
  children: ReactNode;
}) {
  return (
    <main className={`${frame} pb-20 pt-8 sm:pt-12`}>
      <div className="mx-auto max-w-[760px]">
        <Reveal>
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#8a877f]">Legal</p>
          <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)] font-[450] leading-[1.02] tracking-[-0.045em] text-[#1c1b19]">
            {title}
          </h1>
          <p className="mt-3 text-[14px] text-[#8a877f]">{effective}</p>
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Legal documents">
            {DOCS.map((doc) => {
              const current = doc.href === active;
              return (
                <Link
                  key={doc.href}
                  href={doc.href}
                  aria-current={current ? 'page' : undefined}
                  className={
                    current
                      ? `rounded-full bg-[#1c1b19] px-3.5 py-1.5 text-[13px] ${styles.pillDark}`
                      : 'rounded-full bg-[#f3f1ec] px-3.5 py-1.5 text-[13px] text-[#3b3a36]'
                  }
                >
                  {doc.label}
                </Link>
              );
            })}
          </nav>
        </Reveal>
        <Reveal>
          <article className={`${styles.legalProse} mt-8 rounded-[28px] bg-[#f3f1ec] px-6 py-8 sm:px-10 sm:py-10`}>
            {children}
          </article>
        </Reveal>
      </div>
    </main>
  );
}

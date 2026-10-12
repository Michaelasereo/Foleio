import type { ReactNode } from 'react';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { landingSans, landingSerif } from '@/components/landing/fonts';
import styles from '@/components/landing/landing.module.css';
import { Reveal } from '@/components/landing/Reveal';
import { LogoMark, Pill, frame } from '@/components/landing/ui';

const NAV = [
  { href: '/product/link', label: 'Link' },
  { href: '/product/bookings', label: 'Bookings' },
  { href: '/product/shop', label: 'Shop' },
  { href: '/creators', label: 'Creators' },
  { href: '/pricing', label: 'Pricing' },
] as const;

export function SiteChrome({
  active,
  children,
}: {
  active?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${landingSans.variable} ${landingSerif.variable} ${styles.page} min-h-screen bg-[#f6f5f1] text-[#1c1b19]`}
    >
      <header className={`${frame} flex items-center justify-between gap-6 py-[18px]`}>
        <div className="flex min-w-0 items-center gap-11">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1 text-[17px] font-semibold tracking-[-0.02em]"
          >
            <LogoMark className="h-[30px] w-[30px]" />
            <span>Foleio</span>
          </Link>
          <nav
            className="hidden items-center gap-[30px] text-[15px] text-[#3b3a36] min-[980px]:flex"
            aria-label="Products"
          >
            {NAV.map((item) => {
              const current = item.href === active;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={current ? 'page' : undefined}
                  className={[
                    item.href === '/creators' ? 'inline-flex items-center gap-1.5' : '',
                    current ? 'font-semibold text-[#1c1b19]' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                >
                  {item.label}
                  {item.href === '/creators' ? (
                    <span className="inline-flex items-center rounded-full bg-[rgba(21,128,61,0.12)] px-[5px] py-px text-[9px] font-medium uppercase leading-[1.2] tracking-[0.04em] text-[#15803d]">
                      New
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-[22px]">
          <Link href="/login" className="text-[15px] text-[#3b3a36] max-[760px]:hidden">
            Log in
          </Link>
          <Pill href="/signup" className="min-h-[44px] px-[18px] text-[15px] tracking-[-0.01em]">
            Start for free
          </Pill>
        </div>
      </header>
      {children}
      <Reveal as="footer" className="bg-white">
        <LandingFooter />
      </Reveal>
    </div>
  );
}

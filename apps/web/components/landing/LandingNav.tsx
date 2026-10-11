'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LogoMark, Pill, frame } from './ui';

const LINKS = [
  { href: '#product', label: 'Link' },
  { href: '#product', label: 'Bookings' },
  { href: '#product', label: 'Shop' },
] as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 48);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <>
      <div
        className={`${frame} flex items-center justify-between gap-6 py-[18px] ${scrolled ? 'invisible' : ''}`}
        aria-hidden={scrolled}
      >
        <div className="flex items-center gap-11">
          <Brand />
          <NavLinks />
        </div>
        <div className="flex items-center gap-[22px]">
          <Link href="/login" className="text-[15px] text-[#3b3a36] max-[760px]:hidden">
            Log in
          </Link>
          <Pill href="/signup" className="min-h-[44px] px-[18px] text-[15px] tracking-[-0.01em]">
            Request invite
          </Pill>
        </div>
      </div>

      <div
        className={`fixed top-4 left-1/2 z-50 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-1 rounded-full border border-[#e7e5e0] bg-white/90 py-1.5 pr-1.5 pl-2 shadow-[0_12px_40px_-16px_rgba(19,18,16,0.35)] backdrop-blur-md transition duration-300 ${
          scrolled ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
        }`}
        aria-hidden={!scrolled}
      >
        <a
          href="#top"
          className="inline-flex h-9 w-9 items-center justify-center"
          aria-label="Foleio"
        >
          <LogoMark className="h-7 w-7" />
        </a>
        <NavLinks compact />
        <Pill href="/signup" className="min-h-9 px-3.5 text-[14px] tracking-[-0.01em]">
          Request invite
        </Pill>
      </div>
    </>
  );
}

function Brand() {
  return (
    <a
      href="#top"
      className="inline-flex min-h-[44px] items-center gap-[10px] text-[17px] font-semibold tracking-[-0.02em]"
    >
      <LogoMark className="h-[30px] w-[30px]" />
      <span>Foleio</span>
    </a>
  );
}

function NavLinks({ compact = false }: { compact?: boolean }) {
  const item = compact ? 'px-3 py-2 text-[14px] text-[#1c1b19]' : 'text-[15px] text-[#3b3a36]';
  return (
    <div
      className={`items-center max-[760px]:hidden ${compact ? 'flex' : 'flex gap-[30px] text-[15px] text-[#3b3a36]'}`}
    >
      {LINKS.map((itemLink) => (
        <a key={itemLink.label} href={itemLink.href} className={item}>
          {itemLink.label}
        </a>
      ))}
      <Link href="/creators" className={item}>
        Creators
      </Link>
      <a href="#pricing" className={item}>
        Pricing
      </a>
    </div>
  );
}

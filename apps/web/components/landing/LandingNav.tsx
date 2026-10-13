'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LogoMark, Pill, frame } from './ui';

const LINKS = [
  { href: '/product/link', label: 'Link' },
  { href: '/product/bookings', label: 'Bookings' },
  { href: '/product/shop', label: 'Shop' },
] as const;

const MENU = [
  { href: '/product/link', label: 'Link' },
  { href: '/product/bookings', label: 'Bookings' },
  { href: '/product/shop', label: 'Shop' },
  { href: '/creators', label: 'Creators', badge: 'New' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/login', label: 'Log in' },
] as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 48);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 1180px)');
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onDesktop);
    return () => {
      window.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onDesktop);
    };
  }, [open]);

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
        <div className="flex items-center gap-3 min-[761px]:gap-[22px]">
          <Link href="/login" className="text-[15px] text-[#3b3a36] max-[760px]:hidden">
            Log in
          </Link>
          <MenuButton open={open} onClick={() => setOpen((current) => !current)} />
          <Pill href="/signup" className="min-h-[44px] shrink-0 whitespace-nowrap px-[18px] text-[15px] tracking-[-0.01em]">
            Request invite
          </Pill>
        </div>
      </div>

      <div
        className={`fixed top-4 left-1/2 z-50 flex max-w-[calc(100%-32px)] -translate-x-1/2 flex-nowrap items-center gap-1 rounded-full border border-[#e7e5e0] bg-white/90 py-1.5 pr-1.5 pl-2 shadow-[0_12px_40px_-16px_rgba(19,18,16,0.35)] backdrop-blur-md transition duration-300 ${
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
        <MenuButton open={open} wide onClick={() => setOpen((current) => !current)} />
        <Pill href="/signup" className="min-h-9 shrink-0 whitespace-nowrap px-3.5 text-[14px] tracking-[-0.01em]">
          Request invite
        </Pill>
      </div>

      {open ? (
        <nav
          id="landing-menu"
          className="fixed top-[84px] right-4 left-4 z-40 rounded-[20px] border border-[#e7e5e0] bg-white p-2 shadow-[0_18px_50px_-24px_rgba(19,18,16,0.4)] min-[761px]:top-[68px] min-[761px]:right-auto min-[761px]:left-1/2 min-[761px]:w-[240px] min-[761px]:-translate-x-1/2"
        >
          {MENU.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`min-h-11 items-center justify-between rounded-[12px] px-3 text-[16px] text-[#1c1b19] ${menuItemVisibility(item.label)}`}
            >
              <span>{item.label}</span>
              {'badge' in item ? (
                <span className="inline-flex items-center rounded-full bg-[rgba(21,128,61,0.12)] px-[5px] py-px text-[9px] font-medium uppercase leading-[1.2] tracking-[0.04em] text-[#15803d]">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}

function menuItemVisibility(label: string) {
  if (label === 'Link' || label === 'Bookings' || label === 'Shop') {
    return 'hidden max-[760px]:flex';
  }
  if (label === 'Log in') return 'flex';
  return 'flex min-[1180px]:hidden';
}

function MenuButton({
  open,
  onClick,
  wide = false,
}: {
  open: boolean;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#1c1b19] ${wide ? 'min-[1180px]:hidden' : 'min-[761px]:hidden'}`}
      aria-expanded={open}
      aria-controls="landing-menu"
      aria-label={open ? 'Close menu' : 'Open menu'}
      onClick={onClick}
    >
      {open ? <X aria-hidden="true" size={20} strokeWidth={1.75} /> : <Menu aria-hidden="true" size={20} strokeWidth={1.75} />}
    </button>
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
      <Link
        href="/creators"
        className={`${item} items-center gap-1.5 ${compact ? 'hidden min-[1180px]:inline-flex' : 'inline-flex'}`}
      >
        Creators
        <span className="inline-flex items-center rounded-full bg-[rgba(21,128,61,0.12)] px-[5px] py-px text-[9px] font-medium uppercase leading-[1.2] tracking-[0.04em] text-[#15803d]">
          New
        </span>
      </Link>
      <a href="#pricing" className={`${item} ${compact ? 'hidden min-[1180px]:inline' : ''}`}>
        Pricing
      </a>
    </div>
  );
}

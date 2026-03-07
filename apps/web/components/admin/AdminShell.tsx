'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Banknote,
  Calendar,
  Clock,
  CreditCard,
  Crown,
  FlaskConical,
  LayoutDashboard,
  Menu,
  RefreshCw,
  ShieldAlert,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import foleioLogo from '../../../../foleio-logo.png';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldAlert },
  { href: '/admin/creators', label: 'Creators', icon: Users },
  { href: '/admin/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { href: '/admin/billing', label: 'Billing Plans', icon: Crown },
  { href: '/admin/waitlist', label: 'Waitlist', icon: Clock },
  { href: '/admin/webhooks', label: 'Webhooks', icon: Zap },
];

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [now, setNow] = useState(() => new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingModerationCount, setPendingModerationCount] = useState(0);
  const [pendingPayoutCount, setPendingPayoutCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadModerationCount() {
      try {
        const response = await fetch('/api/admin/moderation/count', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        setPendingModerationCount(Number(data.totalPending || 0));
      } catch (error) {
        console.error('Failed to load moderation count:', error);
      }
    }
    void loadModerationCount();
  }, []);

  useEffect(() => {
    async function loadPayoutCount() {
      try {
        const response = await fetch('/api/admin/payouts/pending-count', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        setPendingPayoutCount(Number(data.pendingCount || 0));
      } catch (error) {
        console.error('Failed to load payout count:', error);
      }
    }
    void loadPayoutCount();
  }, []);

  const formattedNow = useMemo(() => formatDateTime(now), [now]);

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 border-r border-black/20 bg-[#1C1008] text-white transition-transform lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-6 py-6">
              <Image
                src={foleioLogo}
                alt="Foleio"
                width={150}
                height={44}
                className="h-10 w-auto object-contain"
                priority
              />
              <p className="mt-1 text-xs text-white/70">Solo Founder Admin</p>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'group flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition',
                      active
                        ? 'border-primary text-primary bg-white/5'
                        : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {item.href === '/admin/moderation' && pendingModerationCount > 0 ? (
                      <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {pendingModerationCount}
                      </span>
                    ) : null}
                    {item.href === '/admin/payouts' && pendingPayoutCount > 0 ? (
                      <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {pendingPayoutCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-4">
              <Link
                href="/admin/payout-test"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'mb-2 flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                  pathname.startsWith('/admin/payout-test')
                    ? 'border-amber-400/70 bg-amber-500/10 text-amber-200'
                    : 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200'
                )}
              >
                <FlaskConical className="h-4 w-4" />
                Payout Test
              </Link>
              <Link
                href="/dashboard"
                className="block rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                Exit Admin
              </Link>
            </div>
          </div>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close admin sidebar"
          />
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="rounded-md border border-border bg-background p-2 lg:hidden"
                  aria-label="Toggle admin sidebar"
                >
                  {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
                <h1 className="text-lg font-semibold text-foreground sm:text-xl">Foleio Admin</h1>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">{formattedNow}</p>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

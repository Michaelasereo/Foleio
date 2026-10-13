'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Banknote,
  Calendar,
  CreditCard,
  Crown,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Settings,
  Shield,
  ShoppingBag,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import foleioLogo from '../../../../foleio-logo.png';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: 'exact' | 'prefix';
  indent?: boolean;
};

const navItems: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, match: 'exact' },
  { href: '/admin/access', label: 'Invites', icon: Shield },
  { href: '/admin/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/admin/creators', label: 'Creators', icon: Users, match: 'exact' },
  {
    href: '/admin/creators/links',
    label: 'Creator links',
    icon: Link2,
    indent: true,
  },
  { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/billing', label: 'Billing', icon: Crown },
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/integrity', label: 'Integrity', icon: CreditCard },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMotion, setSidebarMotion] = useState(false);
  const [pendingPayoutCount, setPendingPayoutCount] = useState(0);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    setSidebarMotion(true);
  }, []);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [payoutRes, meRes, statsRes] = await Promise.all([
          fetch('/api/admin/payouts/pending-count', { cache: 'no-store' }),
          fetch('/api/admin/auth/me', { cache: 'no-store' }),
          fetch('/api/admin/stats', { cache: 'no-store' }),
        ]);
        if (payoutRes.ok) {
          const data = await payoutRes.json();
          setPendingPayoutCount(Number(data.pendingCount || 0));
        }
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setPendingInviteCount(Number(stats.waitlistCount || 0));
        }
        if (meRes.ok) {
          const me = await meRes.json();
          if (me?.admin?.passwordMustChange) {
            // Session exists but password must change — login gate handles UI.
          }
          setAdminEmail(me?.admin?.email || null);
        }
      } catch (error) {
        console.error('Failed to load admin shell meta:', error);
      }
    }
    void loadMeta();
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.refresh();
    window.location.href = '/admin';
  }

  return (
    <div className="foleio-admin-shell min-h-screen bg-[#f6f5f1] text-[#1c1b19]">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-[#e7e5e4] bg-[#f3f2ed] lg:static lg:translate-x-0',
            sidebarMotion && 'transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-full flex-col p-4">
            <div className="mb-6 flex items-center justify-between gap-3 px-1">
              <Image
                src={foleioLogo}
                alt="Foleio"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
                priority
              />
              <button
                type="button"
                className="rounded-lg p-2 text-[#55544f] lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {navItems.map((item) => {
                const active =
                  item.match === 'exact'
                    ? pathname === item.href
                    : item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'foleio-admin-nav-link',
                      active && 'is-active',
                      item.indent && 'ml-4'
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    <span className="flex-1">{item.label}</span>
                    {item.href === '/admin/payouts' && pendingPayoutCount > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        {pendingPayoutCount}
                      </span>
                    ) : null}
                    {item.href === '/admin/access' && pendingInviteCount > 0 ? (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                        {pendingInviteCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-[#e7e5e4] pt-4">
              {adminEmail ? (
                <p className="mb-2 truncate px-2 text-[11px] text-[#6b6964]">{adminEmail}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="foleio-admin-nav-link w-full"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Sign out
              </button>
              {process.env.NODE_ENV !== 'production' ? (
                <Link
                  href="/admin/payout-test"
                  className="mt-2 block px-2 text-[11px] text-[#8a8882] hover:text-[#1c1b19]"
                  onClick={() => setSidebarOpen(false)}
                >
                  Payout test (dev)
                </Link>
              ) : null}
            </div>
          </div>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-[#e7e5e4] px-4 py-3 lg:px-6">
            <button
              type="button"
              className="rounded-lg p-2 text-[#55544f] lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-sm font-medium text-[#1c1b19]">Admin</p>
              <p className="text-xs text-[#6b6964]">Operator console</p>
            </div>
          </header>
          <main className="flex-1 px-4 py-5 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

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

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/admin/creators', label: 'Creators', icon: Users },
  { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/billing', label: 'Billing', icon: Crown },
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/access', label: 'Access', icon: Shield },
  { href: '/admin/integrity', label: 'Integrity', icon: CreditCard },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingPayoutCount, setPendingPayoutCount] = useState(0);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [payoutRes, meRes] = await Promise.all([
          fetch('/api/admin/payouts/pending-count', { cache: 'no-store' }),
          fetch('/api/admin/auth/me', { cache: 'no-store' }),
        ]);
        if (payoutRes.ok) {
          const data = await payoutRes.json();
          setPendingPayoutCount(Number(data.pendingCount || 0));
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
    <div className="foleio-admin-shell min-h-screen bg-[#1a1816] text-[#f4f4f5]">
      <style jsx global>{`
        body:has(.foleio-admin-shell) {
          background: #1a1816 !important;
          color: #f4f4f5 !important;
        }
        body:has(.foleio-admin-shell) footer:not(.foleio-auth-legal) {
          display: none !important;
        }
        .foleio-admin-shell a { color: inherit; text-decoration: none; }
        .foleio-admin-shell {
          --border: 20 6% 12%;
        }
        .foleio-admin-shell .border,
        .foleio-admin-shell .border-b,
        .foleio-admin-shell .border-t,
        .foleio-admin-shell .border-r,
        .foleio-admin-shell .border-l,
        .foleio-admin-shell [class*="border-white"],
        .foleio-admin-shell [class*="border-[#"] {
          border-color: #201e1c !important;
        }
        .foleio-admin-shell header {
          border-bottom: 1px solid #201e1c !important;
        }
        .foleio-admin-shell aside {
          border-right: 1px solid #201e1c !important;
        }
        .foleio-admin-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          color: #adadad;
          font-size: 13px;
          font-weight: 500;
        }
        .foleio-admin-nav-link:hover { background: #2a2a2a; color: #f4f4f5; }
        .foleio-admin-nav-link.is-active {
          background: #2a2a2a;
          color: #fff;
        }
        .foleio-admin-panel {
          background: #212121;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          border-radius: 14px;
          padding: 18px;
        }
        .foleio-admin-title {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        .foleio-admin-meta {
          margin: 6px 0 0;
          color: #828282;
          font-size: 13px;
          font-weight: 500;
        }
      `}</style>

      <div className="flex min-h-screen">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-64 border-r border-[#201e1c] bg-[#141210] transition-transform lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-full flex-col p-4">
            <div className="mb-6 flex items-center justify-between gap-3 px-1">
              <Image
                src={foleioLogo}
                alt="Foleio"
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
                priority
              />
              <button
                type="button"
                className="rounded-lg p-2 text-[#adadad] lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1">
              {navItems.map((item) => {
                const active =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn('foleio-admin-nav-link', active && 'is-active')}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    <span className="flex-1">{item.label}</span>
                    {item.href === '/admin/payouts' && pendingPayoutCount > 0 ? (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                        {pendingPayoutCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-[#201e1c] pt-4">
              {adminEmail ? (
                <p className="mb-2 truncate px-2 text-[11px] text-[#828282]">{adminEmail}</p>
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
                  className="mt-2 block px-2 text-[11px] text-[#666] hover:text-[#adadad]"
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
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-[#201e1c] px-4 py-3 lg:px-6">
            <button
              type="button"
              className="rounded-lg p-2 text-[#adadad] lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-sm font-medium text-[#f4f4f5]">Admin</p>
              <p className="text-xs text-[#828282]">Operator console</p>
            </div>
          </header>
          <main className="flex-1 px-4 py-5 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

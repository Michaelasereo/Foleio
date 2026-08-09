'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  FileText,
  ShoppingBag,
  Wallet,
  Settings2,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import foleioLogo from '../../../../foleio-logo.png';

interface CreatorSidebarProps {
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    platformPlan?: string | null;
    availableBalance?: number;
    fixedBookingsEnabled?: boolean;
    customQuotesEnabled?: boolean;
    shopEnabled?: boolean;
    creatorLinks?: Array<{
      id: string;
      label: string;
      url: string;
    }>;
  };
}

type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  tourId?: string;
  disabled?: boolean;
  tooltip?: string;
  subItems?: { label: string; href: string; queryTab?: string; matchPath?: string }[];
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: 'dashboard' },
      {
        label: 'Bookings',
        href: '/bookings',
        icon: CalendarIcon,
        subItems: [
          {
            label: 'Manage availability',
            href: '/bookings?tab=availability',
            queryTab: 'availability',
          },
          {
            label: 'Services',
            href: '/price-list',
            matchPath: '/price-list',
          },
        ],
      },
      {
        label: 'Quotes & Invoice',
        href: '/invoices',
        icon: FileText,
        tourId: 'invoices',
      },
      { label: 'Shop', href: '/shop', icon: ShoppingBag, tourId: 'shop' },
      {
        label: 'Earnings',
        href: '/earnings',
        icon: Wallet,
        tourId: 'earnings',
        subItems: [
          {
            label: 'Analytics',
            href: '/earnings?tab=analytics',
            queryTab: 'analytics',
          },
        ],
      },
    ],
  },
];

export function CreatorSidebar({ creator }: CreatorSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const fixedOn = creator.fixedBookingsEnabled !== false;
  const quotesOn = Boolean(creator.customQuotesEnabled);
  const shopOn = creator.shopEnabled !== false;
  const currentTab = searchParams.get('tab');

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => {
          if (item.label === 'Shop') return shopOn;
          return true;
        })
        .map((item) => {
          if (item.label !== 'Bookings' || !item.subItems) return item;
          return {
            ...item,
            subItems: item.subItems.filter((sub) => {
              if (sub.queryTab === 'availability') return fixedOn;
              if (sub.matchPath === '/price-list') return fixedOn || quotesOn;
              return true;
            }),
          };
        }),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    // keep searchParams dependency for route awareness
    void currentTab;
  }, [pathname, currentTab]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    if (href === '/bookings') {
      return pathname.startsWith('/bookings') || pathname.startsWith('/price-list');
    }
    if (href === '/invoices') {
      return pathname.startsWith('/invoices');
    }
    if (href === '/shop') {
      return pathname === '/shop' || pathname.startsWith('/services/shop');
    }
    if (href === '/earnings') {
      return pathname.startsWith('/earnings') || pathname.startsWith('/analytics');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
    setIsLoggingOut(false);
  }

  const settingsActive = isActive('/settings');

  return (
    <aside className="hidden h-screen w-[72px] flex-shrink-0 overflow-y-auto bg-transparent lg:flex lg:flex-col">
      <div className="flex flex-1 flex-col items-center justify-between px-2 py-5">
        <div className="flex flex-col items-center gap-1.5">
          <Link
            href="/dashboard"
            className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
            aria-label="Foleio home"
          >
            <Image
              src={foleioLogo}
              alt="Foleio"
              className="h-8 w-auto"
              priority
            />
          </Link>
          {visibleGroups.flatMap((group) =>
            group.items.map((item) => {
              if (item.disabled || !item.href) return null;
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={item.tourId}
                  title={item.label}
                  aria-label={item.label}
                  className={cn(
                    'inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                    active
                      ? 'bg-black/10 text-[#111827]'
                      : 'text-[#6b7280] hover:bg-black/[0.06] hover:text-[#111827]'
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </Link>
              );
            })
          )}
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Link
            href="/settings"
            title="Settings"
            aria-label="Settings"
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
              settingsActive
                ? 'bg-black/10 text-[#111827]'
                : 'text-[#6b7280] hover:bg-black/[0.06] hover:text-[#111827]'
            )}
          >
            <Settings2 className="h-5 w-5" strokeWidth={1.5} />
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            title="Log out"
            aria-label="Log out"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#6b7280] transition-colors hover:bg-black/[0.06] hover:text-[#111827] disabled:opacity-50"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}

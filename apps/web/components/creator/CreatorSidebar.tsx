'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { getCreatorPlan } from '@/lib/utils/plan-limits';
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  Calendar as CalendarIcon,
  FileText,
  ShoppingBag,
  Wallet,
  Settings2,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

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
  href: string;
  icon: LucideIcon;
  tourId?: string;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: 'dashboard' },
  { label: 'Bookings', href: '/bookings', icon: CalendarIcon },
  { label: 'Quotes & Invoice', href: '/invoices', icon: FileText, tourId: 'invoices' },
  { label: 'Shop', href: '/shop', icon: ShoppingBag, tourId: 'shop' },
  { label: 'Earnings', href: '/earnings', icon: Wallet, tourId: 'earnings' },
];

const itemClass =
  'flex items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-[14px] font-medium text-[#1c1c1c] transition-colors hover:bg-black/[0.04]';

export function CreatorSidebar({ creator }: CreatorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const shopOn = creator.shopEnabled !== false;
  const plan = getCreatorPlan(creator.platformPlan ?? null);
  const planLabel = plan === 'STARTER' ? 'FREE' : plan;
  const planIsPaid = plan !== 'STARTER';

  const visibleItems = navItems.filter((item) => {
    if (item.label === 'Shop') return shopOn;
    return true;
  });

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
    <aside className="hidden h-screen w-[260px] flex-shrink-0 flex-col overflow-y-auto bg-transparent px-3 pb-4 pt-3.5 lg:flex">
      <div className="flex items-center gap-1.5 px-2 pb-1 pt-1">
        <Link
          href="/dashboard"
          className="inline-flex min-w-0 items-center gap-2 text-[#1c1c1c]"
          aria-label="Foleio home"
        >
          <Image
            src="/Foleio%20Logo/New-Foleio-Logo.png"
            alt=""
            width={26}
            height={26}
            className="h-[26px] w-[26px] object-contain"
            priority
          />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Foleio</span>
        </Link>
        <Link
          href="/billing"
          className={cn(
            'inline-flex items-center gap-0.5 text-[12px] font-semibold tracking-[0.04em]',
            planIsPaid ? 'text-[#1faa59]' : 'text-[#b3b3b3]'
          )}
        >
          {planLabel}
          <ChevronDown className="h-3 w-3" strokeWidth={2.25} />
        </Link>
        <Link
          href="/settings?tab=notifications"
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#1c1c1c] hover:bg-black/[0.04]"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </Link>
      </div>

      <nav className="mt-2 flex flex-1 flex-col" aria-label="Creator navigation">
        <div className="px-2.5 pb-1.5 pt-3 text-[13px] font-medium text-[#bdbdbd]">Workspace</div>
        <div className="flex flex-col gap-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tourId}
                className={cn(itemClass, active && 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]')}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-0.5 pt-4">
          <div className="px-2.5 pb-1.5 text-[13px] font-medium text-[#bdbdbd]">Account</div>
          <Link
            href="/settings"
            className={cn(itemClass, settingsActive && 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]')}
          >
            <Settings2 className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            Settings
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className={cn(itemClass, 'w-full disabled:opacity-50')}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            {isLoggingOut ? 'Logging out' : 'Log out'}
          </button>
        </div>
      </nav>
    </aside>
  );
}

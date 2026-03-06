'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Video,
  Sparkles,
  FileText,
  Calendar as CalendarIcon,
  Clock,
  Wallet,
  CreditCard,
  Settings,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import foleioLogo from '../../../../foleio-logo.png';

interface CreatorSidebarProps {
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Content',
    href: '/content',
    icon: Video,
  },
  {
    label: 'Brand Deals',
    href: '',
    icon: Sparkles,
    disabled: true,
    tooltip:
      'Coming soon — brands will discover and hire you directly on Foleio',
  },
  {
    label: 'Bookings',
    href: '/bookings',
    icon: CalendarIcon,
  },
  {
    label: 'Availability',
    href: '/availability',
    icon: Clock,
  },
  {
    label: 'Services',
    href: '/price-list',
    icon: FileText,
  },
  {
    label: 'Payouts',
    href: '/payouts',
    icon: Wallet,
  },
  {
    label: 'Billing',
    href: '/billing',
    icon: CreditCard,
  },
];

export function CreatorSidebar({ creator }: CreatorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
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
    <aside className="hidden h-screen w-64 overflow-y-auto border-r border-border/70 bg-card lg:flex lg:flex-col">
      <div className="border-b border-border/60 p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src={foleioLogo}
            alt="Foleio"
            className="h-11 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Creator Profile Quick View */}
      <div className="border-b border-border/60 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                {creator.displayName.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-body font-medium text-foreground">
              {creator.displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">@{creator.username}</p>
          </div>
        </div>
        <Link
          href={`/creator/${creator.username}`}
          target="_blank"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          View Public Page
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href ? isActive(item.href) : false;

          if (item.disabled) {
            return (
              <div
                key={item.label}
                title={item.tooltip}
                className="flex items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-muted-foreground opacity-50 cursor-not-allowed"
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.label}</span>
                <span className="ml-auto rounded-full bg-[hsl(var(--accent)/15)] px-[6px] py-[2px] text-[10px] font-medium text-[hsl(var(--accent))]">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 border-l-[3px] px-4 py-2.5 transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-4 space-y-1">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 border-l-[3px] px-4 py-2.5 transition-colors',
            settingsActive
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          <span className="font-medium">Settings</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </span>
        </button>
      </div>
    </aside>
  );
}


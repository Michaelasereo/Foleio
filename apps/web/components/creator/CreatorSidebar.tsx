'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { formatNaira } from '@foleio/utils';
import {
  LayoutDashboard,
  Video,
  Sparkles,
  FileText,
  BookOpen,
  Calendar as CalendarIcon,
  BarChart3,
  Wallet,
  CreditCard,
  Settings2,
  ExternalLink,
  LogOut,
  ChevronDown,
  Link2,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import foleioLogo from '../../../../foleio-logo.png';
import { getCreatorPlan } from '@/lib/utils/plan-limits';

interface CreatorSidebarProps {
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    platformPlan?: string | null;
    availableBalance?: number;
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
  subItems?: { label: string; href: string; queryTab?: string }[];
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: 'dashboard' },
      { label: 'Services', href: '/price-list', icon: FileText },
      { label: 'Shop', href: '/services/shop', icon: ShoppingBag },
      { label: 'Content', href: '/content', icon: Video, tourId: 'content' },
      { label: 'Journal', href: '/journal', icon: BookOpen, tourId: 'journal' },
      {
        label: 'Brand Deals',
        icon: Sparkles,
        disabled: true,
        tooltip:
          'Coming soon — brands will discover and hire you directly on Foleio',
      },
      {
        label: 'Bookings',
        href: '/bookings',
        icon: CalendarIcon,
        subItems: [
          {
            label: 'Availability',
            href: '/bookings?tab=availability',
            queryTab: 'availability',
          },
        ],
      },
    ],
  },
  {
    title: 'Insights',
    items: [{ label: 'Analytics', href: '/analytics', icon: BarChart3, tourId: 'analytics' }],
  },
  {
    title: 'Payments',
    items: [
      { label: 'Earnings', href: '/earnings', icon: Wallet, tourId: 'earnings' },
      { label: 'Billing', href: '/billing', icon: CreditCard },
    ],
  },
];

export function CreatorSidebar({ creator }: CreatorSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [journalDraftCount, setJournalDraftCount] = useState(0);
  const [expandedNav, setExpandedNav] = useState<Record<string, boolean>>({
    Bookings: pathname.startsWith('/bookings'),
  });
  const currentBookingsTab = searchParams.get('tab');

  useEffect(() => {
    async function loadDraftCount() {
      try {
        const response = await fetch('/api/journal/drafts-count');
        if (!response.ok) return;
        const data = await response.json();
        setJournalDraftCount(Number(data.count || 0));
      } catch {
        setJournalDraftCount(0);
      }
    }
    void loadDraftCount();
  }, []);

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
  const availableBalance = Number(creator.availableBalance || 0);
  const creatorPlan = getCreatorPlan(creator.platformPlan ?? null);

  const planBadgeClass =
    creatorPlan === 'PREMIUM'
      ? 'bg-blue-100 text-blue-700 border border-blue-200'
      : creatorPlan === 'PRO'
        ? 'bg-orange-100 text-orange-700 border border-orange-200'
        : 'bg-slate-100 text-slate-700 border border-slate-200';

  const planLabel =
    creatorPlan === 'PREMIUM'
      ? 'Premium ✦'
      : creatorPlan === 'PRO'
        ? 'Pro ✦'
        : 'Starter';
  const normalizeUrl = (url: string) => (url.startsWith('http') ? url : `https://${url}`);

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
      <div className="border-b border-border/60 p-4" data-tour="creator-profile">
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
            <Link href="/billing" className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${planBadgeClass}`}>
              {planLabel}
            </Link>
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
        {Array.isArray(creator.creatorLinks) && creator.creatorLinks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 px-1">
            {creator.creatorLinks
              .filter((link) => link.url && link.url !== '#price-list')
              .map((link) => (
                <a
                  key={link.id}
                  href={normalizeUrl(link.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  <Link2 className="h-3 w-3 flex-shrink-0" />
                  <span>{link.label || 'Link'}</span>
                </a>
              ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 p-4">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              {group.title}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.href ? isActive(item.href) : false;

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    title={item.tooltip}
                    className="flex cursor-not-allowed items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-muted-foreground opacity-50"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                    <span className="ml-auto rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <div key={item.href}>
                  <div
                    className={cn(
                      'flex items-center gap-3 border-l-[3px] px-4 py-2.5 transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                  >
                  <Link
                    href={item.href!}
                    data-tour={item.tourId}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                  {item.href === '/earnings' && availableBalance > 0 ? (
                    <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {formatNaira(availableBalance / 100)}
                    </span>
                  ) : null}
                  {item.href === '/journal' && journalDraftCount > 0 ? (
                    <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {journalDraftCount}
                    </span>
                  ) : null}
                  {item.subItems?.length ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedNav((prev) => ({
                          ...prev,
                          [item.label]: !prev[item.label],
                        }))
                      }
                      className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                      aria-label={`Toggle ${item.label} sub-navigation`}
                    >
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          expandedNav[item.label] ? 'rotate-180' : ''
                        )}
                      />
                    </button>
                  ) : null}
                </div>
                  {item.subItems?.length && expandedNav[item.label]
                    ? item.subItems.map((subItem) => {
                        const subActive =
                          pathname === '/bookings' &&
                          subItem.queryTab === currentBookingsTab;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              'ml-8 mt-1 flex items-center border-l-[3px] px-4 py-1.5 text-sm transition-colors',
                              subActive
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {subItem.label}
                          </Link>
                        );
                      })
                    : null}
                </div>
              );
            })}
          </div>
        ))}
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
          <Settings2 className="h-4 w-4" />
          <span className="font-medium">Account Settings</span>
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

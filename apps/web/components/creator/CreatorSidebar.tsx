'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Video,
  FileText,
  Calendar as CalendarIcon,
  Clock,
  Wallet,
  Settings,
  ExternalLink,
} from 'lucide-react';

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
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function CreatorSidebar({ creator }: CreatorSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r bg-card h-screen overflow-y-auto hidden lg:flex lg:flex-col">
      <div className="p-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Odim</h2>
        </Link>
      </div>

      {/* Creator Profile Quick View */}
      <div className="p-4 border-b">
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
            <p className="font-medium truncate">{creator.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">@{creator.username}</p>
          </div>
        </div>
        <Link
          href={`/creator/${creator.username}`}
          target="_blank"
          className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2 rounded-md border hover:bg-accent"
        >
          <ExternalLink className="h-3 w-3" />
          View Public Page
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}


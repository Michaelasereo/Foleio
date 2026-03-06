import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFanSessionFromCookieValue } from '@/lib/fan-auth/session';
import { FanLogoutButton } from '@/components/fan/FanLogoutButton';
import { FanSupportChat } from '@/components/ai/FanSupportChat';
import { Home, CalendarCheck, Video, CreditCard } from 'lucide-react';

const tabs = [
  { href: '/fan/dashboard', label: 'Home', icon: Home },
  { href: '/fan/dashboard/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/fan/dashboard/content', label: 'Content', icon: Video },
  { href: '/fan/dashboard/subscriptions', label: 'Subscriptions', icon: CreditCard },
];

export default async function FanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || headerList.get('next-url') || '';
  const isLoginPage = pathname.includes('/fan/login');
  const isDashboardPage = pathname.includes('/fan/dashboard');

  const cookieStore = await cookies();
  const session = getFanSessionFromCookieValue(cookieStore.get('fan_session')?.value);

  if (isDashboardPage && !session) {
    redirect('/fan/login');
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-2xl text-primary">
            Foleio
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {session?.email}
            </span>
            <FanLogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card md:hidden">
        <div className="grid grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center gap-1 py-3 text-xs text-muted-foreground"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <FanSupportChat />
    </div>
  );
}

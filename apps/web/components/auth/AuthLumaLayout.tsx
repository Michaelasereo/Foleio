'use client';

import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  Compass,
  Wallet,
} from 'lucide-react';
import { AuthLegalFooter } from './AuthLegalFooter';
import { AuthPreviewVisual } from './AuthPreviewVisual';
import { authCss } from './styles';

interface AuthLumaLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerExtra?: React.ReactNode;
}

export function AuthLumaLayout({
  title,
  subtitle,
  children,
  footerExtra,
}: AuthLumaLayoutProps) {
  return (
    <div className="foleio-auth-root relative flex min-h-screen flex-col">
      <style dangerouslySetInnerHTML={{ __html: authCss }} />

      <div className="foleio-auth-shell">
        <header className="foleio-auth-topbar relative z-10">
          <div className="foleio-auth-topbar-row">
            <nav className="foleio-auth-topbar-nav" aria-hidden>
              <span>
                <CalendarDays strokeWidth={1.5} />
                Bookings
              </span>
              <span>
                <Wallet strokeWidth={1.5} />
                Earnings
              </span>
              <span>
                <BarChart3 strokeWidth={1.5} />
                Analytics
              </span>
            </nav>
            <Link
              href="/creators"
              className="foleio-auth-topbar-item"
              aria-label="Creator marketplace"
            >
              <Compass strokeWidth={1.5} />
              Creator marketplace
              <span className="foleio-auth-new-badge">New</span>
            </Link>
          </div>
        </header>

        <main className="foleio-auth-main relative z-10 flex-1">
          <div className="foleio-auth-columns">
            <AuthPreviewVisual />

            <div className="foleio-auth-right">
              <h1 className="foleio-auth-title">{title}</h1>
              {subtitle ? (
                <p className="foleio-auth-sub mt-2 text-sm">{subtitle}</p>
              ) : null}

              <div className="mt-8">{children}</div>

              {footerExtra ? (
                <div className="mt-6 text-center text-sm">{footerExtra}</div>
              ) : null}

              <AuthLegalFooter />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

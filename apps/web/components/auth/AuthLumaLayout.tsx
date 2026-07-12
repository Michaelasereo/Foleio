'use client';

import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Wallet,
} from 'lucide-react';
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
        </header>

        <main className="foleio-auth-main relative z-10 flex-1">
          <div className="foleio-auth-columns">
            <div className="foleio-auth-left">
              <div className="foleio-auth-preview" aria-hidden>
                <div className="foleio-auth-preview-bars">
                  <div className="foleio-auth-preview-bar" />
                  <div className="foleio-auth-preview-bar" />
                  <div className="foleio-auth-preview-bar" />
                </div>
              </div>
              <div className="foleio-auth-stub" aria-hidden>
                <div className="foleio-auth-stub-main">
                  <div className="foleio-auth-stub-thumb" />
                  <div className="foleio-auth-stub-lines">
                    <div className="foleio-auth-stub-line" />
                    <div className="foleio-auth-stub-line" />
                    <div className="foleio-auth-stub-line" />
                  </div>
                </div>
                <div className="foleio-auth-stub-badge">
                  <BadgeCheck className="h-6 w-6" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="foleio-auth-right">
              <h1 className="foleio-auth-title">{title}</h1>
              {subtitle ? (
                <p className="foleio-auth-sub mt-2 text-sm">{subtitle}</p>
              ) : null}

              <div className="mt-8">{children}</div>

              {footerExtra ? (
                <div className="mt-6 text-center text-sm">{footerExtra}</div>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

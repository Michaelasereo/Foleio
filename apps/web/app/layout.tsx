import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import Link from 'next/link';
import { ThemeProvider } from '@/components/theme-provider';
import { ChunkRecovery } from '@/components/chunk-recovery';
import { StagingBanner } from '@/components/ui/StagingBanner';
import { Toaster } from '@/components/ui/toaster';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { shouldShowStagingBanner } from '@/lib/config/runtime-environment';
import { validateAndExit } from '@/lib/config/env-validation';
import './globals.css';

// Validate environment on startup
if (typeof window === 'undefined') {
  validateAndExit();
}

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Foleio - Your work. Your world. Your Foleio.',
  description: 'Foleio is the creative portfolio platform for Nigerian creators — monetize your content, offer services, and build your world.',
  keywords: ['creator platform', 'Nigeria', 'subscription', 'content creator'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showStagingBanner = shouldShowStagingBanner();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Paystack Inline Script for Payment Processing */}
        <script src="https://js.paystack.co/v1/inline.js" async />
      </head>
      <body
        className={`${dmSans.variable} ${playfairDisplay.variable} ${
          showStagingBanner ? 'pt-8' : ''
        }`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <StagingBanner />
          <ChunkRecovery />
          {children}
          <footer className="px-6 py-6">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground">
                About
              </Link>
              <Link href="/legal/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="/legal/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/legal/creator-agreement" className="hover:text-foreground">
                Creator Agreement
              </Link>
            </div>
          </footer>
          <Toaster />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}


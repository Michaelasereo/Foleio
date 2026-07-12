import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Playfair_Display } from 'next/font/google';
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

const interTight = localFont({
  src: [
    {
      path: '../public/Font/InterTight-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/Font/InterTight-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/Font/InterTight-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Foleio - Your work. Your world. Your Foleio.',
  description: 'Foleio is the creative portfolio platform for Nigerian creators — monetize your content, offer services, and build your world.',
  keywords: ['creator platform', 'Nigeria', 'subscription', 'content creator'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    images: [
      {
        url: 'https://foleio.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Foleio — Creator platform for Nigerians',
      },
      {
        url: 'https://foleio.com/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Foleio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://foleio.com/og-image.png'],
  },
  manifest: '/site.webmanifest',
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
        className={`${interTight.variable} ${playfairDisplay.variable} ${
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


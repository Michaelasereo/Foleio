import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ChunkRecovery } from '@/components/chunk-recovery';
import { StagingBanner } from '@/components/ui/StagingBanner';
import { Toaster } from '@/components/ui/toaster';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { SiteFooter } from '@/components/system/SiteFooter';
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
      { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.svg?v=2', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png?v=2', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-192x192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-512x512.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png?v=2',
    shortcut: '/favicon.ico?v=2',
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
          <SiteFooter />
          <Toaster />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}


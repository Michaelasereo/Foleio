import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { validateAndExit } from '@/lib/config/env-validation';
import './globals.css';

// Validate environment on startup
if (typeof window === 'undefined') {
  validateAndExit();
}

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Odim - Your Nigerian Creator Platform',
  description: 'Monetize your creativity with instant Naira payouts',
  keywords: ['creator platform', 'Nigeria', 'subscription', 'content creator'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Paystack Inline Script for Payment Processing */}
        <script src="https://js.paystack.co/v1/inline.js" async />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}


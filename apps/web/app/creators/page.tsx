import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreatorsDiscovery } from '@/components/creators/CreatorsDiscovery';
import { authCss } from '@/components/auth/styles';

export const metadata: Metadata = {
  title: 'Creators | Foleio',
  description:
    'Browse Pro creators on Foleio — book services, shop products, and pay securely with Paystack. Africa’s number one creator monetization platform.',
  openGraph: {
    title: 'Creators | Foleio',
    description:
      'Browse Pro creators on Foleio — book services, shop products, and pay securely with Paystack.',
    url: 'https://foleio.com/creators',
    siteName: 'Foleio',
    type: 'website',
  },
  alternates: { canonical: 'https://foleio.com/creators' },
};

const creatorsPageCss = `
.foleio-creators-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1816;
  color: #ededed;
  font-family: var(--font-body), system-ui, sans-serif;
  font-weight: 300;
}
.foleio-creators-page h1 {
  font-family: var(--font-body), system-ui, sans-serif;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #e4e2de;
}
body:has(.foleio-creators-page) .foleio-site-footer {
  display: none !important;
}
.foleio-creators-inner {
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding: 24px 24px 64px;
  flex: 1;
}
.foleio-creators-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 28px;
  color: #adadad;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s ease;
}
.foleio-creators-back:hover {
  color: #fafafa;
}
.foleio-creators-back svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.foleio-creators-header {
  margin-bottom: 28px;
}
.foleio-creators-header h1 {
  margin: 0 0 0.5rem;
  font-size: clamp(1.75rem, 3.5vw, 2.25rem);
  line-height: 1.15;
}
.foleio-creators-header p {
  margin: 0;
  max-width: 36rem;
  color: #8b8f9a;
  font-size: 1rem;
  line-height: 1.6;
}
`;

export default function CreatorsPage() {
  return (
    <div className="foleio-creators-page">
      <style dangerouslySetInnerHTML={{ __html: authCss + creatorsPageCss }} />
      <div className="foleio-creators-inner">
        <Link href="/" className="foleio-creators-back">
          <ArrowLeft strokeWidth={1.5} aria-hidden />
          Back
        </Link>

        <header className="foleio-creators-header">
          <h1>Creator marketplace</h1>
          <p>
            Pro creators on Foleio — book their services or shop their products
            from one public page.
          </p>
        </header>

        <Suspense fallback={<CreatorsLoading />}>
          <CreatorsDiscovery />
        </Suspense>
      </div>
    </div>
  );
}

function CreatorsLoading() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-white/10 bg-[#212121] animate-pulse"
        >
          <div className="h-40 bg-[#2b2b2b]" />
          <div className="space-y-3 p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#2b2b2b]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-[#2b2b2b]" />
                <div className="h-3 w-16 rounded bg-[#2b2b2b]" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-[#2b2b2b]" />
            <div className="h-3 w-3/4 rounded bg-[#2b2b2b]" />
          </div>
        </div>
      ))}
    </div>
  );
}

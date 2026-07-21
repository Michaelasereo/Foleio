import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FanSupportChat } from '@/components/ai/FanSupportChat';
import { CreatorsDiscovery } from '@/components/creators/CreatorsDiscovery';
import {
  MarketingHero,
  MarketingShell,
} from '@/components/marketing/MarketingShell';
import { BRAND_CLAIM } from '@/components/marketing/marketingCss';

export const metadata: Metadata = {
  title: 'Top Creators | Foleio',
  description:
    'Browse top Pro creators on Foleio — book services, shop products, and pay securely with Paystack. Africa’s number one creator monetization platform.',
  openGraph: {
    title: 'Top Creators | Foleio',
    description:
      'Browse top Pro creators on Foleio — book services, shop products, and pay securely with Paystack.',
    url: 'https://foleio.com/creators',
    siteName: 'Foleio',
    type: 'website',
  },
  alternates: { canonical: 'https://foleio.com/creators' },
};

export default function CreatorsPage() {
  return (
    <MarketingShell activePath="/creators">
      <MarketingHero
        eyebrow={BRAND_CLAIM}
        title="Top Creators"
        subtitle="Pro creators on Foleio — book their services or shop their products from one public page."
      />

      <div className="foleio-mkt-creators-wrap">
        <Suspense fallback={<CreatorsLoading />}>
          <CreatorsDiscovery />
        </Suspense>
      </div>

      <FanSupportChat />
    </MarketingShell>
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

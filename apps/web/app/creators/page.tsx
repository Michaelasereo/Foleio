import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CreatorsDiscovery } from '@/components/creators/CreatorsDiscovery';
import { Reveal } from '@/components/landing/Reveal';
import { Italic, frame } from '@/components/landing/ui';
import { SiteChrome } from '@/components/site/SiteChrome';

export const metadata: Metadata = {
  title: 'Creators | Foleio',
  description:
    'Find a creator on Foleio. Book a service or buy from their shop in one visit.',
  openGraph: {
    title: 'Creators | Foleio',
    description:
      'Find a creator on Foleio. Book a service or buy from their shop in one visit.',
    url: 'https://foleio.com/creators',
    siteName: 'Foleio',
    type: 'website',
  },
  alternates: { canonical: 'https://foleio.com/creators' },
};

export default function CreatorsPage() {
  return (
    <SiteChrome active="/creators">
      <main className={`${frame} pb-4 pt-8 sm:pt-12`}>
        <Reveal>
          <p className="text-[14px] text-[#6b6a64]">Top Creators</p>
          <h1 className="mt-3 max-w-[760px] text-[clamp(40px,5vw,64px)] font-[450] leading-[1.02] tracking-[-0.045em] text-[#1c1b19]">
            Find a creator.
            <Italic block>Book or buy in one visit.</Italic>
          </h1>
          <p className="mt-5 max-w-[560px] text-[17px] leading-[1.55] text-[#55544f]">
            Every creator here runs their business on Foleio. Open a page to book a service or shop
            their products, and pay online.
          </p>
        </Reveal>

        <Suspense fallback={<CreatorsLoading />}>
          <CreatorsDiscovery />
        </Suspense>
      </main>
    </SiteChrome>
  );
}

function CreatorsLoading() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[22px] border border-[#e7e5e0] bg-white">
          <div className="h-[132px] animate-pulse bg-[#eceae4]" />
          <div className="space-y-3 px-4 pb-4 pt-6">
            <div className="h-4 w-32 animate-pulse rounded bg-[#eceae4]" />
            <div className="h-3 w-full animate-pulse rounded bg-[#f3f1ec]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[#f3f1ec]" />
          </div>
        </div>
      ))}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MarketingCta,
  MarketingHero,
  MarketingShell,
} from '@/components/marketing/MarketingShell';
import { BRAND_CLAIM } from '@/components/marketing/marketingCss';

const description =
  'Offer services with availability, deposits, balances, tracking, and booking policy on Foleio — Pro adds reusable schedule templates. Get paid upfront via Paystack.';

export const metadata: Metadata = {
  title: 'Get booked and paid | Foleio',
  description,
  openGraph: {
    title: 'Get booked and paid | Foleio',
    description,
    url: 'https://foleio.com/product/bookings',
    siteName: 'Foleio',
    type: 'website',
  },
  alternates: { canonical: 'https://foleio.com/product/bookings' },
};

export const dynamic = 'force-static';

export default function ProductBookingsPage() {
  return (
    <MarketingShell activePath="/product/bookings">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Get booked and paid',
            description,
            url: 'https://foleio.com/product/bookings',
            isPartOf: { '@type': 'WebSite', name: 'Foleio', url: 'https://foleio.com' },
          }),
        }}
      />

      <MarketingHero
        eyebrow={BRAND_CLAIM}
        title="Get booked and paid"
        subtitle="Publish services, set availability, collect deposits or full payment, and share clear booking policy — all on your Foleio link. Pro adds reusable schedule templates."
      />

      <section className="foleio-mkt-section" style={{ paddingTop: 0 }}>
        <div className="foleio-mkt-section-inner">
          <div className="foleio-mkt-grid-3">
            {[
              [
                'Services & availability',
                'List what you offer and when you are free so clients can book without DM back-and-forth.',
              ],
              [
                'Deposits & balances',
                'Take a deposit or full amount online, then track remaining balances when needed.',
              ],
              [
                'Schedule templates (Pro)',
                'Save and reuse availability patterns instead of setting every day from scratch.',
              ],
            ].map(([title, desc]) => (
              <div key={title} className="foleio-mkt-card">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <p className="foleio-mkt-muted mt-10 text-center text-sm">
            Pair bookings with your{' '}
            <Link href="/product/shop" className="underline underline-offset-2 text-[#adadad]">
              shop
            </Link>{' '}
            on one{' '}
            <Link href="/product/link" className="underline underline-offset-2 text-[#adadad]">
              shareable link
            </Link>
            .
          </p>
        </div>
      </section>

      <MarketingCta
        title="Start taking bookings"
        subtitle="Add services, set your calendar, and share your link."
        secondaryHref="/pricing"
        secondaryLabel="See pricing"
      />
    </MarketingShell>
  );
}

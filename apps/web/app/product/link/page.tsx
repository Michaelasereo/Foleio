import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MarketingCta,
  MarketingHero,
  MarketingShell,
} from '@/components/marketing/MarketingShell';
import { BRAND_CLAIM } from '@/components/marketing/marketingCss';

const description =
  'Share one Foleio link for bookings, shop, and portfolio — Africa’s number one creator monetization platform.';

export const metadata: Metadata = {
  title: 'Share your link. Get booked. | Foleio',
  description,
  openGraph: {
    title: 'Share your link. Get booked. | Foleio',
    description,
    url: 'https://foleio.com/product/link',
    siteName: 'Foleio',
    type: 'website',
  },
  alternates: { canonical: 'https://foleio.com/product/link' },
};

export const dynamic = 'force-static';

export default function ProductLinkPage() {
  return (
    <MarketingShell activePath="/product/link">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Share your link. Get booked.',
            description,
            url: 'https://foleio.com/product/link',
            isPartOf: { '@type': 'WebSite', name: 'Foleio', url: 'https://foleio.com' },
          }),
        }}
      />

      <MarketingHero
        eyebrow={BRAND_CLAIM}
        title="Share your link. Get booked."
        subtitle="One public Foleio URL for your profile, bookings, shop, and portfolio. Share it on Instagram, WhatsApp, or TikTok — clients open it and pay with Paystack."
      />

      <section className="foleio-mkt-section" style={{ paddingTop: 0 }}>
        <div className="foleio-mkt-section-inner">
          <div className="foleio-mkt-grid-3">
            {[
              [
                'One link',
                'Replace scattered DMs and payment links with a branded page you control.',
              ],
              [
                'Bookings + shop',
                'Clients book services or buy products without leaving your page.',
              ],
              [
                'Paid to your bank',
                'Paystack settles your share to your linked Nigerian bank account.',
              ],
            ].map(([title, desc]) => (
              <div key={title} className="foleio-mkt-card">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <p className="foleio-mkt-muted mt-10 text-center text-sm">
            Also explore{' '}
            <Link href="/product/bookings" className="underline underline-offset-2 text-[#adadad]">
              Bookings
            </Link>
            {' · '}
            <Link href="/product/shop" className="underline underline-offset-2 text-[#adadad]">
              Shop
            </Link>
            {' · '}
            <Link href="/pricing" className="underline underline-offset-2 text-[#adadad]">
              Pricing
            </Link>
          </p>
        </div>
      </section>

      <MarketingCta
        title="Claim your Foleio link"
        subtitle="Create your page in a few minutes and start sharing."
        secondaryHref="/pricing"
        secondaryLabel="See pricing"
      />
    </MarketingShell>
  );
}

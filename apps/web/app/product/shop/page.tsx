import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MarketingCta,
  MarketingHero,
  MarketingShell,
} from '@/components/marketing/MarketingShell';
import { BRAND_CLAIM } from '@/components/marketing/marketingCss';

const description =
  'Sell physical products with delivery and preorders on your Foleio page. Pro unlocks digital downloads, gift cards, coupons, and conditional free delivery — get paid via Paystack.';

export const metadata: Metadata = {
  title: 'Sell products on your page | Foleio',
  description,
  openGraph: {
    title: 'Sell products on your page | Foleio',
    description,
    url: 'https://foleio.com/product/shop',
    siteName: 'Foleio',
    type: 'website',
  },
  alternates: { canonical: 'https://foleio.com/product/shop' },
};

export const dynamic = 'force-static';

export default function ProductShopPage() {
  return (
    <MarketingShell activePath="/product/shop">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Sell products on your page',
            description,
            url: 'https://foleio.com/product/shop',
            isPartOf: { '@type': 'WebSite', name: 'Foleio', url: 'https://foleio.com' },
          }),
        }}
      />

      <MarketingHero
        eyebrow={BRAND_CLAIM}
        title="Sell products on your page"
        subtitle="Add a shop to your Foleio link — physical products with delivery and preorders. Pro unlocks digital downloads, gift cards, coupons, and conditional free delivery."
      />

      <section className="foleio-mkt-section" style={{ paddingTop: 0 }}>
        <div className="foleio-mkt-section-inner">
          <div className="foleio-mkt-grid-3">
            {[
              [
                'Physical products',
                'List items with pricing, stock, delivery options, and preorders when you need them.',
              ],
              [
                'Pro shop tools',
                'Sell PDF downloads, gift cards, and coupon codes — plus free delivery when customers hit a spend or quantity threshold.',
              ],
              [
                'Payouts to your bank',
                'Orders settle through Paystack to your linked Nigerian bank account.',
              ],
            ].map(([title, desc]) => (
              <div key={title} className="foleio-mkt-card">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <p className="foleio-mkt-muted mt-10 text-center text-sm">
            Free includes a shop with product limits.{' '}
            <Link href="/pricing" className="underline underline-offset-2 text-[#adadad]">
              See Free vs Pro
            </Link>
          </p>
        </div>
      </section>

      <MarketingCta
        title="Open your shop"
        subtitle="Add products to your public page and start selling."
        secondaryHref="/product/link"
        secondaryLabel="Shareable link"
      />
    </MarketingShell>
  );
}

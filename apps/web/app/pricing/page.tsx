import type { Metadata } from 'next';
import Link from 'next/link';
import {
  formatFreeFeeLabel,
  formatPlanPrice,
  formatProFeeLabel,
  freePlanFeatureBullets,
  PLATFORM_PLAN_AMOUNTS_KOBO,
  proPlanFeatureBullets,
} from '@/lib/billing/platform-plans';
import {
  MarketingCta,
  MarketingHero,
  MarketingShell,
} from '@/components/marketing/MarketingShell';
import { BRAND_CLAIM } from '@/components/marketing/marketingCss';

const description =
  'Foleio pricing: Free ₦0/mo with platform fee; Pro from ₦3,000/mo with lower fees, unlimited catalog, reviews, gift cards, and Top Creators listing.';

export const metadata: Metadata = {
  title: 'Pricing | Foleio',
  description,
  openGraph: {
    title: 'Pricing | Foleio',
    description,
    url: 'https://foleio.com/pricing',
    siteName: 'Foleio',
    type: 'website',
  },
  alternates: { canonical: 'https://foleio.com/pricing' },
};

export const dynamic = 'force-static';

export default function PricingPage() {
  const freeFee = formatFreeFeeLabel();
  const proFee = formatProFeeLabel();
  const proMonthly = formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.monthly);
  const proQuarterly = formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.quarterly);
  const monthlyKobo = PLATFORM_PLAN_AMOUNTS_KOBO.pro.monthly;
  const quarterlyKobo = PLATFORM_PLAN_AMOUNTS_KOBO.pro.quarterly;
  const freeFeatures = freePlanFeatureBullets();
  const proFeatures = proPlanFeatureBullets().filter((f) => f !== 'Everything on Free');

  return (
    <MarketingShell activePath="/pricing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Foleio',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description,
            url: 'https://foleio.com/pricing',
            offers: [
              {
                '@type': 'Offer',
                name: 'Free',
                price: '0',
                priceCurrency: 'NGN',
                description: `${freeFee} per transaction`,
              },
              {
                '@type': 'Offer',
                name: 'Pro Monthly',
                price: String(monthlyKobo / 100),
                priceCurrency: 'NGN',
                description: `${proFee} per transaction`,
              },
              {
                '@type': 'Offer',
                name: 'Pro Quarterly',
                price: String(quarterlyKobo / 100),
                priceCurrency: 'NGN',
                description: `${proFee} per transaction`,
              },
            ],
          }),
        }}
      />

      <MarketingHero
        eyebrow={BRAND_CLAIM}
        title="Simple pricing for creator businesses"
        subtitle="Start free. Upgrade to Pro for lower fees, unlimited catalog, digital downloads, reviews, gift cards, and Top Creators discoverability."
      />

      <section className="foleio-mkt-section" style={{ paddingTop: 0 }}>
        <div className="foleio-mkt-section-narrow">
          <div className="foleio-mkt-grid-2">
            <div className="foleio-mkt-card">
              <p className="foleio-mkt-eyebrow" style={{ marginBottom: 8 }}>
                Free
              </p>
              <p className="foleio-mkt-price">₦0 / month</p>
              <p className="mb-4 text-sm font-medium text-[#fafafa]">
                {freeFee} per transaction
              </p>
              <ul>
                {freeFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
            <div className="foleio-mkt-card foleio-mkt-card-accent">
              <p className="foleio-mkt-eyebrow" style={{ marginBottom: 8 }}>
                Pro
              </p>
              <p className="foleio-mkt-price">
                {proMonthly}
                <span className="text-base font-normal text-[#8b8f9a]"> / month</span>
              </p>
              <p className="mb-1 text-sm text-[#8b8f9a]">or {proQuarterly} / quarter</p>
              <p className="mb-4 text-sm font-medium text-[#fafafa]">
                {proFee} per transaction
              </p>
              <ul>
                <li>Everything on Free</li>
                {proFeatures.map((feature) =>
                  feature.includes('Top Creators') ? (
                    <li key={feature}>
                      <Link href="/creators" className="underline underline-offset-2">
                        Appear on Top Creators &amp; Google
                      </Link>
                    </li>
                  ) : (
                    <li key={feature}>{feature}</li>
                  )
                )}
              </ul>
            </div>
          </div>

          <p className="foleio-mkt-muted mt-10 text-center text-sm leading-relaxed">
            Product deep-dives:{' '}
            <Link href="/product/link" className="underline underline-offset-2 text-[#adadad]">
              Link
            </Link>
            {' · '}
            <Link href="/product/bookings" className="underline underline-offset-2 text-[#adadad]">
              Bookings
            </Link>
            {' · '}
            <Link href="/product/shop" className="underline underline-offset-2 text-[#adadad]">
              Shop
            </Link>
          </p>
        </div>
      </section>

      <MarketingCta
        title="Start free — upgrade when you are ready"
        subtitle="Create your page now. Pro is available anytime from Billing."
      />
    </MarketingShell>
  );
}

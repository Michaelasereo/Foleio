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

const aboutDescription =
  'Foleio is Africa’s number one creator monetization platform — shareable link, bookings, shop, and Paystack payouts to Nigerian banks.';

export const metadata: Metadata = {
  title: 'About Foleio — Bookings, Shop & Payouts for Creators',
  description: aboutDescription,
  keywords: [
    'Foleio',
    'creator monetization Africa',
    'Nigerian creator platform',
    'book services Nigeria',
    'creator shop Nigeria',
    'Paystack creator payouts',
  ],
  openGraph: {
    title: 'About Foleio — Built for African Creators',
    description: aboutDescription,
    url: 'https://foleio.com/about',
    siteName: 'Foleio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Foleio',
    description: aboutDescription,
  },
  alternates: {
    canonical: 'https://foleio.com/about',
  },
};

export const dynamic = 'force-static';

export default function AboutPage() {
  const freeFee = formatFreeFeeLabel();
  const proFee = formatProFeeLabel();
  const proMonthly = formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.monthly);
  const proQuarterly = formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.quarterly);
  const freeFeatures = freePlanFeatureBullets();
  const proFeatures = proPlanFeatureBullets().filter((f) => f !== 'Everything on Free');

  return (
    <MarketingShell activePath="/about">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Foleio',
            url: 'https://foleio.com',
            logo: 'https://foleio.com/logo.png',
            description: aboutDescription,
            foundingDate: '2026',
            foundingLocation: 'Lagos, Nigeria',
            sameAs: [
              'https://instagram.com/foleiohq',
              'https://x.com/foleiohq',
              'https://tiktok.com/@foleiohq',
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              email: 'hello@foleio.com',
              contactType: 'customer support',
            },
          }),
        }}
      />

      <MarketingHero
        eyebrow={BRAND_CLAIM}
        title="Your work. Your world. Your Foleio."
        subtitle="A public business page where clients book your services, buy from your shop, and pay online — with payouts to your Nigerian bank via Paystack."
      />

      <section className="foleio-mkt-section">
        <div className="foleio-mkt-section-inner foleio-mkt-grid-2">
          <div>
            <p className="foleio-mkt-eyebrow">Our mission</p>
            <h2>Every creator should run their business from one link.</h2>
            <p className="foleio-mkt-body mb-4">
              Spreadsheets, DMs, and scattered payment links make it hard to look
              professional and get paid on time. Foleio puts your profile, bookings,
              shop, and payouts in one place.
            </p>
            <p className="foleio-mkt-body">
              You share your Foleio link. Clients book or buy. Money settles to your
              bank. You stay in control of prices, availability, and policy.
            </p>
          </div>
          <div className="foleio-mkt-grid-2" style={{ gridTemplateColumns: '1fr' }}>
            {[
              ['Built for Nigeria', 'Naira payments, Nigerian banks, Paystack payouts.'],
              [
                'One public page',
                'Bookings, shop, and portfolio on a link you control.',
              ],
              [
                'Everything in one place',
                'Services, products, deposits, and earnings — no tool juggling.',
              ],
            ].map(([title, desc]) => (
              <div key={title} className="foleio-mkt-card">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="foleio-mkt-section" style={{ paddingTop: 0 }}>
        <div className="foleio-mkt-section-inner">
          <div className="mb-10 text-center">
            <p className="foleio-mkt-eyebrow">What you get</p>
            <h2>Shipped today for creator businesses</h2>
          </div>
          <div className="foleio-mkt-grid-3 mb-4">
            {[
              [
                '01',
                'Public profile',
                'A branded Foleio link clients open to book or buy — share it on Instagram, WhatsApp, or TikTok.',
              ],
              [
                '02',
                'Bookings',
                'Services, availability, deposits and balances, tracking, and booking policy — get paid upfront.',
              ],
              [
                '03',
                'Shop',
                'Sell physical products with delivery and preorders. Pro unlocks digital downloads, gift cards, coupons, and conditional free delivery.',
              ],
            ].map(([num, title, desc]) => (
              <div key={num} className="foleio-mkt-card">
                <p className="foleio-mkt-muted mb-3 text-sm font-medium tracking-wide">
                  {num}
                </p>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <div className="foleio-mkt-grid-3">
            {[
              [
                'Portfolio & reviews',
                'Show your work on Free. Pro adds named portfolio categories and up to 10 customer reviews on your page.',
              ],
              [
                'Get paid in Naira',
                'Paystack settles your share to your linked Nigerian bank — typically next business day.',
              ],
              [
                'Pro discoverability',
                'Pro creators can appear on Top Creators and get listed for Google search.',
              ],
            ].map(([title, desc]) => (
              <div key={title} className="foleio-mkt-card">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="foleio-mkt-section" style={{ paddingTop: 0 }}>
        <div className="foleio-mkt-section-inner">
          <div className="mb-10 text-center">
            <p className="foleio-mkt-eyebrow">For clients</p>
            <h2>Book and buy from creators you trust</h2>
            <p className="foleio-mkt-muted mx-auto mt-3 max-w-xl text-sm leading-relaxed">
              Open a creator&apos;s Foleio page to book their time or shop their
              products — pay securely with Paystack.
            </p>
          </div>
          <div className="foleio-mkt-grid-2">
            {[
              [
                'Book their time',
                'Pick a service, choose a slot, and pay a deposit or full amount online.',
              ],
              [
                'Shop their products',
                'Order physical goods with delivery, or download digital PDFs from Pro sellers.',
              ],
              [
                'Clear policies',
                'Read booking policy before you pay so expectations are clear.',
              ],
              [
                'Pay with Paystack',
                'Card, bank, and other Paystack channels — built for Nigerian commerce.',
              ],
            ].map(([title, desc]) => (
              <div key={title} className="foleio-mkt-card">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="foleio-mkt-section" style={{ paddingTop: 0 }}>
        <div className="foleio-mkt-section-narrow text-center">
          <p className="foleio-mkt-eyebrow">Pricing</p>
          <h2>Free to start. Pro when you scale.</h2>
          <p className="foleio-mkt-body mb-10">
            Foleio takes a platform &amp; service fee on each payment. Upgrade to Pro
            for a lower fee and more tools — including reviews, gift cards, digital
            downloads, and Top Creators listing.
          </p>
          <div className="foleio-mkt-grid-2 text-left">
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
          <p className="mt-8">
            <Link href="/pricing" className="foleio-mkt-btn-ghost" style={{ marginLeft: 0 }}>
              See full pricing
            </Link>
          </p>
        </div>
      </section>

      <section className="foleio-mkt-section" style={{ paddingTop: 0 }}>
        <div className="foleio-mkt-section-narrow">
          <p className="foleio-mkt-eyebrow">Our story</p>
          <h2>Built for how creators actually get paid.</h2>
          <div className="foleio-mkt-body space-y-5 mt-6">
            <p>
              African creators build audiences every day — on Instagram, TikTok,
              WhatsApp, and beyond. Turning that attention into bookings and sales
              should not require five apps and unclear payouts.
            </p>
            <p>
              Foleio started from a simple question: what if your business page,
              bookings, shop, and bank payouts lived in one place built for how you
              actually work?
            </p>
            <p>
              We launched in 2026 from Lagos and we&apos;re shipping the tools
              creators use every day — then growing discoverability for Pro so more
              clients can find you.
            </p>
          </div>
        </div>
      </section>

      <section className="foleio-mkt-section" style={{ paddingTop: 0 }}>
        <div className="foleio-mkt-section-narrow">
          <p className="foleio-mkt-eyebrow">The team</p>
          <h2>Two people. One mission.</h2>
          <p className="foleio-mkt-body mb-8 mt-4">
            Foleio is intentionally small right now. We ship fast, listen to creators,
            and grow the team when the product earns it.
          </p>
          <div className="foleio-mkt-grid-2">
            {[
              {
                initial: 'F',
                role: 'Co-founder',
                focus: 'Product & Vision',
                description:
                  'Obsessed with tools that actually work for African creators. Based in Lagos.',
              },
              {
                initial: 'E',
                role: 'Co-founder',
                focus: 'Engineering',
                description:
                  'Building the infrastructure behind every booking, order, and payout.',
              },
            ].map((member) => (
              <div key={member.focus} className="foleio-mkt-card">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#2b2b2b] text-sm font-medium text-[#fafafa]">
                  {member.initial}
                </div>
                <p className="foleio-mkt-eyebrow" style={{ marginBottom: 4 }}>
                  {member.role}
                </p>
                <h3>{member.focus}</h3>
                <p>{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingCta />
    </MarketingShell>
  );
}

import type { Metadata } from 'next';
import { SiteChrome } from '@/components/site/SiteChrome';
import { Reveal } from '@/components/landing/Reveal';
import { Italic, LogoMark, Pill, frame } from '@/components/landing/ui';
import {
  PLATFORM_FEE_FLAT_KOBO,
  PLATFORM_FEE_PERCENT,
  PLATFORM_PLAN_AMOUNTS_KOBO,
  formatPlanPrice,
} from '@/lib/billing/platform-plans';

const description =
  'Foleio pricing: Free is ₦0 a month. Pro is ₦3,000 a month or ₦7,500 a quarter, with a lower fee on every payment.';

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

const heading =
  'text-[clamp(36px,4.4vw,56px)] font-[450] leading-[1.02] tracking-[-0.045em] text-[#1c1b19]';

const AMOUNTS = [20_000, 50_000, 100_000, 200_000];

function feeFor(amount: number, percent: number) {
  const flat = PLATFORM_FEE_FLAT_KOBO.free / 100;
  return Math.round((amount * percent) / 100 + flat);
}

const COMPARE: { label: string; free: string; pro: string }[] = [
  { label: 'Price', free: '₦0', pro: '₦3,000 a month, or ₦7,500 a quarter' },
  {
    label: 'Fee per transaction',
    free: `${PLATFORM_FEE_PERCENT.free}% + ₦${PLATFORM_FEE_FLAT_KOBO.free / 100}`,
    pro: `${PLATFORM_FEE_PERCENT.pro}% + ₦${PLATFORM_FEE_FLAT_KOBO.pro / 100}`,
  },
  { label: 'Public page, bookings, and shop', free: 'Yes', pro: 'Yes' },
  { label: 'Services', free: 'Up to 10', pro: 'Unlimited' },
  { label: 'Products', free: 'Up to 10, with 5 preorders', pro: 'Unlimited' },
  { label: 'Photos per product', free: '3', pro: '5' },
  { label: 'Portfolio', free: '1 gallery', pro: 'Up to 3 categories' },
  { label: 'Customer reviews', free: 'Up to 3', pro: 'Up to 10' },
  { label: 'Custom quotes', free: 'Yes', pro: 'Yes' },
  { label: 'Paystack payouts to your bank', free: 'Yes', pro: 'Yes' },
  { label: 'Digital PDF downloads', free: '—', pro: 'Yes' },
  { label: 'Gift cards and coupon codes', free: '—', pro: 'Yes' },
  { label: 'Conditional free delivery', free: '—', pro: 'Yes' },
  { label: 'Schedule templates', free: '—', pro: 'Yes' },
  { label: 'Top Creators and Google listing', free: '—', pro: 'Yes' },
];

const QUESTIONS = [
  {
    q: 'When does Pro cost less than Free?',
    a: 'The lower fee covers the ₦3,000 monthly price once you take about ₦180,000 in a month. Below that, Free costs you less.',
  },
  {
    q: 'Is there a processing fee on top?',
    a: 'No. Foleio takes one platform fee per payment. There is no separate processing fee on top.',
  },
  {
    q: 'How do I get paid?',
    a: 'Your share of each payment settles to the Nigerian bank account you link, typically the next business day.',
  },
  {
    q: 'Can I cancel Pro?',
    a: 'Any time. You keep Pro until the end of the period you have paid for, then move back to Free.',
  },
] as const;

const proMonthly = formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.monthly);
const proQuarterly = formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.quarterly);

export default function PricingPage() {
  const rows = AMOUNTS.map((amount) => {
    const freeFee = feeFor(amount, PLATFORM_FEE_PERCENT.free);
    const proFee = feeFor(amount, PLATFORM_FEE_PERCENT.pro);
    return {
      amount,
      freeKeep: amount - freeFee,
      proKeep: amount - proFee,
      freeFee,
      proFee,
      more: proFee < freeFee ? freeFee - proFee : 0,
    };
  });

  return (
    <SiteChrome active="/pricing">
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
              { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'NGN' },
              {
                '@type': 'Offer',
                name: 'Pro Monthly',
                price: String(PLATFORM_PLAN_AMOUNTS_KOBO.pro.monthly / 100),
                priceCurrency: 'NGN',
              },
              {
                '@type': 'Offer',
                name: 'Pro Quarterly',
                price: String(PLATFORM_PLAN_AMOUNTS_KOBO.pro.quarterly / 100),
                priceCurrency: 'NGN',
              },
            ],
          }),
        }}
      />
      <main>
        <Reveal>
          <section className={`${frame} pb-6 pt-12 sm:pt-16`}>
            <h1 className={`max-w-[720px] ${heading}`}>
              Free to start.
              <Italic block>One fee, nothing hidden.</Italic>
            </h1>
            <p className="mt-5 max-w-[560px] text-[17px] leading-[1.55] text-[#55544f]">
              No setup cost, and no separate processing fee on top. Foleio takes one fee on each
              payment. Pro lowers that fee. Upgrade when the lower fee saves you money.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section className={`${frame} grid gap-4 py-8 lg:grid-cols-2`}>
            <article className="flex flex-col rounded-[28px] bg-[#f3f1ec] p-6 sm:p-8">
              <p className="text-[14px] text-[#6b6a64]">Free</p>
              <p className="mt-2 text-[15px] text-[#55544f]">Everything you need to get booked.</p>
              <p className="mt-6 text-[56px] font-[450] leading-none tracking-[-0.05em]">₦0</p>
              <p className="mt-2 text-[14px] text-[#6b6a64]">
                {PLATFORM_FEE_PERCENT.free}% + ₦{PLATFORM_FEE_FLAT_KOBO.free / 100} per transaction
              </p>
              <ul className="mt-6 space-y-2 text-[15px] text-[#3b3a36]">
                <li>Public page, bookings, and shop</li>
                <li>Up to 10 services and 10 products</li>
                <li>One portfolio gallery</li>
                <li>Custom quotes and a booking policy</li>
                <li>Paystack payouts to your bank</li>
              </ul>
              <div className="mt-8">
                <Pill href="/signup" className="min-h-[46px] px-[22px] text-[16px]">
                  Start for free
                </Pill>
              </div>
            </article>
            <article className="flex flex-col rounded-[28px] bg-[#131210] p-6 text-white sm:p-8">
              <p className="text-[14px] text-white/60">Pro</p>
              <p className="mt-2 text-[15px] text-white/70">A lower fee. More room to sell.</p>
              <p className="mt-6 text-[56px] font-[450] leading-none tracking-[-0.05em]">{proMonthly}</p>
              <p className="mt-2 text-[14px] text-white/60">a month, or {proQuarterly} a quarter</p>
              <p className="mt-1 text-[14px] text-white/60">
                {PLATFORM_FEE_PERCENT.pro}% + ₦{PLATFORM_FEE_FLAT_KOBO.pro / 100} per transaction
              </p>
              <ul className="mt-6 space-y-2 text-[15px] text-white/85">
                <li>Everything on Free</li>
                <li>Unlimited services and products</li>
                <li>PDF downloads, gift cards, and coupons</li>
                <li>Up to 10 reviews and 3 portfolio categories</li>
                <li>Top Creators and Google listing</li>
              </ul>
              <div className="mt-8">
                <Pill href="/signup" tone="light" className="min-h-[46px] px-[22px] text-[16px]">
                  Start for free, upgrade any time
                </Pill>
              </div>
            </article>
          </section>
        </Reveal>

        <Reveal>
          <p className={`${frame} pb-10 text-[15px] text-[#6b6a64]`}>
            Once you take about ₦180,000 in a month, the lower fee covers Pro. Until then, Free
            costs you less.
          </p>
        </Reveal>

        <Reveal>
          <section className={`${frame} pb-16`}>
            <h2 className={heading}>
              What you keep <Italic>from each payment.</Italic>
            </h2>
            <p className="mt-4 max-w-[640px] text-[15px] leading-[1.55] text-[#6b6a64]">
              The fee comes off before the money settles to you. This is a completed payment with a
              ₦{PLATFORM_FEE_FLAT_KOBO.free / 100} flat fee included.
            </p>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-[#e6e3dc] text-[#8a877f]">
                    <th className="py-3 pr-4 font-medium">A client pays</th>
                    <th className="py-3 pr-4 font-medium">You keep on Free</th>
                    <th className="py-3 pr-4 font-medium">You keep on Pro</th>
                    <th className="py-3 pr-4 font-medium">Free fee</th>
                    <th className="py-3 pr-4 font-medium">Pro fee</th>
                    <th className="py-3 font-medium">You keep more</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.amount} className="border-b border-[#eeeae4]">
                      <td className="py-3.5 pr-4">₦{row.amount.toLocaleString('en-NG')}</td>
                      <td className="py-3.5 pr-4">₦{row.freeKeep.toLocaleString('en-NG')}</td>
                      <td className="py-3.5 pr-4">₦{row.proKeep.toLocaleString('en-NG')}</td>
                      <td className="py-3.5 pr-4 text-[#6b6a64]">₦{row.freeFee.toLocaleString('en-NG')}</td>
                      <td className="py-3.5 pr-4 text-[#6b6a64]">₦{row.proFee.toLocaleString('en-NG')}</td>
                      <td className="py-3.5">₦{row.more.toLocaleString('en-NG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className={`${frame} pb-16`}>
            <h2 className={heading}>
              Free and Pro, <Italic>side by side.</Italic>
            </h2>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
                <thead>
                  <tr className="border-b border-[#e6e3dc] text-[#8a877f]">
                    <th className="py-3 pr-4 font-medium" />
                    <th className="py-3 pr-4 font-medium">Free</th>
                    <th className="py-3 font-medium">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.label} className="border-b border-[#eeeae4]">
                      <td className="py-3.5 pr-4">{row.label}</td>
                      <td className="py-3.5 pr-4 text-[#6b6a64]">{row.free}</td>
                      <td className="py-3.5">{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className={`${frame} grid gap-8 pb-8 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]`}>
            <h2 className={heading}>
              Pricing questions, <Italic>answered.</Italic>
            </h2>
            <div>
              {QUESTIONS.map((item) => (
                <div key={item.q} className="border-b border-[#e6e3dc] py-5">
                  <h3 className="text-[16px] font-semibold">{item.q}</h3>
                  <p className="mt-2 text-[15px] leading-[1.55] text-[#6b6a64]">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className={`${frame} px-6 pb-20 pt-16 text-center`}>
            <LogoMark className="mx-auto h-14 w-14" />
            <h2 className={`mx-auto mt-6 max-w-[560px] ${heading}`}>
              Start free.
              <Italic block>Upgrade when you are ready.</Italic>
            </h2>
            <p className="mx-auto mt-4 max-w-[420px] text-[16px] leading-[1.5] text-[#6b6a64]">
              Create your page. The fee only comes off when a client pays you.
            </p>
            <div className="mt-7">
              <Pill href="/signup" className="min-h-[46px] px-[22px] text-[16px]">
                Start for free
              </Pill>
            </div>
            <p className="mt-10 text-[20px]">
              <Italic>Your work. Your world. Your Foleio.</Italic>
            </p>
          </section>
        </Reveal>
      </main>
    </SiteChrome>
  );
}

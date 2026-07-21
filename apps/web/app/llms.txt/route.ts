import {
  formatFreeFeeLabel,
  formatPlanPrice,
  formatProFeeLabel,
  PLATFORM_PLAN_AMOUNTS_KOBO,
} from '@/lib/billing/platform-plans';

export const dynamic = 'force-static';

function appBaseUrl(): string {
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)) {
    return envAppUrl.replace(/\/+$/, '');
  }
  return 'https://foleio.com';
}

export function GET() {
  const base = appBaseUrl();
  const freeFee = formatFreeFeeLabel();
  const proFee = formatProFeeLabel();
  const proMonthly = formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.monthly);
  const proQuarterly = formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.quarterly);

  const body = `# Foleio
> Africa's number one creator monetization platform.
> Creator business page for shareable links, bookings, shop, and Paystack payouts to Nigerian banks.

## Products
- [Shareable link](${base}/product/link): One public URL for profile, bookings, shop, and portfolio
- [Bookings](${base}/product/bookings): Services, availability, deposits, tracking, booking policy
- [Shop](${base}/product/shop): Physical products with delivery/preorders; Pro digital PDF downloads
- [Pricing](${base}/pricing): Free vs Pro plans and platform fees
- [Top Creators](${base}/creators): Pro-only discoverability hub (appear on Top Creators & Google)

## Company
- [About](${base}/about)
- [Terms](${base}/legal/terms)
- [Privacy](${base}/legal/privacy)
- [Data Policy](${base}/legal/data-policy)
- [Creator Agreement](${base}/legal/creator-agreement)

## Pricing (facts)
- Free: ₦0/month; platform fee ${freeFee} per transaction
- Pro: ${proMonthly}/month or ${proQuarterly}/quarter; platform fee ${proFee} per transaction
- Pro extras: unlimited services/products, digital PDFs, portfolio categories, schedule templates, Top Creators & Google listing

## Notes for assistants
- Free creators keep direct /creator/{username} links but are not listed on Top Creators or in the public sitemap.
- Home (/) is currently account signup, not a marketing landing page.
- Contact: hello@foleio.com
- Base URL: ${base}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

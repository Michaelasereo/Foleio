import type { Metadata } from 'next';
import { Lock } from 'lucide-react';
import { ProductStory } from '@/components/site/ProductStory';
import { SiteChrome } from '@/components/site/SiteChrome';
import { Italic } from '@/components/landing/ui';

const description =
  'Sell physical products with stock, delivery options, and preorders. Pro adds PDF downloads, gift cards, coupon codes, and conditional free delivery.';

export const metadata: Metadata = {
  title: 'A shop on the same link as your services | Foleio',
  description,
  openGraph: {
    title: 'A shop on the same link as your services | Foleio',
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
    <SiteChrome active="/product/shop">
      <ProductStory
        eyebrow="Shop"
        title={
          <>
            A shop on the <Italic>same link as your services.</Italic>
          </>
        }
        lede="Sell physical products with stock, delivery options, and preorders. Pro adds PDF downloads, gift cards, coupon codes, and conditional free delivery."
        stepsTitle={
          <>
            Sell products <Italic>on your page.</Italic>
          </>
        }
        steps={[
          {
            title: 'Physical products',
            body: 'List each item with a price, stock, photos, and a description. Take preorders when you make to order.',
          },
          {
            title: 'Delivery your way',
            body: 'Charge a flat rate by area, deliver free, offer pickup, or let the buyer send their own rider.',
          },
          {
            title: 'Paid to your bank',
            body: 'Orders are paid through Paystack and settle to your Nigerian bank account, typically the next business day.',
          },
        ]}
        compareTitle={
          <>
            What is on Free, <Italic>and what Pro adds.</Italic>
          </>
        }
        compareLede="Free is ₦0 a month. Pro is ₦3,000 a month or ₦7,500 a quarter, with a lower fee on every payment."
        rows={[
          {
            title: 'Products',
            body: 'Up to 10 on Free, unlimited on Pro.',
            free: 'Free · more on Pro',
          },
          {
            title: 'Photos',
            body: 'Up to 3 photos on Free, or 5 on Pro.',
            free: 'Free · more on Pro',
          },
          {
            title: 'Preorders',
            body: 'Take payment now and ship on the date you set. Up to 5 preorders on Free.',
            free: 'Free',
          },
          {
            title: 'Delivery options',
            body: 'Flat rate, free delivery, pickup, or delivery the buyer arranges.',
            free: 'Free',
          },
          {
            title: 'Orders',
            body: 'See what has been paid and what is still to deliver.',
            free: 'Free',
          },
          {
            title: 'Digital PDF downloads',
            body: 'Sell guides, templates, and other files.',
            free: 'Pro',
            pro: true,
          },
          {
            title: 'Gift cards and coupon codes',
            body: 'Give buyers a reason to come back.',
            free: 'Pro',
            pro: true,
          },
          {
            title: 'Conditional free delivery',
            body: 'Free delivery once an order passes an amount or a quantity.',
            free: 'Pro',
            pro: true,
          },
        ]}
        closeTitle={
          <>
            Open <Italic>your shop.</Italic>
          </>
        }
        closeLede="Add products to your page and start selling."
        preview={<ShopPreview />}
      />
    </SiteChrome>
  );
}

function ShopPreview() {
  const lines = [
    ['Lago set (preorder)', '₦15,000'],
    ['Quantity', '1'],
    ['Delivery · Lagos', '₦1,000'],
  ] as const;

  return (
    <div className="rounded-[28px] bg-[#f3f1ec] p-3 sm:p-4">
      <div className="rounded-[22px] bg-white p-4 shadow-[0_16px_40px_-28px_rgba(28,27,25,0.45)]">
        <ul>
          {lines.map(([label, value]) => (
            <li key={label} className="flex items-center justify-between py-2 text-[14px]">
              <span className="text-[#6b6a64]">{label}</span>
              <span>{value}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between border-t border-[#eeeae4] pt-3 text-[15px] font-semibold">
          <span>Total</span>
          <span>₦16,000</span>
        </div>
        <div className="mt-4 rounded-full bg-[#131210] px-4 py-3 text-center text-[14px] font-medium text-white">
          Pay ₦16,000
        </div>
        <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-[#6b6a64]">
          <Lock aria-hidden="true" size={12} strokeWidth={1.75} />
          Secured
        </div>
      </div>
    </div>
  );
}

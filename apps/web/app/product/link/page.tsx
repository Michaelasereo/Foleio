import type { Metadata } from 'next';
import { PublicLinkShot } from '@/components/landing/PublicLinkShot';
import { Italic } from '@/components/landing/ui';
import { publicLinkPreview } from '@/lib/landing/amata-preview';
import { ProductStory } from '@/components/site/ProductStory';
import { SiteChrome } from '@/components/site/SiteChrome';

const description =
  'One Foleio link for your profile, services, shop, and portfolio. Share it on Instagram, WhatsApp, or TikTok. Clients open it, choose what they want, and pay online.';

export const metadata: Metadata = {
  title: 'One link for everything you sell | Foleio',
  description,
  openGraph: {
    title: 'One link for everything you sell | Foleio',
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
    <SiteChrome active="/product/link">
      <ProductStory
        eyebrow="Link"
        title={
          <>
            One link for <Italic>everything you sell.</Italic>
          </>
        }
        lede="Your profile, services, shop, and portfolio on one page you control. Share it on Instagram, WhatsApp, or TikTok. Clients open it, choose what they want, and pay online."
        stepsTitle={
          <>
            Share your link. <Italic>Get booked.</Italic>
          </>
        }
        steps={[
          {
            title: 'One page with your name on it',
            body: 'foleio.com/creator/yourname replaces the DMs, the price list in your highlights, and the payment links.',
          },
          {
            title: 'Book or buy without leaving',
            body: 'Clients book a service or buy a product on your page and pay with Paystack. They do not need an account.',
          },
          {
            title: 'Your work, next to your prices',
            body: 'A portfolio gallery and customer reviews sit beside your services and shop.',
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
            title: 'Profile',
            body: 'Your photo, bio, and location at the top of the page.',
            free: 'Free',
          },
          {
            title: 'Services and prices',
            body: 'Clients see what you offer and what it costs before they message you.',
            free: 'Free',
          },
          {
            title: 'Shop on the same page',
            body: 'Your products sit beside your services.',
            free: 'Free',
          },
          {
            title: 'Portfolio',
            body: 'One gallery on Free. Up to 3 named categories on Pro.',
            free: 'Free · more on Pro',
          },
          {
            title: 'Reviews',
            body: 'Up to 3 customer reviews on your page, or 10 on Pro.',
            free: 'Free · more on Pro',
          },
          {
            title: 'Booking policy',
            body: 'Clients see your policy before they pay.',
            free: 'Free',
          },
          {
            title: 'Top Creators and Google listing',
            body: 'Get listed on the Foleio marketplace and in Google search.',
            free: 'Pro',
            pro: true,
          },
        ]}
        closeTitle={
          <>
            Claim your <Italic>Foleio link.</Italic>
          </>
        }
        closeLede="Create your page in a few minutes and start sharing it."
        preview={<LinkPreview />}
      />
    </SiteChrome>
  );
}

function LinkPreview() {
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_rgba(19,18,16,0.06),0_24px_50px_-28px_rgba(19,18,16,0.35)]">
      <div className="flex h-11 items-center justify-center border-b border-[#efeee9] px-4">
        <div className="flex h-7 max-w-full items-center rounded-full border border-[#ebeae5] px-4 text-[12px] text-[#55544f]">
          foleio.com/creator/amatathelabel
        </div>
      </div>
      <PublicLinkShot preview={publicLinkPreview} />
    </div>
  );
}

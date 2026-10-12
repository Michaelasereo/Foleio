import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteChrome } from '@/components/site/SiteChrome';
import { Reveal } from '@/components/landing/Reveal';
import { Italic, LogoMark, Pill, frame } from '@/components/landing/ui';

const description =
  'A public business page where clients book your services, buy from your shop, and pay online. The money settles to your Nigerian bank.';

export const metadata: Metadata = {
  title: 'About Foleio',
  description,
  openGraph: {
    title: 'About Foleio',
    description,
    url: 'https://foleio.com/about',
    siteName: 'Foleio',
    type: 'website',
  },
  alternates: { canonical: 'https://foleio.com/about' },
};

export const dynamic = 'force-static';

const heading =
  'text-[clamp(36px,4.4vw,56px)] font-[450] leading-[1.02] tracking-[-0.045em] text-[#1c1b19]';

const CLIENTS = [
  {
    title: 'Book their time',
    body: 'Pick a service, choose a slot, and pay a deposit or the full amount online.',
  },
  {
    title: 'Shop their products',
    body: 'Order something made to order, with delivery, or download a file they sell.',
  },
  {
    title: 'Clear policy',
    body: 'Read how they handle a cancellation or a refund before you pay, so you know where you stand.',
  },
  {
    title: 'Pay with Paystack',
    body: 'Cards, bank transfer, and other Paystack channels. No Foleio account needed.',
  },
] as const;

const FOUNDERS = [
  {
    initial: 'F',
    role: 'Co-founder',
    focus: 'Product and vision',
    body: 'Obsessed with tools that actually work for African creators. Based in Lagos.',
  },
  {
    initial: 'E',
    role: 'Co-founder',
    focus: 'Engineering',
    body: 'Building the infrastructure behind every booking, order, and payout.',
  },
] as const;

export default function AboutPage() {
  return (
    <SiteChrome active="/about">
      <main>
        <Reveal>
          <section className={`${frame} pb-8 pt-12 text-center sm:pt-16`}>
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#8a877f]">About</p>
            <h1 className={`mx-auto mt-4 max-w-[760px] ${heading}`}>
              Your work. Your world.
              <Italic block>Your Foleio.</Italic>
            </h1>
            <p className="mx-auto mt-5 max-w-[520px] text-[17px] leading-[1.55] text-[#55544f]">
              {description}
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section className={`${frame} grid items-start gap-8 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]`}>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#8a877f]">Our mission</p>
              <h2 className={`mt-3 ${heading}`}>
                Every creator should run their business <Italic>from one link.</Italic>
              </h2>
              <div className="mt-5 max-w-[520px] space-y-4 text-[16px] leading-[1.6] text-[#55544f]">
                <p>
                  Screenshots, DMs, and scattered payment links make it hard to look professional
                  and get paid on time. Foleio puts your profile, bookings, shop, and payouts in
                  one place.
                </p>
                <p>
                  You share your link. Clients book or buy. The money settles to your bank. You
                  stay in control of your prices, your availability, and your policy.
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              {[
                ['Built for Nigeria', 'Naira prices, Nigerian banks, payments by Paystack.'],
                ['One public page', 'Bookings, shop, and portfolio on a link you control.'],
                ['Everything in one place', 'Services, products, deposits, and earnings, without hopping tools.'],
              ].map(([title, body]) => (
                <article key={title} className="rounded-[18px] bg-[#f3f1ec] px-5 py-4">
                  <h3 className="text-[16px] font-semibold">{title}</h3>
                  <p className="mt-1 text-[14px] leading-[1.45] text-[#6b6a64]">{body}</p>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className={`${frame} py-6`}>
            <div className="grid gap-8 rounded-[28px] bg-[#131210] px-6 py-8 text-white sm:px-10 sm:py-10 lg:grid-cols-2">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/50">Our story</p>
                <h2 className="mt-3 text-[clamp(28px,3vw,40px)] font-[450] leading-[1.1] tracking-[-0.04em]">
                  Built for how creators <Italic>actually get paid.</Italic>
                </h2>
              </div>
              <div className="space-y-4 text-[15px] leading-[1.6] text-white/75">
                <p>
                  African creators build audiences every day on Instagram, TikTok, and WhatsApp.
                  Turning that attention into bookings and sales should not take five apps and a
                  payout you cannot predict.
                </p>
                <p>
                  Foleio started from one question: what if your business page, bookings, shop, and
                  bank payouts lived in one place, built for how you actually work?
                </p>
                <p>
                  We launched from Lagos in 2026. We are building the tools creators use every day,
                  then helping more clients find them.
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className={`${frame} py-16`}>
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#8a877f]">For clients</p>
            <h2 className={`mt-3 max-w-[560px] ${heading}`}>
              Book and buy from <Italic>creators you trust.</Italic>
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CLIENTS.map((item) => (
                <article key={item.title}>
                  <h3 className="text-[16px] font-semibold">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.5] text-[#6b6a64]">{item.body}</p>
                </article>
              ))}
            </div>
            <Link href="/creators" className="mt-8 inline-flex text-[15px] text-[#1c1b19]">
              Browse creators →
            </Link>
          </section>
        </Reveal>

        <Reveal>
          <section className={`${frame} pb-8`}>
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#8a877f]">Founders</p>
            <h2 className={`mt-3 ${heading}`}>
              The people <Italic>behind Foleio.</Italic>
            </h2>
            <p className="mt-4 max-w-[520px] text-[16px] leading-[1.55] text-[#55544f]">
              Foleio is built in Lagos by its two founders, close to the creators who use it.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {FOUNDERS.map((person) => (
                <article key={person.focus} className="rounded-[22px] bg-[#f3f1ec] p-6">
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#8a877f]">{person.role}</p>
                  <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1c1b19] text-[18px] text-white">
                    {person.initial}
                  </div>
                  <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">{person.focus}</h3>
                  <p className="mt-2 text-[14px] leading-[1.5] text-[#6b6a64]">{person.body}</p>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className={`${frame} px-6 pb-20 pt-16 text-center`}>
            <LogoMark className="mx-auto h-14 w-14" />
            <h2 className={`mx-auto mt-6 max-w-[560px] ${heading}`}>
              Ready to run your <Italic>creator business?</Italic>
            </h2>
            <p className="mx-auto mt-4 max-w-[420px] text-[16px] leading-[1.5] text-[#6b6a64]">
              Set up your page, add services or products, connect your bank, and share your link.
            </p>
            <div className="mt-7">
              <Pill href="/signup" className="min-h-[46px] px-[22px] text-[16px]">
                Start for free
              </Pill>
            </div>
            <p className="mt-4 text-[13px] text-[#8a877f]">
              Free plan. ₦0 a month. Upgrade only when it saves you money.
            </p>
            <p className="mt-10 text-[20px]">
              <Italic>Your work. Your world. Your Foleio.</Italic>
            </p>
          </section>
        </Reveal>
      </main>
    </SiteChrome>
  );
}

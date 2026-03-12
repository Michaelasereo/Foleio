import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Foleio — The Creator Platform for Nigerians',
  description:
    'Foleio is the monetisation platform built for Nigerian creators and diaspora Nigerians in the US, UK, and Canada. Sell content, offer services, and build a business from your creativity.',
  keywords: [
    'Foleio',
    'Nigerian creator platform',
    'monetise content Nigeria',
    'Nigerian diaspora creators',
    'creator economy Nigeria',
    'sell content online Nigeria',
    'Nigerian influencer platform',
  ],
  openGraph: {
    title: 'About Foleio — Built for Nigerian Creators',
    description: 'The monetisation platform for Nigerian creators everywhere.',
    url: 'https://foleio.com/about',
    siteName: 'Foleio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Foleio',
    description: 'The monetisation platform for Nigerian creators everywhere.',
  },
  alternates: {
    canonical: 'https://foleio.com/about',
  },
};

export const dynamic = 'force-static';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Foleio',
            url: 'https://foleio.com',
            logo: 'https://foleio.com/logo.png',
            description:
              'Foleio is the monetisation platform built for Nigerian creators and diaspora Nigerians in the US, UK, and Canada.',
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

      <nav className="border-b border-stone-100 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a
            href="/"
            className="text-2xl font-bold text-[#F97316]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            foleio.
          </a>
          <a
            href="/signup"
            className="rounded-full bg-[#F97316] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Start for free
          </a>
        </div>
      </nav>

      <section className="bg-[#F5F0E8] px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-block rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#F97316]">
            Built in Lagos. Built for the world.
          </div>
          <h1
            className="mb-6 text-5xl font-bold leading-tight text-[#1C1008] md:text-6xl"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            The home Nigerian creators
            <span className="text-[#F97316]"> deserve.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-stone-600">
            Foleio is the monetisation platform built specifically for Nigerian creators
            — whether you&apos;re in Lagos, London, Houston, or Toronto. Sell your
            content, offer your services, and build a real business from your
            creativity.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-4xl items-center gap-12 md:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#F97316]">
              Our Mission
            </p>
            <h2
              className="mb-6 text-4xl font-bold leading-tight text-[#1C1008]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Every Nigerian creator should be able to earn from what they love.
            </h2>
            <p className="mb-4 leading-relaxed text-stone-600">
              The creator economy is worth hundreds of billions of dollars globally
              — but Nigerian creators have been largely locked out. Payment barriers,
              platform restrictions, and tools not built for our reality have made it
              harder than it should be.
            </p>
            <p className="leading-relaxed text-stone-600">
              Foleio changes that. One platform where you can monetise your content,
              run your bookings, set up your shop, and connect with fans — built from
              the ground up for how Nigerian creators actually work.
            </p>
          </div>
          <div className="space-y-6 rounded-3xl bg-[#F5F0E8] p-8">
            {[
              [
                '🇳🇬',
                'Built for Nigeria',
                'Naira payments, Nigerian banks, Nigerian creators first.',
              ],
              [
                '🌍',
                'Diaspora Ready',
                'Nigerian creators in the US, UK, and Canada are fully supported.',
              ],
              [
                '⚡',
                'Everything in one place',
                'Content, services, shop, bookings — no juggling multiple tools.',
              ],
            ].map(([emoji, title, desc]) => (
              <div key={title} className="flex gap-4">
                <span className="shrink-0 text-2xl">{emoji}</span>
                <div>
                  <p className="mb-1 font-bold text-[#1C1008]">{title}</p>
                  <p className="text-sm leading-relaxed text-stone-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#1C1008] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#F97316]">
              For Creators
            </p>
            <h2
              className="text-4xl font-bold text-white"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Everything you need to monetise your audience
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              [
                '01',
                'Upload your content',
                'Videos, PDFs, images. Set your price. Choose who sees it — free, subscribers, or one-time buyers.',
              ],
              [
                '02',
                'Offer your services',
                'Take bookings, coaching sessions, and consultations. Set your availability, get paid upfront.',
              ],
              [
                '03',
                'Open your shop',
                'Sell physical products or digital downloads directly to your fans. No middlemen.',
              ],
            ].map(([num, title, desc]) => (
              <div key={num} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p
                  className="mb-4 text-3xl font-bold text-[#F97316]"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {num}
                </p>
                <h3 className="mb-3 text-lg font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-stone-400">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ['📓', 'Journal', 'Write and publish long-form posts for your community.'],
              ['📊', 'Analytics', 'See who your fans are, what they buy, and how your earnings grow.'],
              ['💳', 'Get paid in Naira', 'Direct payouts to your Nigerian bank account. No complications.'],
            ].map(([emoji, title, desc]) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="shrink-0 text-2xl">{emoji}</span>
                <div>
                  <h3 className="mb-1 font-bold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-stone-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F0E8] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#F97316]">
              For Fans
            </p>
            <h2
              className="text-4xl font-bold text-[#1C1008]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Support the creators you love
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-stone-600">
              Foleio makes it easy to directly support Nigerian creators — wherever
              you are in the world.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              [
                '🔓',
                'Access exclusive content',
                "Subscribe to your favourite creators and unlock videos, PDFs, and more that aren't available anywhere else.",
              ],
              [
                '🛍️',
                'Shop their products',
                'Buy physical products and digital downloads directly from creators. No algorithms, no middlemen.',
              ],
              [
                '📅',
                'Book their time',
                'Book coaching sessions, consultations, or 1-on-1s directly through Foleio.',
              ],
              [
                '🌍',
                'Pay from anywhere',
                'Fans in Nigeria, the US, UK, and Canada can all pay seamlessly through Paystack.',
              ],
            ].map(([emoji, title, desc]) => (
              <div key={title} className="flex gap-4 rounded-2xl bg-white p-6 shadow-sm">
                <span className="shrink-0 text-2xl">{emoji}</span>
                <div>
                  <h3 className="mb-2 font-bold text-[#1C1008]">{title}</h3>
                  <p className="text-sm leading-relaxed text-stone-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#F97316]">
            Pricing
          </p>
          <h2
            className="mb-6 text-4xl font-bold text-[#1C1008]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            We only win when you win.
          </h2>
          <p className="mx-auto mb-12 max-w-xl leading-relaxed text-stone-600">
            Foleio takes just 3% of every transaction. That&apos;s it. No monthly
            fees to start, no hidden charges, no platform tax on your hard work.
            You keep 97% of everything you earn.
          </p>
          <div className="grid gap-6 text-left md:grid-cols-3">
            {[
              ['97%', 'Goes to you', 'Every naira your fans spend, you keep 97 kobo of every 100.'],
              ['3%', 'Foleio fee', "Our only revenue. We grow when you grow — that's the whole model."],
              ['0', 'Hidden fees', 'No setup fees, no monthly platform charge, no surprise deductions.'],
            ].map(([stat, label, desc]) => (
              <div key={label} className="rounded-2xl bg-[#F5F0E8] p-6">
                <p
                  className="mb-1 text-4xl font-bold text-[#F97316]"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {stat}
                </p>
                <p className="mb-2 font-bold text-[#1C1008]">{label}</p>
                <p className="text-sm leading-relaxed text-stone-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F0E8] px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#F97316]">
            Our Story
          </p>
          <h2
            className="mb-8 text-4xl font-bold leading-tight text-[#1C1008]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Built by two people who saw the gap.
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-stone-700">
            <p>
              Nigerian creators are some of the most talented, prolific, and
              entrepreneurial in the world. From Lagos to London to Atlanta,
              they&apos;re building audiences of millions — on Instagram, YouTube,
              TikTok, and beyond.
            </p>
            <p>
              But when it came to actually monetising those audiences? The tools
              weren&apos;t built for them. Payment processors that didn&apos;t support
              Nigerian banks. Platforms that held payouts for weeks. Subscription
              tools that charged in dollars. No single place to bring it all
              together.
            </p>
            <p>
              Foleio started as a simple question:
              <em className="font-semibold text-[#1C1008]">
                {' '}
                what would a creator platform look like if it was built from
                Nigeria, for Nigerians?
              </em>
            </p>
            <p>
              The answer is what you&apos;re looking at. Built in Lagos. Designed
              for the realities of Nigerian creators — whether you&apos;re based at
              home or in the diaspora. We launched in 2026 and we&apos;re just getting
              started.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#F97316]">
            The Team
          </p>
          <h2
            className="mb-4 text-4xl font-bold text-[#1C1008]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Two people. One mission.
          </h2>
          <p className="mb-12 leading-relaxed text-stone-600">
            Foleio is intentionally small right now. We believe in building with
            focus — shipping fast, listening to creators, and not growing the team
            until the product earns it.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                initial: 'F',
                role: 'Co-founder',
                focus: 'Product & Vision',
                description:
                  'Obsessed with building tools that actually work for African creators. Based in Lagos.',
              },
              {
                initial: 'E',
                role: 'Co-founder',
                focus: 'Engineering',
                description:
                  'Building the infrastructure that powers every creator on the platform. Fast and reliable.',
              },
            ].map((member) => (
              <div key={member.focus} className="rounded-2xl bg-[#F5F0E8] p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F97316]/20">
                  <span className="text-lg font-bold text-[#F97316]">{member.initial}</span>
                </div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#F97316]">
                  {member.role}
                </p>
                <p className="mb-2 text-lg font-bold text-[#1C1008]">{member.focus}</p>
                <p className="text-sm leading-relaxed text-stone-600">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#1C1008] px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2
            className="mb-4 text-4xl font-bold text-white"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Ready to build your creator business?
          </h2>
          <p className="mb-8 text-stone-400">
            Join Nigerian creators already using Foleio to monetise their audience
            — in Nigeria and across the diaspora.
          </p>
          <a
            href="/signup"
            className="mb-12 inline-block rounded-full bg-[#F97316] px-8 py-4 text-base font-bold text-white transition-colors hover:bg-orange-600"
          >
            Start for free — it takes 2 minutes
          </a>

          <div className="flex items-center justify-center gap-6 border-t border-white/10 pt-8">
            {[
              ['Instagram', 'https://instagram.com/foleiohq'],
              ['X / Twitter', 'https://x.com/foleiohq'],
              ['TikTok', 'https://tiktok.com/@foleiohq'],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-stone-400 transition-colors hover:text-white"
              >
                {label}
              </a>
            ))}
            <a
              href="mailto:hello@foleio.com"
              className="text-sm font-medium text-stone-400 transition-colors hover:text-white"
            >
              hello@foleio.com
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-100 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
          <a
            href="/"
            className="text-xl font-bold text-[#F97316]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            foleio.
          </a>
          <div className="flex items-center gap-6 text-sm text-stone-500">
            <a href="/about" className="transition-colors hover:text-stone-800">
              About
            </a>
            <a href="/legal/privacy" className="transition-colors hover:text-stone-800">
              Privacy
            </a>
            <a href="/legal/terms" className="transition-colors hover:text-stone-800">
              Terms
            </a>
            <a href="mailto:hello@foleio.com" className="transition-colors hover:text-stone-800">
              Contact
            </a>
          </div>
          <p className="text-sm text-stone-400">© {new Date().getFullYear()} Foleio. Lagos, Nigeria.</p>
        </div>
      </footer>
    </main>
  );
}

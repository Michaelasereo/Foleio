import { AudienceLine } from '@/components/landing/AudienceLine';
import { ClosingCta } from '@/components/landing/ClosingCta';
import { Faq } from '@/components/landing/Faq';
import { FeatureList } from '@/components/landing/FeatureList';
import { Gap } from '@/components/landing/Gap';
import { Hero } from '@/components/landing/Hero';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNav } from '@/components/landing/LandingNav';
import { Pillars } from '@/components/landing/Pillars';
import { Pricing } from '@/components/landing/Pricing';
import { ProductGrid } from '@/components/landing/ProductGrid';
import { Setup } from '@/components/landing/Setup';
import { Steps } from '@/components/landing/Steps';
import { landingSans, landingSerif } from '@/components/landing/fonts';
import styles from '@/components/landing/landing.module.css';
import type { Metadata } from 'next';

const description =
  'Creators get one link to take bookings, sell products while collecting international payments from across the globe.';

const title = 'Foleio | Get paid for your craft';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://foleio.com',
    siteName: 'Foleio',
    type: 'website',
    images: [
      {
        url: 'https://foleio.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Foleio — Creator platform for Nigerians',
      },
      {
        url: 'https://foleio.com/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Foleio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['https://foleio.com/og-image.png'],
  },
};

export default function HomePage() {
  return (
    <div
      id="top"
      className={`${landingSans.variable} ${landingSerif.variable} ${styles.page} foleio-landing`}
    >
      <header className="bg-[linear-gradient(#f2f1ec_0px,#f2f1ec_72%,#ffffff_100%)]">
        <LandingNav />
        <Hero />
      </header>
      <main>
        <AudienceLine />
        <FeatureList />
        <Steps />
        <Gap />
        <Pillars />
        <ProductGrid />
        <Setup />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <footer>
        <LandingFooter />
      </footer>
    </div>
  );
}

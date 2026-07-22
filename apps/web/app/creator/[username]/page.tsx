import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PublicCreatorProfile } from '@/components/creator/PublicCreatorProfile';
import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';
import { serializeForClient } from '@/lib/utils';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import { getPublicCreatorByUsername } from '@/lib/creator/cached-lookups';
import { getPublicReviews } from '@/lib/creator/reviews';
import { isCreatorDiscoverable } from '@/lib/creator/discoverability';
import {
  GallerySectionSkeleton,
  PublicPortfolioSection,
} from '@/components/creator/public/PublicPortfolioSection';
import {
  OfferingsSectionSkeleton,
  PublicOfferingsSection,
} from '@/components/creator/public/PublicOfferingsSection';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const creator = await getPublicCreatorByUsername(username);

  if (!creator) return {};

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const appUrl =
    envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)
      ? envAppUrl.replace(/\/+$/, '')
      : 'https://foleio.com';

  const title = `${creator.displayName} on Foleio`;
  const description =
    creator.bio ||
    `Book ${creator.displayName} or shop their products on Foleio — pay securely with Paystack.`;
  const image = creator.avatarUrl || `${appUrl}/og-default.png`;
  const url = `${appUrl}/creator/${creator.username}`;

  const discoverable = isCreatorDiscoverable({
    isPublic: true,
    platformPlan: creator.platformPlan,
    platformSubscriptionActive: creator.platformSubscriptionActive,
    subscriptionStatus: creator.platformSubscriptions?.[0]?.status ?? null,
    displayName: creator.displayName,
    avatarUrl: creator.avatarUrl,
  });

  return {
    title,
    description,
    ...(discoverable
      ? {}
      : { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      url,
      siteName: 'Foleio',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function CreatorPublicPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  try {
    const lean = await getPublicCreatorByUsername(username);

    if (!lean) {
      notFound();
    }

    const hasActiveProducts = lean.products.length > 0;
    const hasServicesHint = lean.priceListItems.length > 0;
    const requireDojahKyc = await isDojahKycRequired();
    const reviews = serializeForClient(await getPublicReviews(lean.id));

    const serializedCreator = serializeForClient({
      ...lean,
      contentCount: lean.contentCount,
      availability: [],
      creatorPlans: [],
      priceListItems: [],
      content: [],
      collections: [],
      journalEntries: [],
    });

    return (
      <PublicCreatorProfile
        variant="shell"
        creator={serializedCreator as any}
        groupedPriceList={[]}
        hasActiveProducts={hasActiveProducts}
        hasServicesHint={hasServicesHint}
        requireDojahKyc={requireDojahKyc}
        portfolioSections={[]}
        reviews={
          reviews as Array<{
            id: string;
            customerName: string;
            location?: string | null;
            quote: string;
          }>
        }
        gallerySlot={
          <Suspense fallback={<GallerySectionSkeleton />}>
            <PublicPortfolioSection creatorId={lean.id} username={lean.username} />
          </Suspense>
        }
        offeringsSlot={
          <Suspense fallback={<OfferingsSectionSkeleton />}>
            <PublicOfferingsSection
              creatorId={lean.id}
              creator={serializedCreator as any}
              hasActiveProducts={hasActiveProducts}
              requireDojahKyc={requireDojahKyc}
              reviews={
                reviews as Array<{
                  id: string;
                  customerName: string;
                  location?: string | null;
                  quote: string;
                }>
              }
            />
          </Suspense>
        }
      />
    );
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      String((error as { digest: string }).digest).startsWith('NEXT_')
    ) {
      throw error;
    }
    console.error('[public-profile] failed to load:', error);
    return (
      <FoleioStatusPage
        title="Something went wrong"
        description="Could not load this profile. Please try again."
        primaryAction={{ label: 'Go home', href: '/' }}
        secondaryAction={{
          label: 'Explore creators',
          href: '/creators',
          variant: 'outline',
        }}
      />
    );
  }
}

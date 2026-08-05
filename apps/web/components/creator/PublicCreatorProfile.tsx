'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BadgeCheck, Calendar, Link2, ShoppingBag, X } from 'lucide-react';
import { PriceListModal } from '@/components/booking/PriceListModal';
import { BookingModal } from '@/components/booking/BookingModal';
import { authCss } from '@/components/auth/styles';
import { INDUSTRY_OPTIONS } from '@/lib/constants/industries';
import { BusinessCoverCard } from '@/components/creator/BusinessCoverCard';
import { CreatorAvatar } from '@/components/creator/CreatorAvatar';
import {
  cleanSocialUrl,
  resolveInstagramHref,
  resolveTiktokHref,
} from '@/lib/creator/social-urls';
import { isPaymentsReady } from '@/lib/creator/payments-ready';
import { RemoteImage } from '@/components/creator/RemoteImage';
import { PublicShopPanel, prefetchPublicShop } from '@/components/shop/PublicShopPanel';
import { productCardCss } from '@/components/shop/product-card-styles';
import { PublicGalleryPanel } from '@/components/creator/public/PublicGalleryPanel';
import { resolveBookingPolicyHref } from '@/lib/booking/booking-policy-document';

interface CreatorLink {
  id: string;
  label: string;
  url: string;
  linkType: string;
  icon: string | null;
}

interface PriceListItem {
  id: string;
  serviceType?: string | null;
  category: string | null;
  name: string;
  description: string | null;
  location?: string | null;
  sessionDescription?: string | null;
  calendlyLink?: string | null;
  price: number;
  durationMinutes: number | null;
  addons?: Array<{ id: string; name: string; price: number }> | null;
  locationOptions?: Array<{ id: string; name: string; price: number }> | null;
  inclusions?: string[] | null;
  coverImageUrl?: string | null;
  depositType?: string | null;
  depositValue?: number | null;
  allowPayInFull?: boolean | null;
  minNoticeDays?: number | null;
}

interface PortfolioSectionPublic {
  id: string;
  name: string;
  description: string | null;
  items: Array<{
    id: string;
    imageUrl: string;
    caption: string | null;
    priceListItemId: string | null;
    orderIndex?: number;
  }>;
}

interface GroupedPriceList {
  category: string | null;
  items: PriceListItem[];
}

const PUBLIC_LIST_PREVIEW = 4;

function takeGroupedPreview(
  grouped: GroupedPriceList[],
  limit = PUBLIC_LIST_PREVIEW
): GroupedPriceList[] {
  const preview: GroupedPriceList[] = [];
  let remaining = limit;
  for (const group of grouped) {
    if (remaining <= 0) break;
    const items = group.items.slice(0, remaining);
    if (items.length === 0) continue;
    preview.push({ category: group.category, items });
    remaining -= items.length;
  }
  return preview;
}

function countGroupedItems(grouped: GroupedPriceList[]) {
  return grouped.reduce((sum, group) => sum + group.items.length, 0);
}

interface Availability {
  id: string;
  date: Date;
  isAvailable: boolean;
  maxBookings: number | null;
  bookingCount?: number;
  isFullyBooked?: boolean;
  mode?: 'full_day' | 'hours';
  slots?: Array<{ startTime: string; endTime: string; isBooked?: boolean }>;
}

interface Creator {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  category: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  subscriberCount: number;
  contentCount: number;
  introVideo: unknown;
  creatorLinks: CreatorLink[];
  priceListItems: PriceListItem[];
  availability: Availability[];
  creatorPlans: unknown[];
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
  paystackSubaccountCode?: string | null;
  subaccountStatus?: string | null;
  bvnVerified?: boolean | null;
  bookingPolicyType?: string | null;
  bookingPolicyFileUrl?: string | null;
  bookingPolicyFileName?: string | null;
  bookingPolicyLinkUrl?: string | null;
}

interface PublicCreatorProfileProps {
  creator: Creator;
  regularContent?: unknown[];
  tutorials?: unknown[];
  tutorialCollections?: unknown[];
  journalEntries?: unknown[];
  groupedPriceList?: GroupedPriceList[];
  hasActiveProducts?: boolean;
  /** When offerings data is still streaming, hint from lean query for CTA. */
  hasServicesHint?: boolean;
  portfolioSections?: PortfolioSectionPublic[];
  reviews?: Array<{ id: string; customerName: string; location?: string | null; quote: string }>;
  requireDojahKyc?: boolean;
  /** full = classic page; shell = header + slots; offerings = panel + modals only */
  variant?: 'full' | 'shell' | 'offerings';
  gallerySlot?: React.ReactNode;
  offeringsSlot?: React.ReactNode;
}

const publicProfileCss = `
${authCss}

body:has(.foleio-public-root) footer { display: none !important; }

.foleio-public-root {
  min-height: 100vh;
  background: #1a1816;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  display: flex;
  flex-direction: column;
}

.foleio-public-banner {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #1a1816;
}
.foleio-public-banner.has-image {
  height: 160px;
}
@media (min-width: 768px) {
  .foleio-public-banner.has-image { height: 200px; }
}
.foleio-public-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.foleio-public-shell {
  width: 100%;
  max-width: 929px;
  margin: 0 auto;
  padding: 18px 24px 48px;
  box-sizing: border-box;
  flex: 1;
}

.foleio-public-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  align-items: start;
  width: 100%;
}
@media (min-width: 900px) {
  .foleio-public-columns {
    grid-template-columns: minmax(240px, 333px) minmax(0, 542px);
    gap: clamp(24px, 4vw, 54px);
  }
}

.foleio-public-left,
.foleio-public-right {
  width: 100%;
  min-width: 0;
}
.foleio-public-right {
  max-width: 542px;
}
@media (max-width: 899px) {
  .foleio-public-left {
    max-width: 333px;
  }
}

/* Narrow phones: center cover + profile under full-width content */
@media (max-width: 409px) {
  .foleio-public-left {
    max-width: 333px;
    margin-left: auto;
    margin-right: auto;
  }
}

/* Tablet / wide phone: center cover/profile and main content columns */
@media (min-width: 410px) and (max-width: 899px) {
  .foleio-public-columns {
    justify-items: center;
  }
  .foleio-public-left {
    max-width: 333px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
  }
  .foleio-public-right {
    width: 100%;
    max-width: 542px;
    margin-left: auto;
    margin-right: auto;
  }
}

.foleio-public-root .foleio-auth-stub-thumb.is-avatar {
  background: transparent;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.foleio-public-root .foleio-auth-stub-thumb.is-avatar > * {
  width: 100% !important;
  height: 100% !important;
  border-radius: 4px !important;
  background: #2b2b2b !important;
}
.foleio-public-root .foleio-auth-stub-thumb.is-avatar span {
  color: #adadad !important;
  font-weight: 500 !important;
}
.foleio-public-root .foleio-auth-stub-name {
  color: #f4f4f5;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  margin: 0;
}
.foleio-public-root .foleio-auth-stub-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
}
.foleio-public-root .foleio-auth-stub-category {
  color: #828282;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.foleio-public-bio {
  margin: 14px 0 0;
  color: #adadad;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.foleio-product-card .foleio-review-name {
  margin: 0;
  color: #fafafa;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
}
.foleio-reviews-drawer-body .foleio-product-card-desc {
  display: block;
  -webkit-line-clamp: unset;
  overflow: visible;
}

.foleio-reviews-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.55);
}
.foleio-reviews-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 81;
  display: flex;
  flex-direction: column;
  width: min(420px, 100vw);
  background: #212121;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.35);
  animation: foleio-reviews-drawer-in 180ms ease-out;
}
@keyframes foleio-reviews-drawer-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.foleio-reviews-drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 0;
  flex-shrink: 0;
}
.foleio-reviews-drawer-title {
  margin: 0;
  color: #f4f4f5;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}
.foleio-reviews-drawer-meta {
  margin: 6px 0 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}
.foleio-reviews-drawer-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
  cursor: pointer;
}
.foleio-reviews-drawer-close:hover {
  color: #f4f4f5;
}
.foleio-reviews-drawer-close svg {
  width: 18px;
  height: 18px;
}
.foleio-reviews-drawer-body {
  flex: 1;
  overflow: auto;
  padding: 16px 20px 24px;
}

.foleio-public-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  padding: 0 16px;
  border: 1px solid #fff;
  border-radius: 10px;
  background: #fff;
  color: #001035;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 14px;
}
.foleio-public-cta:hover { opacity: 0.92; }
.foleio-public-cta svg {
  width: 16px;
  height: 16px;
}
.foleio-public-cta-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
  width: 100%;
}
.foleio-public-policy-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 10px;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  text-decoration: none;
}
.foleio-public-policy-link:hover {
  color: #f4f4f5;
  text-decoration: none;
}
.foleio-public-cta-row .foleio-public-cta {
  margin-top: 0;
}
.foleio-public-cta-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 10px;
  background: transparent;
  color: #fafafa;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.foleio-public-cta-secondary:hover { opacity: 0.9; }
.foleio-public-cta-secondary svg {
  width: 16px;
  height: 16px;
}

.foleio-public-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.foleio-public-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #212121;
  color: #f4f4f5;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
}
.foleio-public-link:hover {
  background: #2a2a2a;
}
.foleio-public-link svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: #adadad;
}

.foleio-public-panel {
  padding: 16px;
  border-radius: 12px;
  background: #212121;
}
.foleio-public-panel-title {
  margin: 0;
  color: #f4f4f5;
  font-size: 16px;
  font-weight: 600;
}
.foleio-public-panel-meta {
  margin: 6px 0 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.foleio-public-group {
  margin-top: 14px;
}
.foleio-public-group-label {
  margin: 0 0 8px;
  color: #828282;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.foleio-public-service {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.foleio-public-service:first-of-type {
  border-top: none;
  padding-top: 0;
}
@media (min-width: 540px) {
  .foleio-public-service {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
.foleio-public-service-main {
  min-width: 0;
  flex: 1;
}
.foleio-public-service-name {
  margin: 0;
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 500;
}
.foleio-public-service-desc {
  margin: 4px 0 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}
.foleio-public-service-meta {
  margin: 4px 0 0;
  color: #828282;
  font-size: 12px;
  font-weight: 500;
}
.foleio-public-service-side {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.foleio-public-service-price {
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}
.foleio-public-btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: transparent;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.foleio-public-btn-outline:hover { opacity: 0.9; }

.foleio-public-empty {
  margin: 14px 0 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
}

@keyframes foleio-public-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
`;

function isPlaceholderBio(bio?: string | null) {
  const value = bio?.trim() || '';
  if (!value) return true;
  if (value.length < 12) return true;
  // Repeated characters / keyboard mash
  if (/^(.)\1+$/i.test(value)) return true;
  if (!/[aeiou]/i.test(value) && value.length < 20) return true;
  return false;
}

export function PublicCreatorProfile({
  creator,
  groupedPriceList = [],
  portfolioSections = [],
  reviews = [],
  requireDojahKyc = false,
  hasActiveProducts = false,
  hasServicesHint = false,
  variant = 'full',
  gallerySlot,
  offeringsSlot,
}: PublicCreatorProfileProps) {
  const [priceListOpen, setPriceListOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<PriceListItem | null>(null);
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | null>(null);
  const [offeringsTab, setOfferingsTab] = useState<'services' | 'shop' | 'reviews'>(
    'services'
  );
  const [reviewsDrawerOpen, setReviewsDrawerOpen] = useState(false);
  const offeringsPanelRef = useRef<HTMLElement | null>(null);
  const setOfferingsPanelRef = (node: HTMLElement | null) => {
    offeringsPanelRef.current = node;
  };

  const formatPrice = (priceInKobo: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);

  const hasRealServices = groupedPriceList.length > 0 || hasServicesHint;
  const hasShop = Boolean(hasActiveProducts);
  const hasReviews = reviews.length > 0;
  const displayGrouped = groupedPriceList;
  const displayPriceListItems = displayGrouped.flatMap((group) => group.items);
  const servicesPreviewGrouped = takeGroupedPreview(displayGrouped);
  const servicesTotalCount = countGroupedItems(displayGrouped);
  const showServicesViewAll = servicesTotalCount > PUBLIC_LIST_PREVIEW;
  const reviewsPreview = reviews.slice(0, PUBLIC_LIST_PREVIEW);
  const showReviewsViewAll = reviews.length > PUBLIC_LIST_PREVIEW;
  const displayAvailability = creator.availability;
  const showOfferingsPanel =
    Boolean(offeringsSlot) ||
    hasRealServices ||
    hasShop ||
    hasReviews ||
    !hasServicesHint;

  const offeringsTabOptions = [
    hasRealServices ? ('services' as const) : null,
    hasShop ? ('shop' as const) : null,
    hasReviews ? ('reviews' as const) : null,
  ].filter(Boolean) as Array<'services' | 'shop' | 'reviews'>;

  const showOfferingsTabs = offeringsTabOptions.length > 1 && !offeringsSlot;

  const panelTitle = showOfferingsTabs
    ? 'Offerings'
    : hasShop && !hasRealServices && !hasReviews
      ? 'Shop'
      : hasReviews && !hasRealServices && !hasShop
        ? 'Reviews'
        : 'Services';

  const activeOfferingsTab = showOfferingsTabs
    ? offeringsTabOptions.includes(offeringsTab)
      ? offeringsTab
      : offeringsTabOptions[0]!
    : offeringsTabOptions[0] || 'services';

  useEffect(() => {
    const options = [
      hasRealServices ? ('services' as const) : null,
      hasShop ? ('shop' as const) : null,
      hasReviews ? ('reviews' as const) : null,
    ].filter(Boolean) as Array<'services' | 'shop' | 'reviews'>;
    if (!options.includes(offeringsTab) && options[0]) {
      setOfferingsTab(options[0]);
    }
  }, [hasRealServices, hasShop, hasReviews, offeringsTab]);

  useEffect(() => {
    if (!hasShop) return;
    prefetchPublicShop(creator.username);
  }, [hasShop, creator.username]);

  // Shell CTA and offerings panel are separate React trees (streaming). Bridge via events.
  useEffect(() => {
    if (variant === 'shell') return;

    function onOpenShop() {
      if (!hasShop) return;
      setOfferingsTab('shop');
    }

    function onOpenBook(event: Event) {
      const detail = (event as CustomEvent<{ serviceId?: string }>).detail;
      setOfferingsTab('services');
      setPreselectedServiceId(detail?.serviceId || null);
      setPriceListOpen(true);
    }

    window.addEventListener('foleio:open-shop', onOpenShop);
    window.addEventListener('foleio:open-book', onOpenBook);
    return () => {
      window.removeEventListener('foleio:open-shop', onOpenShop);
      window.removeEventListener('foleio:open-book', onOpenBook);
    };
  }, [variant, hasShop]);

  function scrollToOfferings() {
    const target =
      offeringsPanelRef.current ||
      (typeof document !== 'undefined'
        ? document.getElementById('foleio-public-offerings')
        : null);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openShopPanel() {
    if (hasShop) setOfferingsTab('shop');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('foleio:open-shop'));
    }
    scrollToOfferings();
  }

  function openServiceDrawer(serviceId?: string) {
    if (offeringsSlot) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('foleio:open-book', {
            detail: { serviceId },
          })
        );
      }
      scrollToOfferings();
      return;
    }
    setPreselectedServiceId(serviceId || null);
    setPriceListOpen(true);
  }

  const handleServiceSelect = (item: PriceListItem) => {
    setSelectedService(item);
    setPriceListOpen(false);
    setPreselectedServiceId(null);
    setBookingOpen(true);
  };

  const handleBackToServices = () => {
    setBookingOpen(false);
    const currentId = selectedService?.id || null;
    setSelectedService(null);
    setPreselectedServiceId(currentId);
    setPriceListOpen(true);
  };

  const hasPriceList = displayPriceListItems.length > 0;
  const hasAvailability = displayAvailability.length > 0;
  const paymentsReady = isPaymentsReady(creator, {
    requireKyc: requireDojahKyc,
  });
  // Show Book when services + payments are ready. Past-only availability
  // still opens the drawer (calendar shows "No available dates right now").
  // hasServicesHint covers shell mode while offerings stream in.
  const canBook = (hasPriceList || hasServicesHint) && paymentsReady;
  const shopOnly = hasShop && !canBook;
  const showBookAndShop = canBook && hasShop;
  const showPrimaryCta = shopOnly || canBook;
  const bookingPolicyHref = canBook
    ? resolveBookingPolicyHref({
        bookingPolicyType: creator.bookingPolicyType,
        bookingPolicyFileUrl: creator.bookingPolicyFileUrl,
        bookingPolicyLinkUrl: creator.bookingPolicyLinkUrl,
      })
    : null;

  const plan = (creator.platformPlan || '').toUpperCase();
  const isProBadge =
    Boolean(creator.platformSubscriptionActive) &&
    (plan === 'PRO' || plan === 'GROWTH' || plan === 'PREMIUM');

  const industryLabel =
    INDUSTRY_OPTIONS.find((option) => option.value === creator.category)?.label ||
    creator.category;
  const categoryHashtag = industryLabel
    ? `#${industryLabel.replace(/[^a-zA-Z0-9]+/g, '')}`
    : '';

  const links = Array.isArray(creator.creatorLinks) ? creator.creatorLinks : [];
  const twitterLink = links.find((link) => link.linkType === 'twitter');
  const portfolioLink = links.find((link) => link.linkType === 'portfolio');
  const managedLinkTypes = new Set(['twitter', 'portfolio', 'instagram', 'tiktok']);

  const instagramHref = resolveInstagramHref(creator.instagramHandle);
  const tiktokHref = resolveTiktokHref(creator.tiktokHandle);
  const twitterHref = cleanSocialUrl(twitterLink?.url);
  const portfolioHref = cleanSocialUrl(portfolioLink?.url);

  const socialLinks = [
    instagramHref
      ? { id: 'instagram', label: 'Instagram', url: instagramHref }
      : null,
    tiktokHref ? { id: 'tiktok', label: 'TikTok', url: tiktokHref } : null,
    twitterHref
      ? { id: twitterLink?.id || 'twitter', label: 'X', url: twitterHref }
      : null,
    portfolioHref
      ? {
          id: portfolioLink?.id || 'portfolio',
          label: 'Portfolio',
          url: portfolioHref,
        }
      : null,
    ...links
      .filter(
        (link) =>
          link.url &&
          link.url !== '#price-list' &&
          !managedLinkTypes.has(link.linkType)
      )
      .map((link) => {
        const url = cleanSocialUrl(link.url);
        if (!url) return null;
        return {
          id: link.id,
          label: link.label || 'Link',
          url,
        };
      }),
  ].filter(Boolean) as Array<{ id: string; label: string; url: string }>;

  const displayBio = isPlaceholderBio(creator.bio) ? null : creator.bio!.trim();

  const servicesMeta =
    activeOfferingsTab === 'shop'
      ? 'Browse products and checkout'
      : activeOfferingsTab === 'reviews'
        ? 'What clients say about this creator'
        : canBook
          ? hasAvailability
            ? 'Choose a service to book a date.'
            : 'Add available dates in Bookings to enable booking.'
          : hasRealServices
            ? 'Services from this creator.'
            : 'No services published yet.';

  const injectStyles = (
    <style
      dangerouslySetInnerHTML={{ __html: `${productCardCss}\n${publicProfileCss}` }}
    />
  );

  function renderReviewCard(review: {
    id: string;
    customerName: string;
    location?: string | null;
    quote: string;
  }) {
    const location = review.location?.trim();
    return (
      <div key={review.id} className="foleio-product-card">
        <div className="foleio-product-card-body">
          <div className="foleio-product-card-top">
            <p className="foleio-review-name">{review.customerName}</p>
            {location ? (
              <span className="foleio-product-card-stock is-out">{location}</span>
            ) : null}
          </div>
          <p className="foleio-product-card-desc">“{review.quote}”</p>
        </div>
      </div>
    );
  }

  if (variant === 'offerings') {
    return (
      <>
        {injectStyles}
        {showOfferingsPanel ? (
          <section className="foleio-public-panel" ref={setOfferingsPanelRef}>
            <h2 className="foleio-public-panel-title">{panelTitle}</h2>
            <p className="foleio-public-panel-meta">{servicesMeta}</p>
            {showOfferingsTabs ? (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginTop: 12,
                  marginBottom: 4,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  padding: 4,
                  width: 'fit-content',
                }}
                role="tablist"
                aria-label="Offerings"
              >
                {hasRealServices ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={offeringsTab === 'services'}
                    onClick={() => setOfferingsTab('services')}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      background: offeringsTab === 'services' ? '#fafafa' : 'transparent',
                      color: offeringsTab === 'services' ? '#18181b' : '#fafafa',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Services
                  </button>
                ) : null}
                {hasShop ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={offeringsTab === 'shop'}
                    onClick={() => setOfferingsTab('shop')}
                    onMouseEnter={() => prefetchPublicShop(creator.username)}
                    onFocus={() => prefetchPublicShop(creator.username)}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      background: offeringsTab === 'shop' ? '#fafafa' : 'transparent',
                      color: offeringsTab === 'shop' ? '#18181b' : '#fafafa',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Shop
                  </button>
                ) : null}
                {hasReviews ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={offeringsTab === 'reviews'}
                    onClick={() => setOfferingsTab('reviews')}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      background: offeringsTab === 'reviews' ? '#fafafa' : 'transparent',
                      color: offeringsTab === 'reviews' ? '#18181b' : '#fafafa',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Reviews
                  </button>
                ) : null}
              </div>
            ) : null}
            {hasShop ? (
              <div
                hidden={activeOfferingsTab !== 'shop'}
                aria-hidden={activeOfferingsTab !== 'shop'}
              >
                <PublicShopPanel username={creator.username} embedded />
              </div>
            ) : null}
            {activeOfferingsTab === 'services' ? (
              displayGrouped.length === 0 ? (
              <p className="foleio-public-empty">
                No services published yet. Check back soon.
              </p>
            ) : (
              <>
              {servicesPreviewGrouped.map((group) => (
                <div key={group.category || 'uncategorized'} className="foleio-public-group">
                  {group.category ? (
                    <h3 className="foleio-public-group-label">{group.category}</h3>
                  ) : null}
                  {group.items.map((item) => {
                    const inclusions = Array.isArray(item.inclusions)
                      ? item.inclusions.filter((row) => typeof row === 'string')
                      : [];
                    let depositLabel: string | null = null;
                    if (item.depositType === 'percent' && item.depositValue) {
                      const dep = Math.floor((item.price * Number(item.depositValue)) / 100);
                      depositLabel = `From ${formatPrice(dep)} deposit`;
                    } else if (item.depositType === 'fixed' && item.depositValue) {
                      depositLabel = `From ${formatPrice(item.depositValue)} deposit`;
                    }
                    return (
                      <div key={item.id} className="foleio-public-service">
                        <div className="foleio-public-service-main">
                          {item.coverImageUrl ? (
                            <RemoteImage
                              src={item.coverImageUrl}
                              alt=""
                              style={{
                                width: '100%',
                                maxWidth: 220,
                                aspectRatio: '16/10',
                                objectFit: 'cover',
                                borderRadius: 10,
                                marginBottom: 10,
                              }}
                            />
                          ) : null}
                          <p className="foleio-public-service-name">{item.name}</p>
                          {item.description ? (
                            <p className="foleio-public-service-desc">{item.description}</p>
                          ) : null}
                          {item.location ? (
                            <p
                              className="foleio-public-service-location"
                              style={{
                                margin: '8px 0 0',
                                padding: '10px 12px',
                                borderRadius: 8,
                                background: 'rgba(0,0,0,0.28)',
                                color: 'rgba(255,255,255,0.88)',
                                fontSize: 13,
                                lineHeight: 1.45,
                              }}
                            >
                              {item.location}
                            </p>
                          ) : null}
                          {inclusions.length > 0 ? (
                            <ul
                              className="foleio-public-service-desc"
                              style={{ paddingLeft: 18, margin: '6px 0' }}
                            >
                              {inclusions.slice(0, 4).map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          ) : null}
                          {item.durationMinutes ? (
                            <p className="foleio-public-service-meta">{item.durationMinutes} min</p>
                          ) : null}
                          {depositLabel ? (
                            <p className="foleio-public-service-meta">{depositLabel}</p>
                          ) : null}
                        </div>
                        <div className="foleio-public-service-side">
                          <span className="foleio-public-service-price">{formatPrice(item.price)}</span>
                          {canBook ? (
                            <button
                              type="button"
                              className="foleio-public-btn-outline"
                              onClick={() => openServiceDrawer(item.id)}
                            >
                              Book
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {showServicesViewAll ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button
                    type="button"
                    className="foleio-public-btn-outline"
                    onClick={() => openServiceDrawer()}
                  >
                    View all
                  </button>
                </div>
              ) : null}
              </>
            )
            ) : null}
            {activeOfferingsTab === 'reviews' && hasReviews ? (
              <div className="foleio-product-card-list" style={{ marginTop: 12 }}>
                {reviewsPreview.map((review) => renderReviewCard(review))}
                {showReviewsViewAll ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 0 }}>
                    <button
                      type="button"
                      className="foleio-public-btn-outline"
                      onClick={() => setReviewsDrawerOpen(true)}
                    >
                      View all
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
        {reviewsDrawerOpen ? (
          <>
            <div
              className="foleio-reviews-drawer-backdrop"
              onClick={() => setReviewsDrawerOpen(false)}
              aria-hidden
            />
            <aside
              className="foleio-reviews-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reviews-drawer-title"
            >
              <div className="foleio-reviews-drawer-header">
                <div>
                  <h2 id="reviews-drawer-title" className="foleio-reviews-drawer-title">
                    Reviews
                  </h2>
                  <p className="foleio-reviews-drawer-meta">
                    What clients say about {creator.displayName}
                  </p>
                </div>
                <button
                  type="button"
                  className="foleio-reviews-drawer-close"
                  onClick={() => setReviewsDrawerOpen(false)}
                  aria-label="Close reviews"
                >
                  <X strokeWidth={1.75} />
                </button>
              </div>
              <div className="foleio-reviews-drawer-body">
                <div className="foleio-product-card-list">
                  {reviews.map((review) => renderReviewCard(review))}
                </div>
              </div>
            </aside>
          </>
        ) : null}
        {hasPriceList ? (
          <PriceListModal
            open={priceListOpen}
            onOpenChange={(open) => {
              setPriceListOpen(open);
              if (!open) setPreselectedServiceId(null);
            }}
            priceList={displayGrouped}
            onSelectItem={handleServiceSelect}
            creatorName={creator.displayName}
            initialSelectedId={preselectedServiceId}
          />
        ) : null}
        {selectedService ? (
          <BookingModal
            open={bookingOpen}
            onOpenChange={(open) => {
              setBookingOpen(open);
              if (!open) setSelectedService(null);
            }}
            selectedService={selectedService}
            creatorId={creator.id}
            creatorName={creator.displayName}
            availableDates={displayAvailability}
            onBack={handleBackToServices}
            isPreview={false}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="foleio-public-root">
      {injectStyles}

      <div className="foleio-public-shell">
        <div className="foleio-public-columns">
          <aside className="foleio-public-left">
            <BusinessCoverCard bannerUrl={creator.bannerUrl} />

            <div className="foleio-auth-stub">
              <div className="foleio-auth-stub-main">
                <div className="foleio-auth-stub-thumb is-avatar">
                  <CreatorAvatar
                    src={creator.avatarUrl}
                    name={creator.displayName}
                    size={42}
                  />
                </div>
                <div className="foleio-auth-stub-meta">
                  <h1 className="foleio-auth-stub-name">{creator.displayName}</h1>
                  {categoryHashtag ? (
                    <p className="foleio-auth-stub-category">{categoryHashtag}</p>
                  ) : null}
                </div>
              </div>
              <div
                className={`foleio-auth-stub-badge${isProBadge ? ' is-pro' : ''}`}
                aria-label={isProBadge ? 'Pro verified' : 'Verified'}
              >
                <BadgeCheck className="h-6 w-6" strokeWidth={1.5} />
              </div>
            </div>

            {displayBio ? <p className="foleio-public-bio">{displayBio}</p> : null}

            {showPrimaryCta ? (
              showBookAndShop ? (
                <div>
                  <div className="foleio-public-cta-row">
                    <button
                      type="button"
                      className="foleio-public-cta"
                      onClick={() => openServiceDrawer()}
                    >
                      <Calendar strokeWidth={1.75} />
                      Book a service
                    </button>
                    <button
                      type="button"
                      className="foleio-public-cta-secondary"
                      onClick={() => openShopPanel()}
                    >
                      <ShoppingBag strokeWidth={1.75} />
                      Shop
                    </button>
                  </div>
                  {bookingPolicyHref ? (
                    <a
                      href={bookingPolicyHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="foleio-public-policy-link"
                    >
                      Read my booking policy
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </a>
                  ) : null}
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    className="foleio-public-cta"
                    onClick={() => (shopOnly ? openShopPanel() : openServiceDrawer())}
                  >
                    {shopOnly ? (
                      <>
                        <ShoppingBag strokeWidth={1.75} />
                        Shop
                      </>
                    ) : (
                      <>
                        <Calendar strokeWidth={1.75} />
                        Book a service
                      </>
                    )}
                  </button>
                  {bookingPolicyHref && !shopOnly ? (
                    <a
                      href={bookingPolicyHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="foleio-public-policy-link"
                    >
                      Read my booking policy
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </a>
                  ) : null}
                </div>
              )
            ) : null}

            {socialLinks.length > 0 ? (
              <div className="foleio-public-links">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="foleio-public-link"
                  >
                    <Link2 strokeWidth={1.75} />
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </aside>

          <div className="foleio-public-right">
            {gallerySlot != null ? (
              gallerySlot
            ) : portfolioSections.length > 0 ? (
              <PublicGalleryPanel
                username={creator.username}
                initialSections={portfolioSections}
              />
            ) : null}

            {offeringsSlot != null ? (
              <div id="foleio-public-offerings" ref={setOfferingsPanelRef}>
                {offeringsSlot}
              </div>
            ) : showOfferingsPanel ? (
            <section className="foleio-public-panel" ref={setOfferingsPanelRef}>
              <h2 className="foleio-public-panel-title">{panelTitle}</h2>
              <p className="foleio-public-panel-meta">{servicesMeta}</p>

              {showOfferingsTabs ? (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    marginTop: 12,
                    marginBottom: 4,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    padding: 4,
                    width: 'fit-content',
                  }}
                  role="tablist"
                  aria-label="Offerings"
                >
                  {hasRealServices ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={offeringsTab === 'services'}
                      onClick={() => setOfferingsTab('services')}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 14px',
                        cursor: 'pointer',
                        background:
                          offeringsTab === 'services' ? '#fafafa' : 'transparent',
                        color: offeringsTab === 'services' ? '#18181b' : '#fafafa',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Services
                    </button>
                  ) : null}
                  {hasShop ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={offeringsTab === 'shop'}
                      onClick={() => setOfferingsTab('shop')}
                      onMouseEnter={() => prefetchPublicShop(creator.username)}
                      onFocus={() => prefetchPublicShop(creator.username)}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 14px',
                        cursor: 'pointer',
                        background: offeringsTab === 'shop' ? '#fafafa' : 'transparent',
                        color: offeringsTab === 'shop' ? '#18181b' : '#fafafa',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Shop
                    </button>
                  ) : null}
                  {hasReviews ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={offeringsTab === 'reviews'}
                      onClick={() => setOfferingsTab('reviews')}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 14px',
                        cursor: 'pointer',
                        background:
                          offeringsTab === 'reviews' ? '#fafafa' : 'transparent',
                        color: offeringsTab === 'reviews' ? '#18181b' : '#fafafa',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Reviews
                    </button>
                  ) : null}
                </div>
              ) : null}

              {hasShop ? (
                <div
                  hidden={activeOfferingsTab !== 'shop'}
                  aria-hidden={activeOfferingsTab !== 'shop'}
                >
                  <PublicShopPanel username={creator.username} embedded />
                </div>
              ) : null}
              {activeOfferingsTab === 'services' ? (
                displayGrouped.length === 0 ? (
                <p className="foleio-public-empty">
                  No services published yet. Check back soon.
                </p>
              ) : (
                <>
                {servicesPreviewGrouped.map((group) => (
                  <div key={group.category || 'uncategorized'} className="foleio-public-group">
                    {group.category ? (
                      <h3 className="foleio-public-group-label">{group.category}</h3>
                    ) : null}
                    {group.items.map((item) => {
                      const inclusions = Array.isArray(item.inclusions)
                        ? item.inclusions.filter((row) => typeof row === 'string')
                        : [];
                      let depositLabel: string | null = null;
                      if (item.depositType === 'percent' && item.depositValue) {
                        const dep = Math.floor(
                          (item.price * Number(item.depositValue)) / 100
                        );
                        depositLabel = `From ${formatPrice(dep)} deposit`;
                      } else if (item.depositType === 'fixed' && item.depositValue) {
                        depositLabel = `From ${formatPrice(item.depositValue)} deposit`;
                      }

                      return (
                      <div key={item.id} className="foleio-public-service">
                        <div className="foleio-public-service-main">
                          {item.coverImageUrl ? (
                            <RemoteImage
                              src={item.coverImageUrl}
                              alt=""
                              style={{
                                width: '100%',
                                maxWidth: 220,
                                aspectRatio: '16/10',
                                objectFit: 'cover',
                                borderRadius: 10,
                                marginBottom: 10,
                              }}
                            />
                          ) : null}
                          <p className="foleio-public-service-name">{item.name}</p>
                          {item.description ? (
                            <p className="foleio-public-service-desc">{item.description}</p>
                          ) : null}
                          {item.location ? (
                            <p
                              className="foleio-public-service-location"
                              style={{
                                margin: '8px 0 0',
                                padding: '10px 12px',
                                borderRadius: 8,
                                background: 'rgba(0,0,0,0.28)',
                                color: 'rgba(255,255,255,0.88)',
                                fontSize: 13,
                                lineHeight: 1.45,
                              }}
                            >
                              {item.location}
                            </p>
                          ) : null}
                          {inclusions.length > 0 ? (
                            <ul
                              className="foleio-public-service-desc"
                              style={{ paddingLeft: 18, margin: '6px 0' }}
                            >
                              {inclusions.slice(0, 4).map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          ) : null}
                          {item.durationMinutes ? (
                            <p className="foleio-public-service-meta">
                              {item.durationMinutes} min
                            </p>
                          ) : null}
                          {depositLabel ? (
                            <p className="foleio-public-service-meta">{depositLabel}</p>
                          ) : null}
                        </div>
                        <div className="foleio-public-service-side">
                          <span className="foleio-public-service-price">
                            {formatPrice(item.price)}
                          </span>
                          {canBook ? (
                            <button
                              type="button"
                              className="foleio-public-btn-outline"
                              onClick={() => openServiceDrawer(item.id)}
                            >
                              Book
                            </button>
                          ) : null}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ))}
                {showServicesViewAll ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button
                      type="button"
                      className="foleio-public-btn-outline"
                      onClick={() => openServiceDrawer()}
                    >
                      View all
                    </button>
                  </div>
                ) : null}
                </>
              )
              ) : null}
              {activeOfferingsTab === 'reviews' && hasReviews ? (
                <div className="foleio-product-card-list" style={{ marginTop: 12 }}>
                  {reviewsPreview.map((review) => renderReviewCard(review))}
                  {showReviewsViewAll ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 0 }}>
                      <button
                        type="button"
                        className="foleio-public-btn-outline"
                        onClick={() => setReviewsDrawerOpen(true)}
                      >
                        View all
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
            ) : null}
          </div>
        </div>
      </div>

      {offeringsSlot == null && reviewsDrawerOpen ? (
        <>
          <div
            className="foleio-reviews-drawer-backdrop"
            onClick={() => setReviewsDrawerOpen(false)}
            aria-hidden
          />
          <aside
            className="foleio-reviews-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reviews-drawer-title-shell"
          >
            <div className="foleio-reviews-drawer-header">
              <div>
                <h2 id="reviews-drawer-title-shell" className="foleio-reviews-drawer-title">
                  Reviews
                </h2>
                <p className="foleio-reviews-drawer-meta">
                  What clients say about {creator.displayName}
                </p>
              </div>
              <button
                type="button"
                className="foleio-reviews-drawer-close"
                onClick={() => setReviewsDrawerOpen(false)}
                aria-label="Close reviews"
              >
                <X strokeWidth={1.75} />
              </button>
            </div>
            <div className="foleio-reviews-drawer-body">
              <div className="foleio-product-card-list">
                {reviews.map((review) => renderReviewCard(review))}
              </div>
            </div>
          </aside>
        </>
      ) : null}

      {offeringsSlot == null && hasPriceList ? (
        <PriceListModal
          open={priceListOpen}
          onOpenChange={(open) => {
            setPriceListOpen(open);
            if (!open) setPreselectedServiceId(null);
          }}
          priceList={displayGrouped}
          onSelectItem={handleServiceSelect}
          creatorName={creator.displayName}
          initialSelectedId={preselectedServiceId}
        />
      ) : null}

      {offeringsSlot == null && selectedService ? (
        <BookingModal
          open={bookingOpen}
          onOpenChange={(open) => {
            setBookingOpen(open);
            if (!open) setSelectedService(null);
          }}
          selectedService={selectedService}
          creatorId={creator.id}
          creatorName={creator.displayName}
          availableDates={displayAvailability}
          onBack={handleBackToServices}
          isPreview={false}
        />
      ) : null}
    </div>
  );
}

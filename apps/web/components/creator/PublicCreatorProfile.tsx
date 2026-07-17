'use client';

import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Calendar, Link2, ShoppingBag, X } from 'lucide-react';
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
import { publicGalleryItems } from '@/lib/creator/portfolio-gallery';
import { RemoteImage } from '@/components/creator/RemoteImage';
import { PublicShopPanel, prefetchPublicShop } from '@/components/shop/PublicShopPanel';

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
  inclusions?: string[] | null;
  coverImageUrl?: string | null;
  depositType?: string | null;
  depositValue?: number | null;
  allowPayInFull?: boolean | null;
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

const SAMPLE_BIO =
  'Soft glam, bridal, and editorial makeup for clients who want skin that looks like skin — polished, not painted. Sessions in Lagos, with travel for shoots and wedding parties.';

function isPlaceholderBio(bio?: string | null) {
  const value = bio?.trim() || '';
  if (!value) return true;
  if (value.length < 12) return true;
  // Repeated characters / keyboard mash
  if (/^(.)\1+$/i.test(value)) return true;
  if (!/[aeiou]/i.test(value) && value.length < 20) return true;
  return false;
}

const SAMPLE_GROUPED: GroupedPriceList[] = [
  {
    category: null,
    items: [
      {
        id: 'sample-soft-glam',
        category: null,
        name: 'Soft glam session',
        description: 'Natural everyday glam with skin-first finish. Includes lashes.',
        price: 4500000,
        durationMinutes: 90,
      },
      {
        id: 'sample-bridal',
        category: null,
        name: 'Bridal makeup',
        description: 'Full bridal look with trial option. Travel available in Lagos.',
        price: 12000000,
        durationMinutes: 150,
      },
      {
        id: 'sample-editorial',
        category: null,
        name: 'Editorial / shoot',
        description: 'Creative looks for campaigns, lookbooks, and content days.',
        price: 8000000,
        durationMinutes: 120,
      },
    ],
  },
];

function buildSampleAvailability(): Availability[] {
  const dates: Availability[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 2; i <= 16; i += 2) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push({
      id: `sample-avail-${i}`,
      date,
      isAvailable: true,
      maxBookings: 1,
      bookingCount: i % 4 === 0 ? 1 : 0,
      isFullyBooked: false,
      mode: 'full_day',
    });
  }
  return dates;
}

export function PublicCreatorProfile({
  creator,
  groupedPriceList = [],
  portfolioSections = [],
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
  const [offeringsTab, setOfferingsTab] = useState<'services' | 'shop'>('services');
  const offeringsPanelRef = useRef<HTMLElement | null>(null);
  const setOfferingsPanelRef = (node: HTMLElement | null) => {
    offeringsPanelRef.current = node;
  };
  const [galleryLightbox, setGalleryLightbox] = useState<{
    id: string;
    imageUrl: string;
    caption: string | null;
  } | null>(null);
  const [liveSections, setLiveSections] = useState(portfolioSections);

  useEffect(() => {
    setLiveSections(portfolioSections);
  }, [portfolioSections]);

  // Soft-nav / Router Cache can serve a stale public payload after gallery uploads.
  // Refresh from a no-store API so images appear without a hard reload.
  useEffect(() => {
    let cancelled = false;
    const username = creator.username;
    if (!username) return;

    void (async () => {
      try {
        const res = await fetch(`/api/public/creators/${encodeURIComponent(username)}/gallery`, {
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { sections?: PortfolioSectionPublic[] };
        if (!cancelled && Array.isArray(data.sections)) {
          setLiveSections(data.sections);
        }
      } catch {
        // Keep SSR sections.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [creator.username]);

  useEffect(() => {
    if (!galleryLightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGalleryLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [galleryLightbox]);

  const galleryItems = publicGalleryItems(liveSections);

  const formatPrice = (priceInKobo: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);

  const hasRealServices = groupedPriceList.length > 0 || hasServicesHint;
  const hasShop = Boolean(hasActiveProducts);
  const usingSampleServices = !hasRealServices && !hasShop;
  const displayGrouped = usingSampleServices ? SAMPLE_GROUPED : groupedPriceList;
  const displayPriceListItems = displayGrouped.flatMap((group) => group.items);
  const displayAvailability = usingSampleServices
    ? buildSampleAvailability()
    : creator.availability;
  const showOfferingsPanel =
    Boolean(offeringsSlot) || hasRealServices || hasShop || usingSampleServices;
  const showBothTabs = hasRealServices && hasShop && !offeringsSlot;
  const panelTitle = !hasRealServices && hasShop ? 'Shop' : 'Services';
  const activeOfferingsTab = showBothTabs
    ? offeringsTab
    : hasShop && !hasRealServices
      ? 'shop'
      : 'services';

  useEffect(() => {
    if (showBothTabs) setOfferingsTab('services');
  }, [showBothTabs]);

  useEffect(() => {
    if (!hasShop) return;
    prefetchPublicShop(creator.username);
  }, [hasShop, creator.username]);

  function openShopPanel() {
    if (showBothTabs) setOfferingsTab('shop');
    const target =
      offeringsPanelRef.current ||
      (typeof document !== 'undefined'
        ? document.getElementById('foleio-public-offerings')
        : null);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openServiceDrawer(serviceId?: string) {
    if (offeringsSlot) {
      openShopPanel();
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
  const canBook =
    (hasPriceList || hasServicesHint) && (usingSampleServices || paymentsReady);
  const shopOnly = hasShop && !hasRealServices;
  const showPrimaryCta = shopOnly || canBook;

  const plan = (creator.platformPlan || '').toUpperCase();
  const isProBadge =
    Boolean(creator.platformSubscriptionActive) &&
    (plan === 'PRO' || plan === 'PREMIUM');

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

  const displayBio = isPlaceholderBio(creator.bio) ? SAMPLE_BIO : creator.bio!.trim();

  const servicesMeta = usingSampleServices
    ? 'Sample services for preview — publish your own from Bookings.'
    : activeOfferingsTab === 'shop'
      ? 'Browse products and checkout'
      : canBook
        ? hasAvailability
          ? 'Choose a service to book a date.'
          : 'Choose a service — add future available dates in Bookings so clients can pick a day.'
        : hasRealServices
          ? 'Services from this creator.'
          : 'No services published yet.';

  const injectStyles = <style dangerouslySetInnerHTML={{ __html: publicProfileCss }} />;

  if (variant === 'offerings') {
    return (
      <>
        {injectStyles}
        {showOfferingsPanel ? (
          <section className="foleio-public-panel" ref={setOfferingsPanelRef}>
            <h2 className="foleio-public-panel-title">{panelTitle}</h2>
            <p className="foleio-public-panel-meta">{servicesMeta}</p>
            {showBothTabs ? (
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
            {activeOfferingsTab !== 'shop' ? (
              displayGrouped.length === 0 ? (
              <p className="foleio-public-empty">Check back soon for booking options.</p>
            ) : (
              displayGrouped.map((group) => (
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
              ))
            )
            ) : null}
          </section>
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
            isPreview={usingSampleServices}
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
              <button
                type="button"
                className="foleio-public-cta"
                onClick={() => (shopOnly ? openShopPanel() : openServiceDrawer())}
              >
                {shopOnly ? (
                  <>
                    <ShoppingBag strokeWidth={1.75} />
                    Shop products
                  </>
                ) : (
                  <>
                    <Calendar strokeWidth={1.75} />
                    Book service
                  </>
                )}
              </button>
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
            ) : galleryItems.length > 0 ? (
              <section className="foleio-public-panel">
                <h2 className="foleio-public-panel-title">Gallery</h2>
                <p className="foleio-public-panel-meta">Selected work</p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {galleryItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGalleryLightbox(item)}
                      style={{
                        padding: 0,
                        border: 'none',
                        background: '#2b2b2b',
                        cursor: 'pointer',
                        borderRadius: 10,
                        overflow: 'hidden',
                        aspectRatio: '1',
                      }}
                      aria-label={item.caption || 'View gallery photo'}
                    >
                      <RemoteImage
                        src={item.imageUrl}
                        alt={item.caption || 'Gallery photo'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {offeringsSlot != null ? (
              <div id="foleio-public-offerings" ref={setOfferingsPanelRef}>
                {offeringsSlot}
              </div>
            ) : showOfferingsPanel ? (
            <section className="foleio-public-panel" ref={setOfferingsPanelRef}>
              <h2 className="foleio-public-panel-title">{panelTitle}</h2>
              <p className="foleio-public-panel-meta">{servicesMeta}</p>

              {showBothTabs ? (
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
              {activeOfferingsTab !== 'shop' ? (
                displayGrouped.length === 0 ? (
                <p className="foleio-public-empty">Check back soon for booking options.</p>
              ) : (
                displayGrouped.map((group) => (
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
                ))
              )
              ) : null}
            </section>
            ) : null}
          </div>
        </div>
      </div>

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
          isPreview={usingSampleServices}
        />
      ) : null}

      {gallerySlot == null && galleryLightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo"
          onClick={() => setGalleryLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: 640,
              width: '100%',
              background: '#212121',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setGalleryLightbox(null)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.35)',
                color: '#fafafa',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
              }}
            >
              <X className="h-4 w-4" />
            </button>
            <RemoteImage
              src={galleryLightbox.imageUrl}
              alt={galleryLightbox.caption || 'Gallery photo'}
              style={{
                width: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: 10,
                background: '#111',
              }}
            />
            {galleryLightbox.caption ? (
              <p className="foleio-public-panel-meta" style={{ marginTop: 12 }}>
                {galleryLightbox.caption}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

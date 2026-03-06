'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Video,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  Instagram,
  Youtube,
  Twitter,
  Link as LinkIcon,
  Mail,
  Play,
  Eye,
  BookOpen,
  Star,
  CreditCard,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { MuxVideoPlayer } from '@/components/ui/mux-player';
import { PriceListModal } from '@/components/booking/PriceListModal';
import { BookingModal } from '@/components/booking/BookingModal';
import { SubscriptionModal } from '@/components/creator/SubscriptionModal';
import { PremiumAccessModal } from '@/components/creator/PremiumAccessModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';
import { getThumbnailUrl } from '@/lib/utils/generate-thumbnail';

interface Content {
  id: string;
  title: string;
  description: string | null;
  type: string;
  thumbnailUrl: string | null;
  viewCount: number;
  createdAt: Date;
  accessType: string;
  contentCategory: string;
  muxAssetId: string | null;
  muxPlaybackId: string | null;
  tutorialPrice?: number | null;
  collectionId?: string | null;
  collection?: {
    id: string;
    title: string;
  } | null;
}

interface CreatorLink {
  id: string;
  label: string;
  url: string;
  linkType: string;
  icon: string | null;
}

interface PriceListItem {
  id: string;
  category: string | null;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number | null;
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
}

interface CreatorPlan {
  id: string;
  name: string;
  price: number;
  description: string | null;
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
  introVideo: {
    id: string;
    title: string;
    muxAssetId: string | null;
  muxPlaybackId: string | null;
    thumbnailUrl: string | null;
    description: string | null;
  } | null;
  creatorLinks: CreatorLink[];
  priceListItems: PriceListItem[];
  availability: Availability[];
  creatorPlans: CreatorPlan[];
  platformPlan?: string | null;
}

interface PublicCreatorProfileProps {
  creator: Creator;
  regularContent: Content[];
  tutorials: Content[];
  groupedPriceList: GroupedPriceList[];
}

export function PublicCreatorProfile({
  creator,
  regularContent,
  tutorials,
  groupedPriceList,
}: PublicCreatorProfileProps) {
  const router = useRouter();
  const [priceListOpen, setPriceListOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<PriceListItem | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [premiumAccessOpen, setPremiumAccessOpen] = useState(false);
  const [selectedPremiumContent, setSelectedPremiumContent] = useState<Content | null>(null);
  const [verifiedContentIds, setVerifiedContentIds] = useState<Set<string>>(new Set());
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const getLinkIcon = (linkType: string, size: 'sm' | 'md' = 'md') => {
    const iconSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
    switch (linkType) {
      case 'instagram':
        return <Instagram className={iconSize} />;
      case 'youtube':
        return <Youtube className={iconSize} />;
      case 'twitter':
        return <Twitter className={iconSize} />;
      case 'tiktok':
        return <span className={size === 'sm' ? 'text-lg' : 'text-xl'}>🎵</span>;
      case 'price_list':
        return <FileText className={iconSize} />;
      default:
        return <LinkIcon className={iconSize} />;
    }
  };

  const handleServiceSelect = (item: PriceListItem) => {
    // Validate that creator has availability before opening booking modal
    if (creator.availability.length === 0) {
      alert('This creator currently has no available dates for booking. Please check back later.');
      return;
    }

    setSelectedService(item);
    setPriceListOpen(false);
    setBookingOpen(true);
  };

  const handleBackToServices = () => {
    setBookingOpen(false);
    setSelectedService(null);
    setPriceListOpen(true);
  };

  const handleLinkClick = (link: CreatorLink) => {
    if (link.linkType === 'price_list') {
      setPriceListOpen(true);
    } else if (link.url && link.url !== '#price-list') {
      window.open(link.url, '_blank');
    } else {
      setPriceListOpen(true);
    }
  };

  const handleContentClick = (content: Content) => {
    if (content.collectionId) {
      router.push(`/creator/${creator.username}/tutorials?tab=paid`);
      return;
    }

    if (content.accessType === 'free') {
      // Free content - play directly
      if (content.type === 'video' && content.muxPlaybackId) {
        setPlayingVideoId(content.id);
      }
    } else {
      // Premium content - check if verified
      if (verifiedContentIds.has(content.id)) {
        // Already verified - play
        if (content.type === 'video' && content.muxPlaybackId) {
          setPlayingVideoId(content.id);
        }
      } else {
        // Need verification
        setSelectedPremiumContent(content);
        setPremiumAccessOpen(true);
      }
    }
  };

  const handlePremiumAccessVerified = (contentId: string) => {
    setVerifiedContentIds(prev => new Set([...prev, contentId]));
    setPremiumAccessOpen(false);
    // Now play the content
    const content = [...regularContent, ...tutorials].find(c => c.id === contentId);
    if (content?.type === 'video' && content?.muxPlaybackId) {
      setPlayingVideoId(contentId);
    }
  };

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setIsSubscribing(true);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          email: subscribeEmail,
        }),
      });
      
      if (response.ok) {
        setSubscribeSuccess(true);
        setSubscribeEmail('');
      }
    } catch (error) {
      console.error('Subscribe error:', error);
    }
    setIsSubscribing(false);
  }

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  const hasPriceList = creator.priceListItems.length > 0;
  const hasAvailability = creator.availability.length > 0;
  const hasPlans = creator.creatorPlans.length > 0;

  // Separate tutorials by access type
  const freeTutorials = tutorials.filter(t => t.accessType === 'free');
  const paidTutorials = tutorials.filter(t => t.accessType !== 'free');
  
  // Limit to 6 per tab
  const freeTutorialsDisplay = freeTutorials.slice(0, 6);
  const paidTutorialsDisplay = paidTutorials.slice(0, 6);
  const hasMoreFreeTutorials = freeTutorials.length > 6;
  const hasMorePaidTutorials = paidTutorials.length > 6;
  const isStarterPlan =
    !creator.platformPlan || creator.platformPlan.toUpperCase() === 'STARTER';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Banner */}
      <div className="relative h-48 md:h-64">
        {creator.bannerUrl ? (
          <img
            src={creator.bannerUrl}
            alt={`${creator.displayName} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-background via-card to-primary/20" />
        )}
      </div>

      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 relative">
        <div className="-mt-16 md:-mt-20 relative z-10">
          {/* Avatar - Left aligned, overlapping banner */}
          <div className="mb-4 h-32 w-32 flex-shrink-0 overflow-hidden rounded-full border-[3px] border-primary bg-muted md:h-36 md:w-36">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground">
                {creator.displayName.charAt(0)}
              </div>
            )}
          </div>

          {/* Info and Action Buttons Container */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Info */}
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <div>
                  <h1 className="font-display text-3xl md:text-4xl">{creator.displayName}</h1>
                  <p className="font-body text-base text-muted-foreground">@{creator.username}</p>
                </div>
                <Button variant="outline" onClick={() => setSubscribeOpen(true)} size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Subscribe
                </Button>
              </div>

              {creator.bio && (
                <p className="mb-4 text-base leading-relaxed">{creator.bio}</p>
              )}

              <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/15">
                  {creator.category}
                </Badge>
                <span>{creator.subscriberCount} Subscribers</span>
                <span>{creator.contentCount} content</span>
              </div>
            </div>

            {/* Action Buttons - Aligned at top with name */}
            <div className="flex flex-wrap gap-2">
              {hasPriceList && hasAvailability && (
                <Button
                  onClick={() => setPriceListOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-accent text-accent hover:bg-accent/10"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Service
                </Button>
              )}
              {hasPlans && (
                <Button
                  variant="default"
                  onClick={() => setSubscriptionModalOpen(true)}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Premium Subscription
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Creator Links */}
        {creator.creatorLinks.length > 0 && (
          <section className="space-y-3">
            {creator.creatorLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link)}
                className="group flex w-full items-center gap-3 overflow-hidden rounded-[var(--radius)] border border-border/70 bg-card px-4 py-3 text-left text-foreground shadow-sm transition hover:bg-muted/40"
              >
                <span className="h-8 w-1 rounded-full bg-primary" />
                <span className="text-primary">{getLinkIcon(link.linkType, 'sm')}</span>
                <span className="flex-1 font-medium">{link.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-accent" />
              </button>
            ))}
          </section>
        )}

        {/* Intro Video Section */}
        {creator.introVideo && creator.introVideo.muxPlaybackId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Introduction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <MuxVideoPlayer
                  playbackId={creator.introVideo.muxPlaybackId}
                  assetId={creator.introVideo.muxAssetId || undefined}
                  title="Creator Introduction"
                  className="w-full h-full"
                />
              </div>
              {creator.introVideo.title && (
                <h3 className="mt-4 font-semibold">{creator.introVideo.title}</h3>
              )}
              {creator.introVideo.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {creator.introVideo.description}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Subscription Plans */}
        {hasPlans && (
          <section className="space-y-4">
            <h2 className="text-2xl">Subscribe to {creator.displayName}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {creator.creatorPlans.map((plan) => (
                <Card key={plan.id} className="border-border/70 bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-2xl font-semibold text-primary">
                      {formatPrice(plan.price)}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">/month</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-primary">✓</span>
                        <span>{plan.description || 'Exclusive creator-only perks and premium access.'}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-primary">✓</span>
                        <span>Priority updates and fresh content drops.</span>
                      </li>
                    </ul>
                    <Button
                      onClick={() => setSubscriptionModalOpen(true)}
                      className="w-full border border-accent bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Services / Price List */}
        {groupedPriceList.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl">Book a Service</h2>
            <Card className="border-border/70 bg-card shadow-sm">
              <CardContent className="space-y-4 pt-6">
                {groupedPriceList.map((group, index) => (
                  <div key={`${group.category ?? 'general'}-${index}`} className="space-y-2">
                    {group.category && (
                      <h3 className="text-sm uppercase tracking-wide text-muted-foreground">
                        {group.category}
                      </h3>
                    )}
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-[var(--radius)] border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                          {item.durationMinutes && (
                            <p className="text-xs text-muted-foreground">{item.durationMinutes} min</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-primary">{formatPrice(item.price)}</span>
                          <Button
                            size="sm"
                            onClick={() => handleServiceSelect(item)}
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                          >
                            Book
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Tutorials Section with Tabs */}
        {tutorials.length > 0 && (
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BookOpen className="h-5 w-5" />
                Tutorials
              </CardTitle>
              <CardDescription>
                Learn from {creator.displayName}&apos;s tutorial videos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="free" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="free">
                    Free ({freeTutorials.length})
                  </TabsTrigger>
                  <TabsTrigger value="paid">
                    Paid ({paidTutorials.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="free" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {freeTutorialsDisplay.map((content) => (
                      <ContentCard 
                        key={content.id} 
                        content={content} 
                        onClick={() => handleContentClick(content)}
                        isVerified={verifiedContentIds.has(content.id)}
                        isPlaying={playingVideoId === content.id}
                      />
                    ))}
                  </div>
                  {hasMoreFreeTutorials && (
                    <div className="mt-6 text-center">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/creator/${creator.username}/tutorials?tab=free`)}
                      >
                        View More Free Tutorials
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="paid" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {paidTutorialsDisplay.map((content) => (
                      <ContentCard 
                        key={content.id} 
                        content={content} 
                        onClick={() => handleContentClick(content)}
                        isVerified={verifiedContentIds.has(content.id)}
                        isPlaying={playingVideoId === content.id}
                      />
                    ))}
                  </div>
                  {hasMorePaidTutorials && (
                    <div className="mt-6 text-center">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/creator/${creator.username}/tutorials?tab=paid`)}
                      >
                        View More Paid Tutorials
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Regular Content Section */}
        {regularContent.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl">Content</h2>
            <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Content
              </CardTitle>
              <CardDescription>
                Exclusive content from {creator.displayName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {regularContent.map((content) => (
                  <ContentCard 
                    key={content.id} 
                    content={content}
                    onClick={() => handleContentClick(content)}
                    isVerified={verifiedContentIds.has(content.id)}
                    isPlaying={playingVideoId === content.id}
                  />
                ))}
              </div>
            </CardContent>
            </Card>
          </section>
        )}
      </div>

      {/* Price List Modal */}
      <PriceListModal
        open={priceListOpen}
        onOpenChange={setPriceListOpen}
        priceList={groupedPriceList}
        onSelectItem={handleServiceSelect}
        creatorName={creator.displayName}
      />

      {/* Booking Modal */}
      {selectedService && (
        <BookingModal
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          selectedService={selectedService}
          creatorId={creator.id}
          creatorName={creator.displayName}
          availableDates={creator.availability}
          onBack={handleBackToServices}
        />
      )}

      {/* Subscription Modal (Paid Plans) */}
      <SubscriptionModal
        open={subscriptionModalOpen}
        onOpenChange={setSubscriptionModalOpen}
        creator={creator}
        plans={creator.creatorPlans}
      />

      {/* Premium Access Modal */}
      {selectedPremiumContent && (
        <PremiumAccessModal
          open={premiumAccessOpen}
          onOpenChange={setPremiumAccessOpen}
          content={selectedPremiumContent}
          creatorName={creator.displayName}
          onVerified={handlePremiumAccessVerified}
        />
      )}

      {/* Video Player Modal */}
      <Dialog open={!!playingVideoId} onOpenChange={() => setPlayingVideoId(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {playingVideoId && (() => {
            const content = [...regularContent, ...tutorials].find(c => c.id === playingVideoId);
            if (!content?.muxPlaybackId) return null;
            return (
              <>
                <div className="aspect-video bg-black">
                  <MuxVideoPlayer
                    playbackId={content.muxPlaybackId}
                    assetId={content.muxAssetId || undefined}
                    title={content.title}
                    className="w-full h-full"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{content.title}</h3>
                  {content.description && (
                    <p className="text-sm text-muted-foreground mt-1">{content.description}</p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Subscribe Dialog (Email Newsletter) */}
      <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {creator.displayName}</DialogTitle>
            <DialogDescription>
              Get notified about new content and updates
            </DialogDescription>
          </DialogHeader>
          {subscribeSuccess ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-semibold">You&apos;re subscribed!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check your email for confirmation.
              </p>
              <div className="mt-4">
                <NextLink
                  href="/fan/dashboard"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  View your fan dashboard →
                </NextLink>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                required
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubscribing} className="w-full">
                  {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {isStarterPlan && (
        <div className="w-full border-t border-border mt-16 py-6 flex flex-col items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group"
          >
            <span className="text-muted-foreground text-sm">Powered by</span>
            <span className="font-display text-lg font-bold text-primary group-hover:opacity-80 transition-opacity">
              Foleio
            </span>
            <span className="text-primary text-lg">●</span>
          </a>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            The home for Nigerian creators — sell content, offer services, and build your world.
          </p>
          <a
            href="/signup"
            className="text-xs font-medium text-accent underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Are you a creator? Start your Foleio →
          </a>
        </div>
      )}
    </div>
  );
}

// Content Card Component
interface ContentCardProps {
  content: Content;
  onClick: () => void;
  isVerified: boolean;
  isPlaying: boolean;
}

function ContentCard({ content, onClick, isVerified, isPlaying }: ContentCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const isPremium = content.accessType !== 'free';
  const showLock = isPremium && !isVerified;
  const showPlayIcon = content.type === 'video';
  const isCollectionContent = Boolean(content.collectionId && content.collection);
  const thumbnailUrl = getThumbnailUrl({
    id: content.id,
    title: content.title,
    thumbnailUrl: content.thumbnailUrl,
  });

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div className="relative aspect-video overflow-hidden rounded-[var(--radius)] bg-muted shadow-sm">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={content.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <DefaultThumbnail title={content.title} />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          {showLock ? (
            <Lock className="h-12 w-12 text-primary" />
          ) : showPlayIcon ? (
            <Play className="h-12 w-12 text-primary" />
          ) : (
            <Eye className="h-10 w-10 text-primary" />
          )}
        </div>
        <div className="absolute top-2 right-2">
          {isCollectionContent ? (
            <Badge variant="outline" className="bg-background/80">
              <BookOpen className="h-3 w-3 mr-1" />
              {content.collection?.title}
            </Badge>
          ) : (
            <Badge variant={content.accessType === 'free' ? 'secondary' : 'default'}>
              {content.accessType === 'free'
                ? 'Free'
                : content.tutorialPrice && content.tutorialPrice > 0
                  ? formatPrice(content.tutorialPrice)
                  : 'Premium'}
            </Badge>
          )}
        </div>
        {showLock && (
          <div className="absolute bottom-2 left-2">
            <Lock className="h-4 w-4 text-white drop-shadow-md" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <h4 className="font-medium line-clamp-1">{content.title}</h4>
        {isCollectionContent ? (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Subscribe to {content.collection?.title} to access
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {getTypeIcon(content.type)}
          {content.viewCount} views
        </p>
      </div>
    </div>
  );
}

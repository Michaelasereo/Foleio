'use client';

import { useState } from 'react';
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
  Link,
  Mail,
  Play,
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
        return <Link className={iconSize} />;
    }
  };

  const handleServiceSelect = (item: PriceListItem) => {
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

  // Separate links - price list link is special (full width), social links are just icons
  const priceListLink = creator.creatorLinks.find(l => l.linkType === 'price_list');
  const socialLinks = creator.creatorLinks.filter(l => l.linkType !== 'price_list');

  // Separate tutorials by access type
  const freeTutorials = tutorials.filter(t => t.accessType === 'free');
  const paidTutorials = tutorials.filter(t => t.accessType !== 'free');
  
  // Limit to 6 per tab
  const freeTutorialsDisplay = freeTutorials.slice(0, 6);
  const paidTutorialsDisplay = paidTutorials.slice(0, 6);
  const hasMoreFreeTutorials = freeTutorials.length > 6;
  const hasMorePaidTutorials = paidTutorials.length > 6;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/10 relative">
        {creator.bannerUrl && (
          <img
            src={creator.bannerUrl}
            alt={`${creator.displayName} banner`}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 relative">
        <div className="-mt-16 md:-mt-20 relative z-10">
          {/* Avatar - Left aligned, overlapping banner */}
          <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-background bg-muted overflow-hidden flex-shrink-0 mb-4">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                {creator.displayName.charAt(0)}
              </div>
            )}
          </div>

          {/* Info and Action Buttons Container */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Info */}
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{creator.displayName}</h1>
                  <p className="text-muted-foreground text-base">@{creator.username}</p>
                </div>
                <Button variant="outline" onClick={() => setSubscribeOpen(true)} size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Subscribe
                </Button>
              </div>

              {creator.bio && (
                <p className="mb-4 text-base leading-relaxed">{creator.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <Badge variant="secondary">{creator.category}</Badge>
                <span>{creator.subscriberCount} Subscribers</span>
                <span>{creator.contentCount} content</span>
              </div>
            </div>

            {/* Action Buttons - Aligned at top with name */}
            <div className="flex flex-wrap gap-2">
              {hasPriceList && hasAvailability && (
                <Button onClick={() => setPriceListOpen(true)} variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Service
                </Button>
              )}
              {hasPlans && (
                <Button
                  variant="default"
                  onClick={() => setSubscriptionModalOpen(true)}
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
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
        {/* Price List Link - Above Intro Video */}
        {priceListLink && (
          <button
            onClick={() => setPriceListOpen(true)}
            className="w-full p-4 rounded-lg border bg-card hover:bg-accent transition-colors flex items-center gap-3 text-foreground"
          >
            {getLinkIcon(priceListLink.linkType, 'md')}
            <span className="font-medium flex-1 text-left">{priceListLink.label}</span>
            <ExternalLink className="h-4 w-4 opacity-50" />
          </button>
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

        {/* Social Links - After Intro Video, Center Aligned */}
        {socialLinks.length > 0 && (
          <div className="flex items-center justify-center gap-6">
            {socialLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link)}
                className="text-foreground hover:text-primary transition-colors"
                aria-label={link.label}
                title={link.label}
              >
                {getLinkIcon(link.linkType, 'sm')}
              </button>
            ))}
          </div>
        )}

        {/* Tutorials Section with Tabs */}
        {tutorials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
          <Card>
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

  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
        {content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getTypeIcon(content.type)}
          </div>
        )}
        {content.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            {showLock ? (
              <Lock className="h-12 w-12 text-white" />
            ) : (
              <Play className="h-12 w-12 text-white" />
            )}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={content.accessType === 'free' ? 'secondary' : 'default'}>
            {content.accessType === 'free' ? 'Free' : 'Premium'}
          </Badge>
        </div>
        {showLock && (
          <div className="absolute bottom-2 left-2">
            <Lock className="h-4 w-4 text-white drop-shadow-md" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <h4 className="font-medium line-clamp-1">{content.title}</h4>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {getTypeIcon(content.type)}
          {content.viewCount} views
        </p>
      </div>
    </div>
  );
}

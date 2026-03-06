'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  Play,
  Lock,
  Video,
  Clock,
  Users,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { CollectionSubscriptionModal } from './CollectionSubscriptionModal';
import { getStoredVerifiedAccess, storeVerifiedAccess } from '@/lib/utils/tutorial-access';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';

interface Content {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  type: string;
  videoId: string | null;
  durationSeconds: number | null;
  viewCount: number;
  accessType: string;
}

interface SectionContent {
  id: string;
  orderIndex: number;
  content: Content;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  sectionContents: SectionContent[];
  subsections?: Section[];
}

interface Collection {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: number | null;
  subscriptionPrice: number | null;
  subscriptionType: string | null;
  accessType: string;
  enrolledCount: number;
  viewCount: number;
  tutorialCount: number;
  totalDuration: number;
  sections: Section[];
  tutorialContents: Content[];
}

interface Creator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface PublicCollectionPageProps {
  creator: Creator;
  collection: Collection;
}

export function PublicCollectionPage({ creator, collection }: PublicCollectionPageProps) {
  const router = useRouter();
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(() => {
    const stored = getStoredVerifiedAccess('collection', collection.id);
    return !!stored;
  });
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [playingContent, setPlayingContent] = useState<Content | null>(null);

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleSubscribed = () => {
    setIsSubscribed(true);
    storeVerifiedAccess('collection', collection.id, '');
    setSubscriptionModalOpen(false);
  };

  const handleContentClick = (content: Content) => {
    if (collection.accessType === 'free' || isSubscribed) {
      if (content.type === 'video' && content.videoId) {
        setPlayingContent(content);
        setPlayingVideoId(content.videoId);
      }
    } else {
      setSubscriptionModalOpen(true);
    }
  };

  const isFree = collection.accessType === 'free';
  const hasAccess = isFree || isSubscribed;
  const price = collection.price || collection.subscriptionPrice || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/creator/${creator.username}`)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {creator.displayName}
        </Button>

        {/* Collection Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Thumbnail */}
          {collection.thumbnailUrl && (
            <div className="md:w-1/3">
              <img
                src={collection.thumbnailUrl}
                alt={collection.title}
                className="w-full aspect-video object-cover rounded-lg"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <Badge variant="secondary" className="mb-2">
              {isFree ? 'Free Collection' : 'Premium Collection'}
            </Badge>
            <h1 className="text-3xl font-bold mb-2">{collection.title}</h1>
            {collection.description && (
              <p className="text-muted-foreground mb-4">{collection.description}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {collection.tutorialCount} tutorials
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(collection.totalDuration)}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {collection.enrolledCount} enrolled
              </div>
            </div>

            {/* Creator */}
            <div className="flex items-center gap-3 mb-6">
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt={creator.displayName}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
                  {creator.displayName.charAt(0)}
                </div>
              )}
              <span className="font-medium">{creator.displayName}</span>
            </div>

            {/* Action Button */}
            {!hasAccess && (
              <Button size="lg" onClick={() => setSubscriptionModalOpen(true)}>
                {isFree ? 'Start Learning' : `Subscribe for ${formatPrice(price)}`}
              </Button>
            )}
            {hasAccess && (
              <Badge variant="default" className="py-2 px-4">
                {isFree ? 'Free Access' : '✓ Subscribed'}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Course Content</CardTitle>
            <CardDescription>
              {collection.tutorialCount} tutorials • {formatDuration(collection.totalDuration)} total length
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Direct tutorials (not in sections) */}
            {collection.tutorialContents.length > 0 && (
              <div className="space-y-2 mb-6">
                {collection.tutorialContents.map((content, index) => (
                  <ContentRow
                    key={content.id}
                    content={content}
                    index={index + 1}
                    hasAccess={hasAccess}
                    onClick={() => handleContentClick(content)}
                  />
                ))}
              </div>
            )}

            {/* Sections */}
            {collection.sections.length > 0 && (
              <Accordion type="multiple" className="w-full">
                {collection.sections.map((section, sectionIndex) => (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <span className="font-semibold">
                          Section {sectionIndex + 1}: {section.title}
                        </span>
                        <Badge variant="outline">
                          {section.sectionContents.length + (section.subsections?.reduce((sum, s) => sum + s.sectionContents.length, 0) || 0)} lessons
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {section.sectionContents.map((sc, index) => (
                          <ContentRow
                            key={sc.id}
                            content={sc.content}
                            index={index + 1}
                            hasAccess={hasAccess}
                            onClick={() => handleContentClick(sc.content)}
                          />
                        ))}

                        {/* Subsections */}
                        {section.subsections?.map((subsection, subIndex) => (
                          <div key={subsection.id} className="ml-4 mt-4">
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <ChevronRight className="h-4 w-4" />
                              {subsection.title}
                            </h4>
                            <div className="space-y-2">
                              {subsection.sectionContents.map((sc, index) => (
                                <ContentRow
                                  key={sc.id}
                                  content={sc.content}
                                  index={index + 1}
                                  hasAccess={hasAccess}
                                  onClick={() => handleContentClick(sc.content)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription Modal */}
      <CollectionSubscriptionModal
        open={subscriptionModalOpen}
        onOpenChange={setSubscriptionModalOpen}
        collection={{
          id: collection.id,
          title: collection.title,
          description: collection.description,
          thumbnailUrl: collection.thumbnailUrl,
          price: collection.price,
          subscriptionPrice: collection.subscriptionPrice,
          subscriptionType: collection.subscriptionType,
          enrolledCount: collection.enrolledCount,
        }}
        creatorName={creator.displayName}
        onSuccess={handleSubscribed}
      />

      {/* Video Player Modal */}
      <Dialog open={!!playingVideoId} onOpenChange={() => {
        setPlayingVideoId(null);
        setPlayingContent(null);
      }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {playingVideoId && playingContent && (
            <>
              <div className="aspect-video bg-black">
                <iframe
                  src={`https://customer-${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${playingVideoId}/iframe`}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{playingContent.title}</h3>
                {playingContent.description && (
                  <p className="text-sm text-muted-foreground mt-1">{playingContent.description}</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Content Row Component
interface ContentRowProps {
  content: Content;
  index: number;
  hasAccess: boolean;
  onClick: () => void;
}

function ContentRow({ content, index, hasAccess, onClick }: ContentRowProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        hasAccess ? 'hover:bg-muted cursor-pointer' : 'opacity-75'
      }`}
      onClick={hasAccess ? onClick : undefined}
    >
      <div className="h-12 w-20 flex-shrink-0 overflow-hidden rounded">
        {content.thumbnailUrl ? (
          <img src={content.thumbnailUrl} alt={content.title} className="h-full w-full object-cover" />
        ) : (
          <DefaultThumbnail title={content.title} size="sm" />
        )}
      </div>
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
        {hasAccess ? (
          <Play className="h-4 w-4" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{content.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Video className="h-3 w-3" />
          {content.durationSeconds && formatDuration(content.durationSeconds)}
          <span>•</span>
          <span>{content.viewCount} views</span>
        </div>
      </div>
      {!hasAccess && (
        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  );
}


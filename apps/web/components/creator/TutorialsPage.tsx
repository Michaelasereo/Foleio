'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookOpen, ArrowLeft, Play, Lock, Video, Library, Flag, PlayCircle } from 'lucide-react';
import { PremiumAccessModal } from './PremiumAccessModal';
import { MuxVideoPlayer } from '@/components/ui/mux-player';
import { CollectionSubscriptionModal } from './CollectionSubscriptionModal';
import { TutorialPurchaseModal } from './TutorialPurchaseModal';
import { getStoredVerifiedAccess, storeVerifiedAccess } from '@/lib/utils/tutorial-access';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';
import { getThumbnailUrl } from '@/lib/utils/generate-thumbnail';
import { ReportContentModal } from '@/components/content/ReportContentModal';

interface Collection {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: number | null;
  subscriptionPrice: number | null;
  subscriptionType: string | null;
  enrolledCount: number;
}

interface Content {
  id: string;
  title: string;
  description: string | null;
  type: string;
  thumbnailUrl: string | null;
  viewCount: number;
  createdAt: Date;
  accessType: string;
  muxAssetId: string | null;
  muxPlaybackId: string | null;
  tutorialPrice: number | null;
  collectionId: string | null;
  collection?: Collection | null;
  durationSeconds?: number | null;
}

interface Creator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface TutorialsPageProps {
  creator: Creator;
  freeTutorials: Content[];
  paidTutorials: Content[];
  defaultTab: string;
  collections?: Collection[];
}

export function TutorialsPage({
  creator,
  freeTutorials,
  paidTutorials,
  defaultTab,
  collections = [],
}: TutorialsPageProps) {
  const router = useRouter();
  const [premiumAccessOpen, setPremiumAccessOpen] = useState(false);
  const [selectedPremiumContent, setSelectedPremiumContent] = useState<Content | null>(null);
  const [verifiedContentIds, setVerifiedContentIds] = useState<Set<string>>(new Set());
  const [verifiedCollectionIds, setVerifiedCollectionIds] = useState<Set<string>>(new Set());
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [trackedViewIds, setTrackedViewIds] = useState<Set<string>>(new Set());
  
  // Collection subscription modal state
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  
  // Tutorial purchase modal state
  const [tutorialModalOpen, setTutorialModalOpen] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState<Content | null>(null);
  const [reportContentId, setReportContentId] = useState<string | null>(null);

  useEffect(() => {
    if (!playingVideoId || trackedViewIds.has(playingVideoId)) return;
    const content = [...freeTutorials, ...paidTutorials].find((item) => item.id === playingVideoId);
    if (!content?.muxPlaybackId) return;

    const timer = window.setTimeout(() => {
      setTrackedViewIds((prev) => new Set([...prev, playingVideoId]));
      void fetch(`/api/content/${playingVideoId}/views`, { method: 'POST' }).catch(() => {});
    }, 10_000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [playingVideoId, trackedViewIds, freeTutorials, paidTutorials]);

  const handleContentClick = (content: Content) => {
    // Free content - play directly
    if (content.accessType === 'free') {
      if (content.type === 'video' && content.muxPlaybackId) {
        setPlayingVideoId(content.id);
      }
      return;
    }

    // Already verified - play
    if (verifiedContentIds.has(content.id)) {
      if (content.type === 'video' && content.muxPlaybackId) {
        setPlayingVideoId(content.id);
      }
      return;
    }

    // Check if tutorial is in a collection
    if (content.collectionId) {
      // Check if collection is verified
      if (verifiedCollectionIds.has(content.collectionId)) {
        // Collection is verified - play
        if (content.type === 'video' && content.muxPlaybackId) {
          setPlayingVideoId(content.id);
        }
        return;
      }

      // Check if there's stored access for collection
      const storedAccess = getStoredVerifiedAccess('collection', content.collectionId);
      if (storedAccess) {
        setVerifiedCollectionIds(prev => new Set([...prev, content.collectionId!]));
        if (content.type === 'video' && content.muxPlaybackId) {
          setPlayingVideoId(content.id);
        }
        return;
      }

      // Need collection subscription - find collection and show modal
      const collection = content.collection || collections.find(c => c.id === content.collectionId);
      if (collection) {
        setSelectedCollection(collection);
        setCollectionModalOpen(true);
        return;
      }
    }

    // Check for stored access for individual tutorial
    const storedTutorialAccess = getStoredVerifiedAccess('tutorial', content.id);
    if (storedTutorialAccess) {
      setVerifiedContentIds(prev => new Set([...prev, content.id]));
      if (content.type === 'video' && content.muxPlaybackId) {
        setPlayingVideoId(content.id);
      }
      return;
    }

    // Individual tutorial with price - show purchase modal
    if (content.tutorialPrice && content.tutorialPrice > 0) {
      setSelectedTutorial(content);
      setTutorialModalOpen(true);
      return;
    }

    // Fall back to premium access modal (legacy behavior)
    setSelectedPremiumContent(content);
    setPremiumAccessOpen(true);
  };

  const handlePremiumAccessVerified = (contentId: string) => {
    setVerifiedContentIds((prev) => new Set([...prev, contentId]));
    storeVerifiedAccess('tutorial', contentId, '');
    setPremiumAccessOpen(false);
    
    const content = [...freeTutorials, ...paidTutorials].find((c) => c.id === contentId);
    if (content?.type === 'video' && content?.muxPlaybackId) {
      setPlayingVideoId(contentId);
    }
  };

  const handleCollectionSubscribed = () => {
    if (selectedCollection) {
      setVerifiedCollectionIds(prev => new Set([...prev, selectedCollection.id]));
      storeVerifiedAccess('collection', selectedCollection.id, '');
    }
    setCollectionModalOpen(false);
    setSelectedCollection(null);
  };

  const handleTutorialPurchased = () => {
    if (selectedTutorial) {
      setVerifiedContentIds(prev => new Set([...prev, selectedTutorial.id]));
      storeVerifiedAccess('tutorial', selectedTutorial.id, '');
      
      if (selectedTutorial.type === 'video' && selectedTutorial.muxPlaybackId) {
        setPlayingVideoId(selectedTutorial.id);
      }
    }
    setTutorialModalOpen(false);
    setSelectedTutorial(null);
  };

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/creator/${creator.username}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          <div className="flex items-center gap-4">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
                {creator.displayName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{creator.displayName}</h1>
              <p className="text-muted-foreground">All Tutorials</p>
            </div>
          </div>
        </div>

        {/* Collections Section */}
        {collections.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5" />
                Tutorial Collections
              </CardTitle>
              <CardDescription>
                Subscribe to get access to all tutorials in a collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {collections.map((collection) => {
                  const isSubscribed = verifiedCollectionIds.has(collection.id);
                  return (
                    <div
                      key={collection.id}
                      className="rounded-lg border p-4 hover:border-primary cursor-pointer transition-all"
                      onClick={() => {
                        if (!isSubscribed) {
                          setSelectedCollection(collection);
                          setCollectionModalOpen(true);
                        }
                      }}
                    >
                      {collection.thumbnailUrl && (
                        <img
                          src={collection.thumbnailUrl}
                          alt={collection.title}
                          className="w-full aspect-video object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-semibold">{collection.title}</h3>
                      {collection.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {collection.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                          {isSubscribed ? 'Subscribed' : formatPrice(collection.price || collection.subscriptionPrice || 0)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {collection.enrolledCount} enrolled
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tutorials with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Tutorials
            </CardTitle>
            <CardDescription>
              Browse all tutorial videos from {creator.displayName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="free">
                  Free ({freeTutorials.length})
                </TabsTrigger>
                <TabsTrigger value="paid">
                  Paid ({paidTutorials.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="free" className="mt-6">
                {freeTutorials.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No free tutorials available.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {freeTutorials.map((content) => (
                      <TutorialCard
                        key={content.id}
                        content={content}
                        onClick={() => handleContentClick(content)}
                        isVerified={verifiedContentIds.has(content.id) || (content.collectionId ? verifiedCollectionIds.has(content.collectionId) : false)}
                        isPlaying={playingVideoId === content.id}
                        collection={content.collection}
                        onCollectionClick={() => {
                          const targetCollection =
                            content.collection ||
                            collections.find((c) => c.id === content.collectionId);
                          if (targetCollection) {
                            setSelectedCollection(targetCollection);
                            setCollectionModalOpen(true);
                          }
                        }}
                        onReport={() => setReportContentId(content.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="paid" className="mt-6">
                {paidTutorials.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No paid tutorials available.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {paidTutorials.map((content) => (
                      <TutorialCard
                        key={content.id}
                        content={content}
                        onClick={() => handleContentClick(content)}
                        isVerified={verifiedContentIds.has(content.id) || (content.collectionId ? verifiedCollectionIds.has(content.collectionId) : false)}
                        isPlaying={playingVideoId === content.id}
                        collection={content.collection}
                        onCollectionClick={() => {
                          const targetCollection =
                            content.collection ||
                            collections.find((c) => c.id === content.collectionId);
                          if (targetCollection) {
                            setSelectedCollection(targetCollection);
                            setCollectionModalOpen(true);
                          }
                        }}
                        onReport={() => setReportContentId(content.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Premium Access Modal (legacy) */}
      {selectedPremiumContent && (
        <PremiumAccessModal
          open={premiumAccessOpen}
          onOpenChange={setPremiumAccessOpen}
          content={selectedPremiumContent}
          creatorName={creator.displayName}
          onVerified={handlePremiumAccessVerified}
        />
      )}

      {/* Collection Subscription Modal */}
      {selectedCollection && (
        <CollectionSubscriptionModal
          open={collectionModalOpen}
          onOpenChange={setCollectionModalOpen}
          collection={selectedCollection}
          creatorName={creator.displayName}
          onSuccess={handleCollectionSubscribed}
        />
      )}

      {/* Tutorial Purchase Modal */}
      {selectedTutorial && (
        <TutorialPurchaseModal
          open={tutorialModalOpen}
          onOpenChange={setTutorialModalOpen}
          tutorial={{
            id: selectedTutorial.id,
            title: selectedTutorial.title,
            description: selectedTutorial.description,
            thumbnailUrl: selectedTutorial.thumbnailUrl,
            tutorialPrice: selectedTutorial.tutorialPrice,
            durationSeconds: selectedTutorial.durationSeconds || null,
          }}
          creatorName={creator.displayName}
          onSuccess={handleTutorialPurchased}
        />
      )}

      {/* Video Player Modal */}
      <Dialog open={!!playingVideoId} onOpenChange={() => setPlayingVideoId(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Tutorial video player</DialogTitle>
          <DialogDescription className="sr-only">
            Watch the selected tutorial video in a modal player.
          </DialogDescription>
          {playingVideoId && (() => {
            const content = [...freeTutorials, ...paidTutorials].find(
              (c) => c.id === playingVideoId
            );
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

      {reportContentId ? (
        <ReportContentModal
          open={Boolean(reportContentId)}
          onOpenChange={(open) => {
            if (!open) setReportContentId(null);
          }}
          contentId={reportContentId}
        />
      ) : null}
    </div>
  );
}

// Tutorial Card Component
interface TutorialCardProps {
  content: Content;
  onClick: () => void;
  isVerified: boolean;
  isPlaying: boolean;
  collection?: Collection | null;
  onCollectionClick?: () => void;
  onReport: () => void;
}

function TutorialCard({
  content,
  onClick,
  isVerified,
  isPlaying,
  collection,
  onCollectionClick,
  onReport,
}: TutorialCardProps) {
  const isPremium = content.accessType !== 'free';
  const showLock = isPremium && !isVerified;
  const generatedThumbnailUrl = content.muxPlaybackId
    ? `https://image.mux.com/${content.muxPlaybackId}/thumbnail.jpg`
    : null;
  const thumbnailUrl = getThumbnailUrl({
    id: content.id,
    title: content.title,
    thumbnailUrl: content.thumbnailUrl || generatedThumbnailUrl,
  });

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(event) => {
              if (content.muxPlaybackId) {
                event.currentTarget.src = `https://image.mux.com/${content.muxPlaybackId}/thumbnail.jpg?time=0`;
                return;
              }
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <PlayCircle className="w-12 h-12 text-muted-foreground opacity-40" />
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
        <div className="absolute top-2 right-2 flex gap-1">
          {collection && (
            <Badge variant="outline" className="bg-background/80">
              <Library className="h-3 w-3 mr-1" />
              {collection.title}
            </Badge>
          )}
          {!collection && content.tutorialPrice && content.tutorialPrice > 0 && (
            <Badge variant="default" className="bg-primary">
              {formatPrice(content.tutorialPrice)}
            </Badge>
          )}
          {content.accessType === 'free' && (
            <Badge variant="secondary">Free</Badge>
          )}
        </div>
        {showLock && (
          <div className="absolute bottom-2 left-2">
            <Lock className="h-4 w-4 text-white drop-shadow-md" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <h4 className="font-medium line-clamp-2">{content.title}</h4>
        {collection ? (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>
              Subscribe to{' '}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCollectionClick?.();
                }}
                className="text-primary underline underline-offset-2"
              >
                {collection.title}
              </button>{' '}
              to access
            </span>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Video className="h-3 w-3" />
          {content.viewCount} views
        </p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReport();
          }}
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-red-500"
        >
          <Flag className="h-3 w-3" />
          Report
        </button>
      </div>
    </div>
  );
}

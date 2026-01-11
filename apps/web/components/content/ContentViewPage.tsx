'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MuxVideoPlayer } from '@/components/ui/mux-player';
import {
  Calendar,
  Eye,
  Heart,
  Share2,
  Download,
  ArrowLeft,
  Clock,
  User,
  BookOpen,
  Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@odim/utils';

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
  collection?: {
    id: string;
    title: string;
    description: string | null;
  } | null;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    category: string;
  };
}

interface Creator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  category: string;
}

interface ContentViewPageProps {
  content: Content;
  creator: Creator;
  hasAccess: boolean;
  isCreatorView?: boolean; // Whether this is viewed from creator dashboard
}

export function ContentViewPage({ content, creator, hasAccess, isCreatorView = false }: ContentViewPageProps) {
  console.log('ContentViewPage content:', {
    id: content.id,
    type: content.type,
    muxPlaybackId: content.muxPlaybackId,
    muxAssetId: content.muxAssetId,
    title: content.title,
    hasAccess
  });

  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.description || '',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      // You could show a toast here
    }
  };

  const renderContent = () => {
    if (!hasAccess) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">Premium Content</h3>
          <p className="text-muted-foreground mb-4">
            This content requires access to view.
          </p>
          <Button>Unlock Content</Button>
        </div>
      );
    }

    switch (content.type) {
      case 'video':
        return (
          <div className="space-y-4">
            {content.muxPlaybackId ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <MuxVideoPlayer
                  playbackId={content.muxPlaybackId}
                  assetId={content.muxAssetId || undefined}
                  title={content.title}
                  className="w-full h-full"
                />
                {/* Debug info */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-1 rounded">
                  PlaybackID: {content.muxPlaybackId ? '✅' : '❌'}
                  AssetID: {content.muxAssetId ? '✅' : '❌'}
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-muted-foreground/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎬</span>
                  </div>
                  <p className="text-muted-foreground">Video is processing...</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            {content.thumbnailUrl && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={content.thumbnailUrl}
                  alt={content.title}
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>
        );

      case 'pdf':
        return (
          <div className="space-y-4">
            <div className="bg-muted p-8 rounded-lg text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="font-semibold mb-2">{content.title}</h3>
              <p className="text-muted-foreground mb-4">
                PDF documents require download to view.
              </p>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div className="prose prose-gray max-w-none">
              <div className="whitespace-pre-wrap">
                {content.description || 'No content available.'}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Unsupported content type</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium">
                    {creator.displayName.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{creator.displayName}</p>
                <p className="text-xs text-muted-foreground">@{creator.username}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
                  {content.description && (
                    <p className="text-lg text-muted-foreground">{content.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {content.viewCount} views
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(content.createdAt)}
                </div>
                <Badge variant="outline">{content.type}</Badge>
                <Badge variant={content.accessType === 'free' ? 'secondary' : 'default'}>
                  {content.accessType === 'free' ? 'Free' : 'Premium'}
                </Badge>
              </div>
            </div>

            {/* Content Display */}
            <Card>
              <CardContent className="p-0">
                {renderContent()}
              </CardContent>
            </Card>

            {/* Actions */}
            {isCreatorView ? (
              // Creator Dashboard View - Analytics & Management
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    {content.viewCount} total views
                  </Button>
                  <Badge variant="secondary">
                    <Star className="h-3 w-3 mr-1" />
                    Analytics
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Edit Content
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Link
                  </Button>
                </div>
              </div>
            ) : (
              // Public View - Engagement Actions
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>

                  {hasAccess && content.type === 'pdf' && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Heart className="h-4 w-4 mr-2" />
                    Like
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Creator Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Creator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {creator.avatarUrl ? (
                      <img
                        src={creator.avatarUrl}
                        alt={creator.displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-medium">
                        {creator.displayName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{creator.displayName}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {creator.category}
                    </p>
                    {creator.bio && (
                      <p className="text-sm text-muted-foreground">
                        {creator.bio}
                      </p>
                    )}
                  </div>
                </div>

                <hr className="my-4 border-border" />

                <Button
                  className="w-full"
                  onClick={() => router.push(`/${creator.username}`)}
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>

            {/* Collection Info */}
            {content.collection && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Part of Collection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <h3 className="font-semibold mb-1">{content.collection.title}</h3>
                    {content.collection.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {content.collection.description}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/creator/${creator.username}/collections/${content.collection!.id}`)}
                    >
                      View Collection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Content or Actions */}
            <Card>
              <CardHeader>
                <CardTitle>More from {creator.displayName}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/${creator.username}`)}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Explore More Content
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

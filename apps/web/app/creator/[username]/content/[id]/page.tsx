import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { ContentViewPage } from '@/components/content/ContentViewPage';
import type { Metadata } from 'next';

async function getPublicContent(username: string, id: string) {
  const creator = await prisma.creator.findUnique({
    where: { username, isPublic: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      category: true,
    },
  });

  if (!creator) {
    return { creator: null, content: null };
  }

  const content = await prisma.content.findUnique({
    where: {
      id,
      creatorId: creator.id,
      isPublished: true,
    },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          category: true,
        },
      },
      collection: {
        select: {
          id: true,
          title: true,
          description: true,
        },
      },
    },
  });

  return { creator, content };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; id: string }>;
}): Promise<Metadata> {
  const { username, id } = await params;
  const { content } = await getPublicContent(username, id);

  if (!content) {
    return {
      title: 'Content | Foleio',
    };
  }

  const fallbackOgImage = '/og-default.png';

  return {
    title: content.title,
    openGraph: {
      title: content.title,
      images: content.thumbnailUrl ? [content.thumbnailUrl] : [fallbackOgImage],
    },
  };
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ username: string; id: string }>;
}) {
  const { username, id } = await params;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Find creator and content
  const { creator, content } = await getPublicContent(username, id);

  if (!creator) {
    notFound();
  }

  console.log('Fetching content:', { id, creatorId: creator.id, username });

  console.log('Content data from database:', {
    id: content?.id,
    title: content?.title,
    muxPlaybackId: content?.muxPlaybackId,
    muxAssetId: content?.muxAssetId,
    type: content?.type
  });

  if (!content) {
    console.log('Content not found');
    notFound();
  }

  // Check access permissions
  const hasAccess = await checkContentAccess(content, session);

  if (!hasAccess) {
    // For premium content, redirect to access page or show preview
    if (content.accessType !== 'free') {
      return <PremiumContentGate content={content} creator={creator} />;
    }
  }

  // Increment view count (but not for the creator viewing their own content)
  if (session?.user?.id !== creator.id) {
    try {
      await prisma.content.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      // Track analytics
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content_view',
          contentId: id,
          userId: session?.user?.id,
        }),
      });
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  }

  return (
    <ContentViewPage
      content={content}
      creator={creator}
      hasAccess={hasAccess}
      isCreatorView={session?.user?.id === creator.id}
    />
  );
}

async function checkContentAccess(content: any, session: any): Promise<boolean> {
  // Free content is always accessible
  if (content.accessType === 'free') {
    return true;
  }

  // If user is not logged in, they don't have access to premium content
  if (!session?.user) {
    return false;
  }

  // Creator has access to their own content
  if (session.user.id === content.creatorId) {
    return true;
  }

  // Collection content inherits collection subscription access
  if (content.collectionId) {
    const userEmail = (session.user.email || '').toLowerCase();
    if (!userEmail) {
      return false;
    }

    const collectionSubscription = await prisma.collectionSubscription.findUnique({
      where: {
        collectionId_email: {
          collectionId: content.collectionId,
          email: userEmail,
        },
      },
    });

    return Boolean(collectionSubscription && collectionSubscription.status === 'active');
  }

  // Check subscription access
  if (content.accessType === 'subscription') {
    const subscription = await prisma.fanSubscription.findFirst({
      where: {
        fanId: session.user.id,
        creatorId: content.creatorId,
        status: 'active',
      },
    });

    if (subscription) {
      return true;
    }
  }

  // Check one-time purchase access for standalone tutorials
  if (content.accessType === 'one_time') {
    const purchase = await prisma.tutorialPurchase.findFirst({
      where: {
        contentId: content.id,
        email: (session.user.email || '').toLowerCase(),
      },
    });

    if (purchase) {
      return true;
    }
  }

  return false;
}

function PremiumContentGate({ content, creator }: { content: any; creator: any }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">🔒</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-2">Premium Content</h1>
            <p className="text-muted-foreground">
              This content requires a subscription or purchase to view.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg max-w-md mx-auto">
            <h3 className="font-semibold mb-2">{content.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {content.description}
            </p>

            <div className="space-y-3">
              {content.collectionId && content.collection ? (
                <button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors">
                  Subscribe to {content.collection.title} to Access
                </button>
              ) : null}

              {!content.collectionId && content.accessType === 'subscription' && (
                <button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors">
                  Subscribe to {creator.displayName}
                </button>
              )}

              {!content.collectionId && content.accessType === 'one_time' && (
                <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                  Purchase Content
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

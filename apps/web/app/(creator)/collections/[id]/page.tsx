import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Users, BookOpen, Eye, DollarSign } from 'lucide-react';
import { CollectionSectionManager } from '@/components/creator/CollectionSectionManager';
import { CollectionPricingForm } from '@/components/creator/CollectionPricingForm';

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  let creator: Awaited<ReturnType<typeof prisma.creator.findUnique>> = null;
  try {
    creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
    });
  } catch {
    console.warn('Collection detail creator lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Collection</h1>
        <p className="text-muted-foreground">
          We could not load this collection right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Collection</h1>
        <p className="text-muted-foreground">
          Finish setting up your creator profile in Settings to manage your
          collection details.
        </p>
      </div>
    );
  }

  let collection: any = null;
  try {
    collection = await prisma.collection.findFirst({
      where: {
        id,
        creatorId: creator.id,
      },
      include: {
        sections: {
          where: {
            parentSectionId: null, // Only top-level sections
          },
          include: {
            subsections: {
              include: {
                sectionContents: {
                  include: {
                    content: true,
                  },
                  orderBy: {
                    orderIndex: 'asc',
                  },
                },
              },
              orderBy: {
                orderIndex: 'asc',
              },
            },
            sectionContents: {
              include: {
                content: true,
              },
              orderBy: {
                orderIndex: 'asc',
              },
            },
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
        tutorialContents: {
          select: {
            id: true,
            title: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  } catch {
    console.warn('Collection detail lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Collection</h1>
        <p className="text-muted-foreground">
          We could not load this collection right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  if (!collection) {
    redirect('/collections');
  }

  // Get all content for adding to sections
  let allContent: Awaited<ReturnType<typeof prisma.content.findMany>> = [];
  try {
    allContent = await prisma.content.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    console.warn('Collection content lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Collection</h1>
        <p className="text-muted-foreground">
          We could not load this collection right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  // Calculate stats
  const activeSubscribers = collection.subscriptions.filter((s: any) => s.status === 'active').length;
  const totalTutorials = collection.tutorialContents.length;

  const formatPrice = (priceInKobo: number | null) => {
    if (!priceInKobo) return 'Free';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/content" className="text-muted-foreground hover:text-foreground">
              Content
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{collection.title}</span>
          </div>
          <h1 className="text-3xl font-bold">{collection.title}</h1>
          {collection.description && (
            <p className="text-muted-foreground mt-2">{collection.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant={collection.isPublished ? 'default' : 'secondary'}>
          {collection.isPublished ? 'Published' : 'Draft'}
        </Badge>
        <Badge variant="outline">
          {collection.accessType === 'free' ? 'Free' : formatPrice(collection.price || collection.subscriptionPrice)}
        </Badge>
        {collection.subscriptionType && collection.subscriptionType !== 'one_time' && (
          <Badge variant="outline">Monthly</Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscribers}</div>
            <p className="text-xs text-muted-foreground">Active subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collection.enrolledCount}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tutorials</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTutorials}</div>
            <p className="text-xs text-muted-foreground">In collection</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collection.viewCount}</div>
            <p className="text-xs text-muted-foreground">Total views</p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Settings */}
      <CollectionPricingForm
        collectionId={collection.id}
        initialData={{
          accessType: collection.accessType,
          price: collection.price ? collection.price / 100 : null,
          subscriptionPrice: collection.subscriptionPrice ? collection.subscriptionPrice / 100 : null,
          subscriptionType: collection.subscriptionType || 'one_time',
          isPublished: collection.isPublished,
        }}
      />

      {/* Sections Management */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Content</CardTitle>
          <CardDescription>
            Manage sections and add tutorials to this collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CollectionSectionManager
            collectionId={collection.id}
            sections={collection.sections}
            allContent={allContent}
          />
        </CardContent>
      </Card>
    </div>
  );
}

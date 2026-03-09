import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewCollectionButton } from '@/components/creator/NewCollectionButton';

export default async function CollectionsPage() {
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
    console.warn('Collections page creator lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Collections</h1>
        <p className="text-muted-foreground">
          We could not load your collections right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Collections</h1>
        <p className="text-muted-foreground">
          Finish setting up your creator profile in Settings to manage
          collections.
        </p>
      </div>
    );
  }

  let collections: any[] = [];
  try {
    collections = await prisma.collection.findMany({
      where: { creatorId: creator.id },
      include: {
        _count: {
          select: {
            tutorialContents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    console.warn('Collections page data lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Collections</h1>
        <p className="text-muted-foreground">
          We could not load your collections right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted-foreground">
            Organize your content into courses and playlists with sections
          </p>
        </div>
        <NewCollectionButton platformPlan={creator.platformPlan ?? null} />
      </div>

      {collections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No collections yet. Create your first collection to organize your content!
            </p>
            <NewCollectionButton platformPlan={creator.platformPlan ?? null} label="Create Collection" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection: any) => {
            const totalContent = Number(collection._count?.tutorialContents || 0);
            const sectionCount = Number(collection.sectionCount || 0);

            return (
              <Card key={collection.id} className="hover:shadow-lg transition-shadow">
                <Link href={`/collections/${collection.id}`}>
                  {collection.thumbnailUrl && (
                    <div className="aspect-video bg-muted relative">
                      <img
                        src={collection.thumbnailUrl}
                        alt={collection.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{collection.title}</CardTitle>
                    {collection.description && (
                      <CardDescription className="line-clamp-2">
                        {collection.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <Badge variant="outline">
                        {sectionCount} section{sectionCount !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant={collection.isPublished ? 'default' : 'secondary'}>
                        {collection.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{sectionCount} sections</span>
                        <span>·</span>
                        <span>{totalContent} videos</span>
                      </div>
                      <span>{new Date(collection.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-4">
                      <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                        Manage →
                      </span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Video, Eye, Calendar } from 'lucide-react';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';

export default async function TutorialsPage() {
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
    console.warn('Tutorials page creator lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Tutorials</h1>
        <p className="text-muted-foreground">
          We could not load your tutorials right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Tutorials</h1>
        <p className="text-muted-foreground">
          Finish setting up your creator profile in Settings to manage
          tutorials.
        </p>
      </div>
    );
  }

  // Fetch only tutorial content
  let tutorials: Awaited<ReturnType<typeof prisma.content.findMany>> = [];
  try {
    tutorials = await prisma.content.findMany({
      where: {
        creatorId: creator.id,
        contentCategory: 'tutorial',
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    console.warn('Tutorials page data lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Tutorials</h1>
        <p className="text-muted-foreground">
          We could not load your tutorials right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tutorials</h1>
          <p className="text-muted-foreground">
            Manage your tutorial content that appears on your public profile
          </p>
        </div>
        <Link href="/content/new?category=tutorial">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Tutorial
          </Button>
        </Link>
      </div>

      {tutorials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No tutorials yet</h3>
            <p className="text-muted-foreground mb-4">
              Create tutorial content to showcase your expertise on your public profile.
            </p>
            <Link href="/content/new?category=tutorial">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Tutorial
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tutorials.map((tutorial: typeof tutorials[0]) => (
            <Card key={tutorial.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {tutorial.thumbnailUrl ? (
                  <img
                    src={tutorial.thumbnailUrl}
                    alt={tutorial.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <DefaultThumbnail title={tutorial.title} />
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={tutorial.isPublished ? 'default' : 'secondary'}>
                    {tutorial.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-4">
                <h3 className="font-semibold line-clamp-1">{tutorial.title}</h3>
                {tutorial.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {tutorial.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {tutorial.viewCount} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(tutorial.createdAt)}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/content/${tutorial.id}/edit`}>Edit</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    {tutorial.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


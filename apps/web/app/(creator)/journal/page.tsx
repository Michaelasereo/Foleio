import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Plus, Share2 } from 'lucide-react';

function formatDate(value: Date | null) {
  if (!value) return 'Draft';
  return new Date(value).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: { id: true, username: true, displayName: true },
  });
  if (!creator) redirect('/settings');

  const entries = await prisma.journalEntry.findMany({
    where: { creatorId: creator.id },
    orderBy: [{ updatedAt: 'desc' }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Journal</h1>
          <p className="text-muted-foreground">Write public stories and insights for your audience.</p>
        </div>
        <Link href="/journal/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New entry
          </Button>
        </Link>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 opacity-30" />
            <p className="mb-4 text-muted-foreground">No journal entries yet.</p>
            <Link href="/journal/new">
              <Button>Create your first entry</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>{entry.title}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {entry.isPublished ? 'Published' : 'Draft'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {formatDate(entry.publishedAt)} · {entry.readTime} min read · {entry.viewCount} views
                </p>
                <div className="flex items-center gap-2">
                  {entry.isPublished ? (
                    <Link href={`/creator/${creator.username}/journal/${entry.slug}`} target="_blank">
                      <Button size="sm" variant="outline">
                        <Share2 className="mr-1 h-3.5 w-3.5" />
                        View public
                      </Button>
                    </Link>
                  ) : null}
                  <Link href={`/journal/${entry.id}/edit`}>
                    <Button size="sm">Edit</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

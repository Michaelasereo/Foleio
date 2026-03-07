import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@foleio/database';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JournalViewTracker } from '@/components/journal/JournalViewTracker';
import { JournalShareActions } from '@/components/journal/JournalShareActions';

type Params = { username: string; slug: string };

async function getEntry(username: string, slug: string) {
  const creator = await prisma.creator.findUnique({
    where: { username, isPublic: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
    },
  });
  if (!creator) return null;

  const entry = await prisma.journalEntry.findFirst({
    where: { creatorId: creator.id, slug, isPublished: true },
  });
  if (!entry) return null;

  return { creator, entry };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const data = await getEntry(username, slug);
  if (!data) {
    return { title: 'Journal Entry' };
  }

  const { creator, entry } = data;
  return {
    title: `${entry.title} — ${creator.displayName}`,
    description:
      entry.subtitle ||
      entry.content.replace(/<[^>]*>/g, '').slice(0, 160),
    openGraph: {
      title: entry.title,
      description: entry.subtitle || undefined,
      images: entry.coverImage
        ? [entry.coverImage]
        : ['/og-default.png'],
      type: 'article',
      publishedTime: entry.publishedAt?.toISOString(),
    },
  };
}

function formatDate(value: Date | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function PublicJournalEntryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username, slug } = await params;
  const data = await getEntry(username, slug);
  if (!data) notFound();

  const { creator, entry } = data;
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/creator/${creator.username}/journal/${entry.slug}`;

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <JournalViewTracker entryId={entry.id} />

      <Link
        href={`/creator/${creator.username}`}
        className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {creator.displayName}&apos;s profile
      </Link>

      {entry.tags?.[0] ? (
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">
          {entry.tags[0]}
        </span>
      ) : null}
      <h1 className="mt-2 mb-3 text-4xl font-bold font-display leading-tight text-foreground">
        {entry.title}
      </h1>
      {entry.subtitle ? (
        <p className="mb-6 text-xl leading-relaxed text-muted-foreground">{entry.subtitle}</p>
      ) : null}

      <div className="mb-8 flex items-center justify-between border-y border-border py-4">
        <Link
          href={`/creator/${creator.username}`}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          {creator.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.avatarUrl}
              alt={creator.displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : null}
          <div>
            <p className="text-sm font-semibold text-foreground">{creator.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(entry.publishedAt)} · {entry.readTime} min read
            </p>
          </div>
        </Link>

        <JournalShareActions title={entry.title} pageUrl={pageUrl} />
      </div>

      {entry.coverImage ? (
        <div className="mb-10 aspect-[2/1] overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.coverImage} alt={entry.title} className="h-full w-full object-cover" />
        </div>
      ) : null}

      <div
        className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-p:text-foreground prose-p:leading-relaxed prose-blockquote:rounded-r-xl prose-blockquote:border-l-primary prose-blockquote:bg-orange-50 prose-blockquote:px-4 prose-blockquote:py-1 prose-a:text-primary prose-img:rounded-2xl"
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />

      <div className="mt-16 rounded-2xl border border-border bg-[#F5F0E8] p-6 text-center">
        {creator.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.avatarUrl}
            alt={creator.displayName}
            className="mx-auto mb-3 h-16 w-16 rounded-full object-cover"
          />
        ) : null}
        <p className="mb-1 font-semibold text-foreground">Written by {creator.displayName}</p>
        {creator.bio ? <p className="mb-4 text-sm text-muted-foreground">{creator.bio}</p> : null}
        <Link href={`/creator/${creator.username}`}>
          <Button>Visit {creator.displayName}&apos;s profile →</Button>
        </Link>
      </div>
    </article>
  );
}

'use client';

import Link from 'next/link';

function formatDate(value: string | Date | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function JournalEntryCard({
  entry,
  creator,
}: {
  entry: {
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    coverImage?: string | null;
    tags?: string[];
    publishedAt?: string | Date | null;
    readTime: number;
    viewCount: number;
  };
  creator: { username: string };
}) {
  return (
    <Link href={`/creator/${creator.username}/journal/${entry.slug}`}>
      <article className="group flex cursor-pointer gap-6 rounded-2xl border border-border bg-white p-6 transition-all hover:border-primary/30 hover:shadow-md">
        <div className="min-w-0 flex-1">
          {entry.tags?.[0] ? (
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {entry.tags[0]}
            </span>
          ) : null}
          <h2 className="mt-1 mb-2 line-clamp-2 text-xl font-bold font-display text-foreground transition-colors group-hover:text-primary">
            {entry.title}
          </h2>
          {entry.subtitle ? (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{entry.subtitle}</p>
          ) : null}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDate(entry.publishedAt || null)}</span>
            <span>·</span>
            <span>{entry.readTime} min read</span>
            <span>·</span>
            <span>{entry.viewCount} views</span>
          </div>
        </div>

        {entry.coverImage ? (
          <div className="h-24 w-32 flex-shrink-0 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.coverImage}
              alt={entry.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ) : null}
      </article>
    </Link>
  );
}

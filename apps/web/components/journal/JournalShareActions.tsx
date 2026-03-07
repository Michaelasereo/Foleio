'use client';

import { Link2 } from 'lucide-react';

export function JournalShareActions({
  title,
  pageUrl,
}: {
  title: string;
  pageUrl: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigator.clipboard.writeText(pageUrl)}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
        type="button"
      >
        <Link2 className="h-3.5 w-3.5" />
        Copy link
      </button>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
      >
        Share on X
      </a>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${pageUrl}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-600"
      >
        WhatsApp
      </a>
    </div>
  );
}

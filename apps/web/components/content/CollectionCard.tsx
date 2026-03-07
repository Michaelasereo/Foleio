'use client';

import { PlaySquare } from 'lucide-react';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';

interface CollectionVideo {
  id: string;
  title: string;
  thumbnailUrl: string | null;
}

interface CollectionCardProps {
  collection: {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    price: number | null;
    subscriptionPrice: number | null;
    videos: CollectionVideo[];
  };
  onClick: () => void;
}

function formatNaira(priceInKobo: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(priceInKobo / 100);
}

export function CollectionCard({ collection, onClick }: CollectionCardProps) {
  const stacked = collection.videos.slice(0, 3);
  const displayPrice = collection.subscriptionPrice || collection.price || 0;

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <div className="relative aspect-video">
        {stacked[2] ? (
          <div className="absolute inset-0 -translate-y-2 scale-[0.92] overflow-hidden rounded-xl opacity-40">
            {stacked[2].thumbnailUrl ? (
              <img
                src={stacked[2].thumbnailUrl}
                alt={stacked[2].title}
                className="h-full w-full object-cover"
              />
            ) : (
              <DefaultThumbnail title={stacked[2].title} />
            )}
          </div>
        ) : null}
        {stacked[1] ? (
          <div className="absolute inset-0 -translate-y-1 scale-[0.96] overflow-hidden rounded-xl opacity-70">
            {stacked[1].thumbnailUrl ? (
              <img
                src={stacked[1].thumbnailUrl}
                alt={stacked[1].title}
                className="h-full w-full object-cover"
              />
            ) : (
              <DefaultThumbnail title={stacked[1].title} />
            )}
          </div>
        ) : null}

        <div className="absolute inset-0 overflow-hidden rounded-xl shadow-md transition-transform group-hover:scale-[1.02]">
          {collection.thumbnailUrl ? (
            <img
              src={collection.thumbnailUrl}
              alt={collection.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <DefaultThumbnail title={collection.title} />
          )}
        </div>

        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white">
          <PlaySquare className="h-3 w-3" />
          {collection.videos.length} videos
        </div>
      </div>

      <div className="p-4">
        <h3 className="mb-1 line-clamp-2 leading-tight text-foreground font-semibold">{collection.title}</h3>
        {collection.description ? (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{collection.description}</p>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{collection.videos.length} videos</span>
          <span className="font-semibold text-primary">
            {displayPrice > 0 ? formatNaira(displayPrice) : 'Free'}
          </span>
        </div>
      </div>
    </div>
  );
}

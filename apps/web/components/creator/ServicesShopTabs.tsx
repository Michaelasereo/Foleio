'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PriceListManager } from '@/components/creator/PriceListManager';
import { CreatorShopManager } from '@/app/(creator)/services/shop/page';

type PriceListItem = {
  id: string;
  serviceType: string | null;
  category: string | null;
  name: string;
  description: string | null;
  sessionDescription: string | null;
  calendlyLink: string | null;
  price: number;
  durationMinutes: number | null;
  orderIndex: number;
  categoryOrderIndex: number;
  isActive: boolean;
};

export function ServicesShopTabs({
  creatorId,
  initialPriceList,
}: {
  creatorId: string;
  initialPriceList: PriceListItem[];
}) {
  const [tab, setTab] = useState<'services' | 'shop'>('services');

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('services')}
          className={cn(
            'rounded-lg px-5 py-2 text-sm font-medium transition-all',
            tab === 'services'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Services
        </button>
        <button
          type="button"
          onClick={() => setTab('shop')}
          className={cn(
            'rounded-lg px-5 py-2 text-sm font-medium transition-all',
            tab === 'shop'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Shop
        </button>
      </div>

      {tab === 'services' ? (
        <PriceListManager creatorId={creatorId} initialPriceList={initialPriceList} />
      ) : (
        <CreatorShopManager />
      )}
    </div>
  );
}

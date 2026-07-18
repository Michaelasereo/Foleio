'use client';

import { PriceListManager } from '@/components/creator/PriceListManager';

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

/** @deprecated Shop now lives at /shop. Kept for any lingering imports. */
export function ServicesShopTabs({
  creatorId,
  initialPriceList,
}: {
  creatorId: string;
  initialPriceList: PriceListItem[];
}) {
  return <PriceListManager creatorId={creatorId} initialPriceList={initialPriceList} />;
}

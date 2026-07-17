import { prisma } from '@foleio/database';
import { serializeForClient } from '@/lib/utils';
import { getAvailabilityWithBookings } from '@/lib/actions/availability';
import { PublicCreatorProfile } from '@/components/creator/PublicCreatorProfile';

function groupPriceListByCategory(items: Array<{ category: string | null }>) {
  const grouped: { category: string | null; items: typeof items }[] = [];
  const categoryMap: { [key: string]: typeof items } = {};
  const uncategorized: typeof items = [];

  items.forEach((item) => {
    if (item.category) {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = [];
      }
      categoryMap[item.category].push(item);
    } else {
      uncategorized.push(item);
    }
  });

  if (uncategorized.length > 0) {
    grouped.push({ category: null, items: uncategorized });
  }
  Object.entries(categoryMap).forEach(([category, categoryItems]) => {
    grouped.push({ category, items: categoryItems });
  });

  return grouped;
}

export async function PublicOfferingsSection({
  creatorId,
  creator,
  hasActiveProducts,
  requireDojahKyc,
}: {
  creatorId: string;
  creator: Record<string, unknown>;
  hasActiveProducts: boolean;
  requireDojahKyc: boolean;
}) {
  const priceListItems = await prisma.priceListItem.findMany({
    where: { creatorId, isActive: true },
    orderBy: [{ categoryOrderIndex: 'asc' }, { orderIndex: 'asc' }],
  });

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);
  const availabilityResult = await getAvailabilityWithBookings(creatorId, startDate, endDate);
  const availabilityWithCounts =
    availabilityResult.success && availabilityResult.data ? availabilityResult.data : [];

  const groupedPriceList = groupPriceListByCategory(priceListItems);

  const serializedCreator = serializeForClient({
    ...creator,
    availability: availabilityWithCounts.map((avail) => ({
      ...avail,
      date: avail.date.toISOString(),
    })),
  });

  return (
    <PublicCreatorProfile
      variant="offerings"
      creator={serializedCreator as any}
      groupedPriceList={serializeForClient(groupedPriceList) as any}
      hasActiveProducts={hasActiveProducts}
      requireDojahKyc={requireDojahKyc}
      portfolioSections={[]}
    />
  );
}

export function OfferingsSectionSkeleton() {
  return (
    <section className="foleio-public-panel" aria-busy="true" aria-label="Loading offerings">
      <div
        style={{
          height: 18,
          width: 120,
          borderRadius: 6,
          background: '#2c2c2c',
          marginBottom: 8,
          animation: 'foleio-public-pulse 1.4s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: 12,
          width: 180,
          borderRadius: 6,
          background: '#2c2c2c',
          marginBottom: 16,
          animation: 'foleio-public-pulse 1.4s ease-in-out infinite',
        }}
      />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 72,
            borderRadius: 10,
            background: '#2c2c2c',
            marginBottom: 10,
            animation: 'foleio-public-pulse 1.4s ease-in-out infinite',
          }}
        />
      ))}
    </section>
  );
}

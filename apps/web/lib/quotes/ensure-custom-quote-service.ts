import { prisma } from '@foleio/database';
import { CUSTOM_QUOTE_SERVICE_NAME } from '@/lib/quotes/helpers';

/** Hidden placeholder service so Booking.priceListItemId stays required. */
export async function ensureCustomQuoteService(creatorId: string) {
  const existing = await prisma.priceListItem.findFirst({
    where: {
      creatorId,
      pricingType: 'quote',
      name: CUSTOM_QUOTE_SERVICE_NAME,
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.priceListItem.create({
    data: {
      creatorId,
      name: CUSTOM_QUOTE_SERVICE_NAME,
      description: 'System service for custom quote bookings',
      price: 0,
      pricingType: 'quote',
      isActive: false,
      category: 'Custom',
      serviceType: 'quote',
    },
    select: { id: true },
  });
  return created.id;
}

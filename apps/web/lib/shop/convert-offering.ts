import { parseAddonCategories } from '@/lib/shop/product-addons';

export type ServiceAddonRow = { id: string; name: string; price: number };

export function productAddonsToService(addons: unknown): ServiceAddonRow[] {
  const categories = parseAddonCategories(addons);
  const flat: ServiceAddonRow[] = [];
  for (const category of categories) {
    for (const option of category.options) {
      flat.push({
        id: option.id,
        name: category.options.length === 1 ? category.name : `${category.name}: ${option.name}`,
        price: option.price,
      });
    }
  }
  return flat;
}

export function serviceAddonsToProduct(addons: unknown): ServiceAddonRow[] {
  if (!Array.isArray(addons)) return [];
  return addons
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const item = row as { id?: string; name?: string; price?: number };
      const name = String(item.name || '').trim();
      if (!name) return null;
      return {
        id: String(item.id || crypto.randomUUID()),
        name,
        price: Math.max(0, Math.floor(Number(item.price) || 0)),
      };
    })
    .filter((row): row is ServiceAddonRow => Boolean(row));
}

export const OPEN_ORDER_STATUSES = ['pending', 'confirmed', 'processing'] as const;

export const BLOCKING_BOOKING_STATUSES = [
  'cancelled',
  'refunded',
  'completed',
] as const;

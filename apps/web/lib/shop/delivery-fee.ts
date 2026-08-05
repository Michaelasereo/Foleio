/**
 * Delivery fee helpers for paid tiers with optional free thresholds (Pro).
 */

export type DeliveryFeeInput = {
  type: string;
  flatRate: number;
  minSubtotalKobo?: number | null;
  minItemQuantity?: number | null;
};

/** Pickup / customer-arranged: no street address required at checkout. */
export function isAddressOptionalDeliveryType(type: string | null | undefined): boolean {
  const value = String(type || '').toLowerCase();
  return value === 'pickup' || value === 'customer_arranged';
}

export function parseOptionalPositiveInt(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

export function deliveryConditionsMet(
  tier: DeliveryFeeInput,
  subtotalKobo: number,
  itemQuantity: number
): boolean {
  const minSub =
    tier.minSubtotalKobo != null && Number.isFinite(Number(tier.minSubtotalKobo))
      ? Math.max(0, Math.floor(Number(tier.minSubtotalKobo)))
      : null;
  const minQty =
    tier.minItemQuantity != null && Number.isFinite(Number(tier.minItemQuantity))
      ? Math.max(0, Math.floor(Number(tier.minItemQuantity)))
      : null;

  if (minSub == null && minQty == null) return false;

  const spendOk = minSub == null || subtotalKobo >= minSub;
  const qtyOk = minQty == null || itemQuantity >= minQty;
  return spendOk && qtyOk;
}

/** Fee in kobo for a selected delivery tier given cart totals. */
export function resolveDeliveryFeeKobo(
  tier: DeliveryFeeInput | null | undefined,
  subtotalKobo: number,
  itemQuantity: number
): number {
  if (!tier) return 0;
  const type = String(tier.type || 'paid').toLowerCase();
  if (type !== 'paid') return 0;
  if (deliveryConditionsMet(tier, subtotalKobo, itemQuantity)) return 0;
  return Math.max(0, Math.round(Number(tier.flatRate) || 0));
}

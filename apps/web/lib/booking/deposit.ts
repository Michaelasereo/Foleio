export type DepositType = 'percent' | 'fixed';

export type SelectedAddon = {
  id: string;
  name: string;
  price: number; // kobo
};

export function resolveSelectedAddons(
  catalogAddons: unknown,
  selectedAddonIds: string[] | undefined
): SelectedAddon[] {
  const list = Array.isArray(catalogAddons) ? catalogAddons : [];
  const ids = new Set((selectedAddonIds || []).filter(Boolean));
  if (ids.size === 0) return [];

  return list
    .filter((raw): raw is Record<string, unknown> => Boolean(raw) && typeof raw === 'object')
    .filter((addon) => typeof addon.id === 'string' && ids.has(addon.id))
    .map((addon) => ({
      id: String(addon.id),
      name: String(addon.name || 'Add-on'),
      price: Math.max(0, Math.floor(Number(addon.price) || 0)),
    }));
}

export function computePackageTotal(
  basePriceKobo: number,
  addons: SelectedAddon[]
): number {
  const addonsTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
  return Math.max(0, Math.floor(basePriceKobo) + addonsTotal);
}

/**
 * Compute client deposit / balance for a package total.
 * When depositType is unset, payment is full-only (deposit = total, balance = 0).
 */
export function computeDepositSplit({
  totalAmount,
  depositType,
  depositValue,
  paymentPlan,
}: {
  totalAmount: number;
  depositType: string | null | undefined;
  depositValue: number | null | undefined;
  paymentPlan: 'full' | 'deposit';
}): {
  paymentPlan: 'full' | 'deposit';
  depositAmount: number;
  balanceAmount: number;
  chargeNowAmount: number;
} {
  const total = Math.max(0, Math.floor(totalAmount));

  if (!depositType || paymentPlan === 'full') {
    return {
      paymentPlan: 'full',
      depositAmount: total,
      balanceAmount: 0,
      chargeNowAmount: total,
    };
  }

  let deposit = 0;
  if (depositType === 'percent') {
    const pct = Math.min(100, Math.max(1, Math.floor(Number(depositValue) || 0)));
    deposit = Math.floor((total * pct) / 100);
  } else if (depositType === 'fixed') {
    deposit = Math.min(total, Math.max(0, Math.floor(Number(depositValue) || 0)));
  }

  // Guard: meaningless deposit → treat as full
  if (deposit <= 0 || deposit >= total) {
    return {
      paymentPlan: 'full',
      depositAmount: total,
      balanceAmount: 0,
      chargeNowAmount: total,
    };
  }

  return {
    paymentPlan: 'deposit',
    depositAmount: deposit,
    balanceAmount: total - deposit,
    chargeNowAmount: deposit,
  };
}

export function balanceDueDate(
  bookingDate: Date,
  balanceDueDaysBefore: number
): Date {
  const days = Math.max(0, Math.floor(balanceDueDaysBefore || 7));
  const due = new Date(bookingDate);
  due.setHours(0, 0, 0, 0);
  due.setDate(due.getDate() - days);
  return due;
}

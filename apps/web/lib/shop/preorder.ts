export type PreorderPhase = {
  id: string;
  startsAt: string;
  type: 'percent' | 'amount';
  value: number;
};

export type PreorderSettings = {
  releaseAt: string;
  preorderPrice: number;
  preorderCompareAtPrice: number | null;
  postPreorderPrice: number;
  postPreorderCompareAtPrice: number | null;
  phases: PreorderPhase[];
};

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function parsePreorderSettings(raw: unknown): PreorderSettings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;

  const releaseAt = toIsoOrNull(data.releaseAt);
  const preorderPrice = toFiniteNumber(data.preorderPrice);
  const postPreorderPrice = toFiniteNumber(data.postPreorderPrice);
  if (!releaseAt || preorderPrice === null || postPreorderPrice === null) return null;
  if (preorderPrice < 0 || postPreorderPrice <= 0) return null;

  const preorderCompareAtRaw = toFiniteNumber(data.preorderCompareAtPrice);
  const postCompareAtRaw = toFiniteNumber(data.postPreorderCompareAtPrice);

  const phasesRaw = Array.isArray(data.phases) ? data.phases : [];
  const phases: PreorderPhase[] = [];
  for (const phase of phasesRaw) {
    if (!phase || typeof phase !== 'object' || Array.isArray(phase)) continue;
    const row = phase as Record<string, unknown>;
    const startsAt = toIsoOrNull(row.startsAt);
    const type = row.type === 'amount' ? 'amount' : row.type === 'percent' ? 'percent' : null;
    const value = toFiniteNumber(row.value);
    if (!startsAt || !type || value === null || value <= 0) continue;
    if (type === 'percent' && value > 100) continue;
    phases.push({
      id: String(row.id || crypto.randomUUID()),
      startsAt,
      type,
      value: type === 'amount' ? Math.round(value) : value,
    });
  }

  phases.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  return {
    releaseAt,
    preorderPrice: Math.round(preorderPrice),
    preorderCompareAtPrice:
      preorderCompareAtRaw !== null && preorderCompareAtRaw > 0
        ? Math.round(preorderCompareAtRaw)
        : null,
    postPreorderPrice: Math.round(postPreorderPrice),
    postPreorderCompareAtPrice:
      postCompareAtRaw !== null && postCompareAtRaw > 0
        ? Math.round(postCompareAtRaw)
        : null,
    phases,
  };
}

/** Validate creator input; returns settings or an error message. */
export function validatePreorderSettingsInput(raw: unknown): {
  settings: PreorderSettings | null;
  error?: string;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { settings: null, error: 'Preorder settings are required' };
  }
  const data = raw as Record<string, unknown>;
  const releaseAt = toIsoOrNull(data.releaseAt);
  if (!releaseAt) {
    return { settings: null, error: 'Preorder release date and time are required' };
  }

  const preorderPrice = toFiniteNumber(data.preorderPrice);
  const postPreorderPrice = toFiniteNumber(data.postPreorderPrice);
  if (preorderPrice === null || preorderPrice <= 0) {
    return { settings: null, error: 'Preorder sale price must be greater than 0' };
  }
  if (postPreorderPrice === null || postPreorderPrice <= 0) {
    return {
      settings: null,
      error: 'Sale price when preorder is over must be greater than 0',
    };
  }

  const preorderCompareAt = toFiniteNumber(data.preorderCompareAtPrice);
  const postCompareAt = toFiniteNumber(data.postPreorderCompareAtPrice);
  if (
    preorderCompareAt !== null &&
    preorderCompareAt > 0 &&
    preorderCompareAt <= preorderPrice
  ) {
    return {
      settings: null,
      error: 'Preorder old price must be greater than the preorder sale price',
    };
  }
  if (postCompareAt !== null && postCompareAt > 0 && postCompareAt <= postPreorderPrice) {
    return {
      settings: null,
      error: 'Old price when preorder is over must be greater than the sale price',
    };
  }

  const phasesRaw = Array.isArray(data.phases) ? data.phases : [];
  const phases: PreorderPhase[] = [];
  for (let i = 0; i < phasesRaw.length; i += 1) {
    const phase = phasesRaw[i];
    if (!phase || typeof phase !== 'object' || Array.isArray(phase)) {
      return { settings: null, error: `Discount phase ${i + 1} is invalid` };
    }
    const row = phase as Record<string, unknown>;
    const startsAt = toIsoOrNull(row.startsAt);
    if (!startsAt) {
      return {
        settings: null,
        error: `Discount phase ${i + 1} needs a start date and time`,
      };
    }
    if (new Date(startsAt).getTime() >= new Date(releaseAt).getTime()) {
      return {
        settings: null,
        error: `Discount phase ${i + 1} must start before the release date`,
      };
    }
    const type = row.type === 'amount' ? 'amount' : row.type === 'percent' ? 'percent' : null;
    const value = toFiniteNumber(row.value);
    if (!type || value === null || value <= 0) {
      return {
        settings: null,
        error: `Discount phase ${i + 1} needs a valid discount`,
      };
    }
    if (type === 'percent' && value > 100) {
      return {
        settings: null,
        error: `Discount phase ${i + 1} percent must be 100 or less`,
      };
    }
    phases.push({
      id: String(row.id || crypto.randomUUID()),
      startsAt,
      type,
      value: type === 'amount' ? Math.round(value) : value,
    });
  }

  phases.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  return {
    settings: {
      releaseAt,
      preorderPrice: Math.round(preorderPrice),
      preorderCompareAtPrice:
        preorderCompareAt !== null && preorderCompareAt > 0
          ? Math.round(preorderCompareAt)
          : null,
      postPreorderPrice: Math.round(postPreorderPrice),
      postPreorderCompareAtPrice:
        postCompareAt !== null && postCompareAt > 0 ? Math.round(postCompareAt) : null,
      phases,
    },
  };
}

export function getActivePreorderPhase(
  settings: PreorderSettings | null | undefined,
  now: Date = new Date()
): PreorderPhase | null {
  if (!settings) return null;
  const nowMs = now.getTime();
  const releaseMs = new Date(settings.releaseAt).getTime();
  if (Number.isNaN(releaseMs) || nowMs >= releaseMs) return null;

  let active: PreorderPhase | null = null;
  for (const phase of settings.phases) {
    const startsMs = new Date(phase.startsAt).getTime();
    if (Number.isNaN(startsMs) || startsMs > nowMs) continue;
    if (!active || startsMs >= new Date(active.startsAt).getTime()) {
      active = phase;
    }
  }
  return active;
}

function applyPhaseDiscount(basePriceKobo: number, phase: PreorderPhase | null): number {
  if (!phase) return Math.max(0, Math.round(basePriceKobo));
  if (phase.type === 'percent') {
    const discounted = basePriceKobo * (1 - phase.value / 100);
    return Math.max(0, Math.round(discounted));
  }
  return Math.max(0, Math.round(basePriceKobo - phase.value));
}

export function isPreorderWindowOpen(
  settings: PreorderSettings | null | undefined,
  now: Date = new Date()
): boolean {
  if (!settings) return false;
  const releaseMs = new Date(settings.releaseAt).getTime();
  if (Number.isNaN(releaseMs)) return false;
  return now.getTime() < releaseMs;
}

/** Effective charge price in kobo for a product with preorder settings. */
export function getEffectivePreorderPrice(
  settings: PreorderSettings | null | undefined,
  now: Date = new Date()
): number | null {
  if (!settings) return null;
  if (!isPreorderWindowOpen(settings, now)) {
    return Math.max(0, Math.round(settings.postPreorderPrice));
  }
  const phase = getActivePreorderPhase(settings, now);
  return applyPhaseDiscount(settings.preorderPrice, phase);
}

export function getEffectiveCompareAtPrice(
  settings: PreorderSettings | null | undefined,
  now: Date = new Date()
): number | null {
  if (!settings) return null;
  if (!isPreorderWindowOpen(settings, now)) {
    return settings.postPreorderCompareAtPrice;
  }
  const phase = getActivePreorderPhase(settings, now);
  const effective = applyPhaseDiscount(settings.preorderPrice, phase);
  // Prefer explicit preorder compare-at; otherwise show list preorder price when discounted.
  if (
    settings.preorderCompareAtPrice != null &&
    settings.preorderCompareAtPrice > effective
  ) {
    return settings.preorderCompareAtPrice;
  }
  if (phase && settings.preorderPrice > effective) {
    return settings.preorderPrice;
  }
  return settings.preorderCompareAtPrice;
}

/** Resolve display/charge price for any product (preorder-aware). */
export function resolveProductPricing(
  product: {
    price: number;
    compareAtPrice?: number | null;
    isPreorder?: boolean;
    preorderSettings?: unknown;
  },
  now: Date = new Date()
): { price: number; compareAtPrice: number | null; isPreorderActive: boolean } {
  if (!product.isPreorder) {
    return {
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      isPreorderActive: false,
    };
  }
  const settings = parsePreorderSettings(product.preorderSettings);
  if (!settings) {
    return {
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      isPreorderActive: Boolean(product.isPreorder),
    };
  }
  const price = getEffectivePreorderPrice(settings, now) ?? product.price;
  const compareAtPrice = getEffectiveCompareAtPrice(settings, now);
  return {
    price,
    compareAtPrice:
      compareAtPrice != null && compareAtPrice > price ? compareAtPrice : null,
    isPreorderActive: isPreorderWindowOpen(settings, now),
  };
}

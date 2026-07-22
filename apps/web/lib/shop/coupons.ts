import { prisma } from '@foleio/database';

export type CouponType = 'percent' | 'fixed';

export function normalizeCouponCode(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function parseCouponType(raw: unknown): CouponType | null {
  const value = String(raw || '')
    .trim()
    .toLowerCase();
  if (value === 'percent' || value === 'fixed') return value;
  return null;
}

type CouponLike = {
  type: string;
  value: number;
  minSubtotalKobo: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  status: string;
};

/** Returns null if coupon cannot be used for this subtotal / time. */
export function couponUsabilityError(
  coupon: CouponLike,
  subtotalKobo: number,
  now = new Date()
): string | null {
  if (coupon.status !== 'active') {
    return 'This coupon is no longer active';
  }
  if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) {
    return 'This coupon is not active yet';
  }
  if (coupon.endsAt && coupon.endsAt.getTime() <= now.getTime()) {
    return 'This coupon has expired';
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return 'This coupon has reached its usage limit';
  }
  if (
    coupon.minSubtotalKobo != null &&
    coupon.minSubtotalKobo > 0 &&
    subtotalKobo < coupon.minSubtotalKobo
  ) {
    return `This coupon requires a minimum spend of ₦${(
      coupon.minSubtotalKobo / 100
    ).toLocaleString('en-NG')}`;
  }
  return null;
}

export function computeCouponDiscountKobo(
  subtotalKobo: number,
  coupon: Pick<CouponLike, 'type' | 'value'>
): number {
  if (subtotalKobo <= 0) return 0;
  if (coupon.type === 'percent') {
    const pct = Math.min(100, Math.max(0, coupon.value));
    return Math.min(subtotalKobo, Math.floor((subtotalKobo * pct) / 100));
  }
  if (coupon.type === 'fixed') {
    return Math.min(subtotalKobo, Math.max(0, coupon.value));
  }
  return 0;
}

export async function findUsableCoupon(
  creatorId: string,
  codeRaw: unknown,
  subtotalKobo: number
): Promise<
  | { kind: 'miss' }
  | { kind: 'unusable'; error: string }
  | {
      kind: 'ok';
      coupon: {
        id: string;
        type: string;
        value: number;
      };
      discountKobo: number;
    }
> {
  const code = normalizeCouponCode(codeRaw);
  if (!code) return { kind: 'miss' };

  const coupon = await prisma.coupon.findFirst({
    where: {
      creatorId,
      code,
    },
  });
  if (!coupon) return { kind: 'miss' };

  const error = couponUsabilityError(coupon, subtotalKobo);
  if (error) return { kind: 'unusable', error };

  const discountKobo = computeCouponDiscountKobo(subtotalKobo, coupon);
  if (discountKobo <= 0) {
    return { kind: 'unusable', error: 'This coupon cannot be applied to this order' };
  }

  return {
    kind: 'ok',
    coupon: { id: coupon.id, type: coupon.type, value: coupon.value },
    discountKobo,
  };
}

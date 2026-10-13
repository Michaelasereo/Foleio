import { NextResponse } from 'next/server';
import { findUsableCoupon, normalizeCouponCode } from '@/lib/shop/coupons';
import {
  findUsableGiftCard,
  giftCardCreditForTotal,
  normalizeGiftCardCode,
} from '@/lib/shop/gift-cards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const creatorId = String(body?.creatorId || '').trim();
  const code = String(body?.code || '').trim();
  const subtotalKobo = Math.max(0, Math.round(Number(body?.subtotalKobo) || 0));
  const deliveryFeeKobo = Math.max(0, Math.round(Number(body?.deliveryFeeKobo) || 0));

  if (!creatorId || !code) {
    return NextResponse.json({ error: 'Enter a code' }, { status: 400 });
  }
  if (subtotalKobo <= 0) {
    return NextResponse.json({ error: 'Add items before applying a code' }, { status: 400 });
  }

  const couponResult = await findUsableCoupon(creatorId, code, subtotalKobo);
  if (couponResult.kind === 'ok') {
    return NextResponse.json({
      code: normalizeCouponCode(code),
      kind: 'coupon',
      couponDiscountKobo: couponResult.discountKobo,
      giftCardCreditKobo: 0,
    });
  }
  if (couponResult.kind === 'unusable') {
    return NextResponse.json({ error: couponResult.error }, { status: 400 });
  }

  const giftCard = await findUsableGiftCard(creatorId, code);
  if (!giftCard) {
    return NextResponse.json({ error: 'Gift card or coupon code is invalid' }, { status: 400 });
  }

  const orderTotal = Math.max(0, subtotalKobo + deliveryFeeKobo);
  return NextResponse.json({
    code: normalizeGiftCardCode(code),
    kind: 'gift_card',
    couponDiscountKobo: 0,
    giftCardCreditKobo: giftCardCreditForTotal(giftCard.balanceKobo, orderTotal),
  });
}

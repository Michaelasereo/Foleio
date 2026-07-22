import { prisma } from '@foleio/database';
import { randomBytes } from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateGiftCardCode(length = 10): string {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return `FOLEIO-${code}`;
}

export function normalizeGiftCardCode(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export async function findUsableGiftCard(creatorId: string, codeRaw: unknown) {
  const code = normalizeGiftCardCode(codeRaw);
  if (!code) return null;
  const card = await prisma.giftCard.findFirst({
    where: {
      creatorId,
      code,
      status: 'active',
    },
  });
  if (!card) return null;
  if (card.expiresAt && card.expiresAt.getTime() <= Date.now()) return null;
  if (card.balanceKobo <= 0) return null;
  return card;
}

/** Amount of gift card credit to apply toward an order total (kobo). */
export function giftCardCreditForTotal(
  balanceKobo: number,
  orderTotalKobo: number
): number {
  if (balanceKobo <= 0 || orderTotalKobo <= 0) return 0;
  return Math.min(balanceKobo, orderTotalKobo);
}

export type GiftOccasion =
  | 'birthday'
  | 'anniversary'
  | 'wedding'
  | 'special'
  | 'custom';

export function parseGiftOccasion(raw: unknown): GiftOccasion | null {
  const value = String(raw || '')
    .trim()
    .toLowerCase();
  if (
    value === 'birthday' ||
    value === 'anniversary' ||
    value === 'wedding' ||
    value === 'special' ||
    value === 'custom'
  ) {
    return value;
  }
  return null;
}

export function occasionLabel(
  occasion: GiftOccasion | null | undefined,
  custom?: string | null
): string {
  if (occasion === 'custom') {
    const text = String(custom || '').trim();
    return text || 'a special occasion';
  }
  switch (occasion) {
    case 'birthday':
      return 'a birthday';
    case 'anniversary':
      return 'an anniversary';
    case 'wedding':
      return 'a wedding';
    case 'special':
      return 'a special occasion';
    default:
      return 'a special occasion';
  }
}

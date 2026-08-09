/** Shared helpers for Custom Quotes (WhatsApp deep links, deposit math, tokens). */

import { randomBytes } from 'crypto';

export type QuoteLineItem = {
  id: string;
  label: string;
  amountKobo: number;
  productId?: string | null;
  qty?: number;
};

export type QuoteMilestone = {
  id: string;
  label: string;
  dueDate?: string | null;
  status: 'pending' | 'done';
};

export type QuoteDeliveryFeeMode = 'none' | 'tier' | 'custom';

export function newPublicToken() {
  return randomBytes(18).toString('base64url');
}

export function newEntityId() {
  return randomBytes(12).toString('hex');
}

/** Normalize Nigerian/local phone to digits for wa.me (defaults NG 234). */
export function toWhatsAppDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `234${digits.slice(1)}`;
  }
  if (digits.length === 10 && !digits.startsWith('234')) {
    digits = `234${digits}`;
  }
  return digits;
}

export function whatsappChatUrl(phone: string | null | undefined, text?: string) {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!text?.trim()) return base;
  return `${base}?text=${encodeURIComponent(text.trim())}`;
}

export function normalizeQuoteLineItems(raw: unknown): QuoteLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const item = (row || {}) as Record<string, unknown>;
    const productId =
      typeof item.productId === 'string' && item.productId.trim()
        ? item.productId.trim()
        : null;
    const base: QuoteLineItem = {
      id: String(item.id || newEntityId()),
      label: String(item.label || 'Item').trim() || 'Item',
      amountKobo: Math.max(0, Math.round(Number(item.amountKobo) || 0)),
    };
    if (productId) {
      return {
        ...base,
        productId,
        qty: Math.max(1, Math.round(Number(item.qty) || 1)),
      };
    }
    return base;
  });
}

export function sumLineItemsKobo(items: QuoteLineItem[]) {
  return items.reduce((sum, item) => sum + Math.max(0, Math.round(item.amountKobo || 0)), 0);
}

export function splitQuoteLineItems(items: QuoteLineItem[]) {
  const productLines: QuoteLineItem[] = [];
  const serviceLines: QuoteLineItem[] = [];
  for (const item of items) {
    if (item.productId) productLines.push(item);
    else serviceLines.push(item);
  }
  return {
    productLines,
    serviceLines,
    productSubtotalKobo: sumLineItemsKobo(productLines),
    serviceSubtotalKobo: sumLineItemsKobo(serviceLines),
  };
}

export function quoteInvoiceTotalKobo(
  items: QuoteLineItem[],
  deliveryFeeKobo = 0
) {
  return sumLineItemsKobo(items) + Math.max(0, Math.round(deliveryFeeKobo || 0));
}

export function computeQuoteDeposit(opts: {
  totalKobo: number;
  depositType: 'percent' | 'fixed' | null | undefined;
  depositValue: number | null | undefined;
}): { depositAmount: number; balanceAmount: number; paymentPlan: 'full' | 'deposit' } {
  const total = Math.max(0, Math.round(opts.totalKobo || 0));
  if (!opts.depositType || opts.depositValue == null || opts.depositValue <= 0) {
    return { depositAmount: total, balanceAmount: 0, paymentPlan: 'full' };
  }
  let deposit = 0;
  if (opts.depositType === 'percent') {
    const pct = Math.min(100, Math.max(1, Math.round(opts.depositValue)));
    deposit = Math.round((total * pct) / 100);
  } else {
    deposit = Math.min(total, Math.max(0, Math.round(opts.depositValue)));
  }
  if (deposit <= 0 || deposit >= total) {
    return { depositAmount: total, balanceAmount: 0, paymentPlan: 'full' };
  }
  return {
    depositAmount: deposit,
    balanceAmount: total - deposit,
    paymentPlan: 'deposit',
  };
}

export const DEFAULT_QUOTE_VALID_DAYS = 7;

export function defaultValidUntil(from: Date = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + DEFAULT_QUOTE_VALID_DAYS);
  return d;
}

export const CUSTOM_QUOTE_SERVICE_NAME = 'Custom quote';

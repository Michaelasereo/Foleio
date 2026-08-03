/** Paystack / Foleio minimum chargeable amount (naira). */
export const MIN_PAYABLE_NAIRA = 1000;

/** Same minimum in kobo (Paystack amounts). */
export const MIN_PAYABLE_KOBO = MIN_PAYABLE_NAIRA * 100;

export function isBelowMinPayableKobo(amountKobo: number): boolean {
  return !Number.isFinite(amountKobo) || amountKobo < MIN_PAYABLE_KOBO;
}

export function isBelowMinPayableNaira(amountNaira: number): boolean {
  return !Number.isFinite(amountNaira) || amountNaira < MIN_PAYABLE_NAIRA;
}

export const MIN_PAYABLE_PRICE_ERROR = `Price must be at least ₦${MIN_PAYABLE_NAIRA.toLocaleString('en-NG')}`;

export function minPayableChargeError(opts?: { afterGiftCard?: boolean }): string {
  if (opts?.afterGiftCard) {
    return `Remaining balance after gift card must be at least ₦${MIN_PAYABLE_NAIRA.toLocaleString('en-NG')}`;
  }
  return `Order total must be at least ₦${MIN_PAYABLE_NAIRA.toLocaleString('en-NG')} or fully covered`;
}

/**
 * Shop money helpers. DB stores integer kobo; forms use naira strings.
 * Always round through these so edit/save never invents float junk (e.g. 4993.5).
 */

/** Parse a naira form value (string/number, optional ₦ and commas) to integer kobo. */
export function nairaInputToKobo(value: unknown): number {
  if (value === '' || value == null) return 0;
  const cleaned = String(value)
    .replace(/₦/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();
  if (!cleaned) return 0;
  const naira = Number(cleaned);
  if (!Number.isFinite(naira) || naira < 0) return 0;
  return Math.round(naira * 100);
}

/**
 * Format integer kobo as a clean naira string for number inputs.
 * Whole naira stays "5000" — never "4993.5" from float division.
 */
export function koboToNairaInput(kobo: unknown): string {
  if (kobo === '' || kobo == null) return '';
  const k = Math.round(Number(kobo));
  if (!Number.isFinite(k)) return '';
  const sign = k < 0 ? '-' : '';
  const abs = Math.abs(k);
  const whole = Math.trunc(abs / 100);
  const frac = abs % 100;
  if (frac === 0) return `${sign}${whole}`;
  const fracStr = String(frac).padStart(2, '0').replace(/0+$/, '');
  return `${sign}${whole}.${fracStr}`;
}

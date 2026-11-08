export const BIO_MAX_CHARS = 150;

export function countBioChars(text: string): number {
  return text.length;
}

export function trimBioToMaxChars(text: string, maxChars = BIO_MAX_CHARS): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

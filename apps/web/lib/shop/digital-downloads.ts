import { getR2Client } from '@/lib/storage/r2-client';

/** Signed download links in order emails expire after 7 days. */
export const DIGITAL_DOWNLOAD_SIGNED_URL_SECONDS = 7 * 24 * 60 * 60;

export function isR2ObjectKey(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !/^https?:\/\//i.test(trimmed);
}

/**
 * Resolve a product digitalFileUrl (R2 key or legacy absolute URL) to a
 * downloadable URL for email delivery.
 */
export async function resolveDigitalDownloadUrl(
  digitalFileUrl: string | null | undefined,
  expiresIn: number = DIGITAL_DOWNLOAD_SIGNED_URL_SECONDS
): Promise<string | null> {
  if (!digitalFileUrl) return null;
  const trimmed = digitalFileUrl.trim();
  if (!trimmed) return null;
  if (!isR2ObjectKey(trimmed)) return trimmed;

  try {
    const r2 = getR2Client();
    return await r2.getSignedUrl(trimmed, expiresIn);
  } catch (error) {
    console.error('[digital-downloads] failed to sign R2 key:', error);
    return null;
  }
}

import { prisma } from '@foleio/database';

export const REQUIRE_DOJAH_KYC_KEY = 'require_dojah_kyc';

type CacheEntry = { value: unknown; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function readCache<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function writeCache(key: string, value: unknown) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidatePlatformSettingCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

export async function getPlatformSetting<T = unknown>(
  key: string
): Promise<T | null> {
  const cached = readCache<T | null>(key);
  if (cached !== undefined) return cached;

  try {
    // Guard stale Prisma clients (HMR / pre-generate) that lack this delegate.
    const settings = (
      prisma as unknown as {
        platformSetting?: {
          findUnique: (args: {
            where: { key: string };
          }) => Promise<{ value: unknown } | null>;
        };
      }
    ).platformSetting;

    if (!settings?.findUnique) {
      writeCache(key, null);
      return null;
    }

    const row = await settings.findUnique({ where: { key } });
    const value = (row?.value ?? null) as T | null;
    writeCache(key, value);
    return value;
  } catch (error) {
    console.error('[platform-settings] get failed:', key, error);
    return null;
  }
}

export async function setPlatformSetting(
  key: string,
  value: unknown,
  updatedBy?: string | null
) {
  const settings = (
    prisma as unknown as {
      platformSetting?: {
        upsert: (args: unknown) => Promise<unknown>;
      };
    }
  ).platformSetting;

  if (!settings?.upsert) {
    throw new Error(
      'Prisma client is missing platformSetting. Run `pnpm prisma generate` in packages/database and restart the Next.js server.'
    );
  }

  const row = await settings.upsert({
    where: { key },
    create: {
      key,
      value: value as object,
      updatedBy: updatedBy || null,
    },
    update: {
      value: value as object,
      updatedBy: updatedBy || null,
    },
  });
  invalidatePlatformSettingCache(key);
  return row;
}

/** Dojah KYC required for payments unlock. Missing setting ⇒ false. */
export async function isDojahKycRequired(): Promise<boolean> {
  const value = await getPlatformSetting<boolean>(REQUIRE_DOJAH_KYC_KEY);
  return value === true;
}

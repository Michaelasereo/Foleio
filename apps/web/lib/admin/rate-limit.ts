const buckets = new Map<string, { count: number; resetAt: number }>();

export function consumeRateLimit(
  key: string,
  limit = 8,
  windowMs = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

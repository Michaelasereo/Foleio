export const USERNAME_COOLDOWN_DAYS = 14;
const COOLDOWN_MS = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

export function isValidUsername(username: string) {
  return /^[a-z0-9_-]{3,30}$/.test(username);
}

export function usernameChangeEligibleAt(
  usernameChangedAt: Date | null,
  accountCreatedAt: Date
) {
  const base = usernameChangedAt ?? accountCreatedAt;
  return new Date(base.getTime() + COOLDOWN_MS);
}

export function usernameChangeAllowed(
  usernameChangedAt: Date | null,
  accountCreatedAt: Date,
  now = new Date()
) {
  return now.getTime() >= usernameChangeEligibleAt(usernameChangedAt, accountCreatedAt).getTime();
}

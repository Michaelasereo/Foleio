export const PILOT_EMAILS: string[] = [
  'your@email.com',
  'teammate@email.com',
  'asereope@gmail.com',
  'Shosglam@gmail.com',
  'noraonyeka3@gmail.com',
  'tadenmosun@gmail.com',
  'tosinakingbade7@gmail.com',
  'michaelasereo@gmail.com',
  'michaelasereoo@gmail.com',
  'Chiamakasoniaeke@gmail.com',
  'ajayiodeborah@gmail.com',
  'awonaiketimmie@gmail.com',
  'arisoyinopemipograce@gmail.com',
  'clealthstudios@gmail.com',
  // add more here
];

export const PREMIUM_ON_SIGNUP_EMAILS: string[] = [
  'noraonyeka3@gmail.com',
  'tadenmosun@gmail.com',
  'tosinakingbade7@gmail.com',
  'michaelasereo@gmail.com',
];

function normalizeEmail(email: string): string {
  const cleaned = email.trim().toLowerCase();
  const [localPart, domain] = cleaned.split('@');
  if (!localPart || !domain) return cleaned;

  // Treat common Gmail aliases as the same mailbox.
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const withoutPlus = localPart.split('+')[0];
    const withoutDots = withoutPlus.replace(/\./g, '');
    return `${withoutDots}@gmail.com`;
  }

  return cleaned;
}

function getRuntimePilotEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_PILOT_EMAILS || '';
  if (!raw.trim()) return [];

  return raw
    .split(/[,\n;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * When true, any email can sign up (no pilot allowlist).
 * - Local `next dev` is open by default so you can test without editing the list.
 * - Set NEXT_PUBLIC_ALLOW_OPEN_SIGNUP=true to open staging/prod deliberately.
 * - Set NEXT_PUBLIC_ALLOW_OPEN_SIGNUP=false to force the allowlist even in development.
 */
export function isOpenSignupEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ALLOW_OPEN_SIGNUP;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV === 'development';
}

export function isPilotEmail(email: string): boolean {
  if (isOpenSignupEnabled()) return true;

  const normalizedInput = normalizeEmail(email);
  const allAllowedEmails = [...PILOT_EMAILS, ...getRuntimePilotEmails()];
  return allAllowedEmails.some(
    (allowedEmail) => normalizeEmail(allowedEmail) === normalizedInput
  );
}

export function shouldAutoUpgradeToPremium(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedInput = normalizeEmail(email);
  return PREMIUM_ON_SIGNUP_EMAILS.some(
    (allowedEmail) => normalizeEmail(allowedEmail) === normalizedInput
  );
}

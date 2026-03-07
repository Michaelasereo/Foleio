export const PILOT_EMAILS: string[] = [
  'your@email.com',
  'teammate@email.com',
  'asereope@gmail.com',
  'Shosglam@gmail.com',
  'noraonyeka3@gmail.com',
  'tadenmosun@gmail.com',
  'tosinakingbade7@gmail.com',
  'michaelasereo@gmail.com',
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

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const withoutPlus = localPart.split('+')[0];
    const withoutDots = withoutPlus.replace(/\./g, '');
    return `${withoutDots}@gmail.com`;
  }

  return cleaned;
}

export function isPilotEmail(email: string): boolean {
  const normalizedInput = normalizeEmail(email);
  return PILOT_EMAILS.some((allowedEmail) => normalizeEmail(allowedEmail) === normalizedInput);
}

export function shouldAutoUpgradeToPremium(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedInput = normalizeEmail(email);
  return PREMIUM_ON_SIGNUP_EMAILS.some(
    (allowedEmail) => normalizeEmail(allowedEmail) === normalizedInput
  );
}

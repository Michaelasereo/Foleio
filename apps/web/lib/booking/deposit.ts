export type DepositType = 'percent' | 'fixed';

export type SelectedAddon = {
  id: string;
  name: string;
  price: number; // kobo
};

export function resolveSelectedAddons(
  catalogAddons: unknown,
  selectedAddonIds: string[] | undefined
): SelectedAddon[] {
  const list = Array.isArray(catalogAddons) ? catalogAddons : [];
  const ids = new Set((selectedAddonIds || []).filter(Boolean));
  if (ids.size === 0) return [];

  return list
    .filter((raw): raw is Record<string, unknown> => Boolean(raw) && typeof raw === 'object')
    .filter((addon) => typeof addon.id === 'string' && ids.has(addon.id))
    .map((addon) => ({
      id: String(addon.id),
      name: String(addon.name || 'Add-on'),
      price: Math.max(0, Math.floor(Number(addon.price) || 0)),
    }));
}

export function computePackageTotal(
  basePriceKobo: number,
  addons: SelectedAddon[]
): number {
  const addonsTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
  return Math.max(0, Math.floor(basePriceKobo) + addonsTotal);
}

/**
 * Compute client deposit / balance for a package total.
 * When depositType is unset, payment is full-only (deposit = total, balance = 0).
 */
export function computeDepositSplit({
  totalAmount,
  depositType,
  depositValue,
  paymentPlan,
}: {
  totalAmount: number;
  depositType: string | null | undefined;
  depositValue: number | null | undefined;
  paymentPlan: 'full' | 'deposit';
}): {
  paymentPlan: 'full' | 'deposit';
  depositAmount: number;
  balanceAmount: number;
  chargeNowAmount: number;
} {
  const total = Math.max(0, Math.floor(totalAmount));

  if (!depositType || paymentPlan === 'full') {
    return {
      paymentPlan: 'full',
      depositAmount: total,
      balanceAmount: 0,
      chargeNowAmount: total,
    };
  }

  let deposit = 0;
  if (depositType === 'percent') {
    const pct = Math.min(100, Math.max(1, Math.floor(Number(depositValue) || 0)));
    deposit = Math.floor((total * pct) / 100);
  } else if (depositType === 'fixed') {
    deposit = Math.min(total, Math.max(0, Math.floor(Number(depositValue) || 0)));
  }

  // Guard: meaningless deposit → treat as full
  if (deposit <= 0 || deposit >= total) {
    return {
      paymentPlan: 'full',
      depositAmount: total,
      balanceAmount: 0,
      chargeNowAmount: total,
    };
  }

  return {
    paymentPlan: 'deposit',
    depositAmount: deposit,
    balanceAmount: total - deposit,
    chargeNowAmount: deposit,
  };
}

export function balanceDueDate(
  bookingDate: Date,
  balanceDueDaysBefore: number
): Date {
  const days = Math.max(0, Math.floor(balanceDueDaysBefore || 7));
  const bookingYmd = lagosCalendarDay(bookingDate);
  const { y, m, d } = parseYmd(bookingYmd);
  // Noon UTC avoids DST edge cases when formatting back to Lagos
  const dueUtc = new Date(Date.UTC(y, m - 1, d - days, 12, 0, 0));
  return dueUtc;
}

/** Alias used by tracking/emails/cron — same as balanceDueDate. */
export function getBookingBalanceDueDate(
  bookingDate: Date,
  balanceDueDaysBefore: number
): Date {
  return balanceDueDate(bookingDate, balanceDueDaysBefore);
}

export function formatBalanceDueDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

/** Calendar-day YMD in Africa/Lagos (YYYY-MM-DD). */
export function lagosCalendarDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split('-').map(Number);
  return { y, m, d };
}

/** Whole calendar days from `fromYmd` to `toYmd` (to - from). */
export function calendarDayDiff(fromYmd: string, toYmd: string): number {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  const fromUtc = Date.UTC(a.y, a.m - 1, a.d);
  const toUtc = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export type BalanceReminderKind =
  | 'reminder_2d'
  | 'reminder_due'
  | 'reminder_overdue';

/**
 * Which reminder (if any) applies for `today` relative to the balance due date.
 * Both arguments are calendar dates (Date objects; compared in Africa/Lagos).
 */
export function getBalanceReminderKind(
  today: Date,
  dueDate: Date
): BalanceReminderKind | null {
  const todayYmd = lagosCalendarDay(today);
  const dueYmd = lagosCalendarDay(dueDate);
  const daysUntilDue = calendarDayDiff(todayYmd, dueYmd);
  if (daysUntilDue === 2) return 'reminder_2d';
  if (daysUntilDue === 0) return 'reminder_due';
  if (daysUntilDue === -1) return 'reminder_overdue';
  return null;
}

export const BALANCE_EMAIL_TYPES = {
  reminder_2d: 'balance_reminder_2d',
  reminder_due: 'balance_reminder_due',
  reminder_overdue: 'balance_reminder_overdue',
  overdue_creator: 'balance_overdue_creator',
} as const;

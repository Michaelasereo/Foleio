export function getNextPayoutDate(frequency: string, now = new Date()): Date {
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);

  if (frequency === 'WEEKLY') {
    const day = next.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntilFriday);
    return next;
  }

  if (frequency === 'BIWEEKLY') {
    const date = next.getDate();
    if (date < 15) {
      next.setDate(15);
    } else {
      next.setMonth(next.getMonth() + 1, 1);
    }
    return next;
  }

  if (frequency === 'MONTHLY') {
    const target = new Date(next.getFullYear(), next.getMonth() + 1, 0);
    while (target.getDay() !== 5) {
      target.setDate(target.getDate() - 1);
    }
    target.setHours(9, 0, 0, 0);
    return target;
  }

  return next;
}

export function getEstimatedArrival(plan: string | null): string {
  const normalized = (plan || '').toUpperCase();
  const now = new Date();
  if (
    normalized === 'PRO' ||
    normalized === 'GROWTH' ||
    normalized === 'PREMIUM'
  ) {
    if (now.getHours() < 14) return 'Today';
    return 'Next business day';
  }
  return 'Next business day';
}

export function shouldProcessImmediately(plan: string | null): boolean {
  const normalized = (plan || '').toUpperCase();
  if (
    normalized === 'PRO' ||
    normalized === 'GROWTH' ||
    normalized === 'PREMIUM'
  ) {
    return new Date().getHours() < 14;
  }
  return false;
}

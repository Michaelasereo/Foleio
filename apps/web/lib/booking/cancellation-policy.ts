export type CancellationTier = {
  minDaysBefore: number;
  maxDaysBefore: number | null;
  refundPercent: number;
};

export const DEFAULT_CANCELLATION_POLICY: CancellationTier[] = [
  { minDaysBefore: 60, maxDaysBefore: null, refundPercent: 100 },
  { minDaysBefore: 30, maxDaysBefore: 59, refundPercent: 50 },
  { minDaysBefore: 0, maxDaysBefore: 29, refundPercent: 0 },
];

export function parseCancellationPolicy(raw: unknown): CancellationTier[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_CANCELLATION_POLICY;
  }

  const tiers = raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      const minDaysBefore = Math.max(0, Math.floor(Number(item.minDaysBefore) || 0));
      const maxRaw = item.maxDaysBefore;
      const maxDaysBefore =
        maxRaw === null || maxRaw === undefined || maxRaw === ''
          ? null
          : Math.max(0, Math.floor(Number(maxRaw)));
      const refundPercent = Math.min(
        100,
        Math.max(0, Math.floor(Number(item.refundPercent) || 0))
      );
      return { minDaysBefore, maxDaysBefore, refundPercent };
    })
    .filter((row): row is CancellationTier => Boolean(row));

  return tiers.length > 0 ? tiers : DEFAULT_CANCELLATION_POLICY;
}

export function daysUntilBooking(bookingDate: Date, from: Date = new Date()): number {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(bookingDate);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function findRefundPercent(
  policy: CancellationTier[],
  daysBefore: number
): number {
  const tiers = [...policy].sort((a, b) => b.minDaysBefore - a.minDaysBefore);
  for (const tier of tiers) {
    const withinMin = daysBefore >= tier.minDaysBefore;
    const withinMax =
      tier.maxDaysBefore === null ? true : daysBefore <= tier.maxDaysBefore;
    if (withinMin && withinMax) {
      return tier.refundPercent;
    }
  }
  return 0;
}

/** Refund due based on amount already paid by the client and creator policy. */
export function computePolicyRefundKobo({
  amountPaid,
  bookingDate,
  policy,
  now = new Date(),
}: {
  amountPaid: number;
  bookingDate: Date;
  policy: unknown;
  now?: Date;
}): {
  daysBefore: number;
  refundPercent: number;
  refundAmount: number;
} {
  const daysBefore = daysUntilBooking(bookingDate, now);
  const refundPercent = findRefundPercent(
    parseCancellationPolicy(policy),
    daysBefore
  );
  const paid = Math.max(0, Math.floor(amountPaid));
  const refundAmount = Math.floor((paid * refundPercent) / 100);
  return { daysBefore, refundPercent, refundAmount };
}

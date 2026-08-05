/** Shop fulfillment estimate labels (no calendar / specific-day purchase). */

export function isReadyNowPrep(prepDaysMin: number | null | undefined): boolean {
  return prepDaysMin == null || prepDaysMin <= 0;
}

export function formatPrepEstimateLabel(
  prepDaysMin: number | null | undefined,
  prepDaysMax: number | null | undefined
): string {
  if (isReadyNowPrep(prepDaysMin)) return 'Ready now';
  const min = Math.max(1, Math.floor(Number(prepDaysMin) || 1));
  const maxRaw =
    prepDaysMax != null && Number.isFinite(Number(prepDaysMax))
      ? Math.floor(Number(prepDaysMax))
      : null;
  const max = maxRaw != null && maxRaw > min ? maxRaw : null;
  if (max == null) {
    return min === 1 ? 'Takes 1 day' : `Takes ${min} days`;
  }
  return `Takes ${min}–${max} days`;
}

export type PrepGroupKey = 'ready_now' | `takes_${number}_${number | 'x'}`;

export function prepGroupKey(
  prepDaysMin: number | null | undefined,
  prepDaysMax: number | null | undefined
): string {
  if (isReadyNowPrep(prepDaysMin)) return 'ready_now';
  const min = Math.max(1, Math.floor(Number(prepDaysMin) || 1));
  const maxRaw =
    prepDaysMax != null && Number.isFinite(Number(prepDaysMax))
      ? Math.floor(Number(prepDaysMax))
      : null;
  const max = maxRaw != null && maxRaw > min ? maxRaw : null;
  return max == null ? `takes_${min}_x` : `takes_${min}_${max}`;
}

export function groupByPrepEstimate<T>(
  items: T[],
  getPrep: (item: T) => { prepDaysMin?: number | null; prepDaysMax?: number | null }
): Array<{ key: string; label: string; items: T[] }> {
  const map = new Map<string, { label: string; items: T[] }>();
  for (const item of items) {
    const prep = getPrep(item);
    const key = prepGroupKey(prep.prepDaysMin, prep.prepDaysMax);
    const label = formatPrepEstimateLabel(prep.prepDaysMin, prep.prepDaysMax);
    const existing = map.get(key);
    if (existing) existing.items.push(item);
    else map.set(key, { label, items: [item] });
  }
  const groups = [...map.entries()].map(([key, value]) => ({
    key,
    label: value.label,
    items: value.items,
  }));
  groups.sort((a, b) => {
    if (a.key === 'ready_now') return -1;
    if (b.key === 'ready_now') return 1;
    return a.label.localeCompare(b.label);
  });
  return groups;
}

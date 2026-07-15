/** Local clock helpers for hours-mode availability (HH:mm). */

export type TimeRange = { startTime: string; endTime: string };

export type SlotDraft = TimeRange & {
  source: 'generated' | 'custom';
  isActive: boolean;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHHmm(value: string): boolean {
  return TIME_RE.test(value);
}

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Generate exclusive-end hourly slots from `from` until `to` (e.g. 09:00–17:00 → 8 slots). */
export function generateHourlySlots(
  from: string,
  to: string,
  intervalMinutes = 60
): TimeRange[] {
  if (!isValidHHmm(from) || !isValidHHmm(to)) return [];
  const start = timeToMinutes(from);
  const end = timeToMinutes(to);
  if (end <= start || intervalMinutes < 1) return [];

  const slots: TimeRange[] = [];
  for (let cursor = start; cursor + intervalMinutes <= end; cursor += intervalMinutes) {
    slots.push({
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + intervalMinutes),
    });
  }
  return slots;
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  const a0 = timeToMinutes(a.startTime);
  const a1 = timeToMinutes(a.endTime);
  const b0 = timeToMinutes(b.startTime);
  const b1 = timeToMinutes(b.endTime);
  return a0 < b1 && b0 < a1;
}

/**
 * Merge generated hourly slots with custom ranges.
 * Disabled start times only affect generated slots.
 * Custom slots that overlap an active generated slot are still included (creator intent).
 */
export function mergeWithCustom(
  generated: TimeRange[],
  custom: TimeRange[],
  disabledStarts: string[] = []
): SlotDraft[] {
  const disabled = new Set(disabledStarts);
  const drafts: SlotDraft[] = generated.map((slot) => ({
    ...slot,
    source: 'generated' as const,
    isActive: !disabled.has(slot.startTime),
  }));

  for (const customSlot of custom) {
    if (!isValidHHmm(customSlot.startTime) || !isValidHHmm(customSlot.endTime)) continue;
    if (timeToMinutes(customSlot.endTime) <= timeToMinutes(customSlot.startTime)) continue;
    drafts.push({
      ...customSlot,
      source: 'custom',
      isActive: true,
    });
  }

  return drafts.sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
}

export function isSlotOpen(
  slot: TimeRange,
  existingBookings: Array<{ startTime: string | null; endTime: string | null }>
): boolean {
  for (const booking of existingBookings) {
    if (!booking.startTime || !booking.endTime) continue;
    if (
      rangesOverlap(slot, {
        startTime: booking.startTime,
        endTime: booking.endTime,
      })
    ) {
      return false;
    }
  }
  return true;
}

export function formatSlotLabel(startTime: string, endTime: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };
  return `${fmt(startTime)}–${fmt(endTime)}`;
}

export function formatBookingWhen(
  bookingDate: Date | string,
  startTime?: string | null,
  endTime?: string | null
): string {
  const date =
    typeof bookingDate === 'string'
      ? new Date(`${bookingDate.slice(0, 10)}T12:00:00`)
      : new Date(bookingDate);
  const datePart = date.toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Lagos',
  });
  if (startTime && endTime) {
    return `${datePart} · ${formatSlotLabel(startTime, endTime)}`;
  }
  return datePart;
}

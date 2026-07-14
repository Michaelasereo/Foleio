/**
 * Product rule (current pilot): one client booking per available calendar day.
 * Keep this as the single source of truth for capacity checks and writes.
 */
export const BOOKINGS_PER_DAY = 1;

export function dayBookingCapacity(_storedMax?: number | null): number {
  return BOOKINGS_PER_DAY;
}

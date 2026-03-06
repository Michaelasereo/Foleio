import { formatNaira, koboToNaira } from '@foleio/utils';

export function formatMoneyFromKobo(amount?: number | null): string {
  return formatNaira(koboToNaira(Number(amount || 0)));
}

export function formatRelativeTime(date?: string | Date | null): string {
  if (!date) return 'N/A';
  const source = typeof date === 'string' ? new Date(date) : date;
  const diffSeconds = Math.floor((Date.now() - source.getTime()) / 1000);
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return `${Math.floor(diffSeconds / 2592000)}mo ago`;
}

export function statusBadgeClass(status?: string | null): string {
  const normalized = String(status || '').toLowerCase();
  if (['active', 'success', 'completed', 'paid'].includes(normalized)) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (['pending', 'processing', 'trialing'].includes(normalized)) {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  if (['failed', 'disputed', 'cancelled', 'canceled', 'refunded'].includes(normalized)) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (normalized === 'past_due') {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

export function transactionTypeBadgeClass(type?: string | null): string {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'subscription') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (normalized === 'booking') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (normalized === 'one_time') return 'bg-green-100 text-green-800 border-green-200';
  if (normalized === 'payout') return 'bg-purple-100 text-purple-800 border-purple-200';
  if (normalized === 'refund') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

export const adminTableContainerClass = 'overflow-hidden rounded-lg border bg-white';
export const adminTableScrollClass = 'max-h-[70vh] overflow-auto';
export const adminTableClass = 'w-full text-sm';
export const adminTableHeadClass = 'sticky top-0 z-10 bg-slate-50';
export const adminTableHeadingRowClass = 'text-left text-xs uppercase text-muted-foreground';
export const adminTableCellClass = 'px-3 py-2';
export const adminTableRowClass = 'border-t hover:bg-slate-50';

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
  if (['active', 'success', 'completed', 'paid', 'healthy'].includes(normalized)) {
    return 'bg-emerald-100 text-emerald-800 border-[#e7e5e4]';
  }
  if (
    ['pending', 'processing', 'trialing', 'deposit_paid', 'first_payout_done', 'service_day'].includes(
      normalized
    )
  ) {
    return 'bg-amber-100 text-amber-800 border-[#e7e5e4]';
  }
  if (
    ['failed', 'disputed', 'cancelled', 'canceled', 'refunded', 'inactive', 'balance_overdue'].includes(
      normalized
    )
  ) {
    return 'bg-red-100 text-red-800 border-[#e7e5e4]';
  }
  if (normalized === 'past_due' || normalized === 'at_risk') {
    return 'bg-orange-100 text-orange-800 border-[#e7e5e4]';
  }
  return 'bg-[#efece6] text-[#55544f] border-[#e7e5e4]';
}

export function transactionTypeBadgeClass(type?: string | null): string {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'subscription' || normalized === 'platform_subscription') {
    return 'bg-sky-100 text-sky-800 border-[#e7e5e4]';
  }
  if (normalized === 'booking' || normalized === 'booking_balance') {
    return 'bg-orange-100 text-orange-800 border-[#e7e5e4]';
  }
  if (normalized === 'deposit' || normalized === 'booking_deposit') {
    return 'bg-amber-100 text-amber-800 border-[#e7e5e4]';
  }
  if (normalized === 'shop_order') return 'bg-teal-100 text-teal-800 border-[#e7e5e4]';
  if (normalized === 'one_time') return 'bg-emerald-100 text-emerald-800 border-[#e7e5e4]';
  if (normalized === 'payout') return 'bg-violet-100 text-violet-800 border-[#e7e5e4]';
  if (normalized === 'refund') return 'bg-red-100 text-red-800 border-[#e7e5e4]';
  return 'bg-[#efece6] text-[#55544f] border-[#e7e5e4]';
}

export const adminPanelClass = 'foleio-admin-panel';
export const adminTableContainerClass =
  'overflow-hidden rounded-[14px] border border-[#e7e5e4] bg-[#f3f2ed]';
export const adminTableScrollClass = 'max-h-[70vh] overflow-auto';
export const adminTableClass = 'w-full text-sm text-[#1c1b19]';
export const adminTableHeadClass = 'sticky top-0 z-10 bg-[#efece6]';
export const adminTableHeadingRowClass = 'text-left text-xs uppercase tracking-wide text-[#6b6964]';
export const adminTableCellClass = 'px-3 py-2.5';
export const adminTableRowClass = 'border-t border-[#e7e5e4] hover:bg-[#efece6]';
export const adminMutedClass = 'text-[#6b6964]';
export const adminInputClass =
  'rounded-lg border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1b19] placeholder:text-[#8a8882] focus:outline-none focus:ring-1 focus:ring-[#1c1b19]';
export const adminTabActiveClass = 'foleio-admin-tab-active bg-[#1c1b19] text-[#f6f5f1]';
export const adminTabIdleClass =
  'border border-[#e7e5e4] bg-transparent text-[#55544f] hover:bg-[#efece6]';

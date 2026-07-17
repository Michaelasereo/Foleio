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
    return 'bg-emerald-500/15 text-emerald-300 border-[#201e1c]';
  }
  if (
    ['pending', 'processing', 'trialing', 'deposit_paid', 'first_payout_done', 'service_day'].includes(
      normalized
    )
  ) {
    return 'bg-amber-500/15 text-amber-300 border-[#201e1c]';
  }
  if (
    ['failed', 'disputed', 'cancelled', 'canceled', 'refunded', 'inactive', 'balance_overdue'].includes(
      normalized
    )
  ) {
    return 'bg-red-500/15 text-red-300 border-[#201e1c]';
  }
  if (normalized === 'past_due' || normalized === 'at_risk') {
    return 'bg-orange-500/15 text-orange-300 border-[#201e1c]';
  }
  return 'bg-white/10 text-[#adadad] border-[#201e1c]';
}

export function transactionTypeBadgeClass(type?: string | null): string {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'subscription' || normalized === 'platform_subscription') {
    return 'bg-sky-500/15 text-sky-300 border-[#201e1c]';
  }
  if (normalized === 'booking' || normalized === 'booking_balance') {
    return 'bg-orange-500/15 text-orange-300 border-[#201e1c]';
  }
  if (normalized === 'deposit' || normalized === 'booking_deposit') {
    return 'bg-amber-500/15 text-amber-300 border-[#201e1c]';
  }
  if (normalized === 'shop_order') return 'bg-teal-500/15 text-teal-300 border-[#201e1c]';
  if (normalized === 'one_time') return 'bg-emerald-500/15 text-emerald-300 border-[#201e1c]';
  if (normalized === 'payout') return 'bg-violet-500/15 text-violet-300 border-[#201e1c]';
  if (normalized === 'refund') return 'bg-red-500/15 text-red-300 border-[#201e1c]';
  return 'bg-white/10 text-[#adadad] border-[#201e1c]';
}

export const adminPanelClass = 'foleio-admin-panel';
export const adminTableContainerClass =
  'overflow-hidden rounded-[14px] border border-[#201e1c] bg-[#212121]';
export const adminTableScrollClass = 'max-h-[70vh] overflow-auto';
export const adminTableClass = 'w-full text-sm text-[#f4f4f5]';
export const adminTableHeadClass = 'sticky top-0 z-10 bg-[#1a1816]';
export const adminTableHeadingRowClass = 'text-left text-xs uppercase tracking-wide text-[#828282]';
export const adminTableCellClass = 'px-3 py-2.5';
export const adminTableRowClass = 'border-t border-[#201e1c] hover:bg-white/[0.03]';
export const adminMutedClass = 'text-[#828282]';
export const adminInputClass =
  'rounded-lg border border-[#201e1c] bg-[#1a1816] px-3 py-2 text-sm text-[#f4f4f5] placeholder:text-[#666] focus:outline-none focus:ring-1 focus:ring-[#2a2826]';
export const adminTabActiveClass = 'bg-white/10 text-[#f4f4f5]';
export const adminTabIdleClass =
  'border border-[#201e1c] bg-transparent text-[#adadad] hover:bg-white/5';

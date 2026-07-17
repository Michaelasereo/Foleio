/** Successful transaction statuses as stored across legacy and current flows. */
export const ADMIN_SUCCESS_TX_STATUSES = [
  'success',
  'SUCCESS',
  'completed',
  'COMPLETED',
  'paid',
  'PAID',
] as const;

export function platformFeeFromTransaction(tx: {
  platformFee?: bigint | number | string | null;
  feeAmount?: bigint | number | string | null;
}): number {
  const platform = Number(tx.platformFee ?? 0);
  if (platform > 0) return platform;
  return Number(tx.feeAmount ?? 0);
}

export function bookingAmountForAdmin(booking: {
  status: string;
  totalAmount: number;
  amountPaid: number;
  depositAmount: number;
}): number {
  const isDepositHold = ['deposit_paid', 'balance_overdue'].includes(booking.status);
  if (isDepositHold) {
    return Math.max(0, Number(booking.amountPaid || booking.depositAmount || 0));
  }
  return Math.max(0, Number(booking.totalAmount || 0));
}

// Get booking status label and color
export function getBookingStatusLabel(status: string): { label: string; color: string } {
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending Payment', color: 'yellow' },
    paid: { label: 'Paid', color: 'green' },
    first_payout_done: { label: 'Confirmed', color: 'green' },
    service_day: { label: 'Service Day', color: 'blue' },
    completed: { label: 'Completed', color: 'green' },
    disputed: { label: 'Disputed', color: 'red' },
    refunded: { label: 'Refunded', color: 'gray' },
    cancelled: { label: 'Cancelled', color: 'gray' },
  };

  return statusMap[status] || { label: status, color: 'gray' };
}

// Format price in Naira from kobo
export function formatPriceFromKobo(amountInKobo: number): string {
  const naira = amountInKobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(naira);
}

// Calculate escrow amounts
export function calculateEscrowAmounts(
  totalAmount: number,
  platformFeePercent = 0.05
): {
  firstPayout: number; // 60%
  secondPayout: number; // 40%
  platformFee: number;
} {
  const platformFee = Math.round(totalAmount * platformFeePercent);

  // After platform fee
  const netAmount = totalAmount - platformFee;

  // 60% first payout, 40% second payout
  const firstPayout = Math.round(netAmount * 0.6);
  const secondPayout = netAmount - firstPayout; // Remainder to avoid rounding issues

  return {
    firstPayout,
    secondPayout,
    platformFee,
  };
}


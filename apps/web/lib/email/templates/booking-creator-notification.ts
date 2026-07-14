import {
  darkEmailCta,
  darkEmailDetailRows,
  darkEmailMuted,
  formatNairaAmount,
  renderFoleioDarkEmail,
} from '@/lib/email/foleio-dark-email';

export function bookingCreatorNotificationEmail({
  creatorName,
  customerName,
  customerEmail,
  serviceName,
  bookingDate,
  amount,
  bookingUrl,
  paymentPlan,
  amountPaid,
  balanceAmount,
  status,
}: {
  creatorName: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingDate: string;
  amount: number;
  bookingUrl: string;
  paymentPlan?: string;
  amountPaid?: number;
  balanceAmount?: number;
  status?: string;
}) {
  const isDepositHold = status === 'deposit_paid';
  const subject = isDepositHold
    ? `Deposit received from ${customerName}`
    : `New booking from ${customerName}`;

  const rows = [
    { label: 'Client', value: customerName },
    { label: 'Email', value: customerEmail },
    { label: 'Service', value: serviceName },
    { label: 'Date', value: bookingDate },
    {
      label: isDepositHold ? 'Deposit paid' : 'Amount',
      value: formatNairaAmount(amountPaid ?? amount),
    },
  ];
  if (isDepositHold && balanceAmount && balanceAmount > 0) {
    rows.push({
      label: 'Balance due',
      value: formatNairaAmount(balanceAmount),
    });
  }
  if (paymentPlan) {
    rows.push({
      label: 'Plan',
      value: paymentPlan === 'deposit' ? 'Deposit' : 'Pay in full',
    });
  }

  const bodyHtml = `
    ${darkEmailMuted(
      isDepositHold
        ? `Hi ${creatorName} — a client paid a deposit and held a date.`
        : `Hi ${creatorName} — you have a new paid booking on Foleio.`
    )}
    ${darkEmailDetailRows(rows)}
    ${darkEmailCta('View booking', bookingUrl)}
  `;

  const html = renderFoleioDarkEmail({
    previewText: isDepositHold
      ? `Deposit from ${customerName} for ${serviceName}`
      : `New booking from ${customerName} for ${serviceName}`,
    title: isDepositHold ? 'Deposit received' : 'New booking',
    bodyHtml,
    footerNote: 'Manage this booking anytime from your Foleio dashboard.',
  });

  return { subject, html };
}

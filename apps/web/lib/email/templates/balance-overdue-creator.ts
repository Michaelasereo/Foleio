import {
  darkEmailCta,
  darkEmailDetailRows,
  darkEmailMuted,
  formatNairaAmount,
  renderFoleioDarkEmail,
} from '@/lib/email/foleio-dark-email';

export function balanceOverdueCreatorEmail({
  creatorName,
  customerName,
  customerEmail,
  serviceName,
  bookingDate,
  balanceAmount,
  balanceDueDateLabel,
  bookingUrl,
}: {
  creatorName: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingDate: string;
  balanceAmount: number;
  balanceDueDateLabel: string;
  bookingUrl: string;
}) {
  const subject = `Balance overdue — ${customerName}`;
  const rows = [
    { label: 'Client', value: customerName },
    { label: 'Email', value: customerEmail },
    { label: 'Service', value: serviceName },
    { label: 'Service date', value: bookingDate },
    { label: 'Balance due', value: formatNairaAmount(balanceAmount) },
    { label: 'Was due by', value: balanceDueDateLabel },
  ];

  const bodyHtml = `
    ${darkEmailMuted(
      `Hi ${creatorName} — <span style="color:#f4f4f5;">${customerName}</span> still has an unpaid balance for this booking. Chase them or cancel the hold from your dashboard.`
    )}
    ${darkEmailDetailRows(rows)}
    ${darkEmailCta('View booking', bookingUrl)}
  `;

  const html = renderFoleioDarkEmail({
    previewText: `Unpaid balance from ${customerName}`,
    title: 'Balance overdue',
    bodyHtml,
    footerNote: 'No automatic cancel — you decide whether to hold or release the date.',
  });

  return { subject, html };
}

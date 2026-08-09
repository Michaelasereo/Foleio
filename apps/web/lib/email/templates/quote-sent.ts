import {
  darkEmailCta,
  darkEmailDetailRows,
  darkEmailMuted,
  formatNairaAmount,
  renderFoleioDarkEmail,
} from '@/lib/email/foleio-dark-email';

export function quoteSentEmail({
  customerName,
  creatorName,
  quoteTitle,
  totalAmount,
  depositAmount,
  balanceAmount,
  validUntilLabel,
  quoteUrl,
  isUpdate,
}: {
  customerName: string;
  creatorName: string;
  quoteTitle: string;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  validUntilLabel: string;
  quoteUrl: string;
  isUpdate?: boolean;
}) {
  const subject = isUpdate
    ? `Updated quote from ${creatorName}`
    : `Your quote from ${creatorName}`;

  const rows = [
    { label: 'Quote', value: quoteTitle },
    { label: 'Total', value: formatNairaAmount(totalAmount) },
  ];
  if (balanceAmount > 0 && depositAmount > 0 && depositAmount < totalAmount) {
    rows.push({ label: 'Deposit due now', value: formatNairaAmount(depositAmount) });
    rows.push({ label: 'Balance later', value: formatNairaAmount(balanceAmount) });
  }
  rows.push({ label: 'Valid until', value: validUntilLabel });

  const bodyHtml = `
    ${darkEmailMuted(
      isUpdate
        ? `Hi ${customerName} — <span style="color:#f4f4f5;">${creatorName}</span> sent an updated quote. Your previous link no longer works for payment.`
        : `Hi ${customerName} — <span style="color:#f4f4f5;">${creatorName}</span> sent you a custom quote.`
    )}
    ${darkEmailDetailRows(rows)}
    ${darkEmailCta(isUpdate ? 'Review updated quote' : 'View & pay quote', quoteUrl)}
  `;

  return {
    subject,
    html: renderFoleioDarkEmail({
      previewText: subject,
      title: isUpdate ? 'Updated quote' : 'Your quote',
      bodyHtml,
    }),
  };
}

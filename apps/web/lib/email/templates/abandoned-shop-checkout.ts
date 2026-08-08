import {
  darkEmailCta,
  darkEmailDetailRows,
  darkEmailMuted,
  formatNairaAmount,
  renderFoleioDarkEmail,
} from '@/lib/email/foleio-dark-email';

export function abandonedShopCheckoutEmail({
  customerName,
  creatorName,
  itemSummary,
  amountNaira,
  resumeUrl,
}: {
  customerName: string;
  creatorName: string;
  itemSummary: string;
  amountNaira: number;
  resumeUrl: string;
}) {
  const subject = `Complete your order from ${creatorName}`;
  const title = 'Complete your order';
  const preview = `Finish payment for your order from ${creatorName}`;
  const intro = `Hi ${customerName} — you left an order with <span style="color:#f4f4f5;">${creatorName}</span> unpaid. Complete payment to confirm it.`;

  const bodyHtml = `
    ${darkEmailMuted(intro)}
    ${darkEmailDetailRows([
      { label: 'Items', value: itemSummary },
      { label: 'Amount due', value: formatNairaAmount(amountNaira) },
    ])}
    ${darkEmailCta('Complete payment', resumeUrl)}
  `;

  const html = renderFoleioDarkEmail({
    previewText: preview,
    title,
    bodyHtml,
    footerNote:
      'If items are no longer in stock, you’ll be asked to shop again. If you already paid, you can ignore this email.',
  });

  return { subject, html };
}

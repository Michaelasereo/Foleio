import {
  darkEmailCta,
  darkEmailDetailRows,
  darkEmailMuted,
  formatNairaAmount,
  renderFoleioDarkEmail,
} from '@/lib/email/foleio-dark-email';

export function abandonedBookingCheckoutEmail({
  customerName,
  creatorName,
  serviceName,
  amountNaira,
  resumeUrl,
}: {
  customerName: string;
  creatorName: string;
  serviceName: string;
  amountNaira: number;
  resumeUrl: string;
}) {
  const subject = `Complete your booking with ${creatorName}`;
  const title = 'Complete your booking';
  const preview = `Finish payment for ${serviceName} with ${creatorName}`;
  const intro = `Hi ${customerName} — you started a booking with <span style="color:#f4f4f5;">${creatorName}</span> but payment wasn’t finished. Complete it now while your slot is still held.`;

  const bodyHtml = `
    ${darkEmailMuted(intro)}
    ${darkEmailDetailRows([
      { label: 'Service', value: serviceName },
      { label: 'Amount due', value: formatNairaAmount(amountNaira) },
    ])}
    ${darkEmailCta('Complete payment', resumeUrl)}
  `;

  const html = renderFoleioDarkEmail({
    previewText: preview,
    title,
    bodyHtml,
    footerNote:
      'If the time is no longer available, you’ll be asked to book again. If you already paid, you can ignore this email.',
  });

  return { subject, html };
}

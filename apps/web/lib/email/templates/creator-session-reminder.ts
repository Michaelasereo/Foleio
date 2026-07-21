import {
  darkEmailCta,
  darkEmailDetailRows,
  darkEmailMuted,
  renderFoleioDarkEmail,
} from '@/lib/email/foleio-dark-email';

export function creatorSessionReminderEmail({
  creatorName,
  customerName,
  customerEmail,
  serviceName,
  bookingDate,
  bookingUrl,
}: {
  creatorName: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingDate: string;
  bookingUrl: string;
}) {
  const subject = `Session tomorrow — ${customerName}`;
  const rows = [
    { label: 'Client', value: customerName },
    { label: 'Email', value: customerEmail },
    { label: 'Service', value: serviceName },
    { label: 'When', value: bookingDate },
  ];

  const bodyHtml = `
    ${darkEmailMuted(
      `Hi ${creatorName} — you have a session with <span style="color:#f4f4f5;">${customerName}</span> tomorrow. Here’s a quick recap.`
    )}
    ${darkEmailDetailRows(rows)}
    ${darkEmailCta('View booking', bookingUrl)}
  `;

  const html = renderFoleioDarkEmail({
    previewText: `Session tomorrow with ${customerName}`,
    title: 'Session tomorrow',
    bodyHtml,
    footerNote: 'You received this because you have an upcoming booking on Foleio.',
  });

  return { subject, html };
}

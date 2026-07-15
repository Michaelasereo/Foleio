import {
  darkEmailCta,
  darkEmailDetailRows,
  darkEmailMuted,
  formatNairaAmount,
  renderFoleioDarkEmail,
} from '@/lib/email/foleio-dark-email';
import type { BalanceReminderKind } from '@/lib/booking/deposit';

export function balanceReminderEmail({
  customerName,
  creatorName,
  serviceName,
  bookingDate,
  balanceAmount,
  balanceDueDateLabel,
  trackingUrl,
  kind,
}: {
  customerName: string;
  creatorName: string;
  serviceName: string;
  bookingDate: string;
  balanceAmount: number;
  balanceDueDateLabel: string;
  trackingUrl: string;
  kind: BalanceReminderKind;
}) {
  const copy =
    kind === 'reminder_2d'
      ? {
          subject: `Balance due in 2 days — ${creatorName}`,
          title: 'Balance due in 2 days',
          preview: `Pay your remaining balance for ${creatorName}`,
          intro: `Hi ${customerName} — your remaining balance with <span style="color:#f4f4f5;">${creatorName}</span> is due in 2 days.`,
          cta: 'Pay balance',
        }
      : kind === 'reminder_due'
        ? {
            subject: `Balance due today — ${creatorName}`,
            title: 'Balance due today',
            preview: `Pay your balance today for ${creatorName}`,
            intro: `Hi ${customerName} — your remaining balance with <span style="color:#f4f4f5;">${creatorName}</span> is due today.`,
            cta: 'Pay balance now',
          }
        : {
            subject: `Balance overdue — ${creatorName}`,
            title: 'Balance overdue',
            preview: `Your balance with ${creatorName} is overdue`,
            intro: `Hi ${customerName} — your remaining balance with <span style="color:#f4f4f5;">${creatorName}</span> is past due. Pay now to settle your outstanding invoice.`,
            cta: 'Pay overdue balance',
          };

  const rows = [
    { label: 'Service', value: serviceName },
    { label: 'Service date', value: bookingDate },
    { label: 'Balance due', value: formatNairaAmount(balanceAmount) },
    { label: 'Due by', value: balanceDueDateLabel },
  ];

  const bodyHtml = `
    ${darkEmailMuted(copy.intro)}
    ${darkEmailDetailRows(rows)}
    ${darkEmailCta(copy.cta, trackingUrl)}
  `;

  const html = renderFoleioDarkEmail({
    previewText: copy.preview,
    title: copy.title,
    bodyHtml,
    footerNote: 'If you already paid, you can ignore this email.',
  });

  return { subject: copy.subject, html };
}

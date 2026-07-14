import {
  darkEmailCta,
  darkEmailDetailRows,
  darkEmailMuted,
  formatNairaAmount,
  renderFoleioDarkEmail,
} from '@/lib/email/foleio-dark-email';

export function bookingConfirmationEmail({
  customerName,
  creatorName,
  serviceName,
  bookingDate,
  amount,
  trackingToken,
  trackingUrl,
  serviceType,
  calendlyLink,
  paymentPlan,
  amountPaid,
  balanceAmount,
  status,
}: {
  customerName: string;
  customerEmail?: string;
  creatorName: string;
  serviceName: string;
  bookingDate: string;
  amount: number;
  trackingToken: string;
  trackingUrl: string;
  serviceType?: string | null;
  calendlyLink?: string | null;
  paymentPlan?: string;
  amountPaid?: number;
  balanceAmount?: number;
  status?: string;
}) {
  const isDepositHold = status === 'deposit_paid';
  const subject = isDepositHold
    ? `Deposit received — booking with ${creatorName}`
    : `Booking confirmed with ${creatorName}`;
  const showCalendly =
    !isDepositHold &&
    (serviceType === 'coaching' || serviceType === 'consultation') &&
    Boolean(calendlyLink);

  const paidNow = amountPaid ?? amount;
  const rows = [
    { label: 'Service', value: serviceName },
    { label: 'Date', value: bookingDate },
    {
      label: isDepositHold ? 'Deposit paid' : 'Amount paid',
      value: formatNairaAmount(paidNow),
    },
  ];
  if (isDepositHold && balanceAmount && balanceAmount > 0) {
    rows.push({
      label: 'Balance due',
      value: formatNairaAmount(balanceAmount),
    });
  } else if (!isDepositHold && paymentPlan === 'deposit') {
    rows.push({ label: 'Package total', value: formatNairaAmount(amount) });
  }

  const bodyHtml = `
    ${darkEmailMuted(
      isDepositHold
        ? `Hi ${customerName} — your deposit with <span style="color:#f4f4f5;">${creatorName}</span> is confirmed and your date is held.`
        : `Hi ${customerName} — your booking with <span style="color:#f4f4f5;">${creatorName}</span> is confirmed.`
    )}
    ${darkEmailDetailRows(rows)}
    ${
      showCalendly
        ? `
      <div style="background:#2b2b2b;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:20px;margin:0 0 20px;text-align:center;">
        <p style="margin:0 0 14px;color:#adadad;font-size:13px;font-weight:500;line-height:1.5;">
          Next step — pick your session time
        </p>
        <a href="${calendlyLink}"
          style="display:inline-block;background:#fafafa;color:#1a1816;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Book your time slot
        </a>
      </div>`
        : ''
    }
    <div style="background:#2b2b2b;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:18px;margin:0 0 8px;text-align:center;">
      <p style="margin:0 0 10px;color:#828282;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Tracking token</p>
      <span style="display:inline-block;font-size:22px;letter-spacing:0.18em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;color:#ffffff;">${trackingToken}</span>
    </div>
    <p style="margin:0 0 4px;color:#828282;font-size:13px;font-weight:500;line-height:1.55;">
      ${
        isDepositHold
          ? 'Pay your balance from the tracking page when due.'
          : 'Keep this email — you’ll need your token to check booking status.'
      }
    </p>
    ${darkEmailCta(
      isDepositHold ? 'Track & pay balance' : 'Track your booking',
      trackingUrl
    )}
  `;

  const html = renderFoleioDarkEmail({
    previewText: isDepositHold
      ? `Deposit received for ${creatorName}`
      : `Your booking with ${creatorName} is confirmed`,
    title: isDepositHold ? 'Deposit received' : 'Booking confirmed',
    bodyHtml,
    footerNote: 'If you didn’t make this booking, you can ignore this email.',
  });

  return { subject, html };
}

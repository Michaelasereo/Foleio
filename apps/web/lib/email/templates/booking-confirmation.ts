import { baseEmailTemplate, ctaButton, formatNaira } from './common';

export function bookingConfirmationEmail({
  customerName,
  customerEmail,
  creatorName,
  serviceName,
  bookingDate,
  amount,
  trackingToken,
  trackingUrl,
}: {
  customerName: string;
  customerEmail: string;
  creatorName: string;
  serviceName: string;
  bookingDate: string;
  amount: number;
  trackingToken: string;
  trackingUrl: string;
}) {
  const subject = `Booking confirmed with ${creatorName} 📅`;
  const html = baseEmailTemplate(`
    <p style="margin:0 0 12px;">Hi ${customerName},</p>
    <p style="margin:0 0 12px;">Your booking with ${creatorName} is confirmed.</p>
    <p style="margin:0 0 6px;"><strong>Service:</strong> ${serviceName}</p>
    <p style="margin:0 0 6px;"><strong>Date:</strong> ${bookingDate}</p>
    <p style="margin:0 0 14px;"><strong>Amount paid:</strong> ${formatNaira(amount)}</p>
    <div style="margin:20px 0;">
      ${ctaButton('Track Your Booking', trackingUrl)}
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px;">
      <div style="font-size:12px;color:#9a3412;margin-bottom:6px;">Your tracking token</div>
      <div style="font-size:24px;font-weight:700;letter-spacing:2px;color:#c2410c;">${trackingToken}</div>
    </div>
    <p style="margin:14px 0 0;color:#666;">Keep this email — you'll need your tracking token to check your booking status.</p>
  `);

  return { subject, html };
}

import { baseEmailTemplate } from '../base-template';

export function developerSupportInviteEmail(data: {
  creatorName: string;
  creatorUsername: string;
  acceptUrl: string;
}) {
  const subject = `Developer setup access — ${data.creatorName} on Foleio`;
  const html = baseEmailTemplate({
    previewText: `${data.creatorName} invited you to help set up their Foleio page`,
    body: `
    <h2 style="color:#1C1008;font-size:22px;font-weight:700;margin:0 0 12px;">Developer setup invite</h2>
    <p style="color:#44403c;font-size:15px;line-height:1.6;margin:0 0 16px;">
      <strong>${data.creatorName}</strong> (@${data.creatorUsername}) requested developer support on Foleio.
      Accept the invite to configure their shop and bookings — no password sharing required.
    </p>
    <p style="margin:0 0 20px;">
      <a href="${data.acceptUrl}" style="display:inline-block;background:#F97316;color:#fff;padding:14px 28px;border-radius:100px;font-weight:700;font-size:15px;text-decoration:none;">
        Accept access →
      </a>
    </p>
    <p style="color:#78716c;font-size:13px;line-height:1.5;margin:0;">
      This link expires when the merchant revokes access or after 7 days once accepted.
      Earnings, payouts, and billing stay blocked.
    </p>
  `,
  });
  return { subject, html };
}

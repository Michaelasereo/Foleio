import { baseEmailTemplate } from '../base-template';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function developerSupportInviteEmail(data: {
  creatorName: string;
  creatorUsername: string;
  acceptUrl: string;
  merchantWhatsappUrl?: string | null;
  merchantWhatsappPhone?: string | null;
  supportNote?: string | null;
  merchantEmail?: string | null;
}) {
  const merchantWhatsapp = data.merchantWhatsappUrl?.trim() || null;
  const supportNote = data.supportNote?.trim() ? escapeHtml(data.supportNote.trim()) : null;
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
    ${
      merchantWhatsapp
        ? `<p style="margin:0 0 20px;">
      <a href="${merchantWhatsapp}" style="display:inline-block;background:#111827;color:#fff;padding:12px 22px;border-radius:100px;font-weight:700;font-size:14px;text-decoration:none;">
        Message merchant on WhatsApp
      </a>
    </p>`
        : ''
    }
    ${
      data.merchantWhatsappPhone || data.merchantEmail || supportNote
        ? `<div style="margin:0 0 16px;padding:12px 14px;border:1px solid #e7e5e4;border-radius:10px;background:#fafaf9;">
      <p style="margin:0 0 6px;color:#57534e;font-size:13px;font-weight:600;">Merchant contact details</p>
      ${
        data.merchantWhatsappPhone
          ? `<p style="margin:0 0 4px;color:#44403c;font-size:13px;">WhatsApp: ${escapeHtml(data.merchantWhatsappPhone)}</p>`
          : ''
      }
      ${
        data.merchantEmail
          ? `<p style="margin:0;color:#44403c;font-size:13px;">Email: ${escapeHtml(data.merchantEmail)}</p>`
          : ''
      }
    </div>`
        : ''
    }
    ${
      supportNote
        ? `<div style="margin:0 0 16px;padding:12px 14px;border:1px solid #e7e5e4;border-radius:10px;background:#fff;">
      <p style="margin:0 0 6px;color:#57534e;font-size:13px;font-weight:600;">Merchant note</p>
      <p style="margin:0;color:#44403c;font-size:14px;line-height:1.55;">${supportNote}</p>
    </div>`
        : ''
    }
    <p style="color:#78716c;font-size:13px;line-height:1.5;margin:0;">
      This link expires when the merchant revokes access or after 7 days once accepted.
      Earnings, payouts, and billing stay blocked.
    </p>
  `,
  });
  return { subject, html };
}

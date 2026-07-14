import { readFile } from 'fs/promises';
import path from 'path';

/** Shared CID for embedded Foleio logo in Resend emails. */
export const FOLEIO_LOGO_CID = 'foleio-logo';

export async function getFoleioLogoAttachment() {
  const logoPath = path.join(process.cwd(), 'public', 'foleio-logo.png');
  const content = await readFile(logoPath);
  return {
    filename: 'foleio-logo.png',
    content: content.toString('base64'),
    contentId: FOLEIO_LOGO_CID,
    contentType: 'image/png',
  };
}

/**
 * Dark Foleio transactional email shell (matches signup OTP design).
 */
export function renderFoleioDarkEmail({
  previewText,
  title,
  bodyHtml,
  siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com',
  logoSrc = `cid:${FOLEIO_LOGO_CID}`,
  footerNote,
}: {
  previewText: string;
  title: string;
  bodyHtml: string;
  siteUrl?: string;
  logoSrc?: string;
  footerNote?: string;
}) {
  const base = siteUrl.replace(/\/$/, '');
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1816;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:#1a1816;font-size:1px;line-height:1px;">${previewText}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1816;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 28px;">
              <a href="${base}" style="text-decoration:none;display:inline-block;">
                <img
                  src="${logoSrc}"
                  alt="Foleio"
                  width="140"
                  style="display:block;width:140px;max-width:140px;height:auto;border:0;outline:none;text-decoration:none;"
                />
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#212121;border-radius:12px;padding:32px 28px;">
              <h1 style="margin:0 0 10px;color:#fafafa;font-size:26px;font-weight:500;letter-spacing:-0.02em;line-height:1.2;">${title}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 8px 0;">
              ${
                footerNote
                  ? `<p style="margin:0 0 8px;color:#828282;font-size:12px;font-weight:500;line-height:1.5;">${footerNote}</p>`
                  : ''
              }
              <p style="margin:0;color:rgba(250,250,250,0.3);font-size:12px;font-weight:500;">
                © ${year} Foleio. All rights reserved.
              </p>
              <p style="margin:12px 0 0;font-size:12px;">
                <a href="${base}/legal/terms" style="color:rgba(250,250,250,0.45);text-decoration:none;">Terms</a>
                <span style="color:rgba(250,250,250,0.25);padding:0 6px;">·</span>
                <a href="${base}/legal/privacy" style="color:rgba(250,250,250,0.45);text-decoration:none;">Privacy</a>
                <span style="color:rgba(250,250,250,0.25);padding:0 6px;">·</span>
                <a href="${base}/legal/data-policy" style="color:rgba(250,250,250,0.45);text-decoration:none;">Data Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function darkEmailMuted(text: string) {
  return `<p style="margin:0 0 28px;color:#adadad;font-size:14px;font-weight:500;line-height:1.55;">${text}</p>`;
}

export function darkEmailDetailRows(
  rows: Array<{ label: string; value: string }>
) {
  const items = rows
    .map(
      (row) => `
      <tr>
        <td style="padding:10px 0;color:#828282;font-size:13px;font-weight:500;width:38%;vertical-align:top;">${row.label}</td>
        <td style="padding:10px 0;color:#f4f4f5;font-size:13px;font-weight:500;vertical-align:top;">${row.value}</td>
      </tr>`
    )
    .join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2b2b2b;border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin:0 0 20px;">
      <tr>
        <td style="padding:8px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
        </td>
      </tr>
    </table>`;
}

export function darkEmailCta(label: string, href: string) {
  return `
    <div style="margin:24px 0 8px;text-align:center;">
      <a href="${href}"
        style="display:inline-block;background:#fafafa;color:#1a1816;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
        ${label}
      </a>
    </div>`;
}

export function formatNairaAmount(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

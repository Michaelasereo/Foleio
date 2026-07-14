/**
 * Invite approval OTP email (sent via Resend after admin Approve).
 */

import { FOLEIO_LOGO_CID } from '@/lib/email/foleio-dark-email';

export const inviteVerificationSubject = 'You’re invited to Foleio';
export { FOLEIO_LOGO_CID };

export function renderInviteVerificationCodeEmail({
  email,
  code,
  verifyUrl,
  siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com',
  logoSrc = `cid:${FOLEIO_LOGO_CID}`,
}: {
  email: string;
  code: string;
  verifyUrl: string;
  siteUrl?: string;
  logoSrc?: string;
}) {
  const base = siteUrl.replace(/\/$/, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You’re invited to Foleio</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1816;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:#1a1816;font-size:1px;line-height:1px;">Your Foleio invite code is ${code}</div>
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
              <h1 style="margin:0 0 10px;color:#fafafa;font-size:26px;font-weight:500;letter-spacing:-0.02em;line-height:1.2;">You’re invited</h1>
              <p style="margin:0 0 28px;color:#adadad;font-size:14px;font-weight:500;line-height:1.55;">
                Your request for <span style="color:#f4f4f5;">${email}</span> was approved.
                Enter this code on the verification page. Use the password you chose when you requested access.
              </p>
              <div style="background:#2b2b2b;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:22px 16px;text-align:center;margin:0 0 20px;">
                <p style="margin:0 0 12px;color:#828282;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Verification code</p>
                <p style="margin:0;color:#fafafa;font-size:32px;font-weight:600;letter-spacing:0.35em;">${code}</p>
              </div>
              <a href="${verifyUrl}" style="display:block;background:#fafafa;color:#1a1816;text-decoration:none;text-align:center;font-size:14px;font-weight:600;padding:14px 18px;border-radius:10px;margin:0 0 16px;">
                Open verification page
              </a>
              <p style="margin:0;color:#828282;font-size:12px;line-height:1.5;">
                Or paste this link: <span style="color:#adadad;word-break:break-all;">${verifyUrl}</span>
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

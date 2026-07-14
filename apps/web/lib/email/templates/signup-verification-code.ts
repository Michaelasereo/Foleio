/**
 * Creator signup / email-verify OTP email (sent directly via Resend).
 * Subject: `Your Foleio verification code`
 *
 * Logo is embedded via Resend CID (`cid:foleio-logo`) so emails use the
 * current `public/foleio-logo.png`, not whatever is hosted on foleio.com.
 */

import { FOLEIO_LOGO_CID } from '@/lib/email/foleio-dark-email';

export const signupVerificationSubject = 'Your Foleio verification code';
export { FOLEIO_LOGO_CID };

export function renderSignupVerificationCodeEmail({
  email,
  code,
  siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com',
  /** Use CID for Resend sends; absolute/relative URL for browser previews. */
  logoSrc = `cid:${FOLEIO_LOGO_CID}`,
}: {
  email: string;
  code: string;
  siteUrl?: string;
  logoSrc?: string;
}) {
  const base = siteUrl.replace(/\/$/, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1816;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:#1a1816;font-size:1px;line-height:1px;">Your Foleio verification code is ${code}</div>
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
              <h1 style="margin:0 0 10px;color:#fafafa;font-size:26px;font-weight:500;letter-spacing:-0.02em;line-height:1.2;">Verify your email</h1>
              <p style="margin:0 0 28px;color:#adadad;font-size:14px;font-weight:500;line-height:1.55;">
                Enter this code to activate your creator account for <span style="color:#f4f4f5;">${email}</span>.
              </p>
              <div style="background:#2b2b2b;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:22px 16px;text-align:center;margin:0 0 20px;">
                <p style="margin:0 0 12px;color:#828282;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Verification code</p>
                <span style="display:inline-block;font-size:34px;letter-spacing:0.28em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;color:#ffffff;padding-left:0.28em;">${code}</span>
              </div>
              <p style="margin:0;color:#828282;font-size:13px;font-weight:500;line-height:1.55;">
                Expires in 10 minutes. Enter it in the app — no link needed.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 8px 0;">
              <p style="margin:0 0 8px;color:#828282;font-size:12px;font-weight:500;line-height:1.5;">
                If you didn’t create a Foleio account, ignore this email.
              </p>
              <p style="margin:0;color:rgba(250,250,250,0.3);font-size:12px;font-weight:500;">
                © 2026 Foleio. All rights reserved.
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

/** @deprecated Supabase template paste helpers — signup OTP is sent via Resend now. */
export const supabaseConfirmSignupSubject = signupVerificationSubject;
export const supabaseConfirmSignupBody = renderSignupVerificationCodeEmail({
  email: '{{ .Email }}',
  code: '{{ .Token }}',
  siteUrl: '{{ .SiteURL }}',
  logoSrc: '{{ .SiteURL }}/foleio-logo.png',
});

export function emailSignature() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';

  return `
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid #E8E0D5;font-family:DM Sans,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;">
            <a href="${baseUrl}" style="text-decoration:none;">
              <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F97316;letter-spacing:-0.5px;">
                foleio.
              </span>
            </a>
          </td>
          <td align="right" style="vertical-align:middle;">
            <a href="https://instagram.com/foleiohq" style="color:#9E8E82;font-size:12px;text-decoration:none;margin-left:12px;">Instagram</a>
            <a href="https://x.com/foleiohq" style="color:#9E8E82;font-size:12px;text-decoration:none;margin-left:12px;">X</a>
            <a href="https://tiktok.com/@foleiohq" style="color:#9E8E82;font-size:12px;text-decoration:none;margin-left:12px;">TikTok</a>
          </td>
        </tr>
      </table>

      <div style="height:1px;background:#E8E0D5;margin:20px 0;"></div>

      <p style="font-size:12px;color:#9E8E82;margin:0 0 8px;line-height:1.6;">
        © 2026 Foleio · Lagos, Nigeria
      </p>

      <p style="font-size:12px;color:#9E8E82;margin:0 0 12px;">
        <a href="${baseUrl}/privacy" style="color:#9E8E82;text-decoration:underline;">Privacy Policy</a>
        &nbsp;·&nbsp;
        <a href="${baseUrl}/terms" style="color:#9E8E82;text-decoration:underline;">Terms of Service</a>
        &nbsp;·&nbsp;
        <a href="mailto:hello@foleio.com" style="color:#9E8E82;text-decoration:underline;">Help</a>
      </p>

      <p style="font-size:11px;color:#C4B5A8;margin:0;line-height:1.5;">
        You received this email because you have a Foleio account.<br/>
        © ${new Date().getFullYear()} Foleio. All rights reserved.
      </p>
    </div>
  `;
}

import { Resend } from 'resend';
import { baseEmailTemplate } from './base-template';

export const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM_EMAIL = 'Foleio <noreply@foleio.com>';

function canSendEmails() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RESEND_SEND_IN_DEV === 'true'
  );
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!canSendEmails()) {
    console.log('📧 Email skipped (dev mode):', subject, to);
    return { success: true };
  }

  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false };
  }
}

export async function sendWelcomeEmail({
  email,
  displayName,
  username,
}: {
  email: string;
  displayName: string;
  username: string;
}) {
  if (!canSendEmails()) {
    console.log('📧 Email skipped (dev mode):', `Welcome to Foleio, ${displayName} 🧡`, email);
    return { success: true };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';

  try {
    await resend.emails.send({
      from: 'Foleio <hello@foleio.com>',
      to: email,
      subject: `Welcome to Foleio, ${displayName} 🧡`,
      html: baseEmailTemplate({
        previewText: "Your world is now live on Foleio. Here's how to get started.",
        body: `
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:#FFF4EC;border-radius:16px;padding:16px 24px;margin-bottom:24px;">
              <span style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#F97316;letter-spacing:-1px;">foleio.</span>
            </div>
          </div>

          <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:700;color:#1C1008;margin:0 0 16px;line-height:1.2;text-align:center;">
            Welcome to Foleio,<br/>${displayName} 🧡
          </h1>

          <p style="font-size:16px;color:#6B5E52;line-height:1.7;margin:0 0 32px;text-align:center;">
            Your world is now live. You're one of the first creators on Foleio — and that means something. Everything you build here is yours.
          </p>

          <div style="height:1px;background:#F0EAE0;margin:0 0 32px;"></div>

          <p style="font-size:13px;font-weight:700;color:#F97316;text-transform:uppercase;letter-spacing:1px;margin:0 0 20px;">
            Here's how to get started
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
            <tr>
              <td width="40" style="vertical-align:top;padding-top:2px;">
                <div style="width:28px;height:28px;background:#FFF4EC;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#F97316;">1</div>
              </td>
              <td style="vertical-align:top;">
                <p style="font-size:15px;font-weight:700;color:#1C1008;margin:0 0 4px;">Upload your first piece of content</p>
                <p style="font-size:14px;color:#9E8E82;margin:0;line-height:1.5;">
                  A video, a PDF, a mini-course — whatever your audience will love. Set a price and publish it.
                </p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
            <tr>
              <td width="40" style="vertical-align:top;padding-top:2px;">
                <div style="width:28px;height:28px;background:#FFF4EC;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#F97316;">2</div>
              </td>
              <td style="vertical-align:top;">
                <p style="font-size:15px;font-weight:700;color:#1C1008;margin:0 0 4px;">Share your profile card</p>
                <p style="font-size:14px;color:#9E8E82;margin:0;line-height:1.5;">
                  Go to Account Settings and download your profile card. Post it on your Instagram stories and let your audience know you're live.
                </p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
            <tr>
              <td width="40" style="vertical-align:top;padding-top:2px;">
                <div style="width:28px;height:28px;background:#FFF4EC;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#F97316;">3</div>
              </td>
              <td style="vertical-align:top;">
                <p style="font-size:15px;font-weight:700;color:#1C1008;margin:0 0 4px;">Write your first journal entry</p>
                <p style="font-size:14px;color:#9E8E82;margin:0;line-height:1.5;">
                  Share your story. Journal entries are free for all your fans to read — it's how they fall in love with your world before they subscribe.
                </p>
              </td>
            </tr>
          </table>

          <div style="text-align:center;margin-bottom:32px;">
            <a href="${baseUrl}/dashboard" style="display:inline-block;background:#F97316;color:white;padding:16px 36px;border-radius:100px;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:-0.3px;">
              Go to my dashboard →
            </a>
          </div>

          <div style="background:#F5F0E8;border-radius:14px;padding:16px 20px;text-align:center;margin-bottom:8px;">
            <p style="font-size:12px;color:#9E8E82;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
              Your public profile
            </p>
            <a href="${baseUrl}/creator/${username}" style="font-size:15px;font-weight:700;color:#F97316;text-decoration:none;">
              foleio.com/creator/${username}
            </a>
          </div>
        `,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('Welcome email send error:', error);
    return { success: false };
  }
}

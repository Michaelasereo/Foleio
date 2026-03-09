import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { baseEmailTemplate } from '@/lib/email/base-template';

function getAdminEmail() {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    'noreply@foleio.com'
  );
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';
}

export async function sendModerationAlertEmail({
  contentId,
  contentTitle,
  creatorEmail,
  creatorName,
  reason,
}: {
  contentId: string;
  contentTitle: string;
  creatorEmail: string;
  creatorName: string;
  reason: string;
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: getAdminEmail(),
      subject: `🚨 Content Flagged for Review — ${contentTitle}`,
      html: baseEmailTemplate({
        previewText: `Content flagged: ${contentTitle}`,
        body: `
        <h2>Content Flagged for Review</h2>
        <p><strong>Content:</strong> ${contentTitle}</p>
        <p><strong>Content ID:</strong> ${contentId}</p>
        <p><strong>Creator:</strong> ${creatorName} (${creatorEmail})</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Flagged at:</strong> ${new Date().toISOString()}</p>
        <br/>
        <p>
          <a href="${appUrl()}/admin/moderation">
            Review in Admin Dashboard →
          </a>
        </p>
        <p style="color:#666;font-size:12px;">
          Content has been automatically unpublished and is pending review.
        </p>
      `,
      }),
    });
  } catch (error) {
    console.error('Failed to send moderation alert email:', error);
  }
}

export async function sendModerationReviewResultEmail({
  to,
  title,
  approved,
}: {
  to: string;
  title: string;
  approved: boolean;
}) {
  const subject = approved
    ? 'Your content is now live on Foleio'
    : 'Your content is under review on Foleio';
  const body = approved
    ? `<p>Your content "<strong>${title}</strong>" has been approved and is now live.</p>`
    : `<p>Your content "<strong>${title}</strong>" was removed and is currently under review for platform guidelines compliance.</p>`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: baseEmailTemplate({
        previewText: approved ? 'Your content is now live on Foleio' : 'Your content is under review on Foleio',
        body: `${body}<p>If you have questions, reply to this email.</p>`,
      }),
    });
  } catch (error) {
    console.error('Failed to send moderation review result email:', error);
  }
}

export async function sendCreatorBanEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Your Foleio creator account has been suspended',
      html: baseEmailTemplate({
        previewText: 'Your creator account has been suspended',
        body: `
        <p>Hi ${name},</p>
        <p>Your creator account has been suspended for violating Foleio content guidelines.</p>
        <p>If you believe this was a mistake, please contact support.</p>
      `,
      }),
    });
  } catch (error) {
    console.error('Failed to send creator ban email:', error);
  }
}

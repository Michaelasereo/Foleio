import { resend, FROM_EMAIL } from './resend';
import { prisma } from '@foleio/database';
import { subscriptionConfirmationEmail } from './templates/subscription-confirmation';
import { contentPurchaseEmail } from './templates/content-purchase';
import { bookingConfirmationEmail } from './templates/booking-confirmation';
import { bookingCreatorNotificationEmail } from './templates/booking-creator-notification';
import { bookingStatusUpdateEmail } from './templates/booking-status-update';
import { payoutConfirmationEmail } from './templates/payout-confirmation';
import { foundingCreatorResetEmailTemplate } from './templates/founding-creator-reset';
import { baseEmailTemplate } from './base-template';
import { getFoleioLogoAttachment } from './foleio-dark-email';

function canSendEmails() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RESEND_SEND_IN_DEV === 'true'
  );
}

async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
  withLogo?: boolean;
}) {
  if (!canSendEmails()) {
    console.log('📧 Email skipped (dev mode):', payload.subject, payload.to);
    return { success: true };
  }

  try {
    const attachments = payload.withLogo
      ? [await getFoleioLogoAttachment()]
      : undefined;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(attachments ? { attachments } : {}),
    });
    return { success: true };
  } catch (error) {
    console.error('Resend email send failed:', error);
    return { success: false };
  }
}

export async function sendSubscriptionConfirmation(data: {
  fanEmail: string;
  creatorName: string;
  creatorUsername: string;
  planName: string;
  amount: number;
  nextBillingDate: string;
}) {
  try {
    const { subject, html } = subscriptionConfirmationEmail(data);
    return await sendEmail({ to: data.fanEmail, subject, html });
  } catch (error) {
    console.error('sendSubscriptionConfirmation failed:', error);
    return { success: false };
  }
}

export async function sendContentPurchaseEmail(data: {
  email: string;
  creatorName: string;
  contentTitle: string;
  amount: number;
  accessCode?: string;
  accessUrl: string;
}) {
  try {
    const { subject, html } = contentPurchaseEmail(data);
    return await sendEmail({ to: data.email, subject, html });
  } catch (error) {
    console.error('sendContentPurchaseEmail failed:', error);
    return { success: false };
  }
}

export async function sendBookingConfirmation(data: {
  customerName: string;
  customerEmail: string;
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
  try {
    const { subject, html } = bookingConfirmationEmail(data);
    return await sendEmail({
      to: data.customerEmail,
      subject,
      html,
      withLogo: true,
    });
  } catch (error) {
    console.error('sendBookingConfirmation failed:', error);
    return { success: false };
  }
}

export async function sendBookingCreatorNotification(data: {
  creatorEmail: string;
  creatorName: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingDate: string;
  amount: number;
  bookingUrl: string;
  paymentPlan?: string;
  amountPaid?: number;
  balanceAmount?: number;
  status?: string;
}) {
  try {
    const { subject, html } = bookingCreatorNotificationEmail(data);
    return await sendEmail({
      to: data.creatorEmail,
      subject,
      html,
      withLogo: true,
    });
  } catch (error) {
    console.error('sendBookingCreatorNotification failed:', error);
    return { success: false };
  }
}

export async function sendBookingStatusUpdate(data: {
  customerEmail: string;
  customerName: string;
  creatorName: string;
  serviceName: string;
  bookingDate: string;
  status: 'paid' | 'service_day' | 'completed' | 'disputed' | 'refunded';
  trackingUrl: string;
}) {
  try {
    const { subject, html } = bookingStatusUpdateEmail(data);
    return await sendEmail({ to: data.customerEmail, subject, html });
  } catch (error) {
    console.error('sendBookingStatusUpdate failed:', error);
    return { success: false };
  }
}

export async function sendPayoutConfirmation(data: {
  creatorEmail: string;
  creatorName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  status: string;
}) {
  try {
    const { subject, html } = payoutConfirmationEmail(data);
    return await sendEmail({ to: data.creatorEmail, subject, html });
  } catch (error) {
    console.error('sendPayoutConfirmation failed:', error);
    return { success: false };
  }
}

export async function sendPayoutRequestEmail(data: {
  creatorName: string;
  creatorEmail: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  payoutId: string;
}) {
  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    'noreply@foleio.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';
  const amountText = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(data.amount / 100);

  const subject = `💸 New Payout Request — ${data.creatorName} — ${amountText}`;
  const html = baseEmailTemplate({
    previewText: `New payout request from ${data.creatorName}`,
    body: `
    <h2>New Payout Request</h2>
    <p><strong>Creator:</strong> ${data.creatorName} (${data.creatorEmail})</p>
    <p><strong>Amount:</strong> ${amountText}</p>
    <p><strong>Payout ID:</strong> ${data.payoutId}</p>
    <p><strong>Bank:</strong> ${data.bankName}</p>
    <p><strong>Account Number:</strong> ${data.accountNumber}</p>
    <p><strong>Account Name:</strong> ${data.accountName}</p>
    <p><a href="${appUrl}/admin/payouts">Open payout queue →</a></p>
  `,
  });

  return sendEmail({ to: adminEmail, subject, html });
}

export async function sendPayoutRequestConfirmationEmail(data: {
  creatorEmail: string;
  creatorName: string;
  amount: number;
  expectedDate: string;
}) {
  const amountText = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(data.amount / 100);

  const subject = 'Payout request received 🧡';
  const html = baseEmailTemplate({
    previewText: 'Your payout request was received',
    body: `
    <p>Hi ${data.creatorName},</p>
    <p>We received your payout request for <strong>${amountText}</strong>.</p>
    <p>It will be processed by <strong>${data.expectedDate}</strong>.</p>
    <p>We'll email you once it's on its way.</p>
  `,
  });

  return sendEmail({ to: data.creatorEmail, subject, html });
}

export async function sendPayoutSentEmail(data: {
  creatorEmail: string;
  creatorName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
}) {
  const amountText = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(data.amount / 100);
  const last4 = data.accountNumber.slice(-4);

  const subject = 'Your payout is on its way 🎉';
  const html = baseEmailTemplate({
    previewText: 'Your payout is on its way',
    body: `
    <p>Hi ${data.creatorName},</p>
    <p>Your payout of <strong>${amountText}</strong> has been sent to <strong>${data.bankName}</strong> ending in <strong>${last4}</strong>.</p>
    <p>It should arrive within 1 business day.</p>
    <p>Thank you for being a Foleio founding creator.</p>
  `,
  });

  return sendEmail({ to: data.creatorEmail, subject, html });
}

export async function sendPayoutRejectedEmail(data: {
  creatorEmail: string;
  creatorName: string;
  amount: number;
  reason: string;
}) {
  const amountText = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(data.amount / 100);

  const subject = 'Payout request update';
  const html = baseEmailTemplate({
    previewText: 'There is an update to your payout request',
    body: `
    <p>Hi ${data.creatorName},</p>
    <p>Your payout request of <strong>${amountText}</strong> could not be processed.</p>
    <p><strong>Reason:</strong> ${data.reason}</p>
    <p>Your balance has been returned to your account.</p>
    <p>Please contact support@foleio.com if you have questions.</p>
  `,
  });

  return sendEmail({ to: data.creatorEmail, subject, html });
}

export async function sendFoundingCreatorResetEmail(data: { email: string }) {
  try {
    const { subject, html } = foundingCreatorResetEmailTemplate();
    return await sendEmail({
      to: data.email,
      subject,
      html,
    });
  } catch (error) {
    console.error('sendFoundingCreatorResetEmail failed:', error);
    return { success: false };
  }
}

export async function notifySubscribersNewEntry({
  creatorId,
  entryTitle,
  entrySlug,
  creatorUsername,
  creatorName,
}: {
  creatorId: string;
  entryTitle: string;
  entrySlug: string;
  creatorUsername: string;
  creatorName: string;
}) {
  const subscribers = await prisma.fanSubscription.findMany({
    where: {
      creatorId,
      status: 'active',
    },
    select: {
      fan: { select: { email: true } },
    },
  });

  const emails = subscribers.map((sub) => sub.fan.email).filter(Boolean);
  if (!emails.length) return;

  const entryUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'}/creator/${creatorUsername}/journal/${entrySlug}`;
  const batches = chunk(emails, 50);

  for (const batch of batches) {
    if (!canSendEmails()) {
      continue;
    }
    await resend.batch.send(
      batch.map((to) => ({
        from: `${creatorName} via Foleio <noreply@foleio.com>`,
        to,
        subject: `📖 New journal entry: ${entryTitle}`,
        html: baseEmailTemplate({
          previewText: `New journal entry: ${entryTitle}`,
          body: `
          <div style="max-width:560px;margin:0 auto;font-family:DM Sans,sans-serif;">
            <div style="background:#F5F0E8;padding:32px;border-radius:16px;">
              <p style="color:#F97316;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                New Journal Entry
              </p>
              <h1 style="color:#1C1008;font-size:28px;font-weight:800;line-height:1.2;margin:0 0 16px;">
                ${entryTitle}
              </h1>
              <a href="${entryUrl}" style="display:inline-block;background:#F97316;color:white;padding:14px 28px;border-radius:100px;font-weight:700;font-size:15px;text-decoration:none;">
                Read now →
              </a>
            </div>
          </div>
        `,
        }),
      }))
    );
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

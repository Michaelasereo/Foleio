import { resend, FROM_EMAIL } from './resend';
import { subscriptionConfirmationEmail } from './templates/subscription-confirmation';
import { contentPurchaseEmail } from './templates/content-purchase';
import { bookingConfirmationEmail } from './templates/booking-confirmation';
import { bookingStatusUpdateEmail } from './templates/booking-status-update';
import { payoutConfirmationEmail } from './templates/payout-confirmation';

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
}) {
  if (!canSendEmails()) {
    console.log('📧 Email skipped (dev mode):', payload.subject, payload.to);
    return { success: true };
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
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
}) {
  try {
    const { subject, html } = bookingConfirmationEmail(data);
    return await sendEmail({ to: data.customerEmail, subject, html });
  } catch (error) {
    console.error('sendBookingConfirmation failed:', error);
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
  const html = `
    <h2>New Payout Request</h2>
    <p><strong>Creator:</strong> ${data.creatorName} (${data.creatorEmail})</p>
    <p><strong>Amount:</strong> ${amountText}</p>
    <p><strong>Payout ID:</strong> ${data.payoutId}</p>
    <p><strong>Bank:</strong> ${data.bankName}</p>
    <p><strong>Account Number:</strong> ${data.accountNumber}</p>
    <p><strong>Account Name:</strong> ${data.accountName}</p>
    <p><a href="${appUrl}/admin/payouts">Open payout queue →</a></p>
  `;

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
  const html = `
    <p>Hi ${data.creatorName},</p>
    <p>We received your payout request for <strong>${amountText}</strong>.</p>
    <p>It will be processed by <strong>${data.expectedDate}</strong>.</p>
    <p>We'll email you once it's on its way.</p>
  `;

  return sendEmail({ to: data.creatorEmail, subject, html });
}

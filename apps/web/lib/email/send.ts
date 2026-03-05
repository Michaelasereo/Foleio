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

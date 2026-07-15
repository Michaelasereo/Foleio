import { baseEmailTemplate, ctaButton } from './common';

function statusSubject(status: string, creatorName: string) {
  switch (status) {
    case 'paid':
      return `Payment received for your booking with ${creatorName}`;
    case 'service_day':
      return `Your appointment with ${creatorName} is today! 🎉`;
    case 'completed':
      return `Your booking with ${creatorName} is complete`;
    case 'disputed':
      return 'Your dispute has been received';
    case 'refunded':
      return 'Your refund is being processed';
    case 'cancelled':
      return `Booking cancelled with ${creatorName}`;
    default:
      return `Booking update with ${creatorName}`;
  }
}

function statusMessage(status: string, creatorName: string, serviceName: string) {
  switch (status) {
    case 'paid':
      return `We've received payment for your ${serviceName} booking with ${creatorName}.`;
    case 'service_day':
      return `Your ${serviceName} appointment with ${creatorName} is today.`;
    case 'completed':
      return `Your ${serviceName} booking with ${creatorName} has been marked complete.`;
    case 'disputed':
      return 'We have received your dispute request and it is now under review.';
    case 'refunded':
      return 'Your refund has been approved and is being processed.';
    case 'cancelled':
      return `Your ${serviceName} booking with ${creatorName} has been cancelled.`;
    default:
      return `Your booking with ${creatorName} has a new status update.`;
  }
}

export function bookingStatusUpdateEmail({
  customerName,
  creatorName,
  serviceName,
  bookingDate,
  status,
  trackingUrl,
}: {
  customerName: string;
  creatorName: string;
  serviceName: string;
  bookingDate: string;
  status: 'paid' | 'service_day' | 'completed' | 'disputed' | 'refunded' | 'cancelled';
  trackingUrl: string;
}) {
  const subject = statusSubject(status, creatorName);
  const html = baseEmailTemplate(`
    <p style="margin:0 0 12px;">Hi ${customerName},</p>
    <p style="margin:0 0 12px;">${statusMessage(status, creatorName, serviceName)}</p>
    <p style="margin:0 0 4px;"><strong>Service:</strong> ${serviceName}</p>
    <p style="margin:0 0 12px;"><strong>Date:</strong> ${bookingDate}</p>
    <div style="margin-top:18px;">
      ${ctaButton('Track Booking Status', trackingUrl)}
    </div>
  `);

  return { subject, html };
}

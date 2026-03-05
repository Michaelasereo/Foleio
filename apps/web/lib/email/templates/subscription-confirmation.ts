import { baseEmailTemplate, ctaButton, formatNaira } from './common';

export function subscriptionConfirmationEmail({
  fanEmail,
  creatorName,
  creatorUsername,
  planName,
  amount,
  nextBillingDate,
}: {
  fanEmail: string;
  creatorName: string;
  creatorUsername: string;
  planName: string;
  amount: number;
  nextBillingDate: string;
}) {
  const subject = `You're now subscribed to ${creatorName} 🧡`;
  const html = baseEmailTemplate(`
    <p style="margin:0 0 12px;">Hi there,</p>
    <p style="margin:0 0 12px;">You've successfully subscribed to ${creatorName}'s ${planName} plan.</p>
    <p style="margin:0 0 8px;"><strong>Amount paid:</strong> ${formatNaira(amount)}</p>
    <p style="margin:0 0 16px;"><strong>Next billing date:</strong> ${nextBillingDate}</p>
    <div style="margin:20px 0;">
      ${ctaButton(`View ${creatorName}'s Content`, `${process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'}/creator/${creatorUsername}`)}
    </div>
    <p style="margin:0;color:#666;">To manage your subscription, visit foleio.com/fan/subscriptions</p>
  `);

  return { subject, html };
}

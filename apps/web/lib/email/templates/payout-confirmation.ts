import { baseEmailTemplate, formatNaira } from './common';

export function payoutConfirmationEmail({
  creatorName,
  amount,
  bankName,
  accountNumber,
  status,
}: {
  creatorName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  status: string;
}) {
  const subject = `Your payout of ${formatNaira(amount)} is on its way 💰`;
  const last4 = accountNumber.slice(-4);

  const html = baseEmailTemplate(`
    <p style="margin:0 0 12px;">Hi ${creatorName},</p>
    <p style="margin:0 0 12px;">Your payout request has been processed.</p>
    <p style="margin:0 0 6px;"><strong>Amount:</strong> ${formatNaira(amount)}</p>
    <p style="margin:0 0 6px;"><strong>Bank:</strong> ${bankName}</p>
    <p style="margin:0 0 6px;"><strong>Account:</strong> ending in ${last4}</p>
    <p style="margin:0 0 12px;"><strong>Status:</strong> ${status}</p>
    <p style="margin:0;color:#666;">Payouts typically arrive within 1-2 business days.</p>
  `);

  return { subject, html };
}

import { baseEmailTemplate, ctaButton, formatNaira } from './common';

export function contentPurchaseEmail({
  email,
  creatorName,
  contentTitle,
  amount,
  accessCode,
  accessUrl,
}: {
  email: string;
  creatorName: string;
  contentTitle: string;
  amount: number;
  accessCode?: string;
  accessUrl: string;
}) {
  const subject = `Your purchase is confirmed — ${contentTitle}`;
  const codeBlock = accessCode
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin:18px 0;">
         <div style="font-size:12px;color:#9a3412;margin-bottom:8px;">Your access code</div>
         <div style="font-size:28px;font-weight:700;letter-spacing:3px;color:#c2410c;">${accessCode}</div>
       </div>
       <p style="margin:0 0 12px;color:#666;">This code expires in 15 minutes. Enter it on the content page to unlock access.</p>`
    : '';

  const html = baseEmailTemplate(`
    <p style="margin:0 0 12px;">You've purchased ${contentTitle} by ${creatorName}.</p>
    <p style="margin:0 0 16px;"><strong>Amount paid:</strong> ${formatNaira(amount)}</p>
    ${codeBlock}
    <div style="margin-top:18px;">
      ${ctaButton('Access Content Now', accessUrl)}
    </div>
  `);

  return { subject, html };
}

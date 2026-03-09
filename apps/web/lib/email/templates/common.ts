import { baseEmailTemplate as buildBaseEmailTemplate } from '@/lib/email/base-template';

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function baseEmailTemplate(content: string): string {
  return buildBaseEmailTemplate({
    previewText: 'Foleio update',
    body: content,
  });
}

export function ctaButton(label: string, href: string): string {
  return `
    <a href="${href}" style="display:inline-block;background:#F97316;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
      ${label}
    </a>
  `;
}

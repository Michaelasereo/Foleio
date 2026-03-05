export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function baseEmailTemplate(content: string): string {
  return `
  <div style="background:#F5F0E8;padding:32px 16px;font-family:Arial,sans-serif;">
    <div style="max-width:620px;margin:0 auto;">
      <div style="font-size:36px;font-weight:700;color:#F97316;margin-bottom:16px;">Foleio</div>
      <div style="background:#ffffff;border-radius:14px;padding:28px;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
        ${content}
      </div>
      <div style="margin-top:16px;color:#7a7a7a;font-size:12px;">
        Powered by Foleio · noreply@foleio.com
      </div>
    </div>
  </div>
  `;
}

export function ctaButton(label: string, href: string): string {
  return `
    <a href="${href}" style="display:inline-block;background:#F97316;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
      ${label}
    </a>
  `;
}

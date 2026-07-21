import { understandYourFeesEmail } from '@/lib/email/templates/understand-your-fees';

/** Dev-only: preview the “Understand your fees” welcome email (dark shell). */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { html } = understandYourFeesEmail({
    displayName: 'Ada',
    billingUrl: `${appUrl}/settings?tab=billing`,
    siteUrl: appUrl,
    logoSrc: `${appUrl}/foleio-logo.png`,
  });

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

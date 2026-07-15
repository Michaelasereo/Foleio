import { NextRequest } from 'next/server';
import { balanceReminderEmail } from '@/lib/email/templates/balance-reminder';
import type { BalanceReminderKind } from '@/lib/booking/deposit';

const SAMPLE_KINDS: BalanceReminderKind[] = [
  'reminder_2d',
  'reminder_due',
  'reminder_overdue',
];

/** Dev-only: preview balance reminder emails in the browser. */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }

  const kindParam = request.nextUrl.searchParams.get('kind');
  const kind: BalanceReminderKind = SAMPLE_KINDS.includes(
    kindParam as BalanceReminderKind
  )
    ? (kindParam as BalanceReminderKind)
    : 'reminder_due';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const trackingUrl = `${appUrl}/tracking/SAMPLE-TRACKING-TOKEN`;

  const { html } = balanceReminderEmail({
    customerName: 'Jane Doe',
    creatorName: 'Quiet Brand',
    serviceName: 'Bridal Makeup',
    bookingDate: 'Sat, 20 Jul 2026 · 10:00 AM–2:00 PM',
    balanceAmount: 45000,
    balanceDueDateLabel: 'Mon, 15 Jul 2026',
    trackingUrl,
    kind,
  });

  // In real emails the logo is a CID attachment; for browser preview swap it
  // for the public asset so it renders.
  const previewHtml = html.replace(
    /cid:foleio-logo/g,
    `${appUrl}/foleio-logo.png`
  );

  return new Response(previewHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

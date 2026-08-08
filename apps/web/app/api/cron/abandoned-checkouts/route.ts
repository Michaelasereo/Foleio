import { processAbandonedCheckouts } from '@/lib/shop/abandoned-checkout-scheduler';

/**
 * Hourly cron: abandoned checkout reminders (1h) + auto-cancel (24h)
 * for pending bookings and shop orders.
 * Auth: Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processAbandonedCheckouts();
  return Response.json({ success: true, ...result });
}

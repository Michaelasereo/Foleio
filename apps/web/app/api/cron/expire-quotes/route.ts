import { processQuoteExpiry } from '@/lib/quotes/quote-expiry-scheduler';

/**
 * Daily/hourly cron: expire sent/accepted quotes past validUntil.
 * Auth: Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processQuoteExpiry();
  return Response.json({ success: true, ...result });
}

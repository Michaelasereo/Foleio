import { processBalanceReminders } from '@/lib/booking/balance-reminder-scheduler';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processBalanceReminders();
  return Response.json({ success: true, ...result });
}

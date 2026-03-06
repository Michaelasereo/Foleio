import { sendOnboardingNudges } from '@/lib/email/nudge-scheduler';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await sendOnboardingNudges();
  return Response.json({ success: true });
}

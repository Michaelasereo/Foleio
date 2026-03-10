import { NextRequest, NextResponse } from 'next/server';
import { getFanSession } from '@/lib/fan-auth/session';
import { getFanDashboardData } from '@/lib/fan-auth/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = getFanSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getFanDashboardData(session.email);
    return NextResponse.json(data);
  } catch (error) {
    console.error('fan dashboard fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fan dashboard data' },
      { status: 500 }
    );
  }
}

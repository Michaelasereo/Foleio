import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.$executeRaw`
      UPDATE creators
      SET has_seen_welcome = TRUE
      WHERE user_id = ${user.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update welcome state', details: error?.message },
      { status: 500 }
    );
  }
}

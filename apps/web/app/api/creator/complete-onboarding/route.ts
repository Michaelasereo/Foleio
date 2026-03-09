import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { sendWelcomeEmail } from '@/lib/email/resend';

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

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: {
        username: true,
        displayName: true,
        hasCompletedOnboarding: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    if (creator.hasCompletedOnboarding) {
      return NextResponse.json({ success: true });
    }

    await prisma.creator.update({
      where: { userId: user.id },
      data: { hasCompletedOnboarding: true },
    });

    if (user.email) {
      sendWelcomeEmail({
        email: user.email,
        displayName: creator.displayName || creator.username,
        username: creator.username,
      }).catch((err) => {
        console.error('[welcome-email] failed:', err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to complete onboarding', details: error?.message },
      { status: 500 }
    );
  }
}

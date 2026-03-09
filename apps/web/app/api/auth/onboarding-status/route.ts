import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        hasCompletedOnboarding: false,
      });
    }

    let creator: { id: string; hasCompletedOnboarding: boolean } | null = null;
    try {
      creator = await prisma.creator.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          hasCompletedOnboarding: true,
        },
      });
    } catch {
      const legacyCreator = await prisma.creator.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      creator = legacyCreator
        ? { id: legacyCreator.id, hasCompletedOnboarding: true }
        : null;
    }

    return NextResponse.json({
      authenticated: true,
      hasCreator: Boolean(creator),
      hasCompletedOnboarding: creator?.hasCompletedOnboarding ?? false,
    });
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        hasCompletedOnboarding: false,
      },
      { status: 200 }
    );
  }
}

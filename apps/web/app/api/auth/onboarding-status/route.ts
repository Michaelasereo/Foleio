import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export const dynamic = 'force-dynamic';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

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
      creator = await withTimeout(
        prisma.creator.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            hasCompletedOnboarding: true,
          },
        }),
        15000
      );
    } catch {
      try {
        const legacyCreator = await withTimeout(
          prisma.creator.findUnique({
            where: { userId: user.id },
            select: { id: true },
          }),
          15000
        );
        creator = legacyCreator
          ? { id: legacyCreator.id, hasCompletedOnboarding: true }
          : null;
      } catch {
        creator = null;
      }
    }

    return NextResponse.json({
      authenticated: true,
      hasCreator: Boolean(creator),
      hasCompletedOnboarding: creator?.hasCompletedOnboarding ?? false,
    });
  } catch (error) {
    console.error('onboarding-status failed:', error);
    return NextResponse.json(
      {
        authenticated: false,
        hasCreator: false,
        hasCompletedOnboarding: false,
        error: 'status_unavailable',
      },
      { status: 503 }
    );
  }
}

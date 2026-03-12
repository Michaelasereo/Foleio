import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { serializeCreator } from '@/lib/utils/serialization';
import { ensureDbUser } from '@/lib/auth/ensure-db-user';
import { shouldAutoUpgradeToPremium } from '@/lib/config/pilot';

export const dynamic = 'force-dynamic';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

const creatorSafeSelect = {
  id: true,
  userId: true,
  username: true,
  displayName: true,
  bio: true,
  category: true,
  instagramHandle: true,
  tiktokHandle: true,
  avatarUrl: true,
  platformPlan: true,
  balance: true,
  pendingBalance: true,
  totalEarnings: true,
  payoutThreshold: true,
  currentBalance: true,
  chargebackRate: true,
  trustScore: true,
  isPublic: true,
  subscriberCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(request: Request) {
  console.log('🎯 Creator API called');

  try {
    // 1. Initialize Supabase client CORRECTLY for route handlers
    const supabase = await createRouteHandlerClient();

    // 2. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('❌ No user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log(`✅ User authenticated: ${user.id} (${user.email})`);

    // Ensure users row exists before creating related creator row
    await withTimeout(ensureDbUser(user), 2000);

    // 3. Find or create creator
    let creator = await withTimeout(
      prisma.creator.findUnique({
        where: { userId: user.id },
        select: creatorSafeSelect,
      }),
      3000
    );

    if (!creator) {
      console.log(`🆕 Creating new creator for user ${user.id}`);

      // Generate a unique username
      const baseUsername = user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
      let username = baseUsername;
      let counter = 1;

      // Check if username exists
      while (await withTimeout(
        prisma.creator.findUnique({ where: { username }, select: { id: true } }),
        3000
      )) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      const autoPremium = shouldAutoUpgradeToPremium(user.email);
      creator = await withTimeout(
        prisma.creator.create({
          data: {
            userId: user.id,
            username,
            displayName: user.user_metadata?.full_name || username,
            platformPlan: autoPremium ? 'premium' : 'starter',
            platformSubscriptionActive: true,
            platformSubscriptionEndsAt: autoPremium
              ? null
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            balance: 0,
            pendingBalance: 0,
            totalEarnings: 0,
            payoutThreshold: 500000, // 5000 NGN in kobo
            currentBalance: 0,
            trustScore: 100,
            isPublic: true
          },
          select: creatorSafeSelect,
        }),
        3000
      );

      console.log(`✅ Creator created: ${creator.id}`);
    }

    console.log(`✅ Creator found: ${creator.id}`);

    const [contentCount, collections] = await Promise.all([
      withTimeout(
        prisma.content.count({
          where: { creatorId: creator.id, isPublished: true },
        }),
        3000
      ).catch(() => 0),
      withTimeout(
        prisma.collection.findMany({
          where: { creatorId: creator.id },
          select: {
            id: true,
            title: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        3000
      ).catch(() => []),
    ]);

    // 4. Serialize ALL Prisma special types
    const serializedCreator = serializeCreator(creator);
    let hasSeenWelcome = false;
    let hasCompletedTour = false;
    try {
      const creatorFlags = await withTimeout(
        prisma.$queryRaw<
          Array<{ has_seen_welcome: boolean | null; has_completed_tour: boolean | null }>
        >`
          SELECT has_seen_welcome, has_completed_tour
          FROM creators
          WHERE id = ${creator.id}
          LIMIT 1
        `,
        2500
      );
      hasSeenWelcome = creatorFlags[0]?.has_seen_welcome ?? false;
      hasCompletedTour = creatorFlags[0]?.has_completed_tour ?? false;
    } catch {
      try {
        const legacyWelcomeRows = await withTimeout(
          prisma.$queryRaw<Array<{ has_seen_welcome: boolean | null }>>`
            SELECT has_seen_welcome
            FROM creators
            WHERE id = ${creator.id}
            LIMIT 1
          `,
          2500
        );
        hasSeenWelcome = legacyWelcomeRows[0]?.has_seen_welcome ?? false;
      } catch {
        hasSeenWelcome = false;
      }
      hasCompletedTour = false;
    }

    const creatorResponse = {
      ...serializedCreator,
      contentCount,
      collections,
      hasSeenWelcome,
      hasCompletedTour,
      // Compatibility fallback while some databases are still missing this new column.
      contentGuidelinesAccepted:
        (serializedCreator as any).contentGuidelinesAccepted ?? false,
    };

    // 5. Return serialized creator
    return NextResponse.json(creatorResponse);

  } catch (error: any) {
    console.error('❌ Creator API error:', error);

    const timeoutMessage = String(error?.message || '').toLowerCase().includes('timed out')
      ? 'Database is temporarily unavailable. Please retry.'
      : error.message;

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: timeoutMessage,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}


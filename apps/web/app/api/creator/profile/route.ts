import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { getPlanLimits } from '@/lib/utils/plan-limits';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const data: {
      username?: string;
      displayName?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      instagramHandle?: string | null;
      tiktokHandle?: string | null;
    } = {};

    if (typeof body.username === 'string') {
      const username = body.username
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
      if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
        return NextResponse.json(
          {
            error:
              'Username must be 3-30 chars and contain only lowercase letters, numbers, hyphens, and underscores',
          },
          { status: 400 }
        );
      }

      const existing = await prisma.creator.findFirst({
        where: {
          username,
          userId: { not: user.id },
        },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
      }
      data.username = username;
    }

    if (typeof body.displayName === 'string') {
      const trimmed = body.displayName.trim();
      if (trimmed.length < 2) {
        return NextResponse.json(
          { error: 'Display name must be at least 2 characters' },
          { status: 400 }
        );
      }
      data.displayName = trimmed.slice(0, 50);
    }

    if (typeof body.bio === 'string') {
      data.bio = body.bio.trim().slice(0, 150);
    } else if (body.bio === null) {
      data.bio = null;
    }

    if (typeof body.avatarUrl === 'string') {
      data.avatarUrl = body.avatarUrl;
    } else if (body.avatarUrl === null) {
      data.avatarUrl = null;
    }

    if (typeof body.instagramHandle === 'string') {
      data.instagramHandle = body.instagramHandle.trim();
    } else if (body.instagramHandle === null) {
      data.instagramHandle = null;
    }

    if (typeof body.tiktokHandle === 'string') {
      data.tiktokHandle = body.tiktokHandle.trim();
    } else if (body.tiktokHandle === null) {
      data.tiktokHandle = null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updatedCreator = await prisma.creator.update({
      where: { userId: user.id },
      data,
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        instagramHandle: true,
        tiktokHandle: true,
      },
    });

    return NextResponse.json({ success: true, creator: updatedCreator });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update profile', details: error?.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      username,
      displayName,
      bio,
      category,
      instagramHandle,
      tiktokHandle,
      subscriptionPrice,
      avatarUrl,
      bannerUrl
    } = body;

    // 3. Validate required fields
    if (!username || !displayName) {
      return NextResponse.json(
        { error: 'Username and display name are required' },
        { status: 400 }
      );
    }

    // 4. Check if username is unique (excluding current user)
    const existingCreator = await prisma.creator.findFirst({
      where: {
        username,
        userId: { not: user.id }
      }
    });

    if (existingCreator) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // 5. Update creator profile
    const updatedCreator = await prisma.creator.update({
      where: { userId: user.id },
      data: {
        username,
        displayName,
        bio,
        category,
        instagramHandle,
        tiktokHandle,
        avatarUrl,
        bannerUrl,
        // Set default platform plan and pricing
        platformPlan: 'starter',
        platformSubscriptionActive: true
      }
    });

    // 6. Create or update default subscription plan
    if (subscriptionPrice && subscriptionPrice > 0) {
      // Check if creator already has plans
      const existingPlan = await prisma.creatorPlan.findFirst({
        where: { creatorId: updatedCreator.id }
      });

      if (!existingPlan) {
        const limits = getPlanLimits(updatedCreator.platformPlan ?? null);
        if (Number.isFinite(limits.maxSubscriptionPlans)) {
          const planCount = await prisma.creatorPlan.count({
            where: { creatorId: updatedCreator.id, isActive: true },
          });
          if (planCount >= limits.maxSubscriptionPlans) {
            return NextResponse.json(
              { error: 'Plan limit reached', limitType: 'maxSubscriptionPlans' },
              { status: 403 }
            );
          }
        }
      }

      if (existingPlan) {
        // Update existing plan
        await prisma.creatorPlan.update({
          where: { id: existingPlan.id },
          data: {
            price: subscriptionPrice
          }
        });
      } else {
        // Create default plan
        await prisma.creatorPlan.create({
          data: {
            creatorId: updatedCreator.id,
            name: 'Monthly Subscription',
            description: 'Access to all premium content',
            price: subscriptionPrice,
            features: ['All premium videos', 'Exclusive content', 'Direct messaging'],
            isActive: true,
            orderIndex: 0
          }
        });
      }
    }

    // 7. Return updated creator data
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      creator: {
        id: updatedCreator.id,
        username: updatedCreator.username,
        displayName: updatedCreator.displayName,
        bio: updatedCreator.bio,
        category: updatedCreator.category,
        avatarUrl: updatedCreator.avatarUrl,
        bannerUrl: updatedCreator.bannerUrl,
        instagramHandle: updatedCreator.instagramHandle,
        tiktokHandle: updatedCreator.tiktokHandle
      }
    });

  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  }
}

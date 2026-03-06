import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { getPlanLimits } from '@/lib/utils/plan-limits';

export const dynamic = 'force-dynamic';

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

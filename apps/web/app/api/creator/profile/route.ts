import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { getPlanLimits } from '@/lib/utils/plan-limits';
import { cleanSocialUrl, parseSocialUrl } from '@/lib/creator/social-urls';
import { trimBioToMaxWords } from '@/lib/creator/bio';

export const dynamic = 'force-dynamic';

async function upsertTypedSocialLink(
  creatorId: string,
  linkType: 'twitter' | 'portfolio',
  label: string,
  rawUrl: string | null | undefined
) {
  if (rawUrl === undefined) return;

  const url = cleanSocialUrl(rawUrl);
  const existing = await prisma.creatorLink.findFirst({
    where: { creatorId, linkType },
    select: { id: true },
  });

  if (!url) {
    if (existing) {
      await prisma.creatorLink.delete({ where: { id: existing.id } });
    }
    return;
  }

  if (existing) {
    await prisma.creatorLink.update({
      where: { id: existing.id },
      data: { url, label, isActive: true },
    });
    return;
  }

  const maxOrder = await prisma.creatorLink.findFirst({
    where: { creatorId },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  });

  await prisma.creatorLink.create({
    data: {
      creatorId,
      label,
      url,
      linkType,
      isActive: true,
      orderIndex: (maxOrder?.orderIndex ?? 0) + 1,
    },
  });
}

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        displayName: true,
        username: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        category: true,
        instagramHandle: true,
        tiktokHandle: true,
        creatorLinks: {
          where: {
            linkType: { in: ['twitter', 'portfolio'] },
            isActive: true,
          },
          select: {
            id: true,
            url: true,
            linkType: true,
            label: true,
          },
        },
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const twitterUrl =
      creator.creatorLinks.find((link) => link.linkType === 'twitter')?.url || '';
    const portfolioUrl =
      creator.creatorLinks.find((link) => link.linkType === 'portfolio')?.url || '';

    return NextResponse.json({
      creator: {
        displayName: creator.displayName,
        username: creator.username,
        bio: creator.bio,
        avatarUrl: creator.avatarUrl,
        bannerUrl: creator.bannerUrl,
        category: creator.category,
        industry: creator.category ?? '',
        instagramHandle: creator.instagramHandle,
        tiktokHandle: creator.tiktokHandle,
        instagramUrl: creator.instagramHandle || '',
        tiktokUrl: creator.tiktokHandle || '',
        twitterUrl,
        portfolioUrl,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error?.message },
      { status: 500 }
    );
  }
}

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
      bannerUrl?: string | null;
      instagramHandle?: string | null;
      tiktokHandle?: string | null;
      category?: string | null;
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
      data.bio = trimBioToMaxWords(body.bio.trim());
    } else if (body.bio === null) {
      data.bio = null;
    }

    if (typeof body.avatarUrl === 'string') {
      data.avatarUrl = body.avatarUrl;
    } else if (body.avatarUrl === null) {
      data.avatarUrl = null;
    }

    if (typeof body.bannerUrl === 'string') {
      data.bannerUrl = body.bannerUrl;
    } else if (body.bannerUrl === null) {
      data.bannerUrl = null;
    }

    if (typeof body.instagramUrl === 'string' || typeof body.instagramHandle === 'string') {
      const raw =
        typeof body.instagramUrl === 'string'
          ? body.instagramUrl
          : body.instagramHandle;
      const parsed = parseSocialUrl(raw);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: `Instagram URL: ${parsed.error}` },
          { status: 400 }
        );
      }
      data.instagramHandle = parsed.url;
    } else if (body.instagramUrl === null || body.instagramHandle === null) {
      data.instagramHandle = null;
    }

    if (typeof body.tiktokUrl === 'string' || typeof body.tiktokHandle === 'string') {
      const raw =
        typeof body.tiktokUrl === 'string' ? body.tiktokUrl : body.tiktokHandle;
      const parsed = parseSocialUrl(raw);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: `TikTok URL: ${parsed.error}` },
          { status: 400 }
        );
      }
      data.tiktokHandle = parsed.url;
    } else if (body.tiktokUrl === null || body.tiktokHandle === null) {
      data.tiktokHandle = null;
    }

    if (typeof body.industry === 'string') {
      data.category = body.industry.trim();
    } else if (body.industry === null) {
      data.category = null;
    }

    const hasTwitterUpdate =
      typeof body.twitterUrl === 'string' || body.twitterUrl === null;
    const hasPortfolioUpdate =
      typeof body.portfolioUrl === 'string' || body.portfolioUrl === null;

    if (hasTwitterUpdate && typeof body.twitterUrl === 'string') {
      const parsed = parseSocialUrl(body.twitterUrl);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: `X URL: ${parsed.error}` },
          { status: 400 }
        );
      }
      body.twitterUrl = parsed.url;
    }

    if (hasPortfolioUpdate && typeof body.portfolioUrl === 'string') {
      const parsed = parseSocialUrl(body.portfolioUrl);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: `Portfolio URL: ${parsed.error}` },
          { status: 400 }
        );
      }
      body.portfolioUrl = parsed.url;
    }

    if (Object.keys(data).length === 0 && !hasTwitterUpdate && !hasPortfolioUpdate) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const creatorRow = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!creatorRow) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const updatedCreator =
      Object.keys(data).length > 0
        ? await prisma.creator.update({
            where: { userId: user.id },
            data,
            select: {
              id: true,
              username: true,
              displayName: true,
              bio: true,
              avatarUrl: true,
              bannerUrl: true,
              category: true,
              instagramHandle: true,
              tiktokHandle: true,
            },
          })
        : await prisma.creator.findUniqueOrThrow({
            where: { userId: user.id },
            select: {
              id: true,
              username: true,
              displayName: true,
              bio: true,
              avatarUrl: true,
              bannerUrl: true,
              category: true,
              instagramHandle: true,
              tiktokHandle: true,
            },
          });

    if (hasTwitterUpdate) {
      await upsertTypedSocialLink(
        creatorRow.id,
        'twitter',
        'X',
        body.twitterUrl
      );
    }
    if (hasPortfolioUpdate) {
      await upsertTypedSocialLink(
        creatorRow.id,
        'portfolio',
        'Portfolio',
        body.portfolioUrl
      );
    }

    const socialLinks = await prisma.creatorLink.findMany({
      where: {
        creatorId: creatorRow.id,
        linkType: { in: ['twitter', 'portfolio'] },
        isActive: true,
      },
      select: { linkType: true, url: true },
    });

    return NextResponse.json({
      success: true,
      creator: {
        ...updatedCreator,
        industry: updatedCreator.category ?? '',
        instagramUrl: updatedCreator.instagramHandle || '',
        tiktokUrl: updatedCreator.tiktokHandle || '',
        twitterUrl:
          socialLinks.find((link) => link.linkType === 'twitter')?.url || '',
        portfolioUrl:
          socialLinks.find((link) => link.linkType === 'portfolio')?.url || '',
      },
    });
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

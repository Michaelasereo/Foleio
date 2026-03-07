'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { shouldAutoUpgradeToPremium } from '@/lib/config/pilot';

const creatorCoreSelect = {
  id: true,
  userId: true,
  username: true,
  displayName: true,
  bio: true,
  category: true,
  instagramHandle: true,
  tiktokHandle: true,
  avatarUrl: true,
  bannerUrl: true,
  isPublic: true,
  introVideoId: true,
  bankCode: true,
  accountNumber: true,
  accountName: true,
  platformPlan: true,
  createdAt: true,
  updatedAt: true,
} as const;

const onboardingStep1Schema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  bio: z.string().optional(),
  category: z.string().default('makeup'),
  instagramHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
});

const profileUpdateSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores')
    .optional(),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').optional(),
  bio: z.string().optional(),
  instagramHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
});

const onboardingStep2Schema = z.object({
  skipBankSetup: z.boolean().default(true),
});

const onboardingStep3Schema = z.object({
  planName: z.string().min(2, 'Plan name is required'),
  planPrice: z.number().min(1000, 'Minimum price is ₦10'),
  planDescription: z.string().optional(),
  planFeatures: z.array(z.string()).default([]),
});

const onboardingStep4Schema = z.object({
  platformPlan: z.enum(['starter', 'pro', 'premium']).default('starter'),
});

export async function createCreatorProfile(
  step1Data: z.infer<typeof onboardingStep1Schema>,
  _step2Data: z.infer<typeof onboardingStep2Schema>,
  step3Data: z.infer<typeof onboardingStep3Schema>,
  step4Data: z.infer<typeof onboardingStep4Schema>
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Ensure User record exists first
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {}, // Don't update if exists
      create: {
        id: session.user.id,
        email: session.user.email || '',
        fullName: session.user.user_metadata?.full_name || null,
        emailVerified: session.user.email_confirmed_at ? true : false,
      },
    });

    // Generate username from display name
    const username = step1Data.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if username exists
    const existingCreatorWithUsername = await prisma.creator.findUnique({
      where: { username },
      select: { id: true },
    });

    const finalUsername = existingCreatorWithUsername
      ? `${username}-${Date.now()}`
      : username;

    // Create or update creator profile (idempotent for repeated onboarding submits)
    const existingCreatorForUser = await prisma.creator.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const autoPremium = shouldAutoUpgradeToPremium(session.user.email);
    const selectedPlan = autoPremium ? 'premium' : step4Data.platformPlan;
    const creatorData = {
      displayName: step1Data.displayName,
      bio: step1Data.bio,
      category: step1Data.category,
      instagramHandle: step1Data.instagramHandle,
      tiktokHandle: step1Data.tiktokHandle,
      platformPlan: selectedPlan,
      platformSubscriptionActive: true,
      platformSubscriptionEndsAt: autoPremium
        ? null
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
    };

    const creator = existingCreatorForUser
      ? await prisma.creator.update({
          where: { id: existingCreatorForUser.id },
          data: creatorData,
          select: creatorCoreSelect,
        })
      : await prisma.creator.create({
          data: {
            userId: session.user.id,
            username: finalUsername,
            ...creatorData,
          },
          select: creatorCoreSelect,
        });

    // Create or update default subscription plan
    const existingDefaultPlan = await prisma.creatorPlan.findFirst({
      where: { creatorId: creator.id, orderIndex: 0 },
      orderBy: { createdAt: 'asc' },
    });

    if (existingDefaultPlan) {
      await prisma.creatorPlan.update({
        where: { id: existingDefaultPlan.id },
        data: {
          name: step3Data.planName,
          price: step3Data.planPrice * 100, // Convert to kobo
          description: step3Data.planDescription,
          features: step3Data.planFeatures,
          isActive: true,
        },
      });
    } else {
      await prisma.creatorPlan.create({
        data: {
          creatorId: creator.id,
          name: step3Data.planName,
          price: step3Data.planPrice * 100, // Convert to kobo
          description: step3Data.planDescription,
          features: step3Data.planFeatures,
          isActive: true,
          orderIndex: 0,
        },
      });
    }

    // Update user to mark as creator
    await prisma.user.update({
      where: { id: session.user.id },
      data: { isCreator: true },
    });

    revalidatePath('/dashboard');
    return { success: true, creatorId: creator.id, username: creator.username };
  } catch (error) {
    console.error('Error creating creator profile:', error);
    const safeErrorMessage =
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : (() => {
              try {
                const serialized = JSON.stringify(error);
                return serialized === '{}' ? 'Failed to create profile' : serialized;
              } catch {
                return 'Failed to create profile';
              }
            })();
    return {
      success: false,
      error: safeErrorMessage,
    };
  }
}

export async function updateCreatorProfile(
  creatorId: string,
  data: z.infer<typeof profileUpdateSchema>
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Check if username is being changed and if it's unique
    if (data.username) {
      const existingCreator = await prisma.creator.findFirst({
        where: {
          username: data.username,
          userId: { not: session.user.id }
        }
      });

      if (existingCreator) {
        return { success: false, error: 'Username is already taken' };
      }
    }

    // Get current creator to check if username changed
    const currentCreator = await prisma.creator.findUnique({
      where: { id: creatorId, userId: session.user.id },
      select: { username: true },
    });

    const creator = await prisma.creator.update({
      where: { id: creatorId, userId: session.user.id },
      data,
      select: creatorCoreSelect,
    });

    // Revalidate paths
    revalidatePath('/dashboard');
    revalidatePath('/settings');
    
    // If username changed, revalidate the old and new public profile routes
    if (data.username && currentCreator && currentCreator.username !== data.username) {
      revalidatePath(`/creator/${currentCreator.username}`);
      revalidatePath(`/creator/${data.username}`);
    } else if (currentCreator) {
      revalidatePath(`/creator/${currentCreator.username}`);
    }

    return { success: true, creator };
  } catch (error) {
    console.error('Error updating creator profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    };
  }
}

// Set intro video for creator
export async function setIntroVideo(videoId: string | null) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
      select: { id: true, username: true },
    });

    if (!creator) {
      return { success: false, error: 'Creator not found' };
    }

    // If videoId is provided, verify it belongs to this creator
    if (videoId) {
      const content = await prisma.content.findFirst({
        where: { id: videoId, creatorId: creator.id, type: 'video' },
      });

      if (!content) {
        return { success: false, error: 'Video not found' };
      }
    }

    const updatedCreator = await prisma.creator.update({
      where: { id: creator.id },
      data: {
        introVideoId: videoId,
      },
      select: creatorCoreSelect,
    });

    revalidatePath('/settings');
    revalidatePath(`/creator/${creator.username}`);
    return { success: true, creator: updatedCreator };
  } catch (error) {
    console.error('Error setting intro video:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set intro video',
    };
  }
}

export async function updateContentTitle(contentId: string, title: string) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
      select: { id: true, username: true },
    });

    if (!creator) {
      return { success: false, error: 'Creator not found' };
    }

    // Verify the content belongs to this creator
    const content = await prisma.content.findFirst({
      where: { id: contentId, creatorId: creator.id },
    });

    if (!content) {
      return { success: false, error: 'Content not found' };
    }

    const updatedContent = await prisma.content.update({
      where: { id: contentId },
      data: { title },
    });

    revalidatePath('/content');
    revalidatePath(`/creator/${creator.username}`);
    return { success: true, content: updatedContent };
  } catch (error) {
    console.error('Error updating content title:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update content title',
    };
  }
}

// Get creator profile with full details
export async function getCreatorProfile() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
      select: {
        ...creatorCoreSelect,
        introVideo: {
          select: {
            id: true,
            title: true,
            muxAssetId: true,
            muxPlaybackId: true,
            thumbnailUrl: true,
          },
        },
        creatorLinks: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
        priceListItems: {
          where: { isActive: true },
          orderBy: [
            { categoryOrderIndex: 'asc' },
            { orderIndex: 'asc' },
          ],
        },
      },
    });

    if (!creator) {
      return { success: false, error: 'Creator not found' };
    }

    return { success: true, data: creator };
  } catch (error) {
    console.error('Error getting creator profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profile',
    };
  }
}

// Get public creator profile by username
export async function getPublicCreatorProfile(username: string) {
  try {
    const creator = await prisma.creator.findUnique({
      where: { username },
      select: {
        ...creatorCoreSelect,
        introVideo: {
          select: {
            id: true,
            title: true,
            muxAssetId: true,
            muxPlaybackId: true,
            thumbnailUrl: true,
            description: true,
          },
        },
        creatorLinks: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
        priceListItems: {
          where: { isActive: true },
          orderBy: [
            { categoryOrderIndex: 'asc' },
            { orderIndex: 'asc' },
          ],
        },
        content: {
          where: {
            isPublished: true,
          },
          orderBy: { publishedAt: 'desc' },
          take: 20,
        },
        availability: {
          where: {
            isAvailable: true,
            date: {
              gte: new Date(),
            },
          },
          orderBy: { date: 'asc' },
          take: 30,
        },
      },
    });

    if (!creator || !creator.isPublic) {
      return { success: false, error: 'Creator not found' };
    }

    // Group price list items by category
    const groupedPriceList = groupPriceListByCategory(creator.priceListItems);

    // Separate content by category
    const regularContent = creator.content.filter((c: { contentCategory: string }) => c.contentCategory === 'content');
    const tutorials = creator.content.filter((c: { contentCategory: string }) => c.contentCategory === 'tutorial');

    return { 
      success: true, 
      data: {
        ...creator,
        groupedPriceList,
        regularContent,
        tutorials,
      },
    };
  } catch (error) {
    console.error('Error getting public creator profile:', error);
    return { success: false, error: 'Failed to get profile' };
  }
}

// Helper function to group price list items by category
function groupPriceListByCategory(items: any[]) {
  const grouped: { category: string | null; items: any[] }[] = [];
  const categoryMap: { [key: string]: any[] } = {};
  const uncategorized: any[] = [];

  items.forEach((item) => {
    if (item.category) {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = [];
      }
      categoryMap[item.category].push(item);
    } else {
      uncategorized.push(item);
    }
  });

  // Add uncategorized items first
  if (uncategorized.length > 0) {
    grouped.push({ category: null, items: uncategorized });
  }

  // Add categorized items
  Object.entries(categoryMap).forEach(([category, categoryItems]) => {
    grouped.push({ category, items: categoryItems });
  });

  return grouped;
}


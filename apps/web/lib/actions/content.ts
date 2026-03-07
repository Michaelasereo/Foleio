'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { systemMonitor } from '@/lib/monitoring/system-monitor';
import { checkAndLogMilestone } from '@/lib/utils/milestones';

const createContentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['video', 'image', 'pdf', 'text']),
  accessType: z.enum(['free', 'subscription', 'one_time', 'collection']).default('subscription'),
  requiredPlanId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  muxAssetId: z.string().optional(),
  muxPlaybackId: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  contentCategory: z.enum(['content', 'tutorial']).default('content'),
  collectionId: z.string().optional(), // Link tutorial to collection
  tutorialPrice: z.number().optional(), // Individual tutorial price in kobo
  processingJobId: z.string().optional(), // Link to background processing job
});

function normalizeContentPricing(data: {
  contentCategory: 'content' | 'tutorial';
  collectionId?: string | null;
  accessType: 'free' | 'subscription' | 'one_time' | 'collection';
  tutorialPrice?: number | null;
}) {
  const isInCollection = Boolean(data.collectionId);

  if (data.contentCategory !== 'tutorial') {
    return {
      accessType: data.accessType,
      tutorialPrice: data.tutorialPrice ?? null,
      collectionId: data.collectionId ?? null,
      error: null as string | null,
    };
  }

  if (isInCollection) {
    return {
      accessType: 'collection' as const,
      tutorialPrice: 0,
      collectionId: data.collectionId ?? null,
      error: null as string | null,
    };
  }

  if (data.accessType === 'free') {
    return {
      accessType: 'free' as const,
      tutorialPrice: 0,
      collectionId: null,
      error: null as string | null,
    };
  }

  if (!data.tutorialPrice || data.tutorialPrice <= 0) {
    return {
      accessType: data.accessType,
      tutorialPrice: null,
      collectionId: null,
      error: 'Standalone tutorial must have a price or be marked as free',
    };
  }

  return {
    accessType: data.accessType,
    tutorialPrice: data.tutorialPrice,
    collectionId: null,
    error: null as string | null,
  };
}

export async function createContent(
  data: z.infer<typeof createContentSchema>
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'You must be logged in to create content',
      };
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
    });

    if (!creator) {
      return {
        success: false,
        error: 'Creator profile not found',
      };
    }

    const normalizedPricing = normalizeContentPricing({
      contentCategory: data.contentCategory || 'content',
      collectionId: data.collectionId || null,
      accessType: data.accessType,
      tutorialPrice: data.tutorialPrice ?? null,
    });

    if (normalizedPricing.error) {
      return {
        success: false,
        error: normalizedPricing.error,
      };
    }

    const content = await prisma.content.create({
      data: {
        creatorId: creator.id,
        title: data.title,
        description: data.description,
        type: data.type,
        accessType: normalizedPricing.accessType,
        requiredPlanId: data.requiredPlanId,
        tags: data.tags,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
        muxAssetId: data.muxAssetId,
        muxPlaybackId: data.muxPlaybackId,
        thumbnailUrl: data.thumbnailUrl,
        contentCategory: data.contentCategory || 'content',
        collectionId: normalizedPricing.collectionId,
        tutorialPrice: normalizedPricing.tutorialPrice,
      },
    });

    // Update processing job with content ID if it exists
    if (data.processingJobId) {
      // Note: In a production system, you'd want to update the job metadata
      // For now, we'll track that the content was created successfully
      systemMonitor.increment('content.created');
      systemMonitor.increment(`content.${data.type}.created`);
    }

    // Track content creation metrics
    systemMonitor.trackBilling(0, 'content_creation', creator.id);
    systemMonitor.increment('content.total');

    let milestoneUnlocked = false;
    if (data.isPublished) {
      milestoneUnlocked = await checkAndLogMilestone(creator.id, 'first_content');
    }

    revalidatePath('/content');
    revalidatePath('/content/tutorials');
    revalidatePath('/dashboard');
    return { success: true, contentId: content.id, milestoneUnlocked };
  } catch (error) {
    console.error('Error creating content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create content',
    };
  }
}

// Update content
export async function updateContent(
  contentId: string,
  data: Partial<z.infer<typeof createContentSchema>>
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'You must be logged in to update content',
      };
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
    });

    if (!creator) {
      return {
        success: false,
        error: 'Creator profile not found',
      };
    }

    // Verify ownership
    const existing = await prisma.content.findFirst({
      where: { id: contentId, creatorId: creator.id },
    });

    if (!existing) {
      return { success: false, error: 'Content not found' };
    }

    const mergedContentCategory = data.contentCategory || existing.contentCategory;
    const mergedCollectionId =
      data.collectionId !== undefined ? data.collectionId || null : existing.collectionId;
    const mergedAccessType = data.accessType || existing.accessType;
    const mergedTutorialPrice =
      data.tutorialPrice !== undefined ? data.tutorialPrice ?? null : existing.tutorialPrice;

    const normalizedPricing = normalizeContentPricing({
      contentCategory: mergedContentCategory as 'content' | 'tutorial',
      collectionId: mergedCollectionId,
      accessType: mergedAccessType as 'free' | 'subscription' | 'one_time' | 'collection',
      tutorialPrice: mergedTutorialPrice,
    });

    if (normalizedPricing.error) {
      return { success: false, error: normalizedPricing.error };
    }

    const content = await prisma.content.update({
      where: { id: contentId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type }),
        accessType: normalizedPricing.accessType,
        ...(data.requiredPlanId !== undefined && { requiredPlanId: data.requiredPlanId }),
        ...(data.tags && { tags: data.tags }),
        ...(data.isPublished !== undefined && { 
          isPublished: data.isPublished,
          publishedAt: data.isPublished && !existing.publishedAt ? new Date() : existing.publishedAt,
        }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        contentCategory: mergedContentCategory,
        collectionId: normalizedPricing.collectionId,
        tutorialPrice: normalizedPricing.tutorialPrice,
      },
    });

    revalidatePath('/content');
    revalidatePath('/content/tutorials');
    revalidatePath('/dashboard');
    return { success: true, content };
  } catch (error) {
    console.error('Error updating content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update content',
    };
  }
}

// Delete content
export async function deleteContent(contentId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Unauthorized' };
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
    });

    if (!creator) {
      return { success: false, error: 'Creator not found' };
    }

    // Verify ownership
    const existing = await prisma.content.findFirst({
      where: { id: contentId, creatorId: creator.id },
    });

    if (!existing) {
      return { success: false, error: 'Content not found' };
    }

    await prisma.content.delete({
      where: { id: contentId },
    });

    revalidatePath('/content');
    revalidatePath('/content/tutorials');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete content',
    };
  }
}

// Get content for creator (with optional category filter)
export async function getMyContent(category?: 'content' | 'tutorial') {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Unauthorized' };
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
    });

    if (!creator) {
      return { success: false, error: 'Creator not found' };
    }

    const whereClause: any = { creatorId: creator.id };
    if (category) {
      whereClause.contentCategory = category;
    }

    const content = await prisma.content.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: content };
  } catch (error) {
    console.error('Error getting content:', error);
    return { success: false, error: 'Failed to get content' };
  }
}

// Get video content for intro video selection
export async function getMyVideoContent() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Unauthorized' };
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
    });

    if (!creator) {
      return { success: false, error: 'Creator not found' };
    }

    const content = await prisma.content.findMany({
      where: {
        creatorId: creator.id,
        type: 'video',
        muxPlaybackId: { not: null },
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        muxAssetId: true,
        muxPlaybackId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: content };
  } catch (error) {
    console.error('Error getting video content:', error);
    return { success: false, error: 'Failed to get videos' };
  }
}


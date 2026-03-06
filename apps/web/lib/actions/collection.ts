'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createCollectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  accessType: z.enum(['free', 'subscription', 'one_time']).default('subscription'),
  requiredPlanId: z.string().optional(),
  price: z.number().optional(), // One-time price in Naira
  subscriptionPrice: z.number().optional(), // Monthly subscription price in Naira
  subscriptionType: z.enum(['one_time', 'recurring']).optional(), // Subscription type
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
});

const createSectionSchema = z.object({
  collectionId: z.string(),
  parentSectionId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  orderIndex: z.number().default(0),
});

const addContentToSectionSchema = z.object({
  sectionId: z.string(),
  contentId: z.string(),
  orderIndex: z.number().default(0),
});

export async function createCollection(
  data: z.infer<typeof createCollectionSchema>
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'You must be logged in to create a collection',
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

    const collection = await prisma.collection.create({
      data: {
        creatorId: creator.id,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        accessType: data.accessType,
        requiredPlanId: data.requiredPlanId,
        price: data.price ? Math.round(data.price * 100) : null, // Convert to kobo
        subscriptionPrice: data.subscriptionPrice ? Math.round(data.subscriptionPrice * 100) : null, // Convert to kobo
        subscriptionType: data.subscriptionType || 'one_time',
        tags: data.tags,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
      },
    });

    revalidatePath('/content');
    revalidatePath('/collections');
    return { success: true, collectionId: collection.id };
  } catch (error) {
    console.error('Error creating collection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create collection',
    };
  }
}

export async function updateCollection(
  collectionId: string,
  data: Partial<z.infer<typeof createCollectionSchema>>
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'Unauthorized',
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

    const updateData: any = { ...data };
    if (updateData.price !== undefined) {
      updateData.price = updateData.price ? Math.round(updateData.price * 100) : null;
    }
    if (updateData.subscriptionPrice !== undefined) {
      updateData.subscriptionPrice = updateData.subscriptionPrice ? Math.round(updateData.subscriptionPrice * 100) : null;
    }

    const collection = await prisma.collection.update({
      where: {
        id: collectionId,
        creatorId: creator.id,
      },
      data: updateData,
    });

    revalidatePath('/content');
    revalidatePath('/collections');
    revalidatePath(`/collections/${collectionId}`);
    return { success: true, collection };
  } catch (error) {
    console.error('Error updating collection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update collection',
    };
  }
}

export async function createSection(
  data: z.infer<typeof createSectionSchema>
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'Unauthorized',
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

    // Verify collection belongs to creator
    const collection = await prisma.collection.findFirst({
      where: {
        id: data.collectionId,
        creatorId: creator.id,
      },
    });

    if (!collection) {
      return {
        success: false,
        error: 'Collection not found',
      };
    }

    const section = await prisma.section.create({
      data: {
        collectionId: data.collectionId,
        parentSectionId: data.parentSectionId,
        title: data.title,
        description: data.description,
        orderIndex: data.orderIndex,
      },
    });

    revalidatePath('/collections');
    revalidatePath(`/collections/${data.collectionId}`);
    return { success: true, sectionId: section.id };
  } catch (error) {
    console.error('Error creating section:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create section',
    };
  }
}

export async function updateSection(
  sectionId: string,
  data: Partial<z.infer<typeof createSectionSchema>>
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'Unauthorized',
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

    // Verify section belongs to creator's collection
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        collection: {
          creatorId: creator.id,
        },
      },
    });

    if (!section) {
      return {
        success: false,
        error: 'Section not found',
      };
    }

    const updatedSection = await prisma.section.update({
      where: { id: sectionId },
      data,
    });

    revalidatePath('/collections');
    revalidatePath(`/collections/${section.collectionId}`);
    return { success: true, section: updatedSection };
  } catch (error) {
    console.error('Error updating section:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update section',
    };
  }
}

export async function addContentToSection(
  data: z.infer<typeof addContentToSectionSchema>
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'Unauthorized',
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

    // Verify section belongs to creator's collection
    const section = await prisma.section.findFirst({
      where: {
        id: data.sectionId,
        collection: {
          creatorId: creator.id,
        },
      },
    });

    if (!section) {
      return {
        success: false,
        error: 'Section not found',
      };
    }

    // Verify content belongs to creator
    const content = await prisma.content.findFirst({
      where: {
        id: data.contentId,
        creatorId: creator.id,
      },
    });

    if (!content) {
      return {
        success: false,
        error: 'Content not found',
      };
    }

    const sectionContent = await prisma.sectionContent.upsert({
      where: {
        sectionId_contentId: {
          sectionId: data.sectionId,
          contentId: data.contentId,
        },
      },
      update: {
        orderIndex: data.orderIndex,
      },
      create: {
        sectionId: data.sectionId,
        contentId: data.contentId,
        orderIndex: data.orderIndex,
      },
    });

    revalidatePath('/collections');
    revalidatePath(`/collections/${section.collectionId}`);
    return { success: true, sectionContent };
  } catch (error) {
    console.error('Error adding content to section:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add content to section',
    };
  }
}

export async function removeContentFromSection(
  sectionId: string,
  contentId: string
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'Unauthorized',
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

    // Verify section belongs to creator's collection
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        collection: {
          creatorId: creator.id,
        },
      },
    });

    if (!section) {
      return {
        success: false,
        error: 'Section not found',
      };
    }

    await prisma.sectionContent.delete({
      where: {
        sectionId_contentId: {
          sectionId,
          contentId,
        },
      },
    });

    revalidatePath('/collections');
    revalidatePath(`/collections/${section.collectionId}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing content from section:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove content from section',
    };
  }
}


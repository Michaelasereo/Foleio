'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const creatorLinkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url: z.string().url('Invalid URL').or(z.string().min(1)),
  linkType: z.enum(['instagram', 'tiktok', 'twitter', 'youtube', 'price_list', 'custom']).default('custom'),
  icon: z.string().optional().nullable(),
  orderIndex: z.number().optional(),
});

type CreatorLinkInput = z.infer<typeof creatorLinkSchema>;

// Create a new creator link
export async function createCreatorLink(data: CreatorLinkInput) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  const validation = creatorLinkSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  try {
    // Get the highest order index
    const maxOrder = await prisma.creatorLink.findFirst({
      where: { creatorId: creator.id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const link = await prisma.creatorLink.create({
      data: {
        creatorId: creator.id,
        label: data.label,
        url: data.url,
        linkType: data.linkType,
        icon: data.icon || null,
        orderIndex: data.orderIndex ?? (maxOrder?.orderIndex || 0) + 1,
      },
    });

    revalidatePath('/settings');
    revalidatePath(`/creator/${creator.username}`);
    return { success: true, data: link };
  } catch (error) {
    console.error('Error creating creator link:', error);
    return { error: 'Failed to create link' };
  }
}

// Update an existing creator link
export async function updateCreatorLink(linkId: string, data: Partial<CreatorLinkInput>) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  // Verify ownership
  const existingLink = await prisma.creatorLink.findFirst({
    where: { id: linkId, creatorId: creator.id },
  });

  if (!existingLink) {
    return { error: 'Link not found' };
  }

  try {
    const link = await prisma.creatorLink.update({
      where: { id: linkId },
      data: {
        ...(data.label && { label: data.label }),
        ...(data.url && { url: data.url }),
        ...(data.linkType && { linkType: data.linkType }),
        ...(data.icon !== undefined && { icon: data.icon || null }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      },
    });

    revalidatePath('/settings');
    revalidatePath(`/creator/${creator.username}`);
    return { success: true, data: link };
  } catch (error) {
    console.error('Error updating creator link:', error);
    return { error: 'Failed to update link' };
  }
}

// Delete a creator link
export async function deleteCreatorLink(linkId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  // Verify ownership
  const existingLink = await prisma.creatorLink.findFirst({
    where: { id: linkId, creatorId: creator.id },
  });

  if (!existingLink) {
    return { error: 'Link not found' };
  }

  try {
    await prisma.creatorLink.delete({
      where: { id: linkId },
    });

    revalidatePath('/settings');
    revalidatePath(`/creator/${creator.username}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting creator link:', error);
    return { error: 'Failed to delete link' };
  }
}

// Toggle active status of a creator link
export async function toggleCreatorLinkActive(linkId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  // Verify ownership
  const existingLink = await prisma.creatorLink.findFirst({
    where: { id: linkId, creatorId: creator.id },
  });

  if (!existingLink) {
    return { error: 'Link not found' };
  }

  try {
    const link = await prisma.creatorLink.update({
      where: { id: linkId },
      data: {
        isActive: !existingLink.isActive,
      },
    });

    revalidatePath('/settings');
    revalidatePath(`/creator/${creator.username}`);
    return { success: true, data: link };
  } catch (error) {
    console.error('Error toggling creator link:', error);
    return { error: 'Failed to toggle link' };
  }
}

// Reorder creator links
export async function reorderCreatorLinks(linkIds: string[]) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  try {
    // Update order index for each link
    await Promise.all(
      linkIds.map((id, index) =>
        prisma.creatorLink.updateMany({
          where: { id, creatorId: creator.id },
          data: { orderIndex: index },
        })
      )
    );

    revalidatePath('/settings');
    revalidatePath(`/creator/${creator.username}`);
    return { success: true };
  } catch (error) {
    console.error('Error reordering creator links:', error);
    return { error: 'Failed to reorder links' };
  }
}

// Get all links for a creator (for creator dashboard)
export async function getMyCreatorLinks() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    return { error: 'Creator not found' };
  }

  try {
    const links = await prisma.creatorLink.findMany({
      where: { creatorId: creator.id },
      orderBy: { orderIndex: 'asc' },
    });

    return { success: true, data: links };
  } catch (error) {
    console.error('Error getting creator links:', error);
    return { error: 'Failed to get links' };
  }
}

// Get links for a creator (public - only active links)
export async function getCreatorLinksByCreatorId(creatorId: string) {
  try {
    const links = await prisma.creatorLink.findMany({
      where: { 
        creatorId,
        isActive: true,
      },
      orderBy: { orderIndex: 'asc' },
    });

    return { success: true, data: links };
  } catch (error) {
    console.error('Error getting creator links:', error);
    return { error: 'Failed to get links' };
  }
}

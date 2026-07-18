'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { getCreatorPlanLimits } from '@/lib/utils/plan-limits';

const addonSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().min(0),
});

const priceListItemSchema = z.object({
  serviceType: z.enum(['general', 'coaching', 'consultation']).default('general'),
  category: z.string().optional().nullable(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  sessionDescription: z.string().optional().nullable(),
  calendlyLink: z.string().url('Enter a valid URL').optional().nullable().or(z.literal('')),
  price: z.number().min(0, 'Price must be positive'),
  durationMinutes: z.number().optional().nullable(),
  addons: z.array(addonSchema).optional(),
  inclusions: z.array(z.string().min(1)).optional(),
  coverImageUrl: z.string().url().optional().nullable().or(z.literal('')),
  depositType: z.enum(['percent', 'fixed']).optional().nullable(),
  depositValue: z.number().int().min(0).optional().nullable(),
  allowPayInFull: z.boolean().optional(),
  orderIndex: z.number().optional(),
  categoryOrderIndex: z.number().optional(),
});

type PriceListItemInput = z.infer<typeof priceListItemSchema>;

function revalidatePriceListPaths(username?: string | null) {
  revalidatePath('/bookings');
  revalidatePath('/settings');
  if (username) {
    revalidatePath(`/creator/${username}`);
  }
}

// Create a new price list item
export async function createPriceListItem(data: PriceListItemInput) {
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

  const validation = priceListItemSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const limits = getCreatorPlanLimits(creator);
  const serviceCount = await prisma.priceListItem.count({
    where: { creatorId: creator.id },
  });
  if (serviceCount >= limits.maxServices) {
    return {
      error: 'Plan limit reached',
      limitType: 'maxServices' as const,
    };
  }

  try {
    // Get the highest order index for this category
    const maxOrder = await prisma.priceListItem.findFirst({
      where: { 
        creatorId: creator.id,
        category: data.category || null,
      },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    // Get the highest category order index if this is a new category
    let categoryOrderIndex = data.categoryOrderIndex;
    if (data.category && categoryOrderIndex === undefined) {
      const existingCategory = await prisma.priceListItem.findFirst({
        where: { 
          creatorId: creator.id,
          category: data.category,
        },
        select: { categoryOrderIndex: true },
      });

      if (existingCategory) {
        categoryOrderIndex = existingCategory.categoryOrderIndex;
      } else {
        const maxCategoryOrder = await prisma.priceListItem.findFirst({
          where: { creatorId: creator.id },
          orderBy: { categoryOrderIndex: 'desc' },
          select: { categoryOrderIndex: true },
        });
        categoryOrderIndex = (maxCategoryOrder?.categoryOrderIndex || 0) + 1;
      }
    }

    const item = await prisma.priceListItem.create({
      data: {
        creatorId: creator.id,
        serviceType: data.serviceType || 'general',
        category: data.category || null,
        name: data.name,
        description: data.description || null,
        location: data.location?.trim() || null,
        sessionDescription: data.sessionDescription || null,
        calendlyLink: data.calendlyLink || null,
        price: data.price,
        durationMinutes: data.durationMinutes || null,
        addons: data.addons ?? [],
        inclusions: data.inclusions ?? [],
        coverImageUrl: data.coverImageUrl || null,
        depositType: data.depositType ?? null,
        depositValue: data.depositValue ?? null,
        allowPayInFull: data.allowPayInFull ?? true,
        orderIndex: data.orderIndex ?? (maxOrder?.orderIndex || 0) + 1,
        categoryOrderIndex: categoryOrderIndex || 0,
      },
    });

    revalidatePriceListPaths(creator.username);
    return { success: true, data: item };
  } catch (error) {
    console.error('Error creating price list item:', error);
    return { error: 'Failed to create price list item' };
  }
}

// Update an existing price list item
export async function updatePriceListItem(itemId: string, data: Partial<PriceListItemInput>) {
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
  const existingItem = await prisma.priceListItem.findFirst({
    where: { id: itemId, creatorId: creator.id },
  });

  if (!existingItem) {
    return { error: 'Price list item not found' };
  }

  try {
    const item = await prisma.priceListItem.update({
      where: { id: itemId },
      data: {
        ...(data.category !== undefined && { category: data.category || null }),
        ...(data.serviceType !== undefined && { serviceType: data.serviceType }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.location !== undefined && {
          location: data.location?.trim() || null,
        }),
        ...(data.sessionDescription !== undefined && { sessionDescription: data.sessionDescription || null }),
        ...(data.calendlyLink !== undefined && { calendlyLink: data.calendlyLink || null }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.durationMinutes !== undefined && {
          durationMinutes: data.durationMinutes || null,
        }),
        ...(data.addons !== undefined && { addons: data.addons }),
        ...(data.inclusions !== undefined && { inclusions: data.inclusions }),
        ...(data.coverImageUrl !== undefined && {
          coverImageUrl: data.coverImageUrl || null,
        }),
        ...(data.depositType !== undefined && {
          depositType: data.depositType || null,
        }),
        ...(data.depositValue !== undefined && {
          depositValue: data.depositValue ?? null,
        }),
        ...(data.allowPayInFull !== undefined && {
          allowPayInFull: data.allowPayInFull,
        }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(data.categoryOrderIndex !== undefined && { categoryOrderIndex: data.categoryOrderIndex }),
      },
    });

    revalidatePriceListPaths(creator.username);
    return { success: true, data: item };
  } catch (error) {
    console.error('Error updating price list item:', error);
    const message =
      error instanceof Error && error.message.includes('Unknown argument')
        ? 'Database client is out of date. Restart the app and try again.'
        : 'Failed to update price list item';
    return { error: message };
  }
}

// Delete a price list item
export async function deletePriceListItem(itemId: string) {
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
  const existingItem = await prisma.priceListItem.findFirst({
    where: { id: itemId, creatorId: creator.id },
  });

  if (!existingItem) {
    return { error: 'Price list item not found' };
  }

  try {
    await prisma.priceListItem.delete({
      where: { id: itemId },
    });

    revalidatePriceListPaths(creator.username);
    return { success: true };
  } catch (error) {
    console.error('Error deleting price list item:', error);
    return { error: 'Failed to delete price list item' };
  }
}

// Toggle active status of a price list item
export async function togglePriceListItemActive(itemId: string) {
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
  const existingItem = await prisma.priceListItem.findFirst({
    where: { id: itemId, creatorId: creator.id },
  });

  if (!existingItem) {
    return { error: 'Price list item not found' };
  }

  try {
    const item = await prisma.priceListItem.update({
      where: { id: itemId },
      data: {
        isActive: !existingItem.isActive,
      },
    });

    revalidatePriceListPaths(creator.username);
    return { success: true, data: item };
  } catch (error) {
    console.error('Error toggling price list item:', error);
    return { error: 'Failed to toggle price list item' };
  }
}

// Reorder price list items
export async function reorderPriceListItems(itemIds: string[]) {
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
    // Update order index for each item
    await Promise.all(
      itemIds.map((id, index) =>
        prisma.priceListItem.updateMany({
          where: { id, creatorId: creator.id },
          data: { orderIndex: index },
        })
      )
    );

    revalidatePriceListPaths(creator.username);
    return { success: true };
  } catch (error) {
    console.error('Error reordering price list items:', error);
    return { error: 'Failed to reorder items' };
  }
}

// Get price list for a creator (for creator dashboard)
export async function getMyPriceList() {
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
    const items = await prisma.priceListItem.findMany({
      where: { creatorId: creator.id },
      orderBy: [
        { categoryOrderIndex: 'asc' },
        { orderIndex: 'asc' },
      ],
    });

    // Group by category
    const grouped = groupByCategory(items);

    return { success: true, data: items, grouped };
  } catch (error) {
    console.error('Error getting price list:', error);
    return { error: 'Failed to get price list' };
  }
}

// Get price list for a creator (public - only active items)
export async function getPriceListByCreator(creatorId: string) {
  try {
    const items = await prisma.priceListItem.findMany({
      where: { 
        creatorId,
        isActive: true,
      },
      orderBy: [
        { categoryOrderIndex: 'asc' },
        { orderIndex: 'asc' },
      ],
    });

    // Group by category
    const grouped = groupByCategory(items);

    return { success: true, data: items, grouped };
  } catch (error) {
    console.error('Error getting price list:', error);
    return { error: 'Failed to get price list' };
  }
}

// Helper function to group items by category
function groupByCategory(items: any[]) {
  const grouped: { [key: string]: any[] } = {};
  const uncategorized: any[] = [];

  items.forEach((item) => {
    if (item.category) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    } else {
      uncategorized.push(item);
    }
  });

  // Return as array of groups for easier rendering
  const result: { category: string | null; items: any[] }[] = [];
  
  // Add uncategorized items first (if any)
  if (uncategorized.length > 0) {
    result.push({ category: null, items: uncategorized });
  }

  // Add categorized items
  Object.entries(grouped).forEach(([category, categoryItems]) => {
    result.push({ category, items: categoryItems });
  });

  return result;
}


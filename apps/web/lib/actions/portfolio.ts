'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_GALLERY_ITEMS,
  categorySections,
  homeSectionId,
  isHomeSection,
} from '@/lib/creator/portfolio-gallery';
import {
  getCreatorPlanLimits,
  isPaidPlanActive,
} from '@/lib/utils/plan-limits';

const GALLERY_SECTION_NAME = 'Gallery';

async function requireCreator() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' as const };

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      username: true,
      platformPlan: true,
      platformSubscriptionActive: true,
    },
  });
  if (!creator) return { error: 'Creator not found' as const };
  return { creator };
}

function revalidatePortfolio(username?: string | null) {
  revalidatePath('/settings');
  if (username) {
    revalidatePath(`/creator/${username}`);
  }
}

async function loadSectionsMeta(creatorId: string) {
  return prisma.portfolioSection.findMany({
    where: { creatorId },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, orderIndex: true, name: true },
  });
}

/** Ensure a single Gallery (Home) section exists and return it. */
export async function ensureGallerySection() {
  const auth = await requireCreator();
  if ('error' in auth) return { error: auth.error };
  const { creator } = auth;

  const existing = await prisma.portfolioSection.findFirst({
    where: { creatorId: creator.id },
    orderBy: { orderIndex: 'asc' },
  });

  if (existing) {
    return { success: true as const, data: existing };
  }

  const section = await prisma.portfolioSection.create({
    data: {
      creatorId: creator.id,
      name: GALLERY_SECTION_NAME,
      orderIndex: 1,
    },
  });

  revalidatePortfolio(creator.username);
  return { success: true as const, data: section };
}

export async function getMyPortfolio() {
  const auth = await requireCreator();
  if ('error' in auth) return { error: auth.error };
  const { creator } = auth;

  const sections = await prisma.portfolioSection.findMany({
    where: { creatorId: creator.id },
    orderBy: { orderIndex: 'asc' },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return { success: true, data: sections };
}

export async function createPortfolioSection(name: string, description?: string) {
  const auth = await requireCreator();
  if ('error' in auth) return { error: auth.error };
  const { creator } = auth;

  const limits = getCreatorPlanLimits(creator);
  if (limits.maxPortfolioCategories <= 0) {
    return {
      error: 'Portfolio categories require Pro',
      limitType: 'maxPortfolioCategories' as const,
    };
  }

  const trimmed = name.trim();
  if (trimmed.length < 1) return { error: 'Category name is required' };
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    return {
      error: `Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer`,
    };
  }

  // Ensure Home exists so new sections are categories, not a second Home.
  const ensured = await ensureGallerySection();
  if ('error' in ensured && ensured.error) {
    return { error: ensured.error };
  }

  const sections = await loadSectionsMeta(creator.id);
  const categories = categorySections(sections);
  if (categories.length >= limits.maxPortfolioCategories) {
    return {
      error: `You can add up to ${limits.maxPortfolioCategories} portfolio categories`,
      limitType: 'maxPortfolioCategories' as const,
    };
  }

  const maxOrder = sections.reduce(
    (max, s) => Math.max(max, s.orderIndex ?? 0),
    0
  );

  const section = await prisma.portfolioSection.create({
    data: {
      creatorId: creator.id,
      name: trimmed.slice(0, MAX_CATEGORY_NAME_LENGTH),
      description: description?.trim() || null,
      orderIndex: maxOrder + 1,
    },
  });

  revalidatePortfolio(creator.username);
  return { success: true, data: section };
}

export async function updatePortfolioSection(
  sectionId: string,
  data: { name?: string; description?: string | null; isActive?: boolean }
) {
  const auth = await requireCreator();
  if ('error' in auth) return { error: auth.error };
  const { creator } = auth;

  const sections = await loadSectionsMeta(creator.id);
  const existing = sections.find((s) => s.id === sectionId);
  if (!existing) return { error: 'Section not found' };

  if (isHomeSection(sections, existing) && data.name !== undefined) {
    return { error: 'Home gallery cannot be renamed' };
  }

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed.length < 1) return { error: 'Category name is required' };
    if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
      return {
        error: `Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer`,
      };
    }
  }

  const section = await prisma.portfolioSection.update({
    where: { id: sectionId },
    data: {
      ...(data.name !== undefined && {
        name: data.name.trim().slice(0, MAX_CATEGORY_NAME_LENGTH),
      }),
      ...(data.description !== undefined && {
        description: data.description?.trim() || null,
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  revalidatePortfolio(creator.username);
  return { success: true, data: section };
}

export async function deletePortfolioSection(sectionId: string) {
  const auth = await requireCreator();
  if ('error' in auth) return { error: auth.error };
  const { creator } = auth;

  const sections = await loadSectionsMeta(creator.id);
  const existing = sections.find((s) => s.id === sectionId);
  if (!existing) return { error: 'Section not found' };

  if (isHomeSection(sections, existing)) {
    return { error: 'Home gallery cannot be deleted' };
  }

  await prisma.portfolioSection.delete({ where: { id: sectionId } });
  revalidatePortfolio(creator.username);
  return { success: true };
}

const itemSchema = z.object({
  sectionId: z.string().uuid(),
  imageUrl: z.string().url(),
  caption: z.string().optional().nullable(),
  priceListItemId: z.string().uuid().optional().nullable(),
});

export async function createPortfolioItem(input: z.infer<typeof itemSchema>) {
  const auth = await requireCreator();
  if ('error' in auth) return { error: auth.error };
  const { creator } = auth;

  const validation = itemSchema.safeParse(input);
  if (!validation.success) {
    return { error: validation.error.errors[0]?.message || 'Invalid item' };
  }

  const section = await prisma.portfolioSection.findFirst({
    where: { id: validation.data.sectionId, creatorId: creator.id },
  });
  if (!section) return { error: 'Section not found' };

  const sectionCount = await prisma.portfolioItem.count({
    where: { sectionId: validation.data.sectionId, creatorId: creator.id },
  });
  if (sectionCount >= MAX_GALLERY_ITEMS) {
    return { error: `Each gallery is limited to ${MAX_GALLERY_ITEMS} images` };
  }

  if (validation.data.priceListItemId) {
    const service = await prisma.priceListItem.findFirst({
      where: {
        id: validation.data.priceListItemId,
        creatorId: creator.id,
      },
    });
    if (!service) return { error: 'Package not found' };
  }

  const maxOrder = await prisma.portfolioItem.findFirst({
    where: { sectionId: validation.data.sectionId },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  });

  const item = await prisma.portfolioItem.create({
    data: {
      creatorId: creator.id,
      sectionId: validation.data.sectionId,
      imageUrl: validation.data.imageUrl,
      caption: validation.data.caption?.trim() || null,
      priceListItemId: validation.data.priceListItemId || null,
      orderIndex: (maxOrder?.orderIndex ?? 0) + 1,
    },
  });

  revalidatePortfolio(creator.username);
  return { success: true, data: item };
}

export async function deletePortfolioItem(itemId: string) {
  const auth = await requireCreator();
  if ('error' in auth) return { error: auth.error };
  const { creator } = auth;

  const existing = await prisma.portfolioItem.findFirst({
    where: { id: itemId, creatorId: creator.id },
  });
  if (!existing) return { error: 'Item not found' };

  await prisma.portfolioItem.delete({ where: { id: itemId } });
  revalidatePortfolio(creator.username);
  return { success: true };
}

export async function getPublicPortfolio(creatorId: string) {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: {
      platformPlan: true,
      platformSubscriptionActive: true,
    },
  });

  const sections = await prisma.portfolioSection.findMany({
    where: {
      creatorId,
      isActive: true,
      items: { some: { isActive: true } },
    },
    orderBy: { orderIndex: 'asc' },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!creator || !isPaidPlanActive(creator)) {
    const homeId = homeSectionId(sections);
    if (!homeId) return [];
    return sections.filter((s) => s.id === homeId);
  }

  return sections;
}

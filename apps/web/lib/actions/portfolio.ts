'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const MAX_GALLERY_ITEMS = 6;
const GALLERY_SECTION_NAME = 'Gallery';

async function requireCreator() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' as const };

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: { id: true, username: true },
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

/** Ensure a single Gallery section exists and return it. */
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

  const trimmed = name.trim();
  if (trimmed.length < 1) return { error: 'Section name is required' };

  const maxOrder = await prisma.portfolioSection.findFirst({
    where: { creatorId: creator.id },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  });

  const section = await prisma.portfolioSection.create({
    data: {
      creatorId: creator.id,
      name: trimmed.slice(0, 80),
      description: description?.trim() || null,
      orderIndex: (maxOrder?.orderIndex ?? 0) + 1,
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

  const existing = await prisma.portfolioSection.findFirst({
    where: { id: sectionId, creatorId: creator.id },
  });
  if (!existing) return { error: 'Section not found' };

  const section = await prisma.portfolioSection.update({
    where: { id: sectionId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim().slice(0, 80) }),
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

  const existing = await prisma.portfolioSection.findFirst({
    where: { id: sectionId, creatorId: creator.id },
  });
  if (!existing) return { error: 'Section not found' };

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

  const totalCount = await prisma.portfolioItem.count({
    where: { creatorId: creator.id },
  });
  if (totalCount >= MAX_GALLERY_ITEMS) {
    return { error: `Gallery is limited to ${MAX_GALLERY_ITEMS} images` };
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
    where: { creatorId: creator.id },
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
  return sections;
}

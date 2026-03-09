import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { estimateReadTimeMinutes, sanitizeJournalHtml, slugify } from '@/lib/journal/utils';

export const dynamic = 'force-dynamic';

async function getCreator() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  return prisma.creator.findUnique({
    where: { userId: user.id },
    select: { id: true, username: true, displayName: true },
  });
}

async function ensureUniqueSlug(creatorId: string, title: string, currentId: string) {
  const base = slugify(title) || 'untitled';
  let slug = base;
  let i = 1;
  while (true) {
    const conflict = await prisma.journalEntry.findFirst({
      where: { creatorId, slug, NOT: { id: currentId } },
      select: { id: true },
    });
    if (!conflict) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;
    const entry = await prisma.journalEntry.findFirst({
      where: { id, creatorId: creator.id },
    });
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load entry', details: error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;

    const existing = await prisma.journalEntry.findFirst({
      where: { id, creatorId: creator.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const body = (await request.json()) as {
      title?: string;
      subtitle?: string | null;
      content?: string;
      coverImage?: string | null;
      tags?: string[];
      status?: 'draft' | 'published';
      isPublished?: boolean;
    };

    const nextTitle = body.title?.trim() || existing.title;
    const nextSlug =
      body.title && nextTitle !== existing.title
        ? await ensureUniqueSlug(creator.id, nextTitle, existing.id)
        : existing.slug;

    const hasMeaningfulContent =
      body.content !== undefined &&
      body.content !== '' &&
      body.content !== '<p></p>' &&
      body.content !== '<p></p>\n';
    const nextContent = hasMeaningfulContent
      ? sanitizeJournalHtml(body.content as string)
      : existing.content;

    const isPublished = body.isPublished ?? existing.isPublished;
    const status = body.status ?? (isPublished ? 'published' : 'draft');

    const entry = await prisma.journalEntry.update({
      where: { id: existing.id },
      data: {
        title: nextTitle,
        subtitle: body.subtitle !== undefined ? body.subtitle || null : existing.subtitle,
        slug: nextSlug,
        content: nextContent,
        coverImage: body.coverImage !== undefined ? body.coverImage : existing.coverImage,
        tags:
          body.tags !== undefined
            ? body.tags.map((tag) => tag.trim()).filter(Boolean)
            : existing.tags,
        readTime: estimateReadTimeMinutes(nextContent),
        isPublished,
        status,
        publishedAt: isPublished ? existing.publishedAt || new Date() : null,
      },
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update entry', details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.journalEntry.findFirst({
      where: { id, creatorId: creator.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.journalEntry.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete entry', details: error?.message },
      { status: 500 }
    );
  }
}

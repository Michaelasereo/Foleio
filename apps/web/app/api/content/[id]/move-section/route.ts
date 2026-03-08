import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params;
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
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const content = await prisma.content.findFirst({
      where: { id: contentId, creatorId: creator.id },
      select: { id: true },
    });
    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const body = (await request.json()) as {
      sectionId: string | null;
      collectionId: string;
    };

    if (!body.collectionId) {
      return NextResponse.json({ error: 'collectionId is required' }, { status: 400 });
    }

    const collection = await prisma.collection.findFirst({
      where: { id: body.collectionId, creatorId: creator.id },
      select: { id: true },
    });
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const collectionSectionIds = await prisma.section.findMany({
      where: { collectionId: body.collectionId },
      select: { id: true },
    });
    const sectionIds = collectionSectionIds.map((s) => s.id);

    if (body.sectionId && !sectionIds.includes(body.sectionId)) {
      return NextResponse.json(
        { error: 'Section not found in this collection' },
        { status: 400 }
      );
    }

    await prisma.sectionContent.deleteMany({
      where: {
        contentId,
        sectionId: { in: sectionIds },
      },
    });

    if (body.sectionId) {
      const maxOrder = await prisma.sectionContent.aggregate({
        where: { sectionId: body.sectionId },
        _max: { orderIndex: true },
      });
      await prisma.sectionContent.upsert({
        where: {
          sectionId_contentId: {
            sectionId: body.sectionId,
            contentId,
          },
        },
        update: {
          orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
        },
        create: {
          sectionId: body.sectionId,
          contentId,
          orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
        },
      });
    }

    await prisma.content.update({
      where: { id: contentId },
      data: {
        collectionId: body.collectionId,
        accessType: 'collection',
        tutorialPrice: 0,
        contentCategory: 'tutorial',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Move content section error:', error);
    return NextResponse.json(
      { error: 'Failed to move content to section', details: error?.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        creator: {
          select: { userId: true },
        },
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (content.creator.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.content.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: content.publishedAt || new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[creator/content/:id/publish] failed:', error);
    return NextResponse.json({ error: 'Failed to publish draft' }, { status: 500 });
  }
}

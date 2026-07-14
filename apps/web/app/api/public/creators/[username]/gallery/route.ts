import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { getPublicPortfolio } from '@/lib/actions/portfolio';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const creator = await prisma.creator.findUnique({
      where: { username, isPublic: true },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const sections = await getPublicPortfolio(creator.id);
    return NextResponse.json(
      { sections },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[public gallery]', error);
    return NextResponse.json({ error: 'Failed to load gallery' }, { status: 500 });
  }
}

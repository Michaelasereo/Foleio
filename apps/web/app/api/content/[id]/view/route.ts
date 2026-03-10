import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.content.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[view-track]:', error);
    return NextResponse.json(
      { error: 'Failed to track view', details: error?.message },
      { status: 500 }
    );
  }
}

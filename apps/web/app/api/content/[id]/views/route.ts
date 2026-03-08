import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const updated = await prisma.content.updateMany({
      where: { id, isPublished: true },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ success: true, updated: updated.count });
  } catch (error: any) {
    console.error('Content view tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track content view', details: error?.message },
      { status: 500 }
    );
  }
}

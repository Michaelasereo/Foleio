import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.journalEntry.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to increment view', details: error?.message },
      { status: 500 }
    );
  }
}

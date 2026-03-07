import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!email || code.length !== 6) {
      return NextResponse.json({ error: 'Email and 6-digit code are required' }, { status: 400 });
    }

    const accessCode = await prisma.premiumAccessCode.findFirst({
      where: {
        collectionId: id,
        email,
        code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!accessCode) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    await prisma.premiumAccessCode.update({
      where: { id: accessCode.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    const collection = await prisma.collection.findFirst({
      where: { id, isPublished: true },
      select: {
        id: true,
        title: true,
        tutorialContents: {
          where: { isPublished: true, contentCategory: 'tutorial' },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            muxPlaybackId: true,
            muxAssetId: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({
      access: true,
      videos: collection.tutorialContents,
    });
  } catch (error) {
    console.error('Collection verify code error:', error);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { sendCollectionAccessCodeEmail } from '@/lib/actions/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const collection = await prisma.collection.findFirst({
      where: { id, isPublished: true },
      include: {
        creator: {
          select: {
            displayName: true,
          },
        },
        tutorialContents: {
          where: { isPublished: true },
          select: { id: true },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const hasSubscription = await prisma.collectionSubscription.findFirst({
      where: {
        collectionId: id,
        email,
        status: 'active',
      },
    });

    const contentIds = collection.tutorialContents.map((video) => video.id);
    const hasLegacyTutorialPurchase = contentIds.length
      ? await prisma.tutorialPurchase.findFirst({
          where: {
            contentId: { in: contentIds },
            email,
          },
        })
      : null;

    if (!hasSubscription && !hasLegacyTutorialPurchase) {
      return NextResponse.json({
        needsPurchase: true,
        price: collection.subscriptionPrice || collection.price || 0,
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.premiumAccessCode.create({
      data: {
        collectionId: id,
        email,
        code,
        expiresAt,
      },
    });

    const emailResult = await sendCollectionAccessCodeEmail(
      email,
      code,
      collection.title,
      collection.creator.displayName
    );

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error }, { status: 500 });
    }

    return NextResponse.json({ codeSent: true });
  } catch (error) {
    console.error('Collection access code error:', error);
    return NextResponse.json({ error: 'Failed to send access code' }, { status: 500 });
  }
}

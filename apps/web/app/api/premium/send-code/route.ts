import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { z } from 'zod';
import { sendPremiumAccessCode, sendCollectionAccessCodeEmail, sendTutorialAccessCodeEmail } from '@/lib/actions/email';
import { sendContentPurchaseEmail } from '@/lib/email/send';

const sendCodeSchema = z.object({
  contentId: z.string().uuid().optional(),
  collectionId: z.string().uuid().optional(),
  email: z.string().email(),
}).refine(data => data.contentId || data.collectionId, {
  message: 'Either contentId or collectionId must be provided',
});

// Generate a random 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = sendCodeSchema.parse(body);

    // Handle collection access code
    if (validatedData.collectionId) {
      return handleCollectionCode(validatedData.collectionId, validatedData.email);
    }

    // Handle content/tutorial access code
    if (validatedData.contentId) {
      return handleContentCode(validatedData.contentId, validatedData.email);
    }

    return NextResponse.json(
      { error: 'Either contentId or collectionId must be provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Send code error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send verification code' },
      { status: 500 }
    );
  }
}

async function handleCollectionCode(collectionId: string, email: string) {
  // Get the collection to verify it exists
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      creator: {
        select: {
          displayName: true,
          username: true,
        },
      },
    },
  });

  if (!collection) {
    return NextResponse.json(
      { error: 'Collection not found' },
      { status: 404 }
    );
  }

  // Check if collection is free
  if (collection.accessType === 'free') {
    return NextResponse.json(
      { error: 'This collection is free and does not require verification' },
      { status: 400 }
    );
  }

  // Check if user has a subscription
  const subscription = await prisma.collectionSubscription.findUnique({
    where: {
      collectionId_email: {
        collectionId,
        email: email.toLowerCase(),
      },
    },
  });

  if (!subscription || subscription.status !== 'active') {
    return NextResponse.json(
      { error: 'No active subscription found for this email' },
      { status: 403 }
    );
  }

  // Check for existing code
  const existingCode = await prisma.premiumAccessCode.findFirst({
    where: {
      collectionId,
      email: email.toLowerCase(),
      verified: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingCode) {
    const minutesRemaining = Math.floor((existingCode.expiresAt.getTime() - Date.now()) / 60000);
    if (minutesRemaining > 14) {
      return NextResponse.json(
        { error: 'Please wait before requesting a new code' },
        { status: 429 }
      );
    }
  }

  // Generate new code
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Delete any existing unverified codes
  await prisma.premiumAccessCode.deleteMany({
    where: {
      collectionId,
      email: email.toLowerCase(),
      verified: false,
    },
  });

  // Create new code
  await prisma.premiumAccessCode.create({
    data: {
      collectionId,
      email: email.toLowerCase(),
      code,
      expiresAt,
    },
  });

  // Send email with the code
  await sendCollectionAccessCodeEmail(
    email,
    code,
    collection.title,
    collection.creator.displayName
  );

  await sendContentPurchaseEmail({
    email,
    creatorName: collection.creator.displayName,
    contentTitle: collection.title,
    amount: (collection.subscriptionPrice || collection.price || 0) / 100,
    accessCode: code,
    accessUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'}/creator/${collection.creator.username}/collections/${collection.id}`,
  });

  return NextResponse.json({
    success: true,
    message: 'Verification code sent to your email',
  });
}

async function handleContentCode(contentId: string, email: string) {
  // Get the content to verify it exists
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      creator: {
        select: {
          displayName: true,
          username: true,
        },
      },
    },
  });

  if (!content) {
    return NextResponse.json(
      { error: 'Content not found' },
      { status: 404 }
    );
  }

  if (content.collectionId) {
    return NextResponse.json(
      {
        error: 'This content is part of a collection. Verify access at the collection level.',
        collectionId: content.collectionId,
      },
      { status: 400 }
    );
  }

  // Check if content is free
  if (content.accessType === 'free') {
    return NextResponse.json(
      { error: 'This content is free and does not require verification' },
      { status: 400 }
    );
  }

  // Check for access - standalone tutorials only
  let hasAccess = false;

  // Standalone tutorials: check individual purchase
  if (!hasAccess && content.contentCategory === 'tutorial') {
    const purchase = await prisma.tutorialPurchase.findUnique({
      where: {
        contentId_email: {
          contentId,
          email: email.toLowerCase(),
        },
      },
    });
    if (purchase) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return NextResponse.json(
      { error: 'No purchase found for this email' },
      { status: 403 }
    );
  }

  // Check for existing code
  const existingCode = await prisma.premiumAccessCode.findFirst({
    where: {
      contentId,
      email: email.toLowerCase(),
      verified: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingCode) {
    const minutesRemaining = Math.floor((existingCode.expiresAt.getTime() - Date.now()) / 60000);
    if (minutesRemaining > 14) {
      return NextResponse.json(
        { error: 'Please wait before requesting a new code' },
        { status: 429 }
      );
    }
  }

  // Generate new code
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Delete any existing unverified codes
  await prisma.premiumAccessCode.deleteMany({
    where: {
      contentId,
      email: email.toLowerCase(),
      verified: false,
    },
  });

  // Create new code
  await prisma.premiumAccessCode.create({
    data: {
      contentId,
      email: email.toLowerCase(),
      code,
      expiresAt,
    },
  });

  // Send email with the code
  if (content.contentCategory === 'tutorial') {
    await sendTutorialAccessCodeEmail(
      email,
      code,
      content.title,
      content.creator.displayName
    );
    await sendContentPurchaseEmail({
      email,
      creatorName: content.creator.displayName,
      contentTitle: content.title,
      amount: (content.tutorialPrice || 0) / 100,
      accessCode: code,
      accessUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'}/creator/${content.creator.username}/content/${content.id}`,
    });
  } else {
    await sendPremiumAccessCode(
      email,
      code,
      content.title,
      content.creator.displayName
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Verification code sent to your email',
  });
}

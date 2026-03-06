'use server';

import { prisma } from '@foleio/database';
import { randomBytes } from 'crypto';

// Generate a 6-digit access code
function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if email has access to a collection
export async function checkCollectionAccess(
  email: string,
  collectionId: string
): Promise<{ hasAccess: boolean; subscription?: any }> {
  try {
    const subscription = await prisma.collectionSubscription.findUnique({
      where: {
        collectionId_email: {
          collectionId,
          email: email.toLowerCase(),
        },
      },
    });

    if (!subscription) {
      return { hasAccess: false };
    }

    // Check if subscription is active
    if (subscription.status !== 'active') {
      return { hasAccess: false };
    }

    // Check if subscription has expired (for recurring)
    if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
      // Update status to expired
      await prisma.collectionSubscription.update({
        where: { id: subscription.id },
        data: { status: 'expired' },
      });
      return { hasAccess: false };
    }

    return { hasAccess: true, subscription };
  } catch (error) {
    console.error('Error checking collection access:', error);
    return { hasAccess: false };
  }
}

// Check if email has access to an individual tutorial
export async function checkTutorialAccess(
  email: string,
  contentId: string
): Promise<{ hasAccess: boolean; purchase?: any }> {
  try {
    // First check if it's a free tutorial
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: {
        accessType: true,
        collectionId: true,
      },
    });

    if (!content) {
      return { hasAccess: false };
    }

    // Free tutorials are always accessible
    if (content.accessType === 'free') {
      return { hasAccess: true };
    }

    // Collection tutorials inherit access from collection subscription only
    if (content.collectionId) {
      const collectionAccess = await checkCollectionAccess(email, content.collectionId);
      return { hasAccess: collectionAccess.hasAccess };
    }

    // Standalone tutorials: check for individual purchase
    const purchase = await prisma.tutorialPurchase.findUnique({
      where: {
        contentId_email: {
          contentId,
          email: email.toLowerCase(),
        },
      },
    });

    if (purchase) {
      return { hasAccess: true, purchase };
    }

    return { hasAccess: false };
  } catch (error) {
    console.error('Error checking tutorial access:', error);
    return { hasAccess: false };
  }
}

export async function canAccessContent(
  contentId: string,
  fanEmail: string
): Promise<{ canAccess: boolean; reason: string }> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { collection: true },
  });

  if (!content) return { canAccess: false, reason: 'not_found' };
  if (content.accessType === 'free') return { canAccess: true, reason: 'free' };

  if (content.collectionId) {
    const subscription = await prisma.collectionSubscription.findFirst({
      where: {
        collectionId: content.collectionId,
        email: fanEmail.toLowerCase(),
        status: 'active',
      },
    });
    return {
      canAccess: Boolean(subscription),
      reason: subscription ? 'collection_subscriber' : 'no_collection_access',
    };
  }

  const purchased = await prisma.tutorialPurchase.findFirst({
    where: {
      contentId,
      email: fanEmail.toLowerCase(),
    },
  });
  return {
    canAccess: Boolean(purchased),
    reason: purchased ? 'purchased' : 'not_purchased',
  };
}

// Send verification code for collection access
export async function sendCollectionAccessCode(
  email: string,
  collectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: { creator: true },
    });

    if (!collection) {
      return { success: false, error: 'Collection not found' };
    }

    // Check if already has access
    const access = await checkCollectionAccess(email, collectionId);
    if (!access.hasAccess) {
      return { success: false, error: 'No subscription found for this email' };
    }

    // Generate verification code
    const code = generateAccessCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the code
    await prisma.premiumAccessCode.create({
      data: {
        collectionId,
        email: email.toLowerCase(),
        code,
        expiresAt,
      },
    });

    // Send email with code (using existing email action)
    const { sendCollectionAccessCodeEmail } = await import('./email');
    await sendCollectionAccessCodeEmail(
      email,
      code,
      collection.title,
      collection.creator.displayName
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending collection access code:', error);
    return { success: false, error: 'Failed to send verification code' };
  }
}

// Send verification code for tutorial access
export async function sendTutorialAccessCode(
  email: string,
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true },
    });

    if (!content) {
      return { success: false, error: 'Tutorial not found' };
    }

    if (content.collectionId) {
      return {
        success: false,
        error: 'Collection tutorials use collection-level access only',
      };
    }

    // Check if already has access
    const access = await checkTutorialAccess(email, contentId);
    if (!access.hasAccess) {
      return { success: false, error: 'No purchase found for this email' };
    }

    // Generate verification code
    const code = generateAccessCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the code
    await prisma.premiumAccessCode.create({
      data: {
        contentId,
        email: email.toLowerCase(),
        code,
        expiresAt,
      },
    });

    // Send email with code (using existing email action)
    const { sendTutorialAccessCodeEmail } = await import('./email');
    await sendTutorialAccessCodeEmail(
      email,
      code,
      content.title,
      content.creator.displayName
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending tutorial access code:', error);
    return { success: false, error: 'Failed to send verification code' };
  }
}

// Verify collection access code
export async function verifyCollectionAccessCode(
  email: string,
  code: string,
  collectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessCode = await prisma.premiumAccessCode.findFirst({
      where: {
        collectionId,
        email: email.toLowerCase(),
        code,
        verified: false,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!accessCode) {
      return { success: false, error: 'Invalid or expired code' };
    }

    // Mark the code as verified
    await prisma.premiumAccessCode.update({
      where: { id: accessCode.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error verifying collection access code:', error);
    return { success: false, error: 'Verification failed' };
  }
}

// Verify tutorial access code
export async function verifyTutorialAccessCode(
  email: string,
  code: string,
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessCode = await prisma.premiumAccessCode.findFirst({
      where: {
        contentId,
        email: email.toLowerCase(),
        code,
        verified: false,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!accessCode) {
      return { success: false, error: 'Invalid or expired code' };
    }

    // Mark the code as verified
    await prisma.premiumAccessCode.update({
      where: { id: accessCode.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error verifying tutorial access code:', error);
    return { success: false, error: 'Verification failed' };
  }
}

// Create a collection subscription after payment
export async function createCollectionSubscription(data: {
  collectionId: string;
  email: string;
  subscriptionType: 'one_time' | 'recurring';
  paymentReference?: string;
  transactionId?: string;
}): Promise<{ success: boolean; subscription?: any; error?: string }> {
  try {
    // Calculate expiration for recurring subscriptions (30 days)
    const expiresAt =
      data.subscriptionType === 'recurring'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : null;

    const subscription = await prisma.collectionSubscription.upsert({
      where: {
        collectionId_email: {
          collectionId: data.collectionId,
          email: data.email.toLowerCase(),
        },
      },
      create: {
        collectionId: data.collectionId,
        email: data.email.toLowerCase(),
        subscriptionType: data.subscriptionType,
        paymentReference: data.paymentReference,
        transactionId: data.transactionId,
        expiresAt,
        status: 'active',
      },
      update: {
        subscriptionType: data.subscriptionType,
        paymentReference: data.paymentReference,
        transactionId: data.transactionId,
        expiresAt,
        status: 'active',
      },
    });

    // Update collection enrolled count
    await prisma.collection.update({
      where: { id: data.collectionId },
      data: {
        enrolledCount: {
          increment: 1,
        },
      },
    });

    return { success: true, subscription };
  } catch (error) {
    console.error('Error creating collection subscription:', error);
    return { success: false, error: 'Failed to create subscription' };
  }
}

// Create a tutorial purchase after payment
export async function createTutorialPurchase(data: {
  contentId: string;
  email: string;
  paymentReference?: string;
  transactionId?: string;
}): Promise<{ success: boolean; purchase?: any; error?: string }> {
  try {
    const purchase = await prisma.tutorialPurchase.upsert({
      where: {
        contentId_email: {
          contentId: data.contentId,
          email: data.email.toLowerCase(),
        },
      },
      create: {
        contentId: data.contentId,
        email: data.email.toLowerCase(),
        paymentReference: data.paymentReference,
        transactionId: data.transactionId,
      },
      update: {
        paymentReference: data.paymentReference,
        transactionId: data.transactionId,
      },
    });

    const content = await prisma.content.findUnique({
      where: { id: data.contentId },
      include: {
        creator: {
          select: {
            displayName: true,
            username: true,
          },
        },
      },
    });

    if (content) {
      const { sendContentPurchaseEmail } = await import('@/lib/email/send');
      await sendContentPurchaseEmail({
        email: data.email.toLowerCase(),
        creatorName: content.creator.displayName,
        contentTitle: content.title,
        amount: (content.tutorialPrice || 0) / 100,
        accessUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'}/creator/${content.creator.username}/content/${content.id}`,
      });
    }

    return { success: true, purchase };
  } catch (error) {
    console.error('Error creating tutorial purchase:', error);
    return { success: false, error: 'Failed to create purchase' };
  }
}

// Get collection details with access info
export async function getCollectionWithAccessInfo(
  collectionId: string,
  email?: string
): Promise<{
  collection: any | null;
  hasAccess: boolean;
  accessType: 'free' | 'subscription' | 'purchase_required';
}> {
  try {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId, isPublished: true },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        tutorialContents: {
          where: { isPublished: true },
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            type: true,
            accessType: true,
            tutorialPrice: true,
            muxAssetId: true,
            muxPlaybackId: true,
            viewCount: true,
            durationSeconds: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        sections: {
          include: {
            sectionContents: {
              include: {
                content: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    thumbnailUrl: true,
                    type: true,
                    muxAssetId: true,
            muxPlaybackId: true,
                    durationSeconds: true,
                  },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!collection) {
      return { collection: null, hasAccess: false, accessType: 'purchase_required' };
    }

    // Check if collection is free
    if (collection.accessType === 'free') {
      return { collection, hasAccess: true, accessType: 'free' };
    }

    // Check if user has access via email
    if (email) {
      const access = await checkCollectionAccess(email, collectionId);
      if (access.hasAccess) {
        return { collection, hasAccess: true, accessType: 'subscription' };
      }
    }

    return { collection, hasAccess: false, accessType: 'purchase_required' };
  } catch (error) {
    console.error('Error getting collection with access info:', error);
    return { collection: null, hasAccess: false, accessType: 'purchase_required' };
  }
}

// Get tutorial details with access info
export async function getTutorialWithAccessInfo(
  contentId: string,
  email?: string
): Promise<{
  tutorial: any | null;
  hasAccess: boolean;
  accessType: 'free' | 'collection' | 'individual' | 'purchase_required';
  collection?: any;
}> {
  try {
    const tutorial = await prisma.content.findUnique({
      where: { id: contentId, isPublished: true, contentCategory: 'tutorial' },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        collection: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            price: true,
            subscriptionPrice: true,
            subscriptionType: true,
            accessType: true,
          },
        },
      },
    });

    if (!tutorial) {
      return { tutorial: null, hasAccess: false, accessType: 'purchase_required' };
    }

    // Free tutorials are always accessible
    if (tutorial.accessType === 'free') {
      return { tutorial, hasAccess: true, accessType: 'free' };
    }

    // Check access via email
    if (email) {
      // Collection tutorials inherit access from collection subscription
      if (tutorial.collectionId) {
        const collectionAccess = await checkCollectionAccess(email, tutorial.collectionId);
        if (collectionAccess.hasAccess) {
          return {
            tutorial,
            hasAccess: true,
            accessType: 'collection',
            collection: tutorial.collection,
          };
        }
        return {
          tutorial,
          hasAccess: false,
          accessType: 'purchase_required',
          collection: tutorial.collection,
        };
      }

      // Standalone tutorials: check individual purchase
      const tutorialAccess = await checkTutorialAccess(email, contentId);
      if (tutorialAccess.hasAccess) {
        return { tutorial, hasAccess: true, accessType: 'individual' };
      }
    }

    return {
      tutorial,
      hasAccess: false,
      accessType: 'purchase_required',
      collection: tutorial.collection,
    };
  } catch (error) {
    console.error('Error getting tutorial with access info:', error);
    return { tutorial: null, hasAccess: false, accessType: 'purchase_required' };
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { createTutorialPurchase, sendTutorialAccessCode } from '@/lib/actions/collection-access';
import { sendTutorialPurchaseConfirmation } from '@/lib/actions/email';
import { sendContentPurchaseEmail } from '@/lib/email/send';

const purchaseSchema = z.object({
  contentId: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().min(10).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = purchaseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { contentId, email, phone } = validation.data;

    // Get tutorial with creator info
    const tutorial = await prisma.content.findUnique({
      where: { 
        id: contentId, 
        isPublished: true, 
        contentCategory: 'tutorial',
      },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            username: true,
            paystackSubaccountCode: true,
          },
        },
      },
    });

    if (!tutorial) {
      return NextResponse.json(
        { error: 'Tutorial not found' },
        { status: 404 }
      );
    }

    if (tutorial.collectionId) {
      return NextResponse.json(
        { error: 'This tutorial is included in a collection subscription and cannot be purchased individually.' },
        { status: 400 }
      );
    }

    // Check if tutorial has a price
    const price = tutorial.tutorialPrice;
    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Tutorial price not set' },
        { status: 400 }
      );
    }

    // Check if already purchased
    const existingPurchase = await prisma.tutorialPurchase.findUnique({
      where: {
        contentId_email: {
          contentId,
          email: email.toLowerCase(),
        },
      },
    });

    if (existingPurchase) {
      // Already purchased, just send verification code
      await sendTutorialAccessCode(email, contentId);
      return NextResponse.json({
        success: true,
        alreadyPurchased: true,
        message: 'You already have access. Verification code sent to your email.',
        requiresVerification: true,
      });
    }

    // Initialize Paystack payment
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      // For development, simulate a successful payment
      console.log('⚠️ No Paystack key, simulating payment...');

      // Create purchase directly
      const result = await createTutorialPurchase({
        contentId,
        email,
        paymentReference: `sim_${Date.now()}`,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      // Send confirmation email
      await sendTutorialPurchaseConfirmation(
        email,
        tutorial.title,
        tutorial.creator.displayName,
        price
      );
      await sendContentPurchaseEmail({
        email,
        creatorName: tutorial.creator.displayName,
        contentTitle: tutorial.title,
        amount: price / 100,
        accessUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'}/creator/${tutorial.creator.username}/content/${contentId}`,
      });

      // Send access code immediately
      await sendTutorialAccessCode(email, contentId);

      return NextResponse.json({
        success: true,
        purchase: result.purchase,
        message: 'Tutorial purchased successfully (dev mode)',
        requiresVerification: true,
      });
    }

    // Generate unique reference
    const reference = `tut_${contentId.slice(0, 8)}_${Date.now()}`;

    // Calculate platform fee (10%)
    const platformFee = Math.floor(price * 0.10);

    // Initialize Paystack transaction
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: price, // in kobo
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/tutorials/purchase/callback`,
        metadata: {
          type: 'tutorial_purchase',
          contentId,
          email,
          phone,
          creatorId: tutorial.creator.id,
          creatorName: tutorial.creator.displayName,
          tutorialTitle: tutorial.title,
          custom_fields: [
            {
              display_name: 'Tutorial',
              variable_name: 'tutorial',
              value: tutorial.title,
            },
          ],
        },
        // Split payment with creator
        ...(tutorial.creator.paystackSubaccountCode && {
          subaccount: tutorial.creator.paystackSubaccountCode,
          transaction_charge: platformFee, // Platform takes 10%
          bearer: 'account',
        }),
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json(
        { error: data.message || 'Payment initialization failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('Error in tutorial purchase:', error);
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    );
  }
}


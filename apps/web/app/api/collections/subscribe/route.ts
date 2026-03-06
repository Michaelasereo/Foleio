import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { createCollectionSubscription, sendCollectionAccessCode } from '@/lib/actions/collection-access';
import { sendCollectionSubscriptionConfirmation } from '@/lib/actions/email';

const subscribeSchema = z.object({
  collectionId: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().min(10).optional(),
  subscriptionType: z.enum(['one_time', 'recurring']).default('one_time'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = subscribeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { collectionId, email, phone, subscriptionType } = validation.data;

    // Get collection with creator info
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId, isPublished: true },
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

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Determine the price based on subscription type
    const price = subscriptionType === 'recurring' 
      ? collection.subscriptionPrice 
      : collection.price;

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Collection price not set' },
        { status: 400 }
      );
    }

    // Initialize Paystack payment
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      // For development, simulate a successful payment
      console.log('⚠️ No Paystack key, simulating payment...');

      // Create subscription directly
      const result = await createCollectionSubscription({
        collectionId,
        email,
        subscriptionType,
        paymentReference: `sim_${Date.now()}`,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      // Send confirmation email
      await sendCollectionSubscriptionConfirmation(
        email,
        collection.title,
        collection.creator.displayName,
        subscriptionType,
        price
      );

      // Send access code immediately
      await sendCollectionAccessCode(email, collectionId);

      return NextResponse.json({
        success: true,
        subscription: result.subscription,
        message: 'Subscription created successfully (dev mode)',
        requiresVerification: true,
      });
    }

    // Generate unique reference
    const reference = `col_${collectionId.slice(0, 8)}_${Date.now()}`;

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
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/collections/subscribe/callback`,
        metadata: {
          type: 'collection_subscription',
          collectionId,
          email,
          phone,
          subscriptionType,
          creatorId: collection.creator.id,
          creatorName: collection.creator.displayName,
          collectionTitle: collection.title,
          custom_fields: [
            {
              display_name: 'Collection',
              variable_name: 'collection',
              value: collection.title,
            },
            {
              display_name: 'Subscription Type',
              variable_name: 'subscription_type',
              value: subscriptionType === 'recurring' ? 'Monthly' : 'One-time',
            },
          ],
        },
        // Split payment with creator
        ...(collection.creator.paystackSubaccountCode && {
          subaccount: collection.creator.paystackSubaccountCode,
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
    console.error('Error in collection subscribe:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}


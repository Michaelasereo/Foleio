import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paystack } from '@/lib/paystack';
import { prisma } from '@foleio/database';
import { withRateLimit, rateLimiters } from '@/lib/rate-limit/rate-limiter';
import { z } from 'zod';

const paymentSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'), // Add phone requirement
  amount: z.number().min(1000), // Minimum ₦10
  creatorId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  type: z.enum(['subscription', 'one_time']).default('subscription'),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (strict limits for payments)
    const rateLimitResult = await withRateLimit(request, rateLimiters.strict);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many payment requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            ...rateLimitResult.headers,
            'Retry-After': Math.ceil((rateLimitResult.result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const validatedData = paymentSchema.parse(body);

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // For subscriptions, we allow unauthenticated users (they subscribe with email/phone)
    const userId = session?.user?.id || null;

    // Get creator details
    const creator = await prisma.creator.findUnique({
      where: { id: validatedData.creatorId },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Initialize Paystack payment
    const paymentData = await paystack.initializePayment({
      email: validatedData.email,
      amount: validatedData.amount * 100, // Convert to kobo
      metadata: {
        creator_id: validatedData.creatorId,
        plan_id: validatedData.planId,
        user_id: userId,
        type: validatedData.type,
        phone: validatedData.phone, // Store phone in metadata
        subscriber_email: validatedData.email,
      },
      subaccount: creator.paystackSubaccountCode || undefined,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'}/payment/callback`,
    });

    if (!paymentData.status) {
      throw new Error(paymentData.message || 'Payment initialization failed');
    }

    // Save transaction reference (with transaction for atomicity)
    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          reference: paymentData.data.reference,
          userId: userId,
          creatorId: validatedData.creatorId,
          amount: validatedData.amount * 100,
          status: 'pending',
          type: validatedData.type,
          metadata: {
            phone: validatedData.phone,
            subscriber_email: validatedData.email,
            plan_id: validatedData.planId,
          },
        },
      });
    });

    return NextResponse.json(
      {
        authorization_url: paymentData.data.authorization_url,
        reference: paymentData.data.reference,
      },
      {
        headers: rateLimitResult.headers,
      }
    );
  } catch (error) {
    console.error('Payment initialization error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Payment initialization failed',
      },
      { status: 400 }
    );
  }
}

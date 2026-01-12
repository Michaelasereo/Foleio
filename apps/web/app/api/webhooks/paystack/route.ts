import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { webhookQueue, queues } from '@/lib/queue/queue-manager';
import { withRateLimit, rateLimiters } from '@/lib/rate-limit/rate-limiter';
import { prisma } from '@odim/database';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for webhook endpoint (generous limits for Paystack)
    const rateLimitResult = await withRateLimit(request, rateLimiters.generous);

    if (!rateLimitResult.allowed) {
      console.warn('Webhook rate limit exceeded');
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: rateLimitResult.headers,
        }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('Webhook received without signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature using Paystack secret key
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.error('Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    console.log(`Webhook received: ${event.event}`, { reference: event.data?.reference });

    // Process webhook directly (simpler for development)
    console.log(`Processing webhook directly: ${event.event}`);

    try {
      // Process webhook events directly
      await processWebhookEvent(event.event, event.data);
      console.log(`✅ Webhook processed successfully: ${event.event}`);
    } catch (error) {
      console.error(`❌ Webhook processing failed: ${event.event}`, error);
      throw error; // Re-throw to return 500 status
    }
    return NextResponse.json(
      { received: true, queued: true },
      { headers: rateLimitResult.headers }
    );
  } catch (error) {
    console.error('Webhook queuing error:', error);
    return NextResponse.json(
      { error: 'Webhook queuing failed' },
      { status: 500 }
    );
  }
}

// Process webhook events
async function processWebhookEvent(eventType: string, eventData: any) {
  console.log(`🔄 Processing webhook event: ${eventType}`);

  switch (eventType) {
    case 'charge.success':
      await handleChargeSuccess(eventData);
      break;

    case 'subscription.create':
    case 'subscription.disable':
    case 'subscription.enable':
      await handleSubscriptionEvent(eventType, eventData);
      break;

    case 'transfer.success':
    case 'transfer.failed':
      await handleTransferEvent(eventType, eventData);
      break;

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      await handleInvoiceEvent(eventType, eventData);
      break;

    default:
      console.log(`ℹ️ Unhandled webhook event: ${eventType}`);
  }
}

async function handleChargeSuccess(eventData: any) {
  const { reference, amount, customer, metadata } = eventData;

  try {
    // Handle booking payments specifically
    if (metadata?.type === 'booking' && metadata?.bookingId) {
      console.log(`🎯 Processing booking payment: ${reference} for booking ${metadata.bookingId}`);

      try {
        const booking = await prisma.booking.findUnique({
          where: { id: metadata.bookingId },
          include: { creator: true }
        });

        if (!booking) {
          console.log(`⚠️ Booking not found: ${metadata.bookingId} - this might be a test webhook`);
          return; // Don't fail for test webhooks
        }

        if (booking.status !== 'pending') {
          console.log(`⚠️ Booking already processed: ${metadata.bookingId} status: ${booking.status}`);
          return; // Already processed, don't fail
        }

        // Import booking actions
        const { confirmBookingPayment, processFirstPayout } = await import('@/lib/actions/booking');
        const { sendBookingConfirmationEmail } = await import('@/lib/actions/email');

        // Confirm the booking payment
        const confirmResult = await confirmBookingPayment(booking.id, reference);
        if (confirmResult.error) {
          throw new Error(`Payment confirmation failed: ${confirmResult.error}`);
        }

        // Process first payout (60% to creator)
        const payoutResult = await processFirstPayout(booking.id);
        if (payoutResult.error) {
          console.error('First payout error:', payoutResult.error);
          // Don't fail the webhook, but log the error
        }

        // Send confirmation email
        try {
          await sendBookingConfirmationEmail(booking.id);
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          // Don't fail the webhook for email errors
        }

        console.log(`✅ Booking payment processed: ${reference} for booking ${metadata.bookingId}`);
      } catch (error) {
        console.error(`❌ Error processing booking payment: ${error.message}`);
        // For development, don't fail the webhook completely
        if (process.env.NODE_ENV === 'production') {
          throw error;
        }
      }
      return;
    }

    // Handle other charge types (subscriptions, etc.)
    // Update transaction status
    const transaction = await prisma.transaction.findUnique({
      where: { reference },
    });

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'success',
          gatewayResponse: eventData,
          completedAt: new Date(),
        },
      });
    }

    // Create payment record
    await prisma.payment.create({
      data: {
        reference,
        amount: amount / 100, // Convert from kobo
        currency: eventData.currency || 'NGN',
        status: 'COMPLETED',
        type: metadata?.type || 'one_time',
        gateway: 'PAYSTACK',
        gatewayResponse: eventData,
        userId: metadata?.user_id,
        creatorId: metadata?.creator_id,
        metadata,
      },
    });

    // If this is a subscription payment, update creator balance
    if (metadata?.creator_id) {
      const platformFee = 0.15; // 15% platform fee
      const creatorAmount = (amount / 100) * (1 - platformFee);

      await prisma.creator.update({
        where: { id: metadata.creator_id },
        data: {
          balance: { increment: creatorAmount },
          totalEarnings: { increment: creatorAmount },
        },
      });
    }

    // If user_id exists, update user subscription status
    if (metadata?.user_id) {
      await prisma.user.update({
        where: { id: metadata.user_id },
        data: {
          subscriptionStatus: 'ACTIVE',
          currentPlan: metadata?.plan_id,
          lastPaymentDate: new Date(),
        },
      });
    }

    console.log(`✅ Charge success processed: ${reference}`);
  } catch (error) {
    console.error(`❌ Failed to process charge success: ${reference}`, error);
    throw error;
  }
}

async function handleSubscriptionEvent(eventType: string, eventData: any) {
  const { customer, plan, subscription_code } = eventData;

  try {
    const status = eventType === 'subscription.create' ? 'ACTIVE' :
                  eventType === 'subscription.disable' ? 'INACTIVE' : 'ACTIVE';

    // Update user subscription
    await prisma.user.update({
      where: { email: customer.email },
      data: {
        subscriptionStatus: status,
        currentPlan: plan.plan_code,
        subscriptionCode: subscription_code,
        lastPaymentDate: new Date(),
      },
    });

    console.log(`✅ Subscription ${eventType} processed for ${customer.email}`);
  } catch (error) {
    console.error(`❌ Failed to process subscription event: ${eventType}`, error);
    throw error;
  }
}

async function handleTransferEvent(eventType: string, eventData: any) {
  const { reference, transfer_code, amount } = eventData;

  try {
    // Update payout status
    await prisma.payout.update({
      where: { paystackTransferCode: transfer_code },
      data: {
        status: eventType === 'transfer.success' ? 'COMPLETED' : 'FAILED',
        completedAt: eventType === 'transfer.success' ? new Date() : undefined,
        failedAt: eventType === 'transfer.failed' ? new Date() : undefined,
        gatewayResponse: eventData,
      },
    });

    console.log(`✅ Transfer ${eventType} processed: ${reference}`);
  } catch (error) {
    console.error(`❌ Failed to process transfer event: ${eventType}`, error);
    throw error;
  }
}

async function handleInvoiceEvent(eventType: string, eventData: any) {
  const { subscription, amount, customer } = eventData;

  try {
    // Create recurring payment record
    await prisma.payment.create({
      data: {
        reference: eventData.reference || `invoice_${Date.now()}`,
        amount: amount / 100,
        currency: eventData.currency || 'NGN',
        status: eventType === 'invoice.payment_succeeded' ? 'COMPLETED' : 'FAILED',
        type: 'subscription',
        gateway: 'PAYSTACK',
        gatewayResponse: eventData,
        userId: customer.metadata?.user_id,
        creatorId: subscription.metadata?.creator_id,
        metadata: {
          subscription_code: subscription.subscription_code,
          invoice_id: eventData.id,
        },
      },
    });

    // Update creator balance for successful payments
    if (eventType === 'invoice.payment_succeeded' && subscription.metadata?.creator_id) {
      const platformFee = 0.15;
      const creatorAmount = (amount / 100) * (1 - platformFee);

      await prisma.creator.update({
        where: { id: subscription.metadata.creator_id },
        data: {
          balance: { increment: creatorAmount },
          totalEarnings: { increment: creatorAmount },
        },
      });
    }

    console.log(`✅ Invoice ${eventType} processed: ${eventData.reference}`);
  } catch (error) {
    console.error(`❌ Failed to process invoice event: ${eventType}`, error);
    throw error;
  }
}

// Determine job priority based on event type
function getEventPriority(eventType: string): number {
  switch (eventType) {
    case 'charge.success':
      return 10; // Highest priority - customer paid, needs immediate access
    case 'transfer.success':
    case 'transfer.failed':
      return 8; // High priority - payout status updates
    case 'subscription.create':
      return 7; // Medium-high priority - subscription management
    case 'invoice.payment_succeeded':
      return 7; // Medium-high priority - recurring payments
    default:
      return 5; // Normal priority for other events
  }
}


import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { webhookQueue, queues } from '@/lib/queue/queue-manager';
import { withRateLimit, rateLimiters } from '@/lib/rate-limit/rate-limiter';
import { prisma } from '@foleio/database';
import { sendSubscriptionConfirmation } from '@/lib/email/send';
import { sendEmail, sendOrderConfirmationEmail } from '@/lib/email/resend';
import { paymentFailedTemplate, payoutConfirmationTemplate } from '@/lib/email/templates/nudges';
import { checkAndLogMilestone, checkEarned10kMilestone } from '@/lib/utils/milestones';
import { formatNaira } from '@foleio/utils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';

async function ensureFanUserByEmail(email?: string | null, fullName?: string | null) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {},
    create: {
      email: normalizedEmail,
      fullName: fullName || null,
      isCreator: false,
      emailVerified: true,
    },
    select: { id: true, email: true },
  });
}

async function syncFanAccessRecordsFromCharge(eventData: any) {
  const metadata = eventData?.metadata || {};
  const type = String(metadata?.type || '').toLowerCase();
  const reference = String(eventData?.reference || '');
  const amountInKobo = Number(eventData?.amount || 0);

  const fanEmail = String(
    metadata?.subscriber_email ||
      metadata?.email ||
      eventData?.customer?.email ||
      ''
  )
    .trim()
    .toLowerCase();
  const fanName = String(eventData?.customer?.name || '').trim() || null;
  const creatorId = String(metadata?.creatorId || metadata?.creator_id || '').trim() || null;
  const planId = String(metadata?.plan_id || metadata?.planId || '').trim() || null;
  const contentId = String(metadata?.contentId || metadata?.content_id || '').trim() || null;
  const collectionId = String(metadata?.collectionId || metadata?.collection_id || '').trim() || null;
  const subscriptionType = String(metadata?.subscriptionType || metadata?.subscription_type || 'one_time');
  const metadataFanId = String(metadata?.user_id || metadata?.userId || '').trim() || null;

  let fanId = metadataFanId;
  if (!fanId) {
    const fanUser = await ensureFanUserByEmail(fanEmail, fanName);
    fanId = fanUser?.id || null;
  }

  if ((type === 'subscription' || type === 'fan_subscription') && fanId && creatorId) {
    const existing = await prisma.fanSubscription.findFirst({
      where: { fanId, creatorId },
      select: { id: true },
    });

    if (existing) {
      await prisma.fanSubscription.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          planId: planId || undefined,
          paystackAuthorizationCode: eventData?.authorization?.authorization_code || undefined,
          paystackSubscriptionId: eventData?.subscription?.subscription_code || undefined,
          lastPaymentDate: new Date(),
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          metadata: {
            reference,
          },
        },
      });
    } else {
      await prisma.fanSubscription.create({
        data: {
          fanId,
          creatorId,
          planId: planId || undefined,
          status: 'active',
          paystackAuthorizationCode: eventData?.authorization?.authorization_code || undefined,
          paystackSubscriptionId: eventData?.subscription?.subscription_code || undefined,
          lastPaymentDate: new Date(),
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          metadata: {
            reference,
          },
        },
      });
    }
  }

  if (type === 'tutorial_purchase' && contentId && fanEmail) {
    await prisma.tutorialPurchase.upsert({
      where: {
        contentId_email: {
          contentId,
          email: fanEmail,
        },
      },
      create: {
        contentId,
        email: fanEmail,
        paymentReference: reference || undefined,
      },
      update: {
        paymentReference: reference || undefined,
      },
    });
  }

  if (type === 'collection_subscription' && collectionId && fanEmail) {
    await prisma.collectionSubscription.upsert({
      where: {
        collectionId_email: {
          collectionId,
          email: fanEmail,
        },
      },
      create: {
        collectionId,
        email: fanEmail,
        subscriptionType: subscriptionType === 'recurring' ? 'recurring' : 'one_time',
        status: 'active',
        paymentReference: reference || undefined,
      },
      update: {
        status: 'active',
        subscriptionType: subscriptionType === 'recurring' ? 'recurring' : 'one_time',
        paymentReference: reference || undefined,
      },
    });
  }

  if (fanId && creatorId && amountInKobo > 0 && (type === 'subscription' || type === 'fan_subscription')) {
    await prisma.transaction.updateMany({
      where: { reference },
      data: { userId: fanId, creatorId },
    });
  }
}

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
    } catch (error: any) {
      console.error(`❌ Webhook processing failed: ${event.event}`, error);
      throw error; // Re-throw to return 500 status
    }
    return NextResponse.json(
      { received: true, queued: true },
      { headers: rateLimitResult.headers }
    );
  } catch (error: any) {
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

    case 'charge.failed':
      await handleChargeFailed(eventData);
      break;

    case 'subscription.create':
    case 'subscription.disable':
    case 'subscription.enable':
      await handleSubscriptionEvent(eventType, eventData);
      break;

    case 'transfer.success':
    case 'transfer.failed':
    case 'transfer.reversed':
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
    // Handle creator -> Foleio platform subscription payments
    if (metadata?.type === 'platform_subscription') {
      const creatorId = metadata.creatorId || metadata.creator_id;
      if (!creatorId) {
        console.error(
          '[paystack webhook] platform_subscription missing creatorId',
          reference
        );
        return;
      }

      const { activatePlatformSubscription } = await import(
        '@/lib/billing/activate-platform-subscription'
      );

      await activatePlatformSubscription({
        creatorId,
        plan: metadata.plan || 'pro',
        amountKobo: typeof amount === 'number' ? amount : undefined,
        subscriptionCode:
          eventData.subscription_code ||
          eventData.subscription?.subscription_code ||
          null,
        emailToken:
          eventData.email_token ||
          eventData.subscription?.email_token ||
          metadata?.email_token ||
          null,
      });

      console.log(
        `✅ Platform subscription payment processed for creator ${creatorId}`
      );
      return;
    }

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

        const { confirmBookingPayment, processFirstPayout, recordBookingPaymentTransaction } =
          await import('@/lib/actions/booking');
        const { sendBookingConfirmationEmail } = await import('@/lib/actions/email');

        const usedSubaccount =
          metadata?.paymentType === 'DIRECT_SUBACCOUNT' ||
          Boolean(booking.creator?.paystackSubaccountCode) ||
          booking.creator?.payoutMethod === 'DIRECT_SUBACCOUNT';

        const paymentKind =
          metadata?.paymentKind === 'balance' ? 'balance' : 'initial';

        let completedPayment = false;

        if (
          booking.status === 'pending' ||
          booking.status === 'deposit_paid' ||
          booking.status === 'balance_overdue'
        ) {
          const confirmResult = await confirmBookingPayment(
            booking.id,
            reference,
            paymentKind
          );
          if (
            confirmResult.error &&
            confirmResult.error !== 'Booking already processed'
          ) {
            throw new Error(`Payment confirmation failed: ${confirmResult.error}`);
          }
          completedPayment = Boolean(confirmResult.completedPayment);
        } else {
          console.log(
            `⚠️ Booking already processed: ${metadata.bookingId} status: ${booking.status}`
          );
        }

        if (completedPayment) {
          const recordResult = await recordBookingPaymentTransaction({
            bookingId: booking.id,
            reference,
            paymentType: usedSubaccount ? 'DIRECT_SUBACCOUNT' : 'PLATFORM_HELD',
            paymentKind: paymentKind === 'balance' ? 'balance' : 'full',
            gatewayResponse: eventData,
          });
          if (recordResult.error) {
            console.error('Booking transaction record error:', recordResult.error);
          }

          if (!usedSubaccount) {
            const payoutResult = await processFirstPayout(booking.id);
            if (payoutResult.error) {
              console.error('First payout error:', payoutResult.error);
            }
          } else {
            console.log(
              `⏭️ Skipping processFirstPayout for subaccount booking ${booking.id}`
            );
          }
        } else if (confirmResult.data?.status === 'deposit_paid') {
          const recordResult = await recordBookingPaymentTransaction({
            bookingId: booking.id,
            reference,
            paymentType: usedSubaccount ? 'DIRECT_SUBACCOUNT' : 'PLATFORM_HELD',
            paymentKind: 'initial',
            gatewayResponse: eventData,
          });
          if (recordResult.error) {
            console.error('Deposit transaction record error:', recordResult.error);
          }
        }

        try {
          await sendBookingConfirmationEmail(booking.id);
        } catch (emailError) {
          console.error('Email sending error:', emailError);
        }

        console.log(`✅ Booking payment processed: ${reference} for booking ${metadata.bookingId}`);
      } catch (error: any) {
        console.error(`❌ Error processing booking payment: ${error.message}`);
        if (process.env.NODE_ENV === 'production') {
          throw error;
        }
      }
      return;
    }

    if (metadata?.type === 'shop_order' && metadata?.orderId) {
      try {
        const pendingOrder = await prisma.order.findUnique({
          where: { id: metadata.orderId },
          include: { items: true },
        });

        if (!pendingOrder) {
          console.error('[webhook] shop order not found:', metadata.orderId);
          return;
        }

        if (pendingOrder.status === 'pending') {
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: pendingOrder.id },
              data: { status: 'confirmed' },
            });

            for (const item of pendingOrder.items) {
              const product = await tx.product.findUnique({
                where: { id: item.productId },
                select: { id: true, stock: true, status: true },
              });
              if (!product) continue;
              const nextStock = Math.max(0, (product.stock ?? 0) - item.quantity);
              await tx.product.update({
                where: { id: product.id },
                data: {
                  stock: nextStock,
                  ...(nextStock <= 0 ? { status: 'draft' } : {}),
                },
              });
            }
          });
        }

        const updatedOrder = await prisma.order.findUnique({
          where: { id: metadata.orderId },
          include: {
            creator: { select: { displayName: true } },
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    type: true,
                    digitalFileUrl: true,
                  },
                },
              },
            },
            deliveryTier: true,
          },
        });

        if (!updatedOrder) return;

        const deliveryAddress = (updatedOrder.deliveryAddress || {}) as Record<string, string>;
        const recipientEmail = String(deliveryAddress.email || '').trim();
        if (recipientEmail) {
          void sendOrderConfirmationEmail({
            email: recipientEmail,
            fanName: deliveryAddress.name,
            orderId: updatedOrder.id,
            items: updatedOrder.items.map((item) => ({
              name: item.product?.name || 'Product',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              type: (item.product?.type as 'physical' | 'digital' | null) || null,
              digitalFileUrl: item.product?.digitalFileUrl || null,
            })),
            deliveryAddress: {
              address: deliveryAddress.address,
              city: deliveryAddress.city,
              state: deliveryAddress.state,
            },
            deliveryTier: updatedOrder.deliveryTier
              ? {
                  name: updatedOrder.deliveryTier.name,
                  estimatedDays: updatedOrder.deliveryTier.estimatedDays || undefined,
                }
              : null,
            subtotal: updatedOrder.subtotal,
            deliveryFee: updatedOrder.deliveryFee,
            total: updatedOrder.total,
            creatorName: updatedOrder.creator.displayName,
          });
        }

        console.log('[webhook] shop order confirmed:', metadata.orderId);
      } catch (err) {
        console.error('[webhook] shop order update failed:', err);
      }
      return;
    }

    // Handle other charge types (subscriptions, etc.)
    // Update transaction status
    const transaction = await prisma.transaction.findUnique({
      where: { reference },
    });

    const paystackAmountKobo = Number(amount || 0);
    const platformFee = Math.round(paystackAmountKobo * 0.03);
    const creatorEarnings = Math.max(0, paystackAmountKobo - platformFee);

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'success',
          creatorEarnings,
          platformFee,
          netAmount: creatorEarnings,
          feeAmount: platformFee,
          gatewayResponse: eventData,
        },
      });
    }

    // Ensure fan-facing records exist for dashboard visibility after payment.
    // Never fail the full webhook for fan-dashboard sync errors.
    try {
      await syncFanAccessRecordsFromCharge(eventData);
    } catch (fanSyncError) {
      console.error(`[webhook] Failed to sync fan access records for ${reference}:`, fanSyncError);
    }

    // Create payment record
    await (prisma as any).payment.create({
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

      await checkEarned10kMilestone(metadata.creator_id);
    }

    // If user_id exists, update user subscription status
    if (metadata?.user_id) {
      await (prisma as any).user.update({
        where: { id: metadata.user_id },
        data: {
          subscriptionStatus: 'ACTIVE',
          currentPlan: metadata?.plan_id,
          lastPaymentDate: new Date(),
        },
      });
    }

    // Fan subscription confirmation email (non-blocking)
    if (metadata?.type === 'subscription' && metadata?.creator_id) {
      const [creator, plan, activeSubscriberCount] = await Promise.all([
        prisma.creator.findUnique({
          where: { id: metadata.creator_id },
          select: { displayName: true, username: true, subscriberCount: true },
        }),
        metadata?.plan_id
          ? prisma.creatorPlan.findUnique({
              where: { id: metadata.plan_id },
              select: { name: true },
            })
          : Promise.resolve(null),
        prisma.fanSubscription.count({
          where: {
            creatorId: metadata.creator_id,
            status: 'active',
          },
        }),
      ]);

      if (creator) {
        const nextBillingDate = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toLocaleDateString();
        await sendSubscriptionConfirmation({
          fanEmail: metadata?.subscriber_email || customer?.email || '',
          creatorName: creator.displayName,
          creatorUsername: creator.username,
          planName: plan?.name || 'Subscription',
          amount: amount / 100,
          nextBillingDate,
        });
      }

      const milestoneSubscriberCount =
        creator?.subscriberCount && creator.subscriberCount > 0
          ? creator.subscriberCount
          : activeSubscriberCount;

      if (milestoneSubscriberCount === 1) {
        await checkAndLogMilestone(metadata.creator_id, 'first_subscriber');
      }
      if (milestoneSubscriberCount === 10) {
        await checkAndLogMilestone(metadata.creator_id, 'ten_subscribers');
      }
    }

    console.log(`✅ Charge success processed: ${reference}`);
  } catch (error: any) {
    console.error(`❌ Failed to process charge success: ${reference}`, error);
    throw error;
  }
}

async function handleSubscriptionEvent(eventType: string, eventData: any) {
  const { customer, plan, subscription_code } = eventData;

  try {
    const subscriptionCode =
      eventData?.subscription_code ||
      eventData?.subscription?.subscription_code ||
      subscription_code ||
      null;

    const emailToken =
      eventData?.email_token ||
      eventData?.subscription?.email_token ||
      null;

    if (eventType === 'subscription.create' && subscriptionCode) {
      await prisma.platformSubscription.updateMany({
        where: { paystackSubscriptionId: subscriptionCode },
        data: {
          status: 'active',
          ...(emailToken ? { paystackEmailToken: String(emailToken) } : {}),
        },
      });

      // Also match pending rows without code yet via customer email → creator
      if (customer?.email && emailToken) {
        const user = await prisma.user.findFirst({
          where: { email: String(customer.email).toLowerCase() },
          select: { id: true },
        });
        if (user) {
          const creator = await prisma.creator.findUnique({
            where: { userId: user.id },
            select: { id: true },
          });
          if (creator) {
            await prisma.platformSubscription.updateMany({
              where: { creatorId: creator.id },
              data: {
                paystackSubscriptionId: subscriptionCode,
                paystackEmailToken: String(emailToken),
                status: 'active',
              },
            });
          }
        }
      }
    }

    if (eventType === 'subscription.disable') {
      if (subscriptionCode) {
        const platformSub = await prisma.platformSubscription.findFirst({
          where: { paystackSubscriptionId: subscriptionCode },
        });

        if (platformSub) {
          await prisma.platformSubscription.update({
            where: { creatorId: platformSub.creatorId },
            data: { status: 'cancelled', cancelAtPeriodEnd: false },
          });

          await prisma.creator.update({
            where: { id: platformSub.creatorId },
            data: {
              platformSubscriptionActive: false,
              platformPlan: 'STARTER',
            },
          });

          try {
            const { syncCreatorSubaccountFee } = await import(
              '@/lib/billing/platform-fee'
            );
            await syncCreatorSubaccountFee(platformSub.creatorId);
          } catch (feeErr) {
            console.error(
              '[paystack webhook] failed to restore Free platform fee',
              feeErr
            );
          }
        } else {
          await prisma.platformSubscription.updateMany({
            where: { paystackSubscriptionId: subscriptionCode },
            data: { status: 'cancelled', cancelAtPeriodEnd: true },
          });
        }
      }
    }

    const status =
      eventType === 'subscription.create'
        ? 'ACTIVE'
        : eventType === 'subscription.disable'
          ? 'INACTIVE'
          : 'ACTIVE';

    if (customer?.email) {
      await (prisma as any).user
        .update({
          where: { email: customer.email },
          data: {
            subscriptionStatus: status,
            currentPlan: plan?.plan_code,
            subscriptionCode: subscription_code,
            lastPaymentDate: new Date(),
          },
        })
        .catch(() => undefined);
    }

    console.log(`✅ Subscription ${eventType} processed for ${customer?.email}`);
  } catch (error: any) {
    console.error(`❌ Failed to process subscription event: ${eventType}`, error);
    throw error;
  }
}

async function handleTransferEvent(eventType: string, eventData: any) {
  const { reference, transfer_code, amount, reason } = eventData;

  try {
    const payout: any = await prisma.payout.findFirst({
      where: {
        OR: [
          { paystackReference: reference },
          { paystackTransferCode: transfer_code },
        ],
      },
      include: {
        creator: {
          include: {
            user: { select: { email: true } },
            bankAccount: true as any,
          } as any,
        },
      } as any,
    });
    if (!payout) {
      console.log(`ℹ️ payout not found for transfer event: ${reference || transfer_code}`);
      return;
    }

    if (eventType === 'transfer.success') {
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'SUCCESS',
          processedAt: new Date(),
          paystackReference: reference || payout.paystackReference,
        } as any,
      });

      if (payout.creator?.user?.email) {
        await sendEmail({
          to: payout.creator.user.email,
          subject: 'Your Foleio payout is on the way',
          html: payoutConfirmationTemplate({
            name: payout.creator.displayName,
            amount: formatNaira((amount || payout.amount) / 100),
            bankName: payout.creator.bankAccount?.bankName || 'Your bank',
            accountNumber: `****${String(
              payout.creator.bankAccount?.accountNumber || ''
            ).slice(-4)}`,
            reference: reference || payout.paystackReference || payout.id,
          }),
        });
      }
    } else {
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: eventType === 'transfer.reversed' ? 'REVERSED' : 'FAILED',
          failureReason: reason || eventData?.reason || 'Transfer failed',
          processedAt: new Date(),
          paystackReference: reference || payout.paystackReference,
        } as any,
      });

      await prisma.creator.update({
        where: { id: payout.creatorId },
        data: { availableBalance: { increment: Number(amount || payout.amount) } } as any,
      });
    }

    console.log(`✅ Transfer ${eventType} processed: ${reference}`);
  } catch (error: any) {
    console.error(`❌ Failed to process transfer event: ${eventType}`, error);
    throw error;
  }
}

async function handleChargeFailed(eventData: any) {
  try {
    const metadata = eventData?.metadata;
    if (metadata?.type !== 'subscription') {
      console.log('ℹ️ charge.failed received for non-subscription payment');
      return;
    }

    await handleSubscriptionPaymentFailure(eventData);
    console.log(`✅ charge.failed subscription handled: ${eventData?.reference || 'no-ref'}`);
  } catch (error: any) {
    console.error('❌ Failed to process charge.failed event:', error);
    throw error;
  }
}

async function handleSubscriptionPaymentFailure(eventData: any) {
  const subscriptionCode =
    eventData?.subscription?.subscription_code ||
    eventData?.data?.subscription?.subscription_code ||
    eventData?.subscription_code ||
    eventData?.metadata?.subscription_code;

  const fanEmail = (
    eventData?.customer?.email ||
    eventData?.data?.customer?.email ||
    eventData?.metadata?.subscriber_email ||
    ''
  )
    .toString()
    .toLowerCase();

  const whereClause = subscriptionCode
    ? { paystackSubscriptionId: subscriptionCode }
    : fanEmail
      ? { fan: { email: fanEmail } }
      : null;

  if (!whereClause) {
    console.log('ℹ️ No subscription code or fan email found for failed subscription event');
    return;
  }

  const subscription = await prisma.fanSubscription.findFirst({
    where: whereClause,
    include: {
      creator: { select: { displayName: true, username: true } },
      fan: { select: { email: true, fullName: true } },
      plan: { select: { name: true } },
    },
  });

  if (!subscription) {
    console.log('ℹ️ No matching fan subscription found for failed subscription event');
    return;
  }

  const shouldSendRecoveryEmail = subscription.status !== 'past_due';
  if (shouldSendRecoveryEmail) {
    await prisma.fanSubscription.update({
      where: { id: subscription.id },
      data: { status: 'past_due' },
    });
  }

  if (!shouldSendRecoveryEmail) {
    return;
  }

  const updateUrl = `${APP_URL}/fan/dashboard/subscriptions`;
  await sendEmail({
    to: subscription.fan.email,
    subject: `Your subscription to ${subscription.creator.displayName} needs attention`,
    html: paymentFailedTemplate({
      fanName: subscription.fan.fullName?.split(' ')[0] || 'there',
      creatorName: subscription.creator.displayName,
      planName: subscription.plan?.name || 'Subscription',
      updateUrl,
      creatorUrl: `${APP_URL}/creator/${subscription.creator.username}`,
    }),
  });
}

async function handleInvoiceEvent(eventType: string, eventData: any) {
  const { subscription, amount, customer } = eventData;

  try {
    // Create recurring payment record
    await (prisma as any).payment.create({
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

      await checkEarned10kMilestone(subscription.metadata.creator_id);
    }

    if (eventType === 'invoice.payment_failed') {
      await handleSubscriptionPaymentFailure(eventData);
    }

    console.log(`✅ Invoice ${eventType} processed: ${eventData.reference}`);
  } catch (error: any) {
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


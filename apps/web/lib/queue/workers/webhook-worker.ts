import { Worker, Job } from 'bullmq';
import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';
import { webhookQueue, deadLetterQueue } from '../queue-manager';
import crypto from 'crypto';
import {
  sendContentPurchaseEmail,
  sendSubscriptionConfirmation,
} from '@/lib/email/send';
import { checkAndLogMilestone, checkEarned10kMilestone } from '@/lib/utils/milestones';

interface WebhookJobData {
  event: string;
  data: any;
  webhookId?: string;
  attempt: number;
  maxAttempts: number;
}

// Process webhook job
async function processWebhook(job: Job<WebhookJobData>) {
  const { event, data, attempt, maxAttempts } = job.data;

  console.log(`Processing webhook attempt ${attempt}/${maxAttempts}:`, event);

  try {
    switch (event) {
      case 'charge.success':
      case 'subscription.create':
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(data);
        break;

      case 'transfer.success':
      case 'transfer.failed':
        await handleTransferEvent(data, event);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
        break;
    }

    console.log(`Webhook processed successfully: ${event}`);
  } catch (error) {
    console.error(`Webhook processing failed:`, error);

    // If this was the last attempt, move to dead letter queue
    if (attempt >= maxAttempts) {
      await moveToDeadLetter(job);
    }

    throw error; // Re-throw to mark job as failed
  }
}

// Handle successful payment events
async function handlePaymentSuccess(data: any) {
  const reference = data.reference;
  const queuedEmails: Array<Promise<{ success: boolean }>> = [];

  // Use database transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Find transaction by reference
    const transaction = await tx.transaction.findUnique({
      where: { reference },
      include: {
        creator: true,
      },
    });

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${reference}`);
    }

    if (transaction.status === 'success') {
      console.log(`Transaction already processed: ${reference}`);
      return;
    }

    // Update transaction status
    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'success',
        gatewayResponse: data,
        netAmount: data.amount - (data.fees || 0),
        feeAmount: data.fees || 0,
      },
    });

    // Create subscription if this was a subscription payment
    if (transaction.type === 'subscription' && transaction.creatorId) {
      const metadata = transaction.metadata as any;

      // Check for existing active subscription
      const existingSubscription = await tx.fanSubscription.findFirst({
        where: {
          fanId: transaction.userId,
          creatorId: transaction.creatorId,
          status: 'active',
        },
      });

      if (existingSubscription) {
        console.log(`Active subscription already exists, skipping creation`);
        return;
      }

      // Create new subscription
      await tx.fanSubscription.create({
        data: {
          fanId: transaction.userId,
          creatorId: transaction.creatorId,
          planId: metadata?.plan_id,
          paystackAuthorizationCode: data.authorization?.authorization_code,
          paystackSubscriptionId: data.subscription?.subscription_code,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      const creatorName = transaction.creator?.displayName || 'Creator';
      const creatorUsername = transaction.creator?.username || '';
      const planName = metadata?.plan_name || 'Subscription';
      const fanEmail = metadata?.subscriber_email || data?.customer?.email || '';
      const nextBillingDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toLocaleDateString();
      queuedEmails.push(
        sendSubscriptionConfirmation({
          fanEmail,
          creatorName,
          creatorUsername,
          planName,
          amount: (transaction.amount || 0) / 100,
          nextBillingDate,
        })
      );

      // Update creator earnings and balance
      if (transaction.amount && transaction.creatorId) {
        const updatedCreator = await tx.creator.update({
          where: { id: transaction.creatorId },
          data: {
            totalEarnings: {
              increment: transaction.amount - (data.fees || 0),
            },
            currentBalance: {
              increment: transaction.amount - (data.fees || 0),
            },
            subscriberCount: {
              increment: 1,
            },
          },
          select: {
            id: true,
            subscriberCount: true,
          },
        });

        if (updatedCreator.subscriberCount === 1) {
          await checkAndLogMilestone(updatedCreator.id, 'first_subscriber');
        }
        if (updatedCreator.subscriberCount === 10) {
          await checkAndLogMilestone(updatedCreator.id, 'ten_subscribers');
        }
        await checkEarned10kMilestone(updatedCreator.id);
      }

      console.log(`Subscription created for user ${transaction.userId} with creator ${transaction.creatorId}`);
    }

    // Handle collection subscriptions
    else if (transaction.type === 'collection_subscription') {
      const metadata = transaction.metadata as any;
      await handleCollectionSubscription(tx, data, transaction, metadata);
    }

    // Handle tutorial purchases
    else if (transaction.type === 'tutorial_purchase') {
      const metadata = transaction.metadata as any;
      await handleTutorialPurchase(tx, data, transaction, metadata);
    }
  });

  await Promise.all(queuedEmails);
}

// Handle transfer (payout) events
async function handleTransferEvent(data: any, event: string) {
  const transferCode = data.transfer_code;

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Find payout by transfer code
    const payout = await tx.payout.findUnique({
      where: { paystackTransferCode: transferCode },
    });

    if (!payout) {
      throw new Error(`Payout not found for transfer code: ${transferCode}`);
    }

    if (event === 'transfer.success') {
      await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'success',
          processedAt: new Date(),
        },
      });
      console.log(`Payout marked as successful: ${transferCode}`);
    } else if (event === 'transfer.failed') {
      await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'failed',
          failureReason: data.reason || 'Transfer failed',
          processedAt: new Date(),
        },
      });
      console.log(`Payout marked as failed: ${transferCode}`);
    }
  });
}

// Handle collection subscription within transaction
async function handleCollectionSubscription(tx: any, data: any, transaction: any, metadata: any) {
  const { collectionId, email, subscriptionType } = metadata;

  // Find or create user by email
  let user = await tx.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    user = await tx.user.create({
      data: {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
      },
    });
  }

  // Create collection subscription
  await tx.collectionSubscription.create({
    data: {
      collectionId,
      email: email.toLowerCase(),
      subscriptionType,
      paymentReference: transaction.reference,
      transactionId: transaction.id,
      status: 'active',
      ...(subscriptionType === 'recurring' && {
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }),
    },
  });

  // Update creator earnings
  if (transaction.amount && transaction.creatorId) {
    await tx.creator.update({
      where: { id: transaction.creatorId },
      data: {
        totalEarnings: {
          increment: transaction.amount - (data.fees || 0),
        },
        currentBalance: {
          increment: transaction.amount - (data.fees || 0),
        },
      },
    });
    await checkEarned10kMilestone(transaction.creatorId);
  }

  console.log(`Collection subscription created: ${collectionId} for ${email}`);
}

// Handle tutorial purchase within transaction
async function handleTutorialPurchase(tx: any, data: any, transaction: any, metadata: any) {
  const { contentId, email } = metadata;

  // Create tutorial purchase
  await tx.tutorialPurchase.create({
    data: {
      contentId,
      email: email.toLowerCase(),
      paymentReference: transaction.reference,
      transactionId: transaction.id,
    },
  });

  const content = await tx.content.findUnique({
    where: { id: contentId },
    select: { title: true, creator: { select: { displayName: true, username: true } } },
  });

  if (content) {
    await sendContentPurchaseEmail({
      email: email.toLowerCase(),
      creatorName: content.creator.displayName,
      contentTitle: content.title,
      amount: (transaction.amount || 0) / 100,
      accessUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/creator/${content.creator.username}/content/${contentId}`,
    });
  }

  // Update content view count
  await tx.content.update({
    where: { id: contentId },
    data: {
      viewCount: { increment: 1 },
    },
  });

  // Update creator earnings
  if (transaction.amount && transaction.creatorId) {
    await tx.creator.update({
      where: { id: transaction.creatorId },
      data: {
        totalEarnings: {
          increment: transaction.amount - (data.fees || 0),
        },
        currentBalance: {
          increment: transaction.amount - (data.fees || 0),
        },
      },
    });
    await checkEarned10kMilestone(transaction.creatorId);
  }

  console.log(`Tutorial purchase created: ${contentId} for ${email}`);
}

// Move failed job to dead letter queue
async function moveToDeadLetter(job: Job<WebhookJobData>) {
  await deadLetterQueue.add(
    'dead-webhook',
    {
      ...job.data,
      failedAt: new Date(),
      error: job.failedReason,
    },
    {
      priority: 0, // Lowest priority for dead letters
    }
  );

  console.log(`Webhook moved to dead letter queue: ${job.data.event}`);
}

// Create and start the worker
export const webhookWorker = new Worker(
  'webhooks',
  processWebhook,
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 5, // Process up to 5 webhooks simultaneously
    limiter: {
      max: 10, // Max 10 jobs per duration
      duration: 1000, // Per second
    },
  }
);

// Event handlers
webhookWorker.on('completed', (job) => {
  console.log(`Webhook job completed: ${job.id}`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`Webhook job failed: ${job?.id}`, err);
});

webhookWorker.on('stalled', (jobId) => {
  console.warn(`Webhook job stalled: ${jobId}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down webhook worker...');
  await webhookWorker.close();
});

process.on('SIGINT', async () => {
  console.log('Shutting down webhook worker...');
  await webhookWorker.close();
});

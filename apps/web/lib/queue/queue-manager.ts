// Redis configuration (optional for Phase 2 testing)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redisConnected = false;
let redis: any = null;
let Queue: any = null;
let QueueScheduler: any = null;

// Dynamically import Redis and BullMQ only if available
// Use a function to avoid top-level await issues during build
async function initializeRedis() {
  try {
    // Check if we're in a build environment - skip Redis initialization
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('⏭️ Skipping Redis initialization during build');
      return;
    }

    // Use dynamic import - Next.js will still analyze these, but we'll catch errors
    // @ts-ignore - Dynamic imports that may not exist at build time
    const redisModule = await import('ioredis');
    // @ts-ignore - Dynamic imports that may not exist at build time
    const bullmqModule = await import('bullmq');

    redis = new redisModule.default(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });

    Queue = bullmqModule.Queue;
    QueueScheduler =
      'QueueScheduler' in bullmqModule ? (bullmqModule as any).QueueScheduler : null;

    // Test connection with timeout
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);

    redisConnected = true;
    console.log('✅ Redis connected for queue system');
  } catch (error: any) {
    console.warn('⚠️ Redis/BullMQ not available, running without queue system:', error?.message || error);
    redis = null;
    Queue = null;
    QueueScheduler = null;
  }
}

// Initialize Redis lazily (only when needed, not at module load)
// This prevents build-time errors
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  initializeRedis().catch(() => {
    // Silently fail during initialization
  });
}

// Queue definitions (lazy initialization)
let _webhookQueue: any = null;
let _deadLetterQueue: any = null;
let _webhookScheduler: any = null;

function getWebhookQueue() {
  if (!_webhookQueue && redisConnected && Queue && redis) {
    _webhookQueue = new Queue('webhooks', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,     // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 seconds initial delay
        },
      },
    });
  }
  return _webhookQueue;
}

function getDeadLetterQueue() {
  if (!_deadLetterQueue && redisConnected && Queue && redis) {
    _deadLetterQueue = new Queue('webhooks:dead', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 0, // Keep all dead letter jobs
        removeOnFail: 0,
      },
    });
  }
  return _deadLetterQueue;
}

function getWebhookScheduler() {
  if (!_webhookScheduler && redisConnected && QueueScheduler && redis) {
    _webhookScheduler = new QueueScheduler('webhooks', {
      connection: redis,
    });
  }
  return _webhookScheduler;
}

export const webhookQueue = getWebhookQueue();
export const deadLetterQueue = getDeadLetterQueue();
export const webhookScheduler = getWebhookScheduler();

// Export all queues for management (only available queues)
export const queues = {
  get webhookQueue() { return getWebhookQueue(); },
  get deadLetterQueue() { return getDeadLetterQueue(); },
  redisConnected,
};

// Cleanup function
export async function closeQueues() {
  if (redisConnected) {
    await getWebhookQueue()?.close();
    await getDeadLetterQueue()?.close();
    await getWebhookScheduler()?.close();
    await redis?.quit();
  }
}

// Using in-memory rate limiting for development
// Redis can be added later for production scaling
console.log('ℹ️ Using in-memory rate limiting (Redis not configured)');
const redis: any = null;

// In-memory fallback for rate limiting when Redis is not available
const inMemoryStore = new Map<string, { requests: number[]; resetTime: number }>();

function cleanupInMemoryStore() {
  const now = Date.now();
  for (const [key, data] of inMemoryStore.entries()) {
    if (data.resetTime < now) {
      inMemoryStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string; // Prefix for Redis keys
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
}

/**
 * Rate limiting middleware for API routes
 */
export class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      keyPrefix: 'rate-limit:',
      ...options,
    };
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `${this.options.keyPrefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    // Use Redis if available, otherwise fallback to in-memory store
    if (redis) {
      try {
        // Use Redis sorted set to track requests within time window
        // Add current request timestamp
        await redis.zadd(key, now, now.toString());

        // Remove requests outside the time window
        await redis.zremrangebyscore(key, 0, windowStart);

        // Count remaining requests in window
        const requestCount = await redis.zcount(key, windowStart, now);

        // Set expiry on the key (cleanup)
        await redis.expire(key, Math.ceil(this.options.windowMs / 1000) + 60);

        const remaining = Math.max(0, this.options.maxRequests - requestCount);
        const allowed = requestCount <= this.options.maxRequests;

        return {
          allowed,
          remaining: allowed ? remaining - 1 : remaining,
          resetTime: now + this.options.windowMs,
          totalRequests: requestCount,
        };
      } catch (error) {
        console.error('Redis rate limiting error, falling back to in-memory:', error);
        // Fall through to in-memory implementation
      }
    }

    // In-memory fallback implementation
    try {
      cleanupInMemoryStore();

      let data = inMemoryStore.get(key);
      if (!data || data.resetTime < now) {
        data = { requests: [], resetTime: now + this.options.windowMs };
        inMemoryStore.set(key, data);
      }

      // Remove old requests outside the window
      data.requests = data.requests.filter(timestamp => timestamp > windowStart);

      // Add current request
      data.requests.push(now);

      const requestCount = data.requests.length;
      const remaining = Math.max(0, this.options.maxRequests - requestCount);
      const allowed = requestCount <= this.options.maxRequests;

      return {
        allowed,
        remaining: allowed ? remaining - 1 : remaining,
        resetTime: data.resetTime,
        totalRequests: requestCount,
      };
    } catch (error) {
      console.error('Rate limiting fallback error:', error);
      // On error, allow request to prevent blocking legitimate users
      return {
        allowed: true,
        remaining: this.options.maxRequests - 1,
        resetTime: now + this.options.windowMs,
        totalRequests: 1,
      };
    }
  }

  /**
   * Get rate limit headers for response
   */
  getHeaders(result: RateLimitResult) {
    return {
      'X-RateLimit-Limit': this.options.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
      'X-RateLimit-Used': result.totalRequests.toString(),
    };
  }
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // Strict limits for sensitive operations
  strict: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    keyPrefix: 'rate-limit:strict:',
  }),

  // Standard API limits
  standard: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyPrefix: 'rate-limit:standard:',
  }),

  // Generous limits for content consumption
  generous: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120, // 120 requests per minute
    keyPrefix: 'rate-limit:generous:',
  }),

  // Very strict limits for authentication
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    keyPrefix: 'rate-limit:auth:',
  }),

  // File upload limits (expensive operations)
  upload: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 uploads per hour
    keyPrefix: 'rate-limit:upload:',
  }),
};

/**
 * Middleware function for rate limiting
 */
export async function withRateLimit(
  request: Request,
  limiter: RateLimiter,
  getIdentifier?: (request: Request) => string
): Promise<{ allowed: boolean; headers: Record<string, string>; result: RateLimitResult }> {
  // Default identifier: IP address
  const identifier = getIdentifier
    ? getIdentifier(request)
    : getClientIP(request);

  const result = await limiter.checkLimit(identifier);
  const headers = limiter.getHeaders(result);

  return {
    allowed: result.allowed,
    headers,
    result,
  };
}

/**
 * Extract client IP from request
 */
function getClientIP(request: Request): string {
  // Check common headers for client IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Take first IP if multiple (comma-separated)
      return value.split(',')[0].trim();
    }
  }

  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Clean up old rate limit keys (maintenance function)
 */
export async function cleanupRateLimitKeys(): Promise<void> {
  try {
    if (redis) {
      // Redis cleanup
      const keys = await redis.keys('rate-limit:*');
      console.log(`Found ${keys.length} rate limit keys for cleanup`);

      // Remove keys that haven't been accessed recently
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) { // Key has no expiry
          await redis.expire(key, 24 * 60 * 60); // Set 24 hour expiry
        }
      }
    } else {
      // In-memory cleanup
      cleanupInMemoryStore();
      console.log(`In-memory rate limit cleanup completed`);
    }
  } catch (error) {
    console.error('Rate limit cleanup error:', error);
  }
}

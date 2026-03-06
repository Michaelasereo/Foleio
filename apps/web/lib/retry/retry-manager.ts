export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // in milliseconds
  maxDelay?: number; // in milliseconds
  backoffMultiplier?: number;
  jitter?: boolean; // Add randomness to delay
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time before attempting to close circuit (ms)
  monitoringPeriod: number; // Time window to count failures (ms)
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

/**
 * Advanced retry manager with circuit breaker and exponential backoff
 */
export class RetryManager {
  private circuitStates = new Map<string, CircuitState>();

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
    circuitKey?: string
  ): Promise<RetryResult<T>> {
    const config = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: this.defaultRetryCondition,
      onRetry: () => {},
      ...options,
    };

    let lastError: Error | null = null;
    let attempts = 0;
    let totalDelay = 0;

    // Check circuit breaker
    if (circuitKey && this.isCircuitOpen(circuitKey)) {
      return {
        success: false,
        error: new Error('Circuit breaker is open'),
        attempts: 0,
        totalDelay: 0,
      };
    }

    while (attempts < config.maxAttempts) {
      try {
        const result = await operation();

        // Record success in circuit breaker
        if (circuitKey) {
          this.recordSuccess(circuitKey);
        }

        return {
          success: true,
          data: result,
          attempts: attempts + 1,
          totalDelay,
        };
      } catch (error) {
        lastError = error as Error;
        attempts++;

        // Record failure in circuit breaker
        if (circuitKey) {
          this.recordFailure(circuitKey);
        }

        // Check if we should retry
        if (attempts >= config.maxAttempts || !config.retryCondition(lastError, attempts)) {
          break;
        }

        // Calculate delay with exponential backoff
        const baseDelay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempts - 1),
          config.maxDelay
        );

        const delay = config.jitter
          ? baseDelay * (0.5 + Math.random() * 0.5) // Add 50% jitter
          : baseDelay;

        totalDelay += delay;

        // Notify about retry
        config.onRetry(lastError, attempts, delay);

        // Wait before retry
        await this.delay(delay);
      }
    }

    return {
      success: false,
      error: lastError ?? new Error('Operation failed without a captured error'),
      attempts,
      totalDelay,
    };
  }

  /**
   * Execute with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitKey: string,
    retryOptions: RetryOptions = {},
    circuitOptions: CircuitBreakerOptions = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
    }
  ): Promise<RetryResult<T>> {
    if (this.isCircuitOpen(circuitKey)) {
      return {
        success: false,
        error: new Error('Circuit breaker is open - service temporarily unavailable'),
        attempts: 0,
        totalDelay: 0,
      };
    }

    const result = await this.execute(operation, retryOptions, circuitKey);

    // Circuit breaker logic is handled in the execute method
    return result;
  }

  /**
   * Default retry condition - retry on network errors and 5xx status codes
   */
  private defaultRetryCondition(error: Error, attempt: number): boolean {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('fetch') ||
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection')) {
      return true;
    }

    // Server errors (5xx)
    if (message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')) {
      return true;
    }

    // Rate limiting (429)
    if (message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('too many requests')) {
      return attempt < 2; // Only retry once for rate limits
    }

    // Don't retry client errors (4xx) except for specific cases
    if (message.includes('400') ||
        message.includes('401') ||
        message.includes('403') ||
        message.includes('404')) {
      return false;
    }

    // Retry other errors by default
    return true;
  }

  /**
   * Circuit breaker state management
   */
  private getCircuitState(key: string): CircuitState {
    if (!this.circuitStates.has(key)) {
      this.circuitStates.set(key, {
        failures: 0,
        lastFailureTime: 0,
        state: 'closed',
        nextAttemptTime: 0,
      });
    }
    return this.circuitStates.get(key)!;
  }

  private isCircuitOpen(key: string): boolean {
    const state = this.getCircuitState(key);
    const now = Date.now();

    if (state.state === 'open') {
      if (now >= state.nextAttemptTime) {
        // Try to close the circuit
        state.state = 'half-open';
        state.failures = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private recordSuccess(key: string): void {
    const state = this.getCircuitState(key);
    state.failures = 0;
    state.state = 'closed';
  }

  private recordFailure(key: string): void {
    const state = this.getCircuitState(key);
    const now = Date.now();

    state.failures++;
    state.lastFailureTime = now;

    // Default circuit breaker settings (can be made configurable)
    const failureThreshold = 5;
    const recoveryTimeout = 60000;

    if (state.failures >= failureThreshold) {
      state.state = 'open';
      state.nextAttemptTime = now + recoveryTimeout;
      console.warn(`Circuit breaker opened for ${key} due to ${state.failures} failures`);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttemptTime: number;
}

/**
 * Pre-configured retry managers for different services
 */
export const retryManagers = {
  // For critical payment operations
  payments: new RetryManager(),

  // For file uploads (expensive operations)
  uploads: new RetryManager(),

  // For general API calls
  api: new RetryManager(),

  // For external service integrations
  external: new RetryManager(),
};

/**
 * Convenience functions for common retry scenarios
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  const result = await retryManagers.api.execute(operation, {
    maxAttempts,
    initialDelay,
  });

  if (!result.success) {
    throw result.error || new Error('Operation failed after retries');
  }

  return result.data!;
}

export async function retryPaymentOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'payment'
): Promise<T> {
  const result = await retryManagers.payments.execute(
    operation,
    {
      maxAttempts: 3,
      initialDelay: 2000,
      onRetry: (error, attempt, delay) => {
        console.warn(`${operationName} failed (attempt ${attempt}), retrying in ${delay}ms:`, error.message);
      },
    },
    `payment-${operationName}` // Circuit breaker key
  );

  if (!result.success) {
    throw result.error || new Error(`${operationName} failed after retries`);
  }

  return result.data!;
}

export async function retryUploadOperation<T>(
  operation: () => Promise<T>,
  fileName: string
): Promise<T> {
  const result = await retryManagers.uploads.execute(
    operation,
    {
      maxAttempts: 5, // More retries for uploads
      initialDelay: 1000,
      maxDelay: 10000,
      onRetry: (error, attempt, delay) => {
        console.warn(`Upload failed for ${fileName} (attempt ${attempt}), retrying in ${delay}ms:`, error.message);
      },
    },
    `upload-${fileName}` // Circuit breaker per file type
  );

  if (!result.success) {
    throw result.error || new Error(`Upload failed for ${fileName} after retries`);
  }

  return result.data!;
}

/**
 * React hook for retry operations
 */
export function useRetry() {
  const executeWithRetry = async <T,>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<RetryResult<T>> => {
    return retryManagers.api.execute(operation, options);
  };

  const executePaymentWithRetry = async <T,>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    return retryPaymentOperation(operation, operationName);
  };

  const executeUploadWithRetry = async <T,>(
    operation: () => Promise<T>,
    fileName: string
  ): Promise<T> => {
    return retryUploadOperation(operation, fileName);
  };

  return {
    executeWithRetry,
    executePaymentWithRetry,
    executeUploadWithRetry,
  };
}

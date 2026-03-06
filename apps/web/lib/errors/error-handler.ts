export interface ErrorContext {
  operation: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'validation' | 'payment' | 'auth' | 'upload' | 'server' | 'unknown';
}

/**
 * Error handler that converts technical errors into user-friendly messages
 */
export class ErrorHandler {
  private static errorPatterns = {
    // Network errors
    'Failed to fetch': {
      title: 'Connection Problem',
      message: 'Unable to connect to our servers. Please check your internet connection.',
      category: 'network' as const,
      severity: 'medium' as const,
      recovery: 'Check your internet connection and try again.',
    },
    'NetworkError': {
      title: 'Network Error',
      message: 'Your internet connection seems unstable.',
      category: 'network' as const,
      severity: 'medium' as const,
      recovery: 'Wait a moment and try again.',
    },

    // Authentication errors
    'Unauthorized': {
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again.',
      category: 'auth' as const,
      severity: 'high' as const,
      recovery: 'Sign in again to continue.',
    },
    'Session expired': {
      title: 'Session Expired',
      message: 'Your session has expired for security reasons.',
      category: 'auth' as const,
      severity: 'medium' as const,
      recovery: 'Please refresh the page and sign in again.',
    },

    // Payment errors
    'Insufficient balance': {
      title: 'Insufficient Balance',
      message: 'You don\'t have enough funds for this payout.',
      category: 'payment' as const,
      severity: 'medium' as const,
      recovery: 'Check your available balance and try a smaller amount.',
    },
    'Payment verification failed': {
      title: 'Payment Verification Issue',
      message: 'We\'re having trouble verifying your payment.',
      category: 'payment' as const,
      severity: 'high' as const,
      recovery: 'Please contact support if the issue persists.',
    },
    'Rate limit exceeded': {
      title: 'Too Many Requests',
      message: 'You\'ve made too many requests. Please wait before trying again.',
      category: 'payment' as const,
      severity: 'low' as const,
      recovery: 'Wait a few minutes before trying again.',
    },

    // Upload errors
    'Failed to upload': {
      title: 'Upload Failed',
      message: 'Your file couldn\'t be uploaded.',
      category: 'upload' as const,
      severity: 'medium' as const,
      recovery: 'Check file size and format, then try again.',
    },
    'File too large': {
      title: 'File Too Large',
      message: 'Your file exceeds the maximum allowed size.',
      category: 'upload' as const,
      severity: 'low' as const,
      recovery: 'Choose a smaller file or compress it.',
    },

    // Validation errors
    'Required': {
      title: 'Required Information',
      message: 'Please fill in all required fields.',
      category: 'validation' as const,
      severity: 'low' as const,
      recovery: 'Complete all required fields marked with *.',
    },
    'Invalid email': {
      title: 'Invalid Email',
      message: 'Please enter a valid email address.',
      category: 'validation' as const,
      severity: 'low' as const,
      recovery: 'Check your email format and try again.',
    },

    // Server errors
    'Internal server error': {
      title: 'Server Issue',
      message: 'We\'re experiencing technical difficulties.',
      category: 'server' as const,
      severity: 'high' as const,
      recovery: 'Try again in a few minutes. Contact support if it persists.',
    },
    'Service unavailable': {
      title: 'Service Temporarily Unavailable',
      message: 'This service is temporarily unavailable.',
      category: 'server' as const,
      severity: 'high' as const,
      recovery: 'Please try again later.',
    },
  };

  /**
   * Convert any error into a user-friendly format
   */
  static toUserFriendly(error: any, context?: ErrorContext): UserFriendlyError {
    const errorMessage = this.extractErrorMessage(error);
    const matchedPattern = this.findMatchingPattern(errorMessage);

    if (matchedPattern) {
      return {
        title: matchedPattern.title,
        message: matchedPattern.message,
        severity: matchedPattern.severity,
        category: matchedPattern.category,
      };
    }

    // Generic fallback based on context
    if (context?.operation) {
      return this.getContextualError(errorMessage, context);
    }

    // Ultimate fallback
    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
      severity: 'medium',
      category: 'unknown',
    };
  }

  /**
   * Extract error message from various error types
   */
  private static extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error && typeof error === 'object') {
      try {
        const serialized = JSON.stringify(error);
        if (serialized && serialized !== '{}') {
          return serialized;
        }
      } catch {
        // ignore serialization issues and fall through to unknown error
      }
    }
    return 'Unknown error';
  }

  /**
   * Find matching error pattern
   */
  private static findMatchingPattern(message: string): any {
    const lowerMessage = message.toLowerCase();

    for (const [pattern, config] of Object.entries(this.errorPatterns)) {
      if (lowerMessage.includes(pattern.toLowerCase())) {
        return config;
      }
    }

    return null;
  }

  /**
   * Get contextual error based on operation
   */
  private static getContextualError(message: string, context: ErrorContext): UserFriendlyError {
    const { operation } = context;

    switch (operation) {
      case 'payment':
        return {
          title: 'Payment Issue',
          message: 'There was a problem processing your payment.',
          severity: 'high',
          category: 'payment',
        };

      case 'upload':
        return {
          title: 'Upload Issue',
          message: 'There was a problem uploading your file.',
          severity: 'medium',
          category: 'upload',
        };

      case 'booking':
        return {
          title: 'Booking Issue',
          message: 'There was a problem creating your booking.',
          severity: 'medium',
          category: 'server',
        };

      case 'onboarding':
        return {
          title: 'Setup Issue',
          message: 'There was a problem setting up your account.',
          severity: 'high',
          category: 'server',
        };

      default:
        return {
          title: 'Operation Failed',
          message: `There was a problem with ${operation}.`,
          severity: 'medium',
          category: 'server',
        };
    }
  }

  /**
   * Create error with recovery action
   */
  static withRecoveryAction(
    error: any,
    action: { label: string; onClick: () => void },
    context?: ErrorContext
  ): UserFriendlyError {
    const userFriendlyError = this.toUserFriendly(error, context);
    return {
      ...userFriendlyError,
      action,
    };
  }
}

/**
 * React hook for error handling
 */
export function useErrorHandler() {
  const handleError = (error: any, context?: ErrorContext) => {
    const userFriendlyError = ErrorHandler.toUserFriendly(error, context);
    const originalErrorForLog =
      typeof error === 'object' && error !== null
        ? (() => {
            try {
              const serialized = JSON.stringify(error);
              return serialized === '{}' ? 'Unknown error payload' : error;
            } catch {
              return 'Unknown error payload';
            }
          })()
        : error;

    // Log to monitoring service (Sentry, etc.)
    console.error('User Error:', {
      originalError: originalErrorForLog,
      resolvedMessage: userFriendlyError.message,
      userFriendly: userFriendlyError,
      context,
      timestamp: new Date().toISOString(),
    });

    return userFriendlyError;
  };

  const handleErrorWithRetry = (
    error: any,
    retryFn: () => void,
    context?: ErrorContext
  ) => {
    return ErrorHandler.withRecoveryAction(
      error,
      {
        label: 'Try Again',
        onClick: retryFn,
      },
      context
    );
  };

  return {
    handleError,
    handleErrorWithRetry,
  };
}

/**
 * Error boundary helper for React components
 */
export function createErrorFallback(
  error: Error,
  retry?: () => void
): {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
} {
  const userFriendlyError = ErrorHandler.toUserFriendly(error);

  return {
    title: userFriendlyError.title,
    message: userFriendlyError.message,
    action: retry ? {
      label: 'Try Again',
      onClick: retry,
    } : undefined,
  };
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const error = ErrorHandler.toUserFriendly(event.reason);
      console.error('Unhandled Promise Rejection:', error);

      // Could send to monitoring service
      // Could show user notification
    });

    window.addEventListener('error', (event) => {
      const error = ErrorHandler.toUserFriendly(event.error || event.message);
      console.error('Unhandled Error:', error);

      // Could send to monitoring service
      // Could show user notification
    });
  }
}

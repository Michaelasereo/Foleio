import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export interface SessionValidationResult {
  isValid: boolean;
  session: any | null;
  user: any | null;
  error?: string;
  redirectTo?: string;
}

/**
 * Validate user session and return session data
 */
export async function validateSession(): Promise<SessionValidationResult> {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session validation error:', error);
      return {
        isValid: false,
        session: null,
        user: null,
        error: 'Session validation failed',
        redirectTo: '/login',
      };
    }

    if (!session) {
      return {
        isValid: false,
        session: null,
        user: null,
        error: 'No active session',
        redirectTo: '/login',
      };
    }

    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at! * 1000);

    if (now > expiresAt) {
      console.warn('Session expired for user:', session.user.id);
      return {
        isValid: false,
        session: null,
        user: null,
        error: 'Session expired',
        redirectTo: '/login',
      };
    }

    // Validate user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isCreator: true,
        emailVerified: true,
      },
    });

    if (!user) {
      console.error('User not found in database:', session.user.id);
      return {
        isValid: false,
        session: null,
        user: null,
        error: 'User account not found',
        redirectTo: '/login',
      };
    }

    return {
      isValid: true,
      session,
      user,
    };
  } catch (error) {
    console.error('Session validation exception:', error);
    return {
      isValid: false,
      session: null,
      user: null,
      error: 'Session validation error',
      redirectTo: '/login',
    };
  }
}

/**
 * Validate creator session (user must be a creator)
 */
export async function validateCreatorSession(): Promise<SessionValidationResult> {
  const sessionResult = await validateSession();

  if (!sessionResult.isValid) {
    return sessionResult;
  }

  if (!sessionResult.user?.isCreator) {
    return {
      isValid: false,
      session: sessionResult.session,
      user: sessionResult.user,
      error: 'Creator access required',
      redirectTo: '/onboard',
    };
  }

  return sessionResult;
}

/**
 * Middleware helper for API routes
 */
export async function withSessionValidation(
  request: NextRequest,
  handler: (session: any, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  const sessionResult = await validateSession();

  if (!sessionResult.isValid) {
    return NextResponse.json(
      { error: sessionResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  return handler(sessionResult.session, sessionResult.user);
}

/**
 * Middleware helper for creator-only API routes
 */
export async function withCreatorSessionValidation(
  request: NextRequest,
  handler: (session: any, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  const sessionResult = await validateCreatorSession();

  if (!sessionResult.isValid) {
    const statusCode = sessionResult.redirectTo === '/onboard' ? 403 : 401;
    return NextResponse.json(
      { error: sessionResult.error || 'Unauthorized' },
      { status: statusCode }
    );
  }

  return handler(sessionResult.session, sessionResult.user);
}

/**
 * Check if current path requires authentication
 */
export function requiresAuth(pathname: string): boolean {
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/creator/',
    '/tracking/',
    '/payment/callback',
  ];

  // Check if path starts with any public path
  return !publicPaths.some(publicPath =>
    pathname === publicPath || pathname.startsWith(publicPath)
  );
}

/**
 * Check if current path requires creator access
 */
export function requiresCreatorAccess(pathname: string): boolean {
  const creatorPaths = [
    '/dashboard',
    '/analytics',
    '/content',
    '/collections',
    '/bookings',
    '/earnings',
    '/payouts',
    '/settings',
    '/price-list',
    '/api/upload/',
    '/api/creator/',
    '/api/bookings/',
    '/api/payments/',
    '/api/analytics/',
    '/api/admin/',
  ];

  return creatorPaths.some(creatorPath => pathname.startsWith(creatorPath));
}

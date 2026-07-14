import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Public creator deep links that belong to content monetization (MVP-hidden). */
function isHiddenPublicCreatorDeepLink(pathname: string) {
  // /creator/[username]/content|collections|journal|tutorials[...]
  return /^\/creator\/[^/]+\/(content|collections|journal|tutorials)(\/|$)/.test(
    pathname
  );
}

function creatorUsernameFromPath(pathname: string) {
  const match = pathname.match(/^\/creator\/([^/]+)/);
  return match?.[1] ?? null;
}

export async function middleware(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return supabaseResponse;
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isOnboardingRoute =
      pathname.startsWith('/onboarding') || pathname.startsWith('/onboard');
    const creatorProtectedPrefixes = [
      '/dashboard',
      '/analytics',
      '/content',
      '/collections',
      '/bookings',
      '/availability',
      '/price-list',
      '/payouts',
      '/earnings',
      '/settings',
    ];
    const isCreatorProtectedRoute = creatorProtectedPrefixes.some((prefix) =>
      matchesPrefix(pathname, prefix)
    );

    // MVP scope: hide content-monetization and marketplace surfaces.
    // /price-list is intentionally NOT hidden (FR-3.1 services & pricing).
    const sprintHiddenPrefixes = [
      '/content',
      '/collections',
      '/journal',
      '/services',
      '/billing',
      '/dashboard/content',
      '/dashboard/collections',
      '/fan',
      '/creators',
      '/subscriptions',
      '/shop',
    ];
    const isSprintHiddenRoute = sprintHiddenPrefixes.some((prefix) =>
      matchesPrefix(pathname, prefix)
    );

    const copyCookies = (response: NextResponse) => {
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie);
      });
      return response;
    };

    if (isHiddenPublicCreatorDeepLink(pathname)) {
      const username = creatorUsernameFromPath(pathname);
      const target = username ? `/creator/${username}` : '/';
      return copyCookies(NextResponse.redirect(new URL(target, request.url)));
    }

    if (isSprintHiddenRoute) {
      // Public/marketplace/fan routes → home; creator-tool routes → dashboard when authed.
      const isPublicHide =
        matchesPrefix(pathname, '/fan') ||
        matchesPrefix(pathname, '/creators') ||
        matchesPrefix(pathname, '/subscriptions') ||
        matchesPrefix(pathname, '/shop');

      if (matchesPrefix(pathname, '/billing')) {
        return copyCookies(
          NextResponse.redirect(new URL('/settings?tab=billing', request.url))
        );
      }

      if (isPublicHide) {
        return copyCookies(NextResponse.redirect(new URL('/', request.url)));
      }

      if (!user) {
        return copyCookies(NextResponse.redirect(new URL('/login', request.url)));
      }
      return copyCookies(NextResponse.redirect(new URL('/dashboard', request.url)));
    }

    if (isOnboardingRoute || isCreatorProtectedRoute) {
      const isOnboardingPreview =
        isOnboardingRoute && request.nextUrl.searchParams.get('preview') === '1';

      if (!user && !isOnboardingPreview) {
        const loginUrl = new URL('/login', request.url);
        return copyCookies(NextResponse.redirect(loginUrl));
      }

      // Auth only here. Do NOT fetch /api/auth/onboarding-status — that nested
      // request contended for the same Prisma pool (limit 1) and made login hang
      // for 30–70s. Onboarding gating happens in page/layout server code.
      return supabaseResponse;
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next({
      request,
    });
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analytics/:path*',
    '/(creator)/:path*',
    '/content/:path*',
    '/collections/:path*',
    '/journal/:path*',
    '/services/:path*',
    '/billing/:path*',
    '/bookings/:path*',
    '/availability/:path*',
    '/price-list/:path*',
    '/payouts/:path*',
    '/earnings/:path*',
    '/settings/:path*',
    '/onboard/:path*',
    '/onboarding/:path*',
    '/fan/:path*',
    '/creators/:path*',
    '/subscriptions/:path*',
    '/shop/:path*',
    '/creator/:path*',
    '/admin/:path*',
  ],
};

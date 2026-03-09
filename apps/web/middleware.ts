import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
    const isCreatorProtectedRoute = creatorProtectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    const copyCookies = (response: NextResponse) => {
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie);
      });
      return response;
    };

    if (isOnboardingRoute || isCreatorProtectedRoute) {
      if (!user) {
        const loginUrl = new URL('/login', request.url);
        return copyCookies(NextResponse.redirect(loginUrl));
      }

      const statusResponse = await fetch(
        new URL('/api/auth/onboarding-status', request.url),
        {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = (await statusResponse.json()) as {
          hasCompletedOnboarding?: boolean;
        };
        const hasCompletedOnboarding = Boolean(statusData.hasCompletedOnboarding);

        if (isOnboardingRoute && hasCompletedOnboarding) {
          return copyCookies(NextResponse.redirect(new URL('/dashboard', request.url)));
        }

        if (isCreatorProtectedRoute && !hasCompletedOnboarding) {
          return copyCookies(NextResponse.redirect(new URL('/onboarding', request.url)));
        }
      }
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
    '/bookings/:path*',
    '/availability/:path*',
    '/price-list/:path*',
    '/payouts/:path*',
    '/earnings/:path*',
    '/settings/:path*',
    '/onboard/:path*',
    '/onboarding/:path*',
    '/(fan)/:path*',
    '/admin/:path*',
  ],
};


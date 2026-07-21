import type { MetadataRoute } from 'next';

function appBaseUrl(): string {
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)) {
    return envAppUrl.replace(/\/+$/, '');
  }
  return 'https://foleio.com';
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = appBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/creators',
          '/creator/',
          '/legal/',
          '/product/',
          '/pricing',
          '/llms.txt',
        ],
        disallow: [
          '/dashboard',
          '/settings',
          '/admin',
          '/api/',
          '/onboard',
          '/onboarding',
          '/fan/',
          '/login',
          '/signup',
          '/forgot-password',
          '/tracking/',
          '/shop/',
          '/earnings',
          '/analytics',
          '/bookings',
          '/invite/',
          '/payment/',
          '/test',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

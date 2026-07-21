import type { MetadataRoute } from 'next';
import { prisma } from '@foleio/database';
import { discoverableCreatorsWhere } from '@/lib/creator/discoverability';

function appBaseUrl(): string {
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)) {
    return envAppUrl.replace(/\/+$/, '');
  }
  return 'https://foleio.com';
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = appBaseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/creators`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/product/link`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/product/shop`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/product/bookings`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/data-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/creator-agreement`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  let creatorEntries: MetadataRoute.Sitemap = [];
  try {
    const creators = await prisma.creator.findMany({
      where: discoverableCreatorsWhere(),
      select: { username: true, updatedAt: true },
      orderBy: { subscriberCount: 'desc' },
      take: 5000,
    });
    creatorEntries = creators.map((creator) => ({
      url: `${baseUrl}/creator/${creator.username}`,
      lastModified: creator.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('[sitemap] failed to load discoverable creators:', error);
  }

  return [...staticEntries, ...creatorEntries];
}

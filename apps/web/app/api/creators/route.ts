import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { discoverableCreatorsWhere } from '@/lib/creator/discoverability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATEGORY_ORDER = ['makeup', 'hair', 'photography', 'fashion', 'fitness'];

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cityFromLocation(location: string) {
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] || location.trim();
  return last.replace(/\b(nigeria|ng)\b/gi, '').trim() || last;
}

function formatNairaFromKobo(kobo: number) {
  return `₦${Math.round(kobo / 100).toLocaleString('en-NG')}`;
}

function offerLine(input: {
  minBookingPrice: number | null;
  minShopPrice: number | null;
  hasShop: boolean;
  serviceLabel: string | null;
}) {
  const parts: string[] = [];
  if (input.minBookingPrice) {
    parts.push(`Bookings from ${formatNairaFromKobo(input.minBookingPrice)}`);
  }
  if (input.hasShop) {
    parts.push(
      input.minBookingPrice
        ? 'Shop'
        : input.minShopPrice
          ? `Shop from ${formatNairaFromKobo(input.minShopPrice)}`
          : 'Shop'
    );
  }
  if (!input.minBookingPrice && input.serviceLabel) {
    parts.push(input.serviceLabel);
  }
  return parts.join(' · ');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(24, Math.max(1, parseInt(searchParams.get('limit') || '12', 10) || 12));
    const offset = (page - 1) * limit;

    const searchFilter = search
      ? {
          OR: [
            { displayName: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } },
            { bio: { contains: search, mode: 'insensitive' as const } },
            { category: { contains: search, mode: 'insensitive' as const } },
            {
              priceListItems: {
                some: {
                  isActive: true,
                  location: { contains: search, mode: 'insensitive' as const },
                },
              },
            },
          ],
        }
      : undefined;

    const facetWhere = discoverableCreatorsWhere(searchFilter);
    const where = discoverableCreatorsWhere({
      ...(category && category !== 'all' ? { category } : {}),
      ...(searchFilter ?? {}),
    });

    const [creators, totalCount, listedTotal, categoryGroups, locationRows] = await Promise.all([
      prisma.creator.findMany({
        where,
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          category: true,
          avatarUrl: true,
          bannerUrl: true,
          instagramHandle: true,
          tiktokHandle: true,
          subscriberCount: true,
          contentCount: true,
          createdAt: true,
          shopEnabled: true,
          fixedBookingsEnabled: true,
          creatorPlans: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              price: true,
              features: true,
            },
            orderBy: { price: 'asc' },
            take: 1,
          },
          content: {
            where: {
              isPublished: true,
              type: 'video',
            },
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              type: true,
              viewCount: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          priceListItems: {
            where: { isActive: true },
            select: {
              price: true,
              location: true,
              category: true,
              name: true,
              pricingType: true,
            },
            orderBy: { price: 'asc' },
            take: 6,
          },
          products: {
            where: { status: 'active' },
            select: { price: true, imageUrl: true, name: true },
            orderBy: { price: 'asc' },
            take: 3,
          },
          portfolioItems: {
            where: { isActive: true },
            select: { imageUrl: true, thumbnailUrl: true },
            orderBy: { orderIndex: 'asc' },
            take: 3,
          },
        },
        orderBy: [{ subscriberCount: 'desc' }, { displayName: 'asc' }],
        skip: offset,
        take: limit,
      }),
      prisma.creator.count({ where }),
      prisma.creator.count({ where: discoverableCreatorsWhere() }),
      prisma.creator.groupBy({
        by: ['category'],
        where: facetWhere,
        _count: { _all: true },
      }),
      prisma.priceListItem.findMany({
        where: {
          isActive: true,
          location: { not: null },
          creator: where,
        },
        select: { location: true },
        distinct: ['location'],
        take: 40,
      }),
    ]);

    const serializedCreators = creators.map((creator) => {
      const fixedPrices = creator.priceListItems
        .filter((item) => item.pricingType !== 'quote' && item.price > 0)
        .map((item) => item.price);
      const minBookingPrice =
        creator.fixedBookingsEnabled && fixedPrices.length > 0 ? Math.min(...fixedPrices) : null;
      const shopPrices = creator.products.filter((item) => item.price > 0).map((item) => item.price);
      const minShopPrice =
        creator.shopEnabled && shopPrices.length > 0 ? Math.min(...shopPrices) : null;
      const location =
        creator.priceListItems.find((item) => item.location?.trim())?.location?.trim() || null;
      const serviceLabel =
        creator.priceListItems
          .map((item) => item.category?.trim() || item.name?.trim() || '')
          .find((label) => label && label.length <= 22 && label.toLowerCase() !== creator.category) ||
        null;
      const coverImages = [
        ...creator.portfolioItems.map((item) => item.thumbnailUrl || item.imageUrl),
        ...creator.products.map((item) => item.imageUrl),
      ].filter((src): src is string => Boolean(src));
      if (coverImages.length === 0 && creator.bannerUrl) coverImages.push(creator.bannerUrl);

      return {
        id: creator.id,
        username: creator.username,
        displayName: creator.displayName,
        bio: creator.bio,
        category: creator.category,
        avatarUrl: creator.avatarUrl,
        bannerUrl: creator.bannerUrl,
        instagramHandle: creator.instagramHandle,
        tiktokHandle: creator.tiktokHandle,
        subscriberCount: creator.subscriberCount,
        contentCount: creator.contentCount,
        createdAt: creator.createdAt.toISOString(),
        location,
        coverImages: coverImages.slice(0, 3),
        offer: offerLine({
          minBookingPrice,
          minShopPrice,
          hasShop: creator.shopEnabled && creator.products.length > 0,
          serviceLabel,
        }),
        pricing:
          creator.creatorPlans.length > 0
            ? {
                planName: creator.creatorPlans[0].name,
                price: creator.creatorPlans[0].price,
                features: creator.creatorPlans[0].features,
              }
            : null,
        recentContent: creator.content.map((content) => ({
          id: content.id,
          title: content.title,
          thumbnailUrl: content.thumbnailUrl,
          type: content.type,
          viewCount: content.viewCount,
        })),
      };
    });

    const counts = new Map(
      categoryGroups.map((group) => [group.category, group._count._all])
    );
    const known = new Set(CATEGORY_ORDER);
    const ordered = [
      ...CATEGORY_ORDER.filter((value) => (counts.get(value) || 0) > 0),
      ...[...counts.keys()].filter((value) => !known.has(value) && (counts.get(value) || 0) > 0),
    ];
    const categories = ordered.map((value) => ({
      value,
      label: titleCase(value),
      count: counts.get(value) || 0,
    }));

    const cities: string[] = [];
    for (const row of locationRows) {
      const city = cityFromLocation(row.location || '');
      if (city && !cities.some((existing) => existing.toLowerCase() === city.toLowerCase())) {
        cities.push(city);
      }
    }

    return NextResponse.json({
      creators: serializedCreators,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.max(1, Math.ceil(totalCount / limit)),
      },
      facets: {
        listedTotal,
        total: [...counts.values()].reduce((sum, count) => sum + count, 0),
        categories,
        cities,
      },
    });
  } catch (error: unknown) {
    console.error('Creators fetch error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch creators', details: message },
      { status: 500 }
    );
  }
}

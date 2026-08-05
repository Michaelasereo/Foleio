import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { revalidatePublicCreator } from '@/lib/creator/revalidate-public';
import { getEffectiveCreatorPlanLimits } from '@/lib/billing/effective-plan-limits';
import {
  isBelowMinPayableKobo,
  MIN_PAYABLE_PRICE_ERROR,
} from '@/lib/payments/min-amount';
import { nairaInputToKobo } from '@/lib/shop/money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BULK_PRODUCTS = 15;

const toKobo = nairaInputToKobo;

async function getCreatorSession() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return prisma.creator.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      username: true,
      platformPlan: true,
      platformSubscriptionActive: true,
    },
  });
}

type BulkProductInput = {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  stock?: unknown;
  weight?: unknown;
};

function normalizeRow(raw: BulkProductInput, index: number) {
  const name = String(raw?.name || '').trim();
  const description = raw?.description ? String(raw.description).trim() : null;
  const price = toKobo(raw?.price);
  const stockRaw = raw?.stock;
  const stock =
    stockRaw === '' || stockRaw === null || stockRaw === undefined
      ? null
      : Math.floor(Number(stockRaw));
  const weightRaw = raw?.weight;
  const weight =
    weightRaw === '' || weightRaw === null || weightRaw === undefined
      ? null
      : Number(weightRaw);

  if (!name) {
    return { index, error: 'Product name is required' as const };
  }
  if (isBelowMinPayableKobo(price)) {
    return { index, error: MIN_PAYABLE_PRICE_ERROR };
  }
  if (stock === null || !Number.isFinite(stock) || stock < 0) {
    return { index, error: 'Stock is required and must be 0 or more' as const };
  }
  if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
    return { index, error: 'Weight must be a valid number' as const };
  }

  return {
    index,
    data: {
      name,
      description: description || null,
      price,
      stock,
      weight,
    },
  };
}

export async function POST(request: Request) {
  try {
    const creator = await getCreatorSession();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const productsInput = Array.isArray(body?.products) ? body.products : null;
    if (!productsInput) {
      return NextResponse.json({ error: 'products array is required' }, { status: 400 });
    }
    if (productsInput.length === 0) {
      return NextResponse.json({ error: 'No products to import' }, { status: 400 });
    }
    if (productsInput.length > MAX_BULK_PRODUCTS) {
      return NextResponse.json(
        { error: `You can import at most ${MAX_BULK_PRODUCTS} products at a time` },
        { status: 400 }
      );
    }

    const failed: Array<{ index: number; error: string }> = [];
    const valid: Array<{
      name: string;
      description: string | null;
      price: number;
      stock: number;
      weight: number | null;
    }> = [];

    productsInput.forEach((row: BulkProductInput, index: number) => {
      const result = normalizeRow(row, index);
      if ('error' in result && result.error) {
        failed.push({ index: result.index, error: result.error });
        return;
      }
      if ('data' in result && result.data) {
        valid.push(result.data);
      }
    });

    if (valid.length === 0) {
      return NextResponse.json(
        { created: 0, products: [], failed },
        { status: 400 }
      );
    }

    const limits = await getEffectiveCreatorPlanLimits(creator);
    const productCount = await prisma.product.count({
      where: { creatorId: creator.id },
    });
    const remaining = limits.maxProducts - productCount;
    if (remaining <= 0) {
      return NextResponse.json(
        { error: 'Plan limit reached', limitType: 'maxProducts' },
        { status: 403 }
      );
    }
    if (valid.length > remaining) {
      return NextResponse.json(
        {
          error: `Free includes up to ${limits.maxProducts} products. You can import ${remaining} more, or upgrade to Pro.`,
          limitType: 'maxProducts',
          remaining,
        },
        { status: 403 }
      );
    }

    const maxOrder = await prisma.product.findFirst({
      where: { creatorId: creator.id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    let nextOrder = (maxOrder?.orderIndex ?? -1) + 1;

    const created = await prisma.$transaction(
      valid.map((row) => {
        const orderIndex = nextOrder;
        nextOrder += 1;
        return prisma.product.create({
          data: {
            id: crypto.randomUUID(),
            creatorId: creator.id,
            name: row.name,
            description: row.description,
            price: row.price,
            compareAtPrice: null,
            weight: row.weight,
            type: 'physical',
            imageUrl: null,
            imageUrls: [],
            digitalFileUrl: null,
            stock: row.stock,
            status: 'draft',
            orderIndex,
            waiveDeliveryFee: false,
            isPreorder: false,
            preorderSettings: Prisma.DbNull,
            addons: [],
          },
          include: { variants: true },
        });
      })
    );

    revalidatePublicCreator(creator.username);

    return NextResponse.json({
      created: created.length,
      products: created,
      failed,
    });
  } catch (error) {
    console.error('[creator/products/bulk][POST] failed:', error);
    return NextResponse.json({ error: 'Failed to import products' }, { status: 500 });
  }
}

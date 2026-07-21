import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { normalizeAddonCategoriesInput } from '@/lib/shop/product-addons';
import { revalidatePublicCreator } from '@/lib/creator/revalidate-public';
import { validatePreorderSettingsInput } from '@/lib/shop/preorder';
import { getEffectiveCreatorPlanLimits } from '@/lib/billing/effective-plan-limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProductVariantInput = {
  name?: string;
  options?: string[];
};

function toKobo(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function parseAddons(raw: unknown) {
  return normalizeAddonCategoriesInput(raw, false);
}

function parseVariants(raw: unknown) {
  const variantsInput: ProductVariantInput[] = Array.isArray(raw) ? raw : [];
  return variantsInput
    .map((variant) => ({
      name: String(variant?.name || '').trim(),
      options: Array.isArray(variant?.options)
        ? variant.options.map((option) => String(option).trim()).filter(Boolean)
        : [],
    }))
    .filter((variant) => variant.name && variant.options.length > 0)
    .slice(0, 3);
}

function parseImageUrls(body: Record<string, unknown>) {
  const fromArray = Array.isArray(body?.imageUrls)
    ? body.imageUrls.map((url) => String(url || '').trim()).filter(Boolean)
    : [];
  const legacy = body?.imageUrl ? String(body.imageUrl).trim() : '';
  const urls = (fromArray.length > 0 ? fromArray : legacy ? [legacy] : []).slice(0, 2);
  return {
    imageUrls: urls,
    imageUrl: urls[0] || null,
  };
}

/** Convert form-style preorder payload (naira amounts) into kobo for validation/storage. */
function normalizePreorderSettingsBody(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const data = raw as Record<string, unknown>;
  const phases = Array.isArray(data.phases)
    ? data.phases.map((phase) => {
        if (!phase || typeof phase !== 'object' || Array.isArray(phase)) return phase;
        const row = phase as Record<string, unknown>;
        const type = row.type === 'amount' ? 'amount' : 'percent';
        const valueNum = Number(row.value);
        return {
          ...row,
          type,
          value:
            type === 'amount' && Number.isFinite(valueNum)
              ? Math.round(valueNum * 100)
              : valueNum,
        };
      })
    : [];
  return {
    ...data,
    preorderPrice: toKobo(data.preorderPrice),
    preorderCompareAtPrice:
      data.preorderCompareAtPrice === '' ||
      data.preorderCompareAtPrice === null ||
      data.preorderCompareAtPrice === undefined
        ? null
        : toKobo(data.preorderCompareAtPrice),
    postPreorderPrice: toKobo(data.postPreorderPrice),
    postPreorderCompareAtPrice:
      data.postPreorderCompareAtPrice === '' ||
      data.postPreorderCompareAtPrice === null ||
      data.postPreorderCompareAtPrice === undefined
        ? null
        : toKobo(data.postPreorderCompareAtPrice),
    phases,
  };
}

async function getCreatorSession() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      username: true,
      platformPlan: true,
      platformSubscriptionActive: true,
    },
  });
  return creator;
}

export async function GET() {
  try {
    const creator = await getCreatorSession();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { creatorId: creator.id },
      include: { variants: true },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('[creator/products][GET] failed:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const creator = await getCreatorSession();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const creatorId = creator.id;
    const limits = await getEffectiveCreatorPlanLimits(creator);

    const productCount = await prisma.product.count({ where: { creatorId } });
    if (productCount >= limits.maxProducts) {
      return NextResponse.json(
        { error: 'Plan limit reached', limitType: 'maxProducts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const productType =
      String(body?.type || '').trim().toLowerCase() === 'digital' ? 'digital' : 'physical';
    const isDigital = productType === 'digital';

    if (isDigital && !limits.canSellDigitalProducts) {
      return NextResponse.json(
        { error: 'Plan limit reached', limitType: 'digitalProducts' },
        { status: 403 }
      );
    }

    const name = String(body?.name || '').trim();
    const description = body?.description ? String(body.description) : null;
    const { imageUrl, imageUrls } = parseImageUrls(body);
    const status = body?.status === 'active' ? 'active' : 'draft';
    const digitalFileUrl = isDigital
      ? String(body?.digitalFileUrl || '').trim() || null
      : null;
    const stockRaw = body?.stock;
    const stock = isDigital
      ? null
      : stockRaw === '' || stockRaw === null || stockRaw === undefined
        ? null
        : Math.max(0, Math.floor(Number(stockRaw)));
    const weight = isDigital
      ? null
      : body?.weight === '' || body?.weight === null || body?.weight === undefined
        ? null
        : Math.max(0, Number(body.weight));
    const isPreorder = isDigital ? false : Boolean(body?.isPreorder);
    const addons = isDigital ? [] : parseAddons(body?.addons);
    const variants = isDigital ? [] : parseVariants(body?.variants);

    if (isPreorder) {
      const preorderCount = await prisma.product.count({
        where: { creatorId, isPreorder: true },
      });
      if (preorderCount >= limits.maxPreorderProducts) {
        return NextResponse.json(
          { error: 'Plan limit reached', limitType: 'maxPreorderProducts' },
          { status: 403 }
        );
      }
    }

    let price = toKobo(body?.price);
    let compareAtPrice: number | null =
      body?.compareAtPrice === '' ||
      body?.compareAtPrice === null ||
      body?.compareAtPrice === undefined
        ? null
        : toKobo(body.compareAtPrice);
    let preorderSettings: ReturnType<
      typeof validatePreorderSettingsInput
    >['settings'] = null;

    if (isPreorder) {
      const validated = validatePreorderSettingsInput(
        normalizePreorderSettingsBody(body?.preorderSettings)
      );
      if (!validated.settings) {
        return NextResponse.json(
          { error: validated.error || 'Invalid preorder settings' },
          { status: 400 }
        );
      }
      preorderSettings = validated.settings;
      price = preorderSettings.postPreorderPrice;
      compareAtPrice = preorderSettings.postPreorderCompareAtPrice;
    }

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }
    if (price <= 0) {
      return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 });
    }
    if (!isDigital && (stock === null || !Number.isFinite(stock))) {
      return NextResponse.json({ error: 'Stock is required' }, { status: 400 });
    }
    if (isDigital && status === 'active' && !digitalFileUrl) {
      return NextResponse.json(
        { error: 'Upload a PDF before publishing a digital product' },
        { status: 400 }
      );
    }
    if (compareAtPrice !== null && compareAtPrice <= price) {
      return NextResponse.json(
        { error: 'Compare-at price must be greater than the sale price' },
        { status: 400 }
      );
    }
    if (!isDigital && status === 'active' && (stock ?? 0) <= 0) {
      return NextResponse.json(
        { error: 'Cannot publish a product with zero stock' },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.product.findFirst({
      where: { creatorId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const productId = crypto.randomUUID();
    const showLimitedStock = isDigital ? false : Boolean(body?.showLimitedStock);
    const nextStatus =
      !isDigital && stock !== null && stock <= 0 ? 'draft' : status;
    const product = await prisma.product.create({
      data: {
        id: productId,
        creatorId,
        name,
        description,
        price,
        compareAtPrice,
        weight,
        type: productType,
        imageUrl,
        imageUrls,
        digitalFileUrl,
        stock,
        status: nextStatus,
        orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
        waiveDeliveryFee: false,
        isPreorder,
        preorderSettings: isPreorder
          ? (preorderSettings as Prisma.InputJsonValue)
          : Prisma.DbNull,
        addons,
        variants: {
          create: variants.map((variant) => ({
            id: crypto.randomUUID(),
            name: variant.name,
            options: variant.options,
          })),
        },
      },
      include: { variants: true },
    });

    if (showLimitedStock) {
      await prisma.$executeRawUnsafe(
        `UPDATE products SET show_limited_stock = $1 WHERE id = $2`,
        true,
        productId
      );
      product.showLimitedStock = true;
    }

    revalidatePublicCreator(creator.username);
    return NextResponse.json({ product });
  } catch (error) {
    console.error('[creator/products][POST] failed:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

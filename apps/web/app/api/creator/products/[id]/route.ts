import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@foleio/database';
import { getCreatorApiAccess } from '@/lib/creator/api-session';
import { normalizeAddonCategoriesInput } from '@/lib/shop/product-addons';
import { revalidatePublicCreator } from '@/lib/creator/revalidate-public';
import { validatePreorderSettingsInput } from '@/lib/shop/preorder';
import { getEffectiveCreatorPlanLimits } from '@/lib/billing/effective-plan-limits';
import {
  isBelowMinPayableKobo,
  MIN_PAYABLE_PRICE_ERROR,
} from '@/lib/payments/min-amount';

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

function parseOptionalIsoDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const iso = String(value).trim();
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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

function parseImageUrls(body: Record<string, unknown>, maxImages = 3) {
  const cap = Math.max(1, Math.min(10, Math.floor(Number(maxImages) || 3)));
  const fromArray = Array.isArray(body?.imageUrls)
    ? body.imageUrls.map((url) => String(url || '').trim()).filter(Boolean)
    : [];
  const legacy = body?.imageUrl ? String(body.imageUrl).trim() : '';
  const urls = (fromArray.length > 0 ? fromArray : legacy ? [legacy] : []).slice(0, cap);
  return {
    imageUrls: urls,
    imageUrl: urls[0] || null,
  };
}

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

async function getCreatorSession(request?: Request) {
  const access = await getCreatorApiAccess(request);
  return access?.creator ?? null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const creator = await getCreatorSession(request);
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const creatorId = creator.id;

    const { id } = await params;
    const existing = await prisma.product.findFirst({
      where: { id, creatorId },
      select: {
        id: true,
        isPreorder: true,
        type: true,
        digitalFileUrl: true,
        stock: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const limits = await getEffectiveCreatorPlanLimits(creator);

    if (body?.statusOnly === true && (body.status === 'active' || body.status === 'draft')) {
      const stockCheck = await prisma.product.findFirst({
        where: { id, creatorId },
        select: { stock: true, type: true, digitalFileUrl: true },
      });
      const isDigitalStatus = stockCheck?.type === 'digital';
      const isGiftCardStatus = stockCheck?.type === 'gift_card';
      if (
        body.status === 'active' &&
        isDigitalStatus &&
        !String(stockCheck?.digitalFileUrl || '').trim()
      ) {
        return NextResponse.json(
          { error: 'Upload a PDF before publishing a digital product' },
          { status: 400 }
        );
      }
      if (
        body.status === 'active' &&
        !isDigitalStatus &&
        !isGiftCardStatus &&
        (stockCheck?.stock ?? 0) <= 0
      ) {
        return NextResponse.json(
          { error: 'Cannot publish a product with zero stock' },
          { status: 400 }
        );
      }
      const product = await prisma.product.update({
        where: { id },
        data: { status: body.status },
        include: { variants: true },
      });
      return NextResponse.json({ product });
    }

    const rawType = String(body?.type || existing.type || '')
      .trim()
      .toLowerCase();
    const productType =
      rawType === 'digital'
        ? 'digital'
        : rawType === 'gift_card'
          ? 'gift_card'
          : 'physical';
    const isDigital = productType === 'digital';
    const isGiftCard = productType === 'gift_card';
    const isNonPhysical = isDigital || isGiftCard;

    if (isDigital && !limits.canSellDigitalProducts) {
      return NextResponse.json(
        { error: 'Plan limit reached', limitType: 'digitalProducts' },
        { status: 403 }
      );
    }
    if (isGiftCard && !limits.canSellGiftCards) {
      return NextResponse.json(
        { error: 'Plan limit reached', limitType: 'giftCards' },
        { status: 403 }
      );
    }

    const name = String(body?.name || '').trim();
    const description = body?.description ? String(body.description) : null;
    const { imageUrl, imageUrls } = parseImageUrls(body, limits.maxProductImages);
    const status = body?.status === 'active' ? 'active' : 'draft';
    const digitalFileUrl = isDigital
      ? String(body?.digitalFileUrl || existing.digitalFileUrl || '').trim() || null
      : null;
    const stockRaw = body?.stock;
    const stock = isNonPhysical
      ? null
      : stockRaw === '' || stockRaw === null || stockRaw === undefined
        ? null
        : Math.max(0, Math.floor(Number(stockRaw)));
    const weight = isNonPhysical
      ? null
      : body?.weight === '' || body?.weight === null || body?.weight === undefined
        ? null
        : Math.max(0, Number(body.weight));
    let price = toKobo(body?.price);
    let compareAtPrice: number | null =
      body?.compareAtPrice === '' ||
      body?.compareAtPrice === null ||
      body?.compareAtPrice === undefined
        ? null
        : toKobo(body.compareAtPrice);
    const isPreorder = isNonPhysical ? false : Boolean(body?.isPreorder);
    const minOrderQuantity = isNonPhysical
      ? 1
      : Math.max(1, Math.floor(Number(body?.minOrderQuantity) || 1));
    const prepDaysMinRaw =
      body?.prepDaysMin === '' || body?.prepDaysMin == null
        ? null
        : Math.max(0, Math.floor(Number(body.prepDaysMin)));
    const prepDaysMaxRaw =
      body?.prepDaysMax === '' || body?.prepDaysMax == null
        ? null
        : Math.max(0, Math.floor(Number(body.prepDaysMax)));
    const prepDaysMin =
      prepDaysMinRaw == null || prepDaysMinRaw <= 0 ? null : prepDaysMinRaw;
    const prepDaysMax =
      prepDaysMin == null
        ? null
        : prepDaysMaxRaw != null && prepDaysMaxRaw >= prepDaysMin
          ? prepDaysMaxRaw
          : null;
    const requiresCustomDelivery = isNonPhysical
      ? false
      : Boolean(body?.requiresCustomDelivery);
    const addons = isNonPhysical ? [] : parseAddons(body?.addons);
    const variants = isNonPhysical ? [] : parseVariants(body?.variants);
    let preorderSettings: ReturnType<
      typeof validatePreorderSettingsInput
    >['settings'] = null;

    if (
      Array.isArray(body?.imageUrls) &&
      body.imageUrls.filter((url: unknown) => String(url || '').trim()).length >
        limits.maxProductImages
    ) {
      return NextResponse.json(
        { error: 'Plan limit reached', limitType: 'maxProductImages' },
        { status: 403 }
      );
    }

    if (isPreorder && !existing.isPreorder) {
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
    if (isBelowMinPayableKobo(price)) {
      return NextResponse.json({ error: MIN_PAYABLE_PRICE_ERROR }, { status: 400 });
    }
    if (!isNonPhysical && (stock === null || !Number.isFinite(stock))) {
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

    const nextStatus =
      !isNonPhysical && stock !== null && stock <= 0 ? 'draft' : status;

    const product = await prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: id } });

      await tx.product.update({
        where: { id },
        data: {
          name,
          description,
          price,
          compareAtPrice,
          discountStartsAt: isPreorder
            ? null
            : parseOptionalIsoDate(body?.discountStartsAt),
          discountEndsAt: isPreorder
            ? null
            : parseOptionalIsoDate(body?.discountEndsAt),
          weight,
          type: productType,
          imageUrl,
          digitalFileUrl,
          stock,
          status: nextStatus,
          waiveDeliveryFee: false,
          minOrderQuantity,
          prepDaysMin,
          prepDaysMax,
          requiresCustomDelivery,
          isPreorder,
          preorderSettings: isPreorder
            ? (preorderSettings as Prisma.InputJsonValue)
            : Prisma.DbNull,
          addons,
        },
      });

      await tx.$executeRawUnsafe(
        `UPDATE products SET image_urls = $1::text[], show_limited_stock = $2 WHERE id = $3`,
        imageUrls,
        isNonPhysical ? false : Boolean(body?.showLimitedStock),
        id
      );

      if (variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map((variant) => ({
            id: crypto.randomUUID(),
            productId: id,
            name: variant.name,
            options: variant.options,
          })),
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: { variants: true },
      });
    });

    revalidatePublicCreator(creator.username);
    return NextResponse.json({ product });
  } catch (error) {
    console.error('[creator/products/:id][PATCH] failed:', error);
    const message =
      error instanceof Error && error.message
        ? error.message.split('\n').find((line) => line.trim()) || error.message
        : 'Failed to update product';
    return NextResponse.json(
      {
        error: 'Failed to update product',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const creator = await getCreatorSession(request);
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.product.findFirst({
      where: { id, creatorId: creator.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });
    revalidatePublicCreator(creator.username);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[creator/products/:id][DELETE] failed:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';

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

async function getCreatorId() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return creator?.id || null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const creatorId = await getCreatorId();
    if (!creatorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.product.findFirst({
      where: { id, creatorId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const description = body?.description ? String(body.description) : null;
    const type = body?.type === 'digital' ? 'digital' : 'physical';
    const imageUrl = body?.imageUrl ? String(body.imageUrl) : null;
    const digitalFileUrl = body?.digitalFileUrl ? String(body.digitalFileUrl) : null;
    const status = body?.status === 'active' ? 'active' : 'draft';
    const stock = body?.stock === '' || body?.stock === null || body?.stock === undefined
      ? null
      : Math.max(0, Number(body.stock));
    const weight = body?.weight === '' || body?.weight === null || body?.weight === undefined
      ? null
      : Math.max(0, Number(body.weight));
    const price = toKobo(body?.price);

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    if (price <= 0) {
      return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 });
    }

    const variantsInput: ProductVariantInput[] = Array.isArray(body?.variants) ? body.variants : [];
    const variants = variantsInput
      .map((variant) => ({
        name: String(variant?.name || '').trim(),
        options: Array.isArray(variant?.options)
          ? variant.options.map((option) => String(option).trim()).filter(Boolean)
          : [],
      }))
      .filter((variant) => variant.name && variant.options.length > 0)
      .slice(0, 3);

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price,
        weight: type === 'physical' ? weight : null,
        type,
        imageUrl,
        digitalFileUrl: type === 'digital' ? digitalFileUrl : null,
        stock,
        status,
        variants: {
          deleteMany: {},
          create: variants.map((variant) => ({
            id: crypto.randomUUID(),
            name: variant.name,
            options: variant.options,
          })),
        },
      },
      include: { variants: true },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('[creator/products/:id][PATCH] failed:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const creatorId = await getCreatorId();
    if (!creatorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.product.findFirst({
      where: { id, creatorId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[creator/products/:id][DELETE] failed:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

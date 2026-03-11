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

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: { creatorId: creator.id },
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('[creator/products][GET] failed:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
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

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const price = toKobo(body?.price);
    if (price <= 0) {
      return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        id: crypto.randomUUID(),
        creatorId: creator.id,
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
    console.error('[creator/products][POST] failed:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

import { prisma } from '@foleio/database';
import { resolveDeliveryFeeKobo } from '@/lib/shop/delivery-fee';
import {
  normalizeQuoteLineItems,
  newEntityId,
  quoteInvoiceTotalKobo,
  splitQuoteLineItems,
  type QuoteDeliveryFeeMode,
  type QuoteLineItem,
} from '@/lib/quotes/helpers';

export type HybridDeliveryInput = {
  deliveryFeeMode?: string | null;
  deliveryTierId?: string | null;
  deliveryFeeKobo?: number | null;
};

export type HybridQuoteShape = {
  lineItems: QuoteLineItem[];
  linkedServiceId?: string | null;
  serviceDate?: Date | string | null;
  deliveryFeeMode: QuoteDeliveryFeeMode;
  deliveryTierId: string | null;
  deliveryFeeKobo: number;
  totalAmount: number;
};

/**
 * Validate + normalize hybrid invoice fields (service and/or products + delivery).
 */
export async function resolveHybridQuoteFields(opts: {
  creatorId: string;
  lineItemsRaw: unknown;
  linkedServiceId?: string | null;
  serviceDateRaw?: unknown;
  delivery?: HybridDeliveryInput;
  /** When true, empty line items get a default service row. */
  defaultLineLabel?: string;
}): Promise<{ ok: true; data: HybridQuoteShape } | { ok: false; error: string }> {
  let lineItems = normalizeQuoteLineItems(opts.lineItemsRaw);
  if (lineItems.length === 0) {
    lineItems = [
      {
        id: newEntityId(),
        label: opts.defaultLineLabel || 'Project',
        amountKobo: 0,
      },
    ];
  }

  const { productLines, serviceLines, productSubtotalKobo } =
    splitQuoteLineItems(lineItems);
  const hasProducts = productLines.length > 0;
  const hasServiceLines = serviceLines.length > 0;

  let linkedServiceId =
    typeof opts.linkedServiceId === 'string' && opts.linkedServiceId.trim()
      ? opts.linkedServiceId.trim()
      : null;

  let serviceDate: Date | null = null;
  if (opts.serviceDateRaw !== undefined && opts.serviceDateRaw !== null && opts.serviceDateRaw !== '') {
    const d = new Date(String(opts.serviceDateRaw));
    if (!Number.isNaN(d.getTime())) serviceDate = d;
  }

  if (hasProducts) {
    const productIds = [...new Set(productLines.map((p) => String(p.productId)))];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        creatorId: opts.creatorId,
        status: 'active',
      },
      select: { id: true, name: true, type: true, stock: true, price: true },
    });
    if (products.length !== productIds.length) {
      return {
        ok: false,
        error: 'One or more products are missing or inactive',
      };
    }
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const line of productLines) {
      const product = byId.get(String(line.productId));
      if (!product) {
        return { ok: false, error: 'One or more products are missing or inactive' };
      }
      const qty = Math.max(1, Math.round(Number(line.qty) || 1));
      const needsStock =
        product.type === 'physical' ||
        (product.type !== 'physical' && product.stock != null);
      if (needsStock && (product.stock ?? 0) < qty) {
        return {
          ok: false,
          error: `Not enough stock for ${product.name}`,
        };
      }
    }
  }

  if (linkedServiceId) {
    const linkedService = await prisma.priceListItem.findFirst({
      where: {
        id: linkedServiceId,
        creatorId: opts.creatorId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!linkedService) {
      return { ok: false, error: 'Booking service not found or inactive' };
    }
    if (!serviceDate) {
      return { ok: false, error: 'Service date is required when a booking service is selected' };
    }
    if (!hasServiceLines) {
      return {
        ok: false,
        error: 'Add at least one service line item for the booking, or remove the booking service',
      };
    }
  } else if (hasServiceLines && !hasProducts) {
    return {
      ok: false,
      error:
        'Select a booking service before creating a service invoice, or add shop products',
    };
  } else if (!hasProducts && !linkedServiceId) {
    return {
      ok: false,
      error: 'Add a booking service or at least one shop product',
    };
  }

  // Products-only: clear service
  if (hasProducts && !linkedServiceId) {
    serviceDate = null;
  }

  let deliveryFeeMode: QuoteDeliveryFeeMode = 'none';
  let deliveryTierId: string | null = null;
  let deliveryFeeKobo = 0;

  const physicalProductIds = hasProducts
    ? (
        await prisma.product.findMany({
          where: {
            id: { in: productLines.map((p) => String(p.productId)) },
            creatorId: opts.creatorId,
            type: 'physical',
          },
          select: { id: true },
        })
      ).map((p) => p.id)
    : [];
  const hasPhysical = physicalProductIds.length > 0;

  if (hasPhysical) {
    const modeRaw = String(opts.delivery?.deliveryFeeMode || '').trim();
    if (modeRaw === 'custom') {
      deliveryFeeMode = 'custom';
      deliveryFeeKobo = Math.max(
        0,
        Math.round(Number(opts.delivery?.deliveryFeeKobo) || 0)
      );
    } else if (modeRaw === 'tier' || opts.delivery?.deliveryTierId) {
      const tierId = String(opts.delivery?.deliveryTierId || '').trim();
      if (!tierId) {
        return {
          ok: false,
          error: 'Select a delivery option or enter a custom delivery fee',
        };
      }
      const tier = await prisma.deliveryTier.findFirst({
        where: { id: tierId, creatorId: opts.creatorId },
      });
      if (!tier) {
        return { ok: false, error: 'Delivery option not found' };
      }
      deliveryFeeMode = 'tier';
      deliveryTierId = tier.id;
      const itemQty = productLines
        .filter((l) => physicalProductIds.includes(String(l.productId)))
        .reduce((sum, l) => sum + Math.max(1, Math.round(Number(l.qty) || 1)), 0);
      deliveryFeeKobo = resolveDeliveryFeeKobo(
        {
          type: tier.type,
          flatRate: Number(tier.flatRate) || 0,
          minSubtotalKobo: tier.minSubtotalKobo,
          minItemQuantity: tier.minItemQuantity,
        },
        productSubtotalKobo,
        itemQty
      );
    } else {
      return {
        ok: false,
        error: 'Select a delivery option or enter a custom delivery fee',
      };
    }
  } else if (opts.delivery?.deliveryFeeMode === 'custom') {
    // Allow custom fee even for digital-only if merchant sets it explicitly — ignore
    deliveryFeeMode = 'none';
    deliveryFeeKobo = 0;
  }

  const totalAmount = quoteInvoiceTotalKobo(lineItems, deliveryFeeKobo);

  return {
    ok: true,
    data: {
      lineItems,
      linkedServiceId,
      serviceDate,
      deliveryFeeMode,
      deliveryTierId,
      deliveryFeeKobo,
      totalAmount,
    },
  };
}

export function quoteHasProductLines(lineItems: unknown) {
  return splitQuoteLineItems(normalizeQuoteLineItems(lineItems)).productLines.length > 0;
}

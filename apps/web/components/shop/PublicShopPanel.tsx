'use client';

import { productCardCss } from '@/components/shop/product-card-styles';
import { isAddressOptionalDeliveryType, resolveDeliveryFeeKobo } from '@/lib/shop/delivery-fee';
import { NIGERIA_STATES, nigeriaCities } from '@/lib/shop/nigeria-locations';
import { ShopSearchSelect } from '@/components/shop/ShopSearchSelect';
import { resolveProductPricing } from '@/lib/shop/preorder';
import { formatPrepEstimateLabel, groupByPrepEstimate } from '@/lib/shop/prep-estimate';
import {
  type AddonOption,
  flattenAddonOptions,
  isAddonOptionAvailable,
  parseAddonCategories,
  validateAddonStock,
  validateRequiredAddons,
} from '@/lib/shop/product-addons';
import { ArrowLeft, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

type ProductVariant = {
  id: string;
  name: string;
  options: string[];
};

export type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  imageUrl: string | null;
  imageUrls?: string[];
  stock: number | null;
  showLimitedStock?: boolean;
  type?: string;
  isPreorder?: boolean;
  minOrderQuantity?: number;
  prepDaysMin?: number | null;
  prepDaysMax?: number | null;
  requiresCustomDelivery?: boolean;
  preorderSettings?: unknown;
  addons?: unknown;
  variants: ProductVariant[];
};

function productImages(product: Pick<ShopProduct, 'imageUrl' | 'imageUrls'>): string[] {
  const fromArray = Array.isArray(product.imageUrls)
    ? product.imageUrls.map(String).filter(Boolean)
    : [];
  if (fromArray.length > 0) return fromArray.slice(0, 5);
  return product.imageUrl ? [product.imageUrl] : [];
}

export type ShopDeliveryTier = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  flatRate: number;
  minSubtotalKobo?: number | null;
  minItemQuantity?: number | null;
  contactPhone?: string | null;
};

type CartItem = {
  product: ShopProduct;
  selectedVariants: Record<string, string>;
  selectedAddons: AddonOption[];
  quantity: number;
  unitPrice: number;
  giftCardSendToEmail?: string;
};

type DrawerStep = 'catalog' | 'product' | 'cart' | 'checkout';

const PUBLIC_SHOP_PREVIEW = 4;

export type ShopCatalogPayload = {
  creatorId: string;
  merchantPhone: string | null;
  products: ShopProduct[];
  deliveryTiers: ShopDeliveryTier[];
};

/** In-memory catalog so tab switches / remounts stay instant. */
const shopCatalogCache = new Map<string, ShopCatalogPayload>();
const shopCatalogInflight = new Map<string, Promise<ShopCatalogPayload | null>>();

async function loadPublicShopCatalog(
  username: string,
  options?: { force?: boolean }
): Promise<ShopCatalogPayload | null> {
  if (!options?.force) {
    const cached = shopCatalogCache.get(username);
    if (cached) return cached;

    const inflight = shopCatalogInflight.get(username);
    if (inflight) return inflight;
  }

  const promise = (async () => {
    try {
      const response = await fetch(`/api/shop/${encodeURIComponent(username)}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) return null;
      const payload: ShopCatalogPayload = {
        creatorId: data.creator?.id || '',
        merchantPhone: data.creator?.phoneNumber || null,
        products: (Array.isArray(data.products) ? data.products : []).map(
          (product: ShopProduct) => ({
            ...product,
            isPreorder: Boolean(product.isPreorder),
            preorderSettings: product.preorderSettings ?? null,
            minOrderQuantity: Math.max(1, Number(product.minOrderQuantity) || 1),
            prepDaysMin: product.prepDaysMin ?? null,
            prepDaysMax: product.prepDaysMax ?? null,
            requiresCustomDelivery: Boolean(product.requiresCustomDelivery),
          })
        ),
        deliveryTiers: data.deliveryTiers || [],
      };
      shopCatalogCache.set(username, payload);
      return payload;
    } catch {
      return null;
    } finally {
      shopCatalogInflight.delete(username);
    }
  })();

  shopCatalogInflight.set(username, promise);
  return promise;
}

/** Warm the shop catalog before the Shop tab is opened. */
export function prefetchPublicShop(username: string) {
  if (!username || shopCatalogCache.has(username)) return;
  void loadPublicShopCatalog(username);
}

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

function isNonPhysicalProduct(product: Pick<ShopProduct, 'type'>) {
  return product.type === 'digital' || product.type === 'gift_card';
}

function isGiftCardProduct(product: Pick<ShopProduct, 'type'>) {
  return product.type === 'gift_card';
}

function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

function shopProductPricing(product: ShopProduct) {
  return resolveProductPricing({
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    isPreorder: Boolean(product.isPreorder),
    preorderSettings: product.preorderSettings,
    discountStartsAt: product.discountStartsAt,
    discountEndsAt: product.discountEndsAt,
  });
}

function isColorVariantName(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized === 'color' || normalized === 'colour';
}

function isHexColor(value: string) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

const shopDrawerCss = `
.foleio-shop-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.55);
}
.foleio-shop-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 81;
  display: flex;
  flex-direction: column;
  width: min(680px, 100vw);
  background: #212121;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.35);
  animation: foleio-shop-drawer-in 180ms ease-out;
}
@keyframes foleio-shop-drawer-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.foleio-shop-drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 0;
  flex-shrink: 0;
}
.foleio-shop-drawer-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.foleio-shop-drawer-close {
  border: none;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
  padding: 4px;
}
.foleio-shop-drawer-back {
  border: none;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
}
.foleio-shop-drawer-back:hover {
  color: #fafafa;
  background: rgba(255,255,255,0.06);
}
.foleio-shop-drawer-back svg {
  width: 20px;
  height: 20px;
}
.foleio-shop-drawer-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px 20px 24px;
}
.foleio-shop-drawer-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.foleio-shop-checkout-summary {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 14px;
  background: #f2f1ec;
  color: #18181b;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.foleio-shop-checkout-summary .foleio-shop-field {
  background: #fff;
  color: #18181b;
  border-color: #e7e5e4;
}
.foleio-shop-checkout-summary .foleio-shop-field::placeholder {
  color: #6b6964;
}
.foleio-shop-summary-divider {
  height: 1px;
  margin: 2px 0;
  background: rgba(28, 27, 25, 0.12);
}
.foleio-shop-summary-lines {
  display: grid;
  gap: 8px;
}
.foleio-shop-summary-row,
.foleio-shop-summary-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin: 0;
}
.foleio-shop-summary-row {
  font-size: 14px;
  line-height: 1.35;
  color: #55544f;
}
.foleio-shop-summary-row span:first-child,
.foleio-shop-summary-total span:first-child {
  min-width: 0;
}
.foleio-shop-summary-row span:last-child,
.foleio-shop-summary-total span:last-child {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.foleio-shop-summary-total {
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px solid rgba(28, 27, 25, 0.08);
  font-size: 16px;
  font-weight: 700;
  color: #18181b;
}
.foleio-shop-summary-label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #18181b;
}
.foleio-shop-promo-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
}
.foleio-shop-promo-row .foleio-shop-field {
  flex: 1;
  min-width: 0;
}
.foleio-shop-promo-apply {
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background: #1c1b19;
  color: #f6f5f1;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 16px;
  cursor: pointer;
  font-family: var(--font-body), sans-serif;
}
.foleio-shop-promo-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.foleio-shop-promo-error {
  margin: 0;
  font-size: 12px;
  color: #b42318;
}
.foleio-shop-drawer-footer {
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 16px 20px;
  flex-shrink: 0;
}
.foleio-shop-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.16);
  padding: 2px 8px;
  font-size: 11px;
  color: #fafafa;
}
.foleio-shop-chip.is-preorder {
  border-color: transparent;
  background: #facc15;
  color: #422006;
  font-weight: 600;
}
.foleio-shop-image-badges {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  pointer-events: none;
}
.foleio-shop-image-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  color: #18181b;
  background: #fafafa;
  box-shadow: 0 4px 12px rgba(0,0,0,0.35);
}
.foleio-shop-image-badge.is-discount {
  color: #ecfdf5;
  background: #16a34a;
}
.foleio-shop-field {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: #2b2b2b;
  color: #f4f4f5;
  padding: 10px 12px;
  font-size: 14px;
  font-family: var(--font-body), sans-serif;
  outline: none;
  box-shadow: none;
  -webkit-appearance: none;
  appearance: none;
}
.foleio-shop-field:focus,
.foleio-shop-field:focus-visible {
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16);
}
.foleio-shop-field::placeholder {
  color: rgba(250, 250, 250, 0.68);
  opacity: 1;
}
.foleio-shop-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}
.foleio-shop-select-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.foleio-shop-select-menu {
  position: fixed;
  z-index: 100;
  display: grid;
  gap: 4px;
  max-height: 220px;
  overflow: auto;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.16);
  background: #1c1c1c;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}
.foleio-shop-select-option {
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #f4f4f5;
  text-align: left;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 14px;
  font-family: var(--font-body), sans-serif;
}
.foleio-shop-select-option:hover,
.foleio-shop-select-option.is-active {
  background: rgba(250,250,250,0.12);
}
.foleio-shop-select-empty {
  margin: 0;
  padding: 8px 10px;
  font-size: 13px;
  color: rgba(250,250,250,0.68);
}
.foleio-shop-drawer input[type='radio'] {
  accent-color: #fafafa;
}
.foleio-shop-drawer input[type='checkbox'] {
  accent-color: #fafafa;
}
.foleio-shop-btn {
  border: none;
  border-radius: 10px;
  background: #fafafa;
  color: #18181b;
  font-weight: 600;
  padding: 12px 16px;
  cursor: pointer;
  width: 100%;
}
.foleio-shop-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.foleio-shop-btn-ghost {
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 10px;
  background: transparent;
  color: #fafafa;
  padding: 10px 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
`;

export function PublicShopPanel({
  username,
  embedded = false,
  catalog = null,
}: {
  username: string;
  embedded?: boolean;
  /** When set, render this catalog and skip the shop request. */
  catalog?: ShopCatalogPayload | null;
}) {
  const cachedCatalog = catalog || shopCatalogCache.get(username);
  const [creatorId, setCreatorId] = useState(cachedCatalog?.creatorId || '');
  const [merchantPhone, setMerchantPhone] = useState<string | null>(
    cachedCatalog?.merchantPhone || null
  );
  const [products, setProducts] = useState<ShopProduct[]>(cachedCatalog?.products || []);
  const [deliveryTiers, setDeliveryTiers] = useState<ShopDeliveryTier[]>(
    cachedCatalog?.deliveryTiers || []
  );
  const [loading, setLoading] = useState(!cachedCatalog);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<DrawerStep>('product');
  const [browseFromCatalog, setBrowseFromCatalog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState<{
    code: string;
    kind: 'coupon' | 'gift_card';
    couponDiscountKobo: number;
    giftCardCreditKobo: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const promoRef = useRef(promo);
  const promoRequestRef = useRef(0);
  const stepRef = useRef(step);
  promoRef.current = promo;
  stepRef.current = step;
  const [deliveryTierId, setDeliveryTierId] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [address, setAddress] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
    address: '',
    city: '',
    state: '',
    isGift: false,
    occasion: '' as '' | 'birthday' | 'anniversary' | 'wedding' | 'special' | 'custom',
    customOccasion: '',
    recipientName: '',
    recipientEmail: '',
    giftMessage: '',
    giftCardCode: '',
  });
  const [customDelivery, setCustomDelivery] = useState({
    phone: '',
    notes: '',
  });
  const [giftCardSendToEmail, setGiftCardSendToEmail] = useState('');

  useEffect(() => {
    if (catalog) return;
    let cancelled = false;
    const apply = (payload: ShopCatalogPayload) => {
      setCreatorId(payload.creatorId);
      setMerchantPhone(payload.merchantPhone);
      setProducts(payload.products);
      setDeliveryTiers(payload.deliveryTiers);
      setLoading(false);
    };

    const existing = shopCatalogCache.get(username);
    if (existing) {
      apply(existing);
      // Soft-refresh so delivery flags stay current after creator edits.
      void loadPublicShopCatalog(username, { force: true }).then((payload) => {
        if (cancelled || !payload) return;
        apply(payload);
      });
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void loadPublicShopCatalog(username).then((payload) => {
      if (cancelled) return;
      if (payload) apply(payload);
      else setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [username, catalog]);

  const addonCategories = useMemo(
    () => (selectedProduct ? parseAddonCategories(selectedProduct.addons) : []),
    [selectedProduct]
  );

  const catalogAddons = useMemo(() => flattenAddonOptions(addonCategories), [addonCategories]);

  const livePricing = useMemo(() => {
    if (!selectedProduct) {
      return { price: 0, compareAtPrice: null as number | null, isPreorderActive: false };
    }
    return shopProductPricing(selectedProduct);
  }, [selectedProduct]);

  const liveUnitPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    const addonsTotal = catalogAddons
      .filter((addon) => selectedAddonIds.includes(addon.id))
      .reduce((sum, addon) => sum + addon.price, 0);
    return livePricing.price + addonsTotal;
  }, [selectedProduct, catalogAddons, selectedAddonIds, livePricing.price]);

  const needsDelivery = cart.some((item) => !isNonPhysicalProduct(item.product));
  const needsCustomDeliveryBlock = cart.some(
    (item) => !isNonPhysicalProduct(item.product) && Boolean(item.product.requiresCustomDelivery)
  );
  const cartPrepGroups = useMemo(
    () =>
      groupByPrepEstimate(cart, (item) => ({
        prepDaysMin: item.product.prepDaysMin,
        prepDaysMax: item.product.prepDaysMax,
      })),
    [cart]
  );

  const deliverySelectionRequired = needsDelivery && deliveryTiers.length > 0;

  const selectedTier = useMemo(
    () => deliveryTiers.find((tier) => tier.id === deliveryTierId),
    [deliveryTiers, deliveryTierId]
  );
  const needsStreetAddress = Boolean(
    needsDelivery && selectedTier && !isAddressOptionalDeliveryType(selectedTier.type)
  );
  const stateCities = nigeriaCities(address.state);

  const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const deliveryFee =
    needsDelivery && selectedTier
      ? resolveDeliveryFeeKobo(
          {
            type: selectedTier.type,
            flatRate: selectedTier.flatRate,
            minSubtotalKobo: selectedTier.minSubtotalKobo,
            minItemQuantity: selectedTier.minItemQuantity,
          },
          cartSubtotal,
          cart.reduce((sum, item) => {
            if (isNonPhysicalProduct(item.product)) return sum;
            return sum + item.quantity;
          }, 0)
        )
      : 0;

  const typedPromoCode = address.giftCardCode.trim().toUpperCase().replace(/\s+/g, '');
  const promoApplied = Boolean(promo && promo.code === typedPromoCode);
  const couponOff = promoApplied && promo ? promo.couponDiscountKobo : 0;
  const giftCredit = promoApplied && promo ? promo.giftCardCreditKobo : 0;
  const payableTotal = Math.max(0, cartSubtotal - couponOff + deliveryFee - giftCredit);
  const deliverySelected = Boolean(selectedTier);

  useEffect(() => {
    // Clear stale delivery selection if tiers change or cart empties.
    if (cart.length === 0 && deliveryTierId) {
      setDeliveryTierId('');
    }
  }, [cart.length, deliveryTierId]);

  function goToCheckout() {
    if (cart.length === 0) return;
    if (needsDelivery && deliveryTiers.length === 0) {
      setError('Delivery is required, but this shop has no delivery options yet.');
      return;
    }
    if (deliverySelectionRequired && !deliveryTierId) {
      setError('Select a delivery option to continue');
      return;
    }
    setError(null);
    setStep('checkout');
  }

  function openProduct(product: ShopProduct) {
    setSelectedProduct(product);
    setSelectedVariants({});
    setSelectedAddonIds([]);
    setQuantity(Math.max(1, Number(product.minOrderQuantity) || 1));
    setGiftCardSendToEmail('');
    setStep('product');
    setError(null);
  }

  function openCatalog() {
    setSelectedProduct(null);
    setLightboxIndex(null);
    setBrowseFromCatalog(true);
    setStep('catalog');
    setError(null);
  }

  function closeDrawer() {
    setSelectedProduct(null);
    setLightboxIndex(null);
    setBrowseFromCatalog(false);
    setStep('product');
    setError(null);
  }

  function variantsReady(product: ShopProduct) {
    if (isGiftCardProduct(product)) return true;
    return product.variants.every((variant) => selectedVariants[variant.name]);
  }

  function addSelectedToCart() {
    if (!selectedProduct || !variantsReady(selectedProduct)) {
      setError(
        selectedProduct?.variants.length ? 'Select all variants first' : 'Could not add to cart'
      );
      return;
    }
    const minQty = Math.max(1, Number(selectedProduct.minOrderQuantity) || 1);
    if (quantity < minQty) {
      setError(`Minimum order is ${minQty}`);
      return;
    }
    if (!isGiftCardProduct(selectedProduct)) {
      const requiredError = validateRequiredAddons(addonCategories, selectedAddonIds);
      if (requiredError) {
        setError(requiredError);
        return;
      }
      const stockError = validateAddonStock(addonCategories, selectedAddonIds, quantity);
      if (stockError) {
        setError(stockError);
        return;
      }
    }
    const selectedAddons = catalogAddons.filter((addon) => selectedAddonIds.includes(addon.id));
    setCart((prev) => [
      ...prev,
      {
        product: selectedProduct,
        selectedVariants: { ...selectedVariants },
        selectedAddons: isGiftCardProduct(selectedProduct) ? [] : selectedAddons,
        quantity,
        unitPrice: liveUnitPrice,
        giftCardSendToEmail: isGiftCardProduct(selectedProduct)
          ? giftCardSendToEmail.trim() || undefined
          : undefined,
      },
    ]);
    setStep('cart');
    setError(null);
  }

  function removeCartItem(index: number) {
    setCart((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setDeliveryTierId('');
      }
      return next;
    });
    setError(null);
  }

  async function applyPromoCode() {
    const code = address.giftCardCode.trim();
    if (!code) {
      setPromo(null);
      setPromoError('Enter a code');
      return;
    }
    if (!creatorId) return;
    const requestId = ++promoRequestRef.current;
    setPromoLoading(true);
    setPromoError(null);
    setError(null);
    try {
      const response = await fetch('/api/shop/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          code,
          subtotalKobo: cartSubtotal,
          deliveryFeeKobo: deliveryFee,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (requestId !== promoRequestRef.current || stepRef.current !== 'checkout') return;
      if (!response.ok) {
        setPromo(null);
        setPromoError(data.error || 'Could not apply this code');
        return;
      }
      setPromo({
        code: String(data.code || ''),
        kind: data.kind === 'gift_card' ? 'gift_card' : 'coupon',
        couponDiscountKobo: Number(data.couponDiscountKobo) || 0,
        giftCardCreditKobo: Number(data.giftCardCreditKobo) || 0,
      });
      setAddress((prev) => ({ ...prev, giftCardCode: String(data.code || code) }));
    } catch {
      if (requestId !== promoRequestRef.current || stepRef.current !== 'checkout') return;
      setPromo(null);
      setPromoError('Could not apply this code');
    } finally {
      if (requestId === promoRequestRef.current) setPromoLoading(false);
    }
  }

  function clearPromoCode() {
    setPromo(null);
    setPromoError(null);
    setAddress((prev) => ({ ...prev, giftCardCode: '' }));
  }

  async function pay() {
    if (!creatorId || cart.length === 0) return;
    if (!address.firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim())) {
      setError('A valid email is required');
      return;
    }
    if (address.phone.replace(/\D/g, '').length < 7) {
      setError('A valid phone number is required');
      return;
    }
    if (address.isGift) {
      if (!address.recipientName.trim()) {
        setError('Recipient name is required for gift orders');
        return;
      }
      if (!address.recipientEmail.trim()) {
        setError('Recipient email is required for gift orders');
        return;
      }
      if (!address.occasion) {
        setError('Select a gift occasion');
        return;
      }
      if (address.occasion === 'custom' && !address.customOccasion.trim()) {
        setError('Enter a custom occasion');
        return;
      }
    }
    if (needsDelivery && deliveryTiers.length === 0) {
      setError('Delivery is required, but this shop has no delivery options yet.');
      return;
    }
    if (deliverySelectionRequired && !deliveryTierId) {
      setError('Select a delivery option');
      return;
    }
    if (needsStreetAddress && !address.address.trim()) {
      setError('Address is required');
      return;
    }
    if (address.giftCardCode.trim() && !promoApplied) {
      setError('Apply the code before paying');
      return;
    }
    const needsCustomDeliveryBlock = cart.some(
      (item) =>
        item.product.type !== 'digital' &&
        item.product.type !== 'gift_card' &&
        item.product.requiresCustomDelivery
    );
    if (needsCustomDeliveryBlock && !customDelivery.phone.trim()) {
      setError('Custom delivery phone is required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const cartGiftCardEmail =
        cart.find((item) => item.giftCardSendToEmail)?.giftCardSendToEmail || '';
      const response = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          giftCardCode: promoApplied && promo ? promo.code : null,
          deliveryTierId: needsDelivery ? deliveryTierId || null : null,
          deliveryAddress: {
            ...address,
            name: `${address.firstName.trim()} ${address.lastName.trim()}`.trim(),
            giftCardSendToEmail: cartGiftCardEmail || address.email.trim(),
            ...(needsCustomDeliveryBlock
              ? {
                  customDelivery: {
                    phone: customDelivery.phone.trim(),
                    notes: customDelivery.notes.trim() || null,
                  },
                }
              : {}),
          },
          items: cart.map((item) => ({
            productId: item.product.id,
            variantSelected: item.selectedVariants,
            addonIds: item.selectedAddons.map((addon) => addon.id),
            quantity: item.quantity,
            giftCardSendToEmail: item.giftCardSendToEmail,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not start payment');
        setIsSubmitting(false);
        return;
      }
      if (data.orderId && !data.paystackUrl) {
        window.location.href = `/shop/order-success?orderId=${encodeURIComponent(data.orderId)}`;
        return;
      }
      if (!data.paystackUrl) {
        setError('Could not start payment');
        setIsSubmitting(false);
        return;
      }
      window.location.href = data.paystackUrl;
    } catch {
      setError('Could not start payment');
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!deliveryTierId) return;
    const stillValid = deliveryTiers.some((tier) => tier.id === deliveryTierId);
    if (!stillValid) setDeliveryTierId('');
  }, [deliveryTiers, deliveryTierId]);

  useEffect(() => {
    if (!promo?.code || !creatorId) return;
    let cancelled = false;
    void (async () => {
      const response = await fetch('/api/shop/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          code: promo.code,
          subtotalKobo: cartSubtotal,
          deliveryFeeKobo: deliveryFee,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (cancelled || stepRef.current !== 'checkout') return;
      if (!response.ok) {
        setPromo(null);
        setPromoError(data.error || 'This code no longer applies');
        return;
      }
      setPromo((current) => {
        if (!current || current.code !== data.code) return current;
        const couponDiscountKobo = Number(data.couponDiscountKobo) || 0;
        const giftCardCreditKobo = Number(data.giftCardCreditKobo) || 0;
        if (
          current.couponDiscountKobo === couponDiscountKobo &&
          current.giftCardCreditKobo === giftCardCreditKobo
        ) {
          return current;
        }
        return {
          code: current.code,
          kind: data.kind === 'gift_card' ? 'gift_card' : 'coupon',
          couponDiscountKobo,
          giftCardCreditKobo,
        };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [promo?.code, cartSubtotal, deliveryFee, creatorId]);

  useEffect(() => {
    if (step === 'checkout') return;
    promoRequestRef.current += 1;
    setPromoError(null);
    setPromoLoading(false);
    const applied = promoRef.current;
    setAddress((prev) => {
      const typed = prev.giftCardCode.trim().toUpperCase().replace(/\s+/g, '');
      if (applied && typed === applied.code) return prev;
      if (!prev.giftCardCode) return prev;
      return { ...prev, giftCardCode: '' };
    });
  }, [step]);

  useEffect(() => {
    if (!error) return;
    document.getElementById('shop-checkout-error')?.scrollIntoView({ block: 'nearest' });
  }, [error]);

  if (loading) {
    return embedded ? <p className="foleio-public-empty">Loading shop…</p> : null;
  }

  if (products.length === 0) {
    return embedded ? (
      <p className="foleio-public-empty">No products available right now.</p>
    ) : null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${shopDrawerCss}\n${productCardCss}` }} />
      {cart.length > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: embedded ? 12 : 0 }}>
          <button
            type="button"
            className="foleio-shop-btn-ghost"
            onClick={() => {
              setSelectedProduct(cart[0]?.product || null);
              setStep('cart');
            }}
          >
            Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
        </div>
      ) : null}
      <div
        className="foleio-product-card-list"
        style={{ marginTop: cart.length > 0 ? 12 : embedded ? 12 : 0 }}
      >
        {products.slice(0, PUBLIC_SHOP_PREVIEW).map((product) => {
          const pricing = shopProductPricing(product);
          const pct = discountPercent(pricing.price, pricing.compareAtPrice);
          const thumb = productImages(product)[0];
          const stockCount = product.stock ?? 0;
          const inStock =
            product.type === 'digital' || product.type === 'gift_card' || stockCount > 0;
          const stockLabel =
            product.type === 'digital'
              ? 'Digital'
              : product.type === 'gift_card'
                ? 'Gift card'
                : !inStock
                  ? 'Out of stock'
                  : product.showLimitedStock
                    ? 'Limited stock'
                    : `In Stock : ${stockCount}`;
          return (
            <button
              key={product.id}
              type="button"
              className="foleio-product-card"
              onClick={() => openProduct(product)}
            >
              <div className="foleio-product-card-media">
                {thumb ? (
                  <Image src={thumb} alt={product.name} fill className="object-cover" unoptimized />
                ) : null}
                {pct ? (
                  <div className="foleio-product-card-badges">
                    <span className="foleio-product-card-discount">{pct}% off</span>
                  </div>
                ) : null}
              </div>
              <div className="foleio-product-card-body">
                <div className="foleio-product-card-top">
                  <p className="foleio-product-card-title">
                    {product.name}
                    {pricing.isPreorderActive ? (
                      <span className="foleio-shop-chip is-preorder" style={{ marginLeft: 8 }}>
                        Preorder
                      </span>
                    ) : null}
                  </p>
                  <span className={`foleio-product-card-stock${inStock ? '' : ' is-out'}`}>
                    {stockLabel}
                  </span>
                </div>
                <p className="foleio-product-card-desc">
                  {product.description?.trim() || 'View details and order.'}
                </p>
                <div className="foleio-product-card-footer">
                  <p className="foleio-product-card-price">
                    {pricing.compareAtPrice && pricing.compareAtPrice > pricing.price ? (
                      <>
                        <span className="is-compare">{formatNaira(pricing.compareAtPrice)}</span>
                        {formatNaira(pricing.price)}
                      </>
                    ) : (
                      formatNaira(pricing.price)
                    )}
                  </p>
                  <span className="foleio-product-card-shop-btn" aria-hidden="true">
                    Shop
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {products.length > PUBLIC_SHOP_PREVIEW ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" className="foleio-shop-btn-ghost" onClick={openCatalog}>
            View all
          </button>
        </div>
      ) : null}

      {selectedProduct || step === 'cart' || step === 'checkout' || step === 'catalog' ? (
        <>
          <div className="foleio-shop-drawer-backdrop" onClick={closeDrawer} />
          <div
            className="foleio-shop-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-drawer-title"
          >
            <div className="foleio-shop-drawer-header">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {step === 'cart' ||
                step === 'checkout' ||
                (step === 'product' && browseFromCatalog) ? (
                  <button
                    type="button"
                    className="foleio-shop-drawer-back"
                    aria-label="Back"
                    onClick={() => {
                      setError(null);
                      if (step === 'checkout') {
                        setStep('cart');
                        return;
                      }
                      if (step === 'cart') {
                        setSelectedProduct(null);
                        setStep(browseFromCatalog ? 'catalog' : 'product');
                        return;
                      }
                      setSelectedProduct(null);
                      setStep('catalog');
                    }}
                  >
                    <ArrowLeft strokeWidth={1.75} />
                  </button>
                ) : null}
                <h2 id="shop-drawer-title" className="foleio-shop-drawer-title">
                  {step === 'catalog'
                    ? 'All products'
                    : step === 'product'
                      ? selectedProduct?.name
                      : step === 'cart'
                        ? 'Cart'
                        : 'Checkout'}
                </h2>
                {step === 'product' && selectedProduct && livePricing.isPreorderActive ? (
                  <span className="foleio-shop-chip is-preorder">Preorder</span>
                ) : null}
              </div>
              <button type="button" className="foleio-shop-drawer-close" onClick={closeDrawer}>
                <X />
              </button>
            </div>

            <div className="foleio-shop-drawer-body">
              <div className="foleio-shop-drawer-scroll">
              {step === 'checkout' ? (
                <div className="foleio-shop-checkout-summary">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <p className="foleio-shop-summary-label">Gift card or coupon code</p>
                    <div className="foleio-shop-promo-row">
                      <input
                        className="foleio-shop-field"
                        placeholder="Enter code (optional)"
                        value={address.giftCardCode}
                        onChange={(event) => {
                          setPromoError(null);
                          setAddress((prev) => ({
                            ...prev,
                            giftCardCode: event.target.value.toUpperCase(),
                          }));
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' || promoApplied) return;
                          event.preventDefault();
                          void applyPromoCode();
                        }}
                      />
                      <button
                        type="button"
                        className="foleio-shop-promo-apply"
                        disabled={promoLoading || (!promoApplied && !address.giftCardCode.trim())}
                        onClick={() => {
                          if (promoApplied) clearPromoCode();
                          else void applyPromoCode();
                        }}
                      >
                        {promoLoading ? 'Applying…' : promoApplied ? 'Remove' : 'Apply'}
                      </button>
                    </div>
                    {promoError ? <p className="foleio-shop-promo-error">{promoError}</p> : null}
                  </div>
                  <div className="foleio-shop-summary-divider" />
                  <div className="foleio-shop-summary-lines">
                    <div className="foleio-shop-summary-row">
                      <span>Subtotal</span>
                      <span>{formatNaira(cartSubtotal)}</span>
                    </div>
                    {couponOff > 0 ? (
                      <div className="foleio-shop-summary-row">
                        <span>Discount</span>
                        <span>−{formatNaira(couponOff)}</span>
                      </div>
                    ) : null}
                    {needsDelivery && selectedTier ? (
                      <div className="foleio-shop-summary-row">
                        <span>Delivery · {selectedTier.name}</span>
                        <span>
                          {selectedTier.type === 'paid' ? formatNaira(deliveryFee) : 'Free'}
                        </span>
                      </div>
                    ) : null}
                    {giftCredit > 0 ? (
                      <div className="foleio-shop-summary-row">
                        <span>Gift card</span>
                        <span>−{formatNaira(giftCredit)}</span>
                      </div>
                    ) : null}
                    <p className="foleio-shop-summary-total">
                      <span>Total</span>
                      <span>{formatNaira(payableTotal)}</span>
                    </p>
                  </div>
                </div>
              ) : null}
              {step === 'catalog' ? (
                <div className="foleio-product-card-list">
                  {products.map((product) => {
                    const pricing = shopProductPricing(product);
                    const pct = discountPercent(pricing.price, pricing.compareAtPrice);
                    const thumb = productImages(product)[0];
                    const stockCount = product.stock ?? 0;
                    const inStock =
                      product.type === 'digital' || product.type === 'gift_card' || stockCount > 0;
                    const stockLabel =
                      product.type === 'digital'
                        ? 'Digital'
                        : product.type === 'gift_card'
                          ? 'Gift card'
                          : !inStock
                            ? 'Out of stock'
                            : product.showLimitedStock
                              ? 'Limited stock'
                              : `In Stock : ${stockCount}`;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className="foleio-product-card"
                        onClick={() => openProduct(product)}
                      >
                        <div className="foleio-product-card-media">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt={product.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}
                          {pct ? (
                            <div className="foleio-product-card-badges">
                              <span className="foleio-product-card-discount">{pct}% off</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="foleio-product-card-body">
                          <div className="foleio-product-card-top">
                            <p className="foleio-product-card-title">
                              {product.name}
                              {pricing.isPreorderActive ? (
                                <span
                                  className="foleio-shop-chip is-preorder"
                                  style={{ marginLeft: 8 }}
                                >
                                  Preorder
                                </span>
                              ) : null}
                            </p>
                            <span
                              className={`foleio-product-card-stock${inStock ? '' : ' is-out'}`}
                            >
                              {stockLabel}
                            </span>
                          </div>
                          <p className="foleio-product-card-desc">
                            {product.description?.trim() || 'View details and order.'}
                          </p>
                          <div className="foleio-product-card-footer">
                            <p className="foleio-product-card-price">
                              {pricing.compareAtPrice && pricing.compareAtPrice > pricing.price ? (
                                <>
                                  <span className="is-compare">
                                    {formatNaira(pricing.compareAtPrice)}
                                  </span>
                                  {formatNaira(pricing.price)}
                                </>
                              ) : (
                                formatNaira(pricing.price)
                              )}
                            </p>
                            <span className="foleio-product-card-shop-btn" aria-hidden="true">
                              Shop
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {step === 'product' && selectedProduct ? (
                <div style={{ display: 'grid', gap: 16 }}>
                  {(() => {
                    const images = productImages(selectedProduct);
                    const pct = discountPercent(livePricing.price, livePricing.compareAtPrice);
                    return (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => images[0] && setLightboxIndex(0)}
                          style={{
                            position: 'relative',
                            aspectRatio: '1.2',
                            borderRadius: 12,
                            overflow: 'hidden',
                            background: '#1f1f1f',
                            border: 'none',
                            padding: 0,
                            cursor: images[0] ? 'zoom-in' : 'default',
                            display: 'block',
                            width: '100%',
                          }}
                          aria-label={images[0] ? `View ${selectedProduct.name} photo` : undefined}
                        >
                          {images[0] ? (
                            <Image
                              src={images[0]}
                              alt={selectedProduct.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}
                          {pct ? (
                            <div className="foleio-shop-image-badges">
                              <span className="foleio-shop-image-badge is-discount">
                                {pct}% off
                              </span>
                            </div>
                          ) : null}
                        </button>
                        {images.length > 1 ? (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns:
                                images.length >= 4
                                  ? 'repeat(4, minmax(0, 1fr))'
                                  : 'repeat(3, minmax(0, 1fr))',
                              gap: 8,
                            }}
                          >
                            {images.map((src, index) => (
                              <button
                                key={`${src}-${index}`}
                                type="button"
                                onClick={() => setLightboxIndex(index)}
                                style={{
                                  position: 'relative',
                                  aspectRatio: '1',
                                  borderRadius: 10,
                                  overflow: 'hidden',
                                  background: '#1f1f1f',
                                  border:
                                    lightboxIndex === index
                                      ? '2px solid #fafafa'
                                      : '2px solid transparent',
                                  padding: 0,
                                  cursor: 'zoom-in',
                                }}
                                aria-label={`View photo ${index + 1}`}
                              >
                                <Image
                                  src={src}
                                  alt={`${selectedProduct.name} ${index + 1}`}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                  {selectedProduct.description ? (
                    <p style={{ margin: 0, color: 'rgba(250,250,250,0.72)', fontSize: 14 }}>
                      {selectedProduct.description}
                    </p>
                  ) : null}
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                    {livePricing.compareAtPrice &&
                    livePricing.compareAtPrice > livePricing.price ? (
                      <>
                        <span
                          style={{
                            textDecoration: 'line-through',
                            marginRight: 8,
                            color: 'rgba(250,250,250,0.45)',
                            fontSize: 16,
                            fontWeight: 500,
                          }}
                        >
                          {formatNaira(livePricing.compareAtPrice)}
                        </span>
                        {formatNaira(liveUnitPrice)}
                      </>
                    ) : (
                      formatNaira(liveUnitPrice)
                    )}
                  </p>

                  {selectedProduct && !isGiftCardProduct(selectedProduct)
                    ? selectedProduct.variants.map((variant) => {
                        const showSwatches =
                          isColorVariantName(variant.name) ||
                          variant.options.every((option) => isHexColor(option));
                        return (
                          <div key={variant.id}>
                            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>
                              {variant.name}
                            </p>
                            <div style={{ display: 'grid', gap: 8 }} role="radiogroup" aria-label={variant.name}>
                              {variant.options.map((option) => {
                                const selected = selectedVariants[variant.name] === option;
                                return (
                                  <label
                                    key={option}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      fontSize: 14,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <input
                                      type="radio"
                                      name={`variant-${variant.id}`}
                                      checked={selected}
                                      onChange={() =>
                                        setSelectedVariants((prev) => ({
                                          ...prev,
                                          [variant.name]: option,
                                        }))
                                      }
                                    />
                                    {showSwatches && isHexColor(option) ? (
                                      <span
                                        aria-hidden
                                        style={{
                                          width: 16,
                                          height: 16,
                                          borderRadius: 999,
                                          background: option,
                                          border: '1px solid rgba(255,255,255,0.35)',
                                          flexShrink: 0,
                                        }}
                                      />
                                    ) : null}
                                    {option}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    : null}

                  {selectedProduct &&
                  !isGiftCardProduct(selectedProduct) &&
                  addonCategories.length > 0 ? (
                    <div style={{ display: 'grid', gap: 14 }}>
                      {addonCategories.map((category) => (
                        <div key={category.id}>
                          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>
                            {category.name}
                            {category.required ? (
                              <span style={{ color: '#fca5a5', marginLeft: 6 }}>*</span>
                            ) : (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontWeight: 400,
                                  opacity: 0.55,
                                  fontSize: 12,
                                }}
                              >
                                optional
                              </span>
                            )}
                          </p>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {category.options.map((option) => {
                              const checked = selectedAddonIds.includes(option.id);
                              const available = isAddonOptionAvailable(option);
                              return (
                                <label
                                  key={option.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    fontSize: 14,
                                    opacity: available ? 1 : 0.45,
                                    cursor: available ? 'pointer' : 'not-allowed',
                                  }}
                                >
                                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                      type={category.required ? 'radio' : 'checkbox'}
                                      name={category.required ? `addon-${category.id}` : undefined}
                                      checked={checked}
                                      disabled={!available}
                                      onChange={() => {
                                        if (!available) return;
                                        if (category.required) {
                                          const otherIds = category.options.map((row) => row.id);
                                          setSelectedAddonIds((prev) => [
                                            ...prev.filter((id) => !otherIds.includes(id)),
                                            option.id,
                                          ]);
                                          return;
                                        }
                                        setSelectedAddonIds((prev) =>
                                          prev.includes(option.id)
                                            ? prev.filter((id) => id !== option.id)
                                            : [...prev, option.id]
                                        );
                                      }}
                                    />
                                    {option.name}
                                    {option.stock != null ? (
                                      <span
                                        style={{
                                          fontSize: 12,
                                          opacity: 0.65,
                                          fontWeight: 400,
                                        }}
                                      >
                                        {option.stock <= 0
                                          ? '· Out of stock'
                                          : `· ${option.stock} left`}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span>+{formatNaira(option.price)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {selectedProduct && isGiftCardProduct(selectedProduct) ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 13, color: 'rgba(250,250,250,0.72)' }}>
                        Face value · unlimited stock
                      </p>
                      <input
                        className="foleio-shop-field"
                        placeholder="Send gift card code to (optional)"
                        type="email"
                        value={giftCardSendToEmail}
                        onChange={(event) => setGiftCardSendToEmail(event.target.value)}
                      />
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(250,250,250,0.55)' }}>
                        Defaults to your email at checkout if left blank
                      </p>
                    </div>
                  ) : null}

                  <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                    Quantity
                    <input
                      className="foleio-shop-field"
                      type="number"
                      min={Math.max(1, Number(selectedProduct?.minOrderQuantity) || 1)}
                      max={
                        selectedProduct && isGiftCardProduct(selectedProduct)
                          ? 99
                          : selectedProduct.stock || 1
                      }
                      value={quantity}
                      onChange={(event) => {
                        const minQty = Math.max(1, Number(selectedProduct?.minOrderQuantity) || 1);
                        setQuantity(
                          Math.max(
                            minQty,
                            Math.min(
                              selectedProduct && isGiftCardProduct(selectedProduct)
                                ? 99
                                : Number(selectedProduct.stock || 1),
                              Number(event.target.value) || minQty
                            )
                          )
                        );
                      }}
                    />
                    {selectedProduct &&
                    Math.max(1, Number(selectedProduct.minOrderQuantity) || 1) > 1 ? (
                      <span style={{ fontSize: 12, color: 'rgba(250,250,250,0.55)' }}>
                        Minimum {Math.max(1, Number(selectedProduct.minOrderQuantity) || 1)}
                      </span>
                    ) : null}
                    {selectedProduct ? (
                      <span style={{ fontSize: 12, color: 'rgba(250,250,250,0.55)' }}>
                        {formatPrepEstimateLabel(
                          selectedProduct.prepDaysMin,
                          selectedProduct.prepDaysMax
                        )}
                      </span>
                    ) : null}
                  </label>
                </div>
              ) : null}

              {step === 'cart' ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {cart.length === 0 ? (
                    <p style={{ margin: 0, color: 'rgba(250,250,250,0.65)', fontSize: 14 }}>
                      Your cart is empty.
                    </p>
                  ) : (
                    cartPrepGroups.map((group) => (
                      <div key={group.key} style={{ display: 'grid', gap: 8 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: 'rgba(250,250,250,0.55)',
                          }}
                        >
                          {group.label}
                        </p>
                        {group.items.map((item) => {
                          const index = cart.indexOf(item);
                          const variantLabel = Object.entries(item.selectedVariants)
                            .map(([name, value]) => `${name}: ${value}`)
                            .join(' · ');
                          return (
                            <div
                              key={`${item.product.id}-${index}`}
                              style={{
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12,
                                padding: 12,
                                display: 'grid',
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  alignItems: 'flex-start',
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 600 }}>{item.product.name}</p>
                                  <p
                                    style={{
                                      margin: '4px 0 0',
                                      fontSize: 13,
                                      color: 'rgba(250,250,250,0.65)',
                                    }}
                                  >
                                    {item.quantity} × {formatNaira(item.unitPrice)}
                                    {variantLabel ? ` · ${variantLabel}` : ''}
                                    {item.selectedAddons.length
                                      ? ` · ${item.selectedAddons
                                          .map((addon) => addon.name)
                                          .join(', ')}`
                                      : ''}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="foleio-shop-btn-ghost"
                                  aria-label={`Remove ${item.product.name} from cart`}
                                  onClick={() => removeCartItem(index)}
                                  style={{
                                    flexShrink: 0,
                                    padding: '6px 10px',
                                    fontSize: 12,
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}

                  {cart.length > 0 && needsDelivery ? (
                    <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Choose delivery</p>
                      {deliveryTiers.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 13, color: '#fca5a5' }}>
                          This shop has no delivery options yet. Please contact the creator.
                        </p>
                      ) : (
                        deliveryTiers.map((tier) => (
                          <label
                            key={tier.id}
                            style={{
                              display: 'grid',
                              gap: 4,
                              border:
                                deliveryTierId === tier.id
                                  ? '1px solid rgba(255,255,255,0.35)'
                                  : '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 10,
                              padding: 10,
                              fontSize: 13,
                              cursor: 'pointer',
                              background:
                                deliveryTierId === tier.id
                                  ? 'rgba(255,255,255,0.06)'
                                  : 'transparent',
                            }}
                          >
                            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input
                                type="radio"
                                name="deliveryTierCart"
                                checked={deliveryTierId === tier.id}
                                onChange={() => {
                                  setDeliveryTierId(tier.id);
                                  setError(null);
                                }}
                              />
                              <strong>{tier.name}</strong>
                              <span style={{ marginLeft: 'auto', opacity: 0.8 }}>
                                {tier.type === 'paid'
                                  ? formatNaira(tier.flatRate)
                                  : tier.type === 'free'
                                    ? 'Free'
                                    : tier.type === 'customer_arranged'
                                      ? 'You arrange'
                                      : 'Pickup'}
                              </span>
                            </span>
                            {tier.description ? (
                              <span style={{ opacity: 0.65, paddingLeft: 24 }}>
                                {tier.description}
                              </span>
                            ) : null}
                            {tier.type === 'customer_arranged' &&
                            (tier.contactPhone || merchantPhone) ? (
                              <span
                                style={{
                                  opacity: 0.72,
                                  paddingLeft: 24,
                                  fontSize: 12,
                                }}
                              >
                                Call {tier.contactPhone || merchantPhone} to arrange
                              </span>
                            ) : null}
                          </label>
                        ))
                      )}
                    </div>
                  ) : null}

                  {selectedTier?.type === 'customer_arranged' ? (
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: 13,
                        color: 'rgba(250,250,250,0.78)',
                      }}
                    >
                      {selectedTier.contactPhone || merchantPhone
                        ? `Call ${selectedTier.contactPhone || merchantPhone} to arrange delivery`
                        : 'Merchant contact phone will appear on your receipt after checkout.'}
                    </p>
                  ) : null}

                  {cart.length > 0 ? (
                    <div
                      style={{
                        display: 'grid',
                        gap: 6,
                        paddingTop: 12,
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          fontSize: 14,
                          color: 'rgba(250,250,250,0.72)',
                        }}
                      >
                        <span>Subtotal</span>
                        <span>{formatNaira(cartSubtotal)}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          fontSize: 14,
                          color: 'rgba(250,250,250,0.72)',
                        }}
                      >
                        <span>Delivery</span>
                        <span>
                          {deliverySelected
                            ? selectedTier?.type === 'paid'
                              ? formatNaira(deliveryFee)
                              : 'Free'
                            : 'Select option'}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          fontSize: 16,
                          fontWeight: 700,
                          marginTop: 2,
                        }}
                      >
                        <span>Total</span>
                        <span>{deliverySelected ? formatNaira(payableTotal) : '—'}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === 'checkout' ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Who is this for?</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        type="button"
                        className={!address.isGift ? 'foleio-shop-btn' : 'foleio-shop-btn-ghost'}
                        aria-pressed={!address.isGift}
                        style={{
                          padding: '10px 12px',
                          fontSize: 13,
                          background: !address.isGift ? '#fafafa' : 'transparent',
                          color: !address.isGift ? '#18181b' : 'rgba(250,250,250,0.38)',
                          border: !address.isGift
                            ? 'none'
                            : '1px solid rgba(255,255,255,0.1)',
                          opacity: !address.isGift ? 1 : 0.55,
                        }}
                        onClick={() => setAddress((prev) => ({ ...prev, isGift: false }))}
                      >
                        For me
                      </button>
                      <button
                        type="button"
                        className={address.isGift ? 'foleio-shop-btn' : 'foleio-shop-btn-ghost'}
                        aria-pressed={address.isGift}
                        style={{
                          padding: '10px 12px',
                          fontSize: 13,
                          background: address.isGift ? '#fafafa' : 'transparent',
                          color: address.isGift ? '#18181b' : 'rgba(250,250,250,0.38)',
                          border: address.isGift
                            ? 'none'
                            : '1px solid rgba(255,255,255,0.1)',
                          opacity: address.isGift ? 1 : 0.55,
                        }}
                        onClick={() => setAddress((prev) => ({ ...prev, isGift: true }))}
                      >
                        This is a gift
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    <input
                      className="foleio-shop-field"
                      placeholder="First name *"
                      autoComplete="given-name"
                      aria-required="true"
                      required
                      value={address.firstName}
                      onChange={(event) =>
                        setAddress((prev) => ({ ...prev, firstName: event.target.value }))
                      }
                    />
                    <input
                      className="foleio-shop-field"
                      placeholder="Last name"
                      value={address.lastName}
                      onChange={(event) =>
                        setAddress((prev) => ({ ...prev, lastName: event.target.value }))
                      }
                    />
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    <input
                      className="foleio-shop-field"
                      placeholder="Email *"
                      type="email"
                      autoComplete="email"
                      aria-required="true"
                      required
                      value={address.email}
                      onChange={(event) =>
                        setAddress((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                    <input
                      className="foleio-shop-field"
                      placeholder="Phone *"
                      type="tel"
                      autoComplete="tel"
                      aria-required="true"
                      required
                      value={address.phone}
                      onChange={(event) =>
                        setAddress((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                  </div>
                  <textarea
                    className="foleio-shop-field"
                    placeholder="Order notes (optional)"
                    rows={3}
                    value={address.notes}
                    onChange={(event) =>
                      setAddress((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    style={{ resize: 'vertical', minHeight: 72 }}
                  />

                  {address.isGift ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Occasion</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(
                          [
                            ['birthday', 'Birthday'],
                            ['anniversary', 'Anniversary'],
                            ['wedding', 'Wedding'],
                            ['special', 'Special'],
                            ['custom', 'Custom'],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            className="foleio-shop-btn-ghost"
                            style={{
                              padding: '8px 12px',
                              fontSize: 12,
                              background: address.occasion === value ? '#fafafa' : 'transparent',
                              color: address.occasion === value ? '#18181b' : '#fafafa',
                              border:
                                address.occasion === value
                                  ? '1px solid #fafafa'
                                  : '1px solid rgba(255,255,255,0.16)',
                            }}
                            onClick={() => setAddress((prev) => ({ ...prev, occasion: value }))}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {address.occasion === 'custom' ? (
                        <input
                          className="foleio-shop-field"
                          placeholder="Custom occasion"
                          value={address.customOccasion}
                          onChange={(event) =>
                            setAddress((prev) => ({
                              ...prev,
                              customOccasion: event.target.value,
                            }))
                          }
                        />
                      ) : null}
                      <input
                        className="foleio-shop-field"
                        placeholder="Recipient name"
                        value={address.recipientName}
                        onChange={(event) =>
                          setAddress((prev) => ({
                            ...prev,
                            recipientName: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="foleio-shop-field"
                        placeholder="Recipient email"
                        type="email"
                        value={address.recipientEmail}
                        onChange={(event) =>
                          setAddress((prev) => ({
                            ...prev,
                            recipientEmail: event.target.value,
                          }))
                        }
                      />
                      <textarea
                        className="foleio-shop-field"
                        placeholder="Gift message (optional)"
                        rows={3}
                        value={address.giftMessage}
                        onChange={(event) =>
                          setAddress((prev) => ({
                            ...prev,
                            giftMessage: event.target.value,
                          }))
                        }
                        style={{ resize: 'vertical', minHeight: 72 }}
                      />
                    </div>
                  ) : null}

                  {cart.some((item) => isGiftCardProduct(item.product)) ? (
                    <input
                      className="foleio-shop-field"
                      placeholder="Send gift card code to (email, optional)"
                      type="email"
                      value={
                        cart.find((item) => item.giftCardSendToEmail)?.giftCardSendToEmail ||
                        address.email
                      }
                      readOnly
                      style={{ opacity: 0.75 }}
                    />
                  ) : null}

                  {needsStreetAddress ? (
                    <>
                      <input
                        className="foleio-shop-field"
                        placeholder="Address *"
                        autoComplete="street-address"
                        aria-required="true"
                        required
                        value={address.address}
                        onChange={(event) =>
                          setAddress((prev) => ({ ...prev, address: event.target.value }))
                        }
                      />
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 10,
                        }}
                      >
                        <ShopSearchSelect
                          value={address.state}
                          options={NIGERIA_STATES}
                          placeholder="State"
                          searchPlaceholder="Search states"
                          onChange={(state) =>
                            setAddress((prev) => ({
                              ...prev,
                              state,
                              city: nigeriaCities(state).includes(prev.city) ? prev.city : '',
                            }))
                          }
                        />
                        <ShopSearchSelect
                          value={address.city}
                          options={stateCities}
                          placeholder={address.state ? 'City' : 'Select state first'}
                          searchPlaceholder="Search cities"
                          disabled={!address.state}
                          onChange={(city) => setAddress((prev) => ({ ...prev, city }))}
                        />
                      </div>
                    </>
                  ) : null}

                  {needsCustomDeliveryBlock ? (
                    <div
                      style={{
                        display: 'grid',
                        gap: 8,
                        marginTop: 8,
                        paddingTop: 12,
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                        Custom delivery details
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(250,250,250,0.55)' }}>
                        Needed for items that require special logistics.
                      </p>
                      {merchantPhone ? (
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(250,250,250,0.72)' }}>
                          Merchant contact: {merchantPhone}
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(250,250,250,0.45)' }}>
                          Merchant phone not listed — you can still complete checkout.
                        </p>
                      )}
                      <input
                        className="foleio-shop-field"
                        placeholder="Phone for custom delivery"
                        value={customDelivery.phone}
                        onChange={(event) =>
                          setCustomDelivery((prev) => ({
                            ...prev,
                            phone: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="foleio-shop-field"
                        placeholder="Notes (optional)"
                        value={customDelivery.notes}
                        onChange={(event) =>
                          setCustomDelivery((prev) => ({
                            ...prev,
                            notes: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : null}

                  {cartPrepGroups.length > 0 ? (
                    <div
                      style={{
                        display: 'grid',
                        gap: 6,
                        marginTop: 8,
                        paddingTop: 10,
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Order timing</p>
                      {cartPrepGroups.map((group) => (
                        <p
                          key={group.key}
                          style={{
                            margin: 0,
                            fontSize: 13,
                            color: 'rgba(250,250,250,0.72)',
                          }}
                        >
                          {group.label}: {group.items.map((item) => item.product.name).join(', ')}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <p id="shop-checkout-error" style={{ color: '#fca5a5', marginTop: 12, fontSize: 13 }}>
                  {error}
                </p>
              ) : null}
              </div>
            </div>

            <div className="foleio-shop-drawer-footer">
              {step === 'product' ? (
                <button type="button" className="foleio-shop-btn" onClick={addSelectedToCart}>
                  Add to cart · {formatNaira(liveUnitPrice * quantity)}
                </button>
              ) : null}
              {step === 'cart' ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <button
                    type="button"
                    className="foleio-shop-btn-ghost"
                    onClick={() => {
                      setSelectedProduct(null);
                      setStep('product');
                    }}
                  >
                    Keep shopping
                  </button>
                  <button
                    type="button"
                    className="foleio-shop-btn"
                    onClick={goToCheckout}
                    disabled={
                      cart.length === 0 ||
                      (needsDelivery && deliveryTiers.length === 0) ||
                      (deliverySelectionRequired && !deliveryTierId)
                    }
                  >
                    Checkout
                    {deliverySelected || !needsDelivery ? ` · ${formatNaira(payableTotal)}` : ''}
                  </button>
                </div>
              ) : null}
              {step === 'checkout' ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <button
                    type="button"
                    className="foleio-shop-btn-ghost"
                    onClick={() => {
                      setError(null);
                      setStep('cart');
                    }}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft strokeWidth={1.75} style={{ width: 16, height: 16 }} />
                    Back
                  </button>
                  <button
                    type="button"
                    className="foleio-shop-btn"
                    onClick={() => void pay()}
                    disabled={
                      isSubmitting ||
                      (needsDelivery && deliveryTiers.length === 0) ||
                      (deliverySelectionRequired && !deliveryTierId)
                    }
                  >
                    {isSubmitting
                      ? 'Starting payment…'
                      : payableTotal <= 0 && promoApplied
                        ? 'Complete order'
                        : `Pay ${formatNaira(payableTotal)}`}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {lightboxIndex != null && selectedProduct
        ? (() => {
            const images = productImages(selectedProduct);
            const src = images[lightboxIndex];
            if (!src) return null;
            return (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Product photo"
                onClick={() => setLightboxIndex(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 80,
                  background: 'rgba(0,0,0,0.88)',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  aria-label="Close photo"
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.4)',
                    color: '#fafafa',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <X strokeWidth={1.75} style={{ width: 18, height: 18 }} />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={selectedProduct.name}
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    maxWidth: 'min(920px, 100%)',
                    maxHeight: '85vh',
                    objectFit: 'contain',
                    borderRadius: 12,
                  }}
                />
              </div>
            );
          })()
        : null}
    </>
  );
}

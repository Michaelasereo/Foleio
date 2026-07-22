'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, X } from 'lucide-react';
import {
  flattenAddonOptions,
  parseAddonCategories,
  validateRequiredAddons,
  type AddonOption,
} from '@/lib/shop/product-addons';
import { resolveProductPricing } from '@/lib/shop/preorder';
import { resolveDeliveryFeeKobo } from '@/lib/shop/delivery-fee';
import { productCardCss } from '@/components/shop/product-card-styles';

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

type ShopCatalogPayload = {
  creatorId: string;
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
        products: (Array.isArray(data.products) ? data.products : []).map(
          (product: ShopProduct) => ({
            ...product,
            isPreorder: Boolean(product.isPreorder),
            preorderSettings: product.preorderSettings ?? null,
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
  overflow-y: auto;
  padding: 16px 20px 24px;
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
  color: #5c6070;
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
}: {
  username: string;
  embedded?: boolean;
}) {
  const cachedCatalog = shopCatalogCache.get(username);
  const [creatorId, setCreatorId] = useState(cachedCatalog?.creatorId || '');
  const [products, setProducts] = useState<ShopProduct[]>(
    cachedCatalog?.products || []
  );
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
  const [giftCardSendToEmail, setGiftCardSendToEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    const apply = (payload: ShopCatalogPayload) => {
      setCreatorId(payload.creatorId);
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
  }, [username]);

  const addonCategories = useMemo(
    () => (selectedProduct ? parseAddonCategories(selectedProduct.addons) : []),
    [selectedProduct]
  );

  const catalogAddons = useMemo(
    () => flattenAddonOptions(addonCategories),
    [addonCategories]
  );

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

  const deliverySelectionRequired = needsDelivery && deliveryTiers.length > 0;

  const selectedTier = useMemo(
    () => deliveryTiers.find((tier) => tier.id === deliveryTierId),
    [deliveryTiers, deliveryTierId]
  );

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

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

  const cartTotalBeforeCredit = cartSubtotal + deliveryFee;
  const payableTotal = cartTotalBeforeCredit;
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
    setQuantity(1);
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
        selectedProduct?.variants.length
          ? 'Select all variants first'
          : 'Could not add to cart'
      );
      return;
    }
    if (!isGiftCardProduct(selectedProduct)) {
      const requiredError = validateRequiredAddons(addonCategories, selectedAddonIds);
      if (requiredError) {
        setError(requiredError);
        return;
      }
    }
    const selectedAddons = catalogAddons.filter((addon) =>
      selectedAddonIds.includes(addon.id)
    );
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

  async function pay() {
    if (!creatorId || cart.length === 0) return;
    if (!address.firstName.trim() || !address.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }
    if (!address.email.trim() || !address.phone.trim()) {
      setError('Email and phone are required');
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
    if (
      needsDelivery &&
      selectedTier &&
      selectedTier.type !== 'pickup' &&
      (!address.address.trim() || !address.city.trim() || !address.state.trim())
    ) {
      setError('Delivery address, city, and state are required');
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
          giftCardCode: address.giftCardCode.trim() || null,
          deliveryTierId: needsDelivery ? deliveryTierId || null : null,
          deliveryAddress: {
            ...address,
            name: `${address.firstName.trim()} ${address.lastName.trim()}`.trim(),
            giftCardSendToEmail: cartGiftCardEmail || address.email.trim(),
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

  if (loading) {
    return embedded ? (
      <p className="foleio-public-empty">Loading shop…</p>
    ) : null;
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
            product.type === 'digital' ||
            product.type === 'gift_card' ||
            stockCount > 0;
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
                    {pricing.compareAtPrice &&
                    pricing.compareAtPrice > pricing.price ? (
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
      {products.length > PUBLIC_SHOP_PREVIEW ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button
            type="button"
            className="foleio-shop-btn-ghost"
            onClick={openCatalog}
          >
            View all
          </button>
        </div>
      ) : null}

      {selectedProduct ||
      step === 'cart' ||
      step === 'checkout' ||
      step === 'catalog' ? (
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
              {step === 'catalog' ? (
                <div className="foleio-product-card-list">
                  {products.map((product) => {
                    const pricing = shopProductPricing(product);
                    const pct = discountPercent(pricing.price, pricing.compareAtPrice);
                    const thumb = productImages(product)[0];
                    const stockCount = product.stock ?? 0;
                    const inStock =
                      product.type === 'digital' ||
                      product.type === 'gift_card' ||
                      stockCount > 0;
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
                              <span className="foleio-product-card-discount">
                                {pct}% off
                              </span>
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
                              className={`foleio-product-card-stock${
                                inStock ? '' : ' is-out'
                              }`}
                            >
                              {stockLabel}
                            </span>
                          </div>
                          <p className="foleio-product-card-desc">
                            {product.description?.trim() || 'View details and order.'}
                          </p>
                          <div className="foleio-product-card-footer">
                            <p className="foleio-product-card-price">
                              {pricing.compareAtPrice &&
                              pricing.compareAtPrice > pricing.price ? (
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
                            <span
                              className="foleio-product-card-shop-btn"
                              aria-hidden="true"
                            >
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
                    const pct = discountPercent(
                      livePricing.price,
                      livePricing.compareAtPrice
                    );
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
                          aria-label={
                            images[0] ? `View ${selectedProduct.name} photo` : undefined
                          }
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
                              <span className="foleio-shop-image-badge is-discount">{pct}% off</span>
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
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {variant.options.map((option) => {
                            const selected = selectedVariants[variant.name] === option;
                            if (showSwatches && isHexColor(option)) {
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() =>
                                    setSelectedVariants((prev) => ({
                                      ...prev,
                                      [variant.name]: option,
                                    }))
                                  }
                                  aria-label={option}
                                  title={option}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 999,
                                    border: selected
                                      ? '2px solid #fafafa'
                                      : '2px solid rgba(255,255,255,0.2)',
                                    background: option,
                                    boxShadow: selected
                                      ? '0 0 0 2px rgba(250,250,250,0.35)'
                                      : 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                />
                              );
                            }
                            return (
                              <button
                                key={option}
                                type="button"
                                className="foleio-shop-btn-ghost"
                                style={{
                                  background: selected
                                    ? 'rgba(250,250,250,0.12)'
                                    : 'transparent',
                                }}
                                onClick={() =>
                                  setSelectedVariants((prev) => ({
                                    ...prev,
                                    [variant.name]: option,
                                  }))
                                }
                              >
                                {option}
                              </button>
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
                              return (
                                <label
                                  key={option.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    fontSize: 14,
                                  }}
                                >
                                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                      type={category.required ? 'radio' : 'checkbox'}
                                      name={
                                        category.required
                                          ? `addon-${category.id}`
                                          : undefined
                                      }
                                      checked={checked}
                                      onChange={() => {
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
                      min={1}
                      max={
                        selectedProduct && isGiftCardProduct(selectedProduct)
                          ? 99
                          : selectedProduct.stock || 1
                      }
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(
                          Math.max(
                            1,
                            Math.min(
                              selectedProduct && isGiftCardProduct(selectedProduct)
                                ? 99
                                : Number(selectedProduct.stock || 1),
                              Number(event.target.value) || 1
                            )
                          )
                        )
                      }
                    />
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
                    cart.map((item, index) => {
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
                                  ? ` · ${item.selectedAddons.map((addon) => addon.name).join(', ')}`
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
                    })
                  )}

                  {cart.length > 0 && needsDelivery ? (
                    <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                        Choose delivery
                      </p>
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
                                    : 'Pickup'}
                              </span>
                            </span>
                            {tier.description ? (
                              <span style={{ opacity: 0.65, paddingLeft: 24 }}>
                                {tier.description}
                              </span>
                            ) : null}
                          </label>
                        ))
                      )}
                    </div>
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
                            ? selectedTier?.type === 'free' || selectedTier?.type === 'pickup'
                              ? 'Free'
                              : formatNaira(deliveryFee)
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
                        <span>
                          {deliverySelected ? formatNaira(payableTotal) : '—'}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === 'checkout' ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    <input
                      className="foleio-shop-field"
                      placeholder="First name"
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
                  <input
                    className="foleio-shop-field"
                    placeholder="Email"
                    type="email"
                    value={address.email}
                    onChange={(event) =>
                      setAddress((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                  <input
                    className="foleio-shop-field"
                    placeholder="Phone"
                    value={address.phone}
                    onChange={(event) =>
                      setAddress((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
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

                  <div style={{ display: 'grid', gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Who is this for?</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        type="button"
                        className={
                          !address.isGift ? 'foleio-shop-btn' : 'foleio-shop-btn-ghost'
                        }
                        style={{
                          padding: '10px 12px',
                          fontSize: 13,
                          background: !address.isGift
                            ? 'rgba(250,250,250,0.12)'
                            : undefined,
                        }}
                        onClick={() =>
                          setAddress((prev) => ({ ...prev, isGift: false }))
                        }
                      >
                        For me
                      </button>
                      <button
                        type="button"
                        className={
                          address.isGift ? 'foleio-shop-btn' : 'foleio-shop-btn-ghost'
                        }
                        style={{
                          padding: '10px 12px',
                          fontSize: 13,
                          background: address.isGift
                            ? 'rgba(250,250,250,0.12)'
                            : undefined,
                        }}
                        onClick={() =>
                          setAddress((prev) => ({ ...prev, isGift: true }))
                        }
                      >
                        This is a gift
                      </button>
                    </div>
                  </div>

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
                              background:
                                address.occasion === value
                                  ? 'rgba(250,250,250,0.12)'
                                  : 'transparent',
                              border:
                                address.occasion === value
                                  ? '1px solid rgba(255,255,255,0.35)'
                                  : undefined,
                            }}
                            onClick={() =>
                              setAddress((prev) => ({ ...prev, occasion: value }))
                            }
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

                  <div style={{ display: 'grid', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                      Gift card or coupon code
                    </p>
                    <input
                      className="foleio-shop-field"
                      placeholder="Enter code (optional)"
                      value={address.giftCardCode}
                      onChange={(event) =>
                        setAddress((prev) => ({
                          ...prev,
                          giftCardCode: event.target.value.toUpperCase(),
                        }))
                      }
                    />
                    {address.giftCardCode.trim() ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: 'rgba(250,250,250,0.55)',
                        }}
                      >
                        Balance will be applied at checkout
                      </p>
                    ) : null}
                  </div>

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

                  {needsDelivery && selectedTier?.type !== 'pickup' ? (
                    <>
                      <input
                        className="foleio-shop-field"
                        placeholder="Address"
                        value={address.address}
                        onChange={(event) =>
                          setAddress((prev) => ({ ...prev, address: event.target.value }))
                        }
                      />
                      <input
                        className="foleio-shop-field"
                        placeholder="City"
                        value={address.city}
                        onChange={(event) =>
                          setAddress((prev) => ({ ...prev, city: event.target.value }))
                        }
                      />
                      <input
                        className="foleio-shop-field"
                        placeholder="State"
                        value={address.state}
                        onChange={(event) =>
                          setAddress((prev) => ({ ...prev, state: event.target.value }))
                        }
                      />
                    </>
                  ) : null}
                  <div
                    style={{
                      display: 'grid',
                      gap: 6,
                      marginTop: 4,
                      paddingTop: 10,
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 14,
                        color: 'rgba(250,250,250,0.72)',
                      }}
                    >
                      <span>Subtotal</span>
                      <span>{formatNaira(cartSubtotal)}</span>
                    </div>
                    {needsDelivery && selectedTier ? (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 14,
                          color: 'rgba(250,250,250,0.72)',
                        }}
                      >
                        <span>Delivery · {selectedTier.name}</span>
                        <span>
                          {selectedTier.type === 'paid'
                            ? formatNaira(deliveryFee)
                            : 'Free'}
                        </span>
                      </div>
                    ) : null}
                    {address.giftCardCode.trim() ? (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 14,
                          color: 'rgba(250,250,250,0.72)',
                        }}
                      >
                        <span>Gift card</span>
                        <span>Applied at checkout</span>
                      </div>
                    ) : null}
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>
                      Total {formatNaira(payableTotal)}
                    </p>
                  </div>
                </div>
              ) : null}

              {error ? (
                <p style={{ color: '#fca5a5', marginTop: 12, fontSize: 13 }}>{error}</p>
              ) : null}
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
                    {deliverySelected || !needsDelivery
                      ? ` · ${formatNaira(payableTotal)}`
                      : ''}
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
                      : payableTotal <= 0 && address.giftCardCode.trim()
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

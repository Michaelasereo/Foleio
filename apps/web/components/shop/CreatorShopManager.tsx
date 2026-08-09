'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Download,
  FileEdit,
  Gift,
  ImagePlus,
  Loader2,
  Lock,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { RemoteImage } from '@/components/creator/RemoteImage';
import { MIN_PAYABLE_NAIRA, MIN_PAYABLE_PRICE_ERROR } from '@/lib/payments/min-amount';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { FieldInfoTip } from '@/components/ui/FieldInfoTip';
import { parseAddonCategories } from '@/lib/shop/product-addons';
import { parsePreorderSettings, resolveProductPricing } from '@/lib/shop/preorder';
import { koboToNairaInput, nairaInputToKobo } from '@/lib/shop/money';
import {
  downloadProductCsvTemplate,
  parseProductCsv,
  type ParsedProductCsvRow,
} from '@/lib/shop/product-csv';
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import {
  getCreatorPlan,
  getCreatorPlanLimits,
  type PlatformPlan,
} from '@/lib/utils/plan-limits';
import { productCardCss } from '@/components/shop/product-card-styles';

type Variant = { id?: string; name: string; options: string[] };
type Addon = { id: string; name: string; price: number };
type AddonCategoryForm = {
  id: string;
  name: string;
  required: boolean;
  options: Array<{ id: string; name: string; price: string; stock: string }>;
};

type PreorderPhaseForm = {
  id: string;
  startDate: string;
  startTime: string;
  type: 'percent' | 'amount';
  value: string;
};

type PreorderForm = {
  startDate: string;
  startTime: string;
  releaseDate: string;
  releaseTime: string;
  preorderPrice: string;
  preorderCompareAtPrice: string;
  postPreorderPrice: string;
  postPreorderCompareAtPrice: string;
  phases: PreorderPhaseForm[];
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  weight: number | null;
  type: string;
  imageUrl: string | null;
  imageUrls?: string[];
  digitalFileUrl?: string | null;
  stock: number | null;
  showLimitedStock?: boolean;
  status: 'draft' | 'active';
  orderIndex: number;
  isPreorder: boolean;
  minOrderQuantity?: number;
  prepDaysMin?: number | null;
  prepDaysMax?: number | null;
  requiresCustomDelivery?: boolean;
  preorderSettings?: unknown;
  addons: Addon[] | unknown;
  variants: Variant[];
};

type ShopCoupon = {
  id: string;
  code: string;
  type: 'percent' | 'fixed' | string;
  value: number;
  minSubtotalKobo: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  createdAt: string;
};

function emptyCouponForm() {
  return {
    id: '',
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: '',
    minSubtotalNaira: '',
    maxUses: '',
    startDate: '',
    endDate: '',
    status: 'active' as 'active' | 'disabled',
  };
}

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PRODUCT_IMAGE_SLOTS_FALLBACK = 3;

function isColorVariantName(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized === 'color' || normalized === 'colour';
}

function isHexColor(value: string) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

function toColorInputValue(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9A-Fa-f]{3}$/i.test(trimmed)) {
    const short = trimmed.slice(1);
    return `#${short
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`;
  }
  return '#000000';
}

function normalizeHexInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return withHash.slice(0, 7);
}

function productImages(
  product: Pick<Product, 'imageUrl' | 'imageUrls'>,
  maxSlots = PRODUCT_IMAGE_SLOTS_FALLBACK
): string[] {
  const fromArray = Array.isArray(product.imageUrls)
    ? product.imageUrls.map(String).filter(Boolean)
    : [];
  if (fromArray.length > 0) return fromArray.slice(0, maxSlots);
  return product.imageUrl ? [product.imageUrl] : [];
}

type DeliveryTier = {
  id: string;
  name: string;
  description: string | null;
  type: 'paid' | 'free' | 'pickup' | 'customer_arranged' | string;
  flatRate: number;
  minSubtotalKobo?: number | null;
  minItemQuantity?: number | null;
  contactPhone?: string | null;
};

type Order = {
  id: string;
  status: string;
  total: number;
  deliveryFee: number;
  createdAt: string;
  deliveryAddress: Record<string, string>;
  deliveryTier?: { name: string; type: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    variantSelected: Record<string, string> | null;
    addonsSelected?: Addon[] | null;
    product: { id: string; name: string } | null;
  }>;
};

const ORDER_STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'delivered', label: 'Delivered' },
] as const;

function normalizeOrderStatus(status: string) {
  if (status === 'in_progress' || status === 'shipped') return 'processing';
  return status;
}

function formatNaira(kobo: number) {
  return `₦${(Math.round(kobo) / 100).toLocaleString('en-NG')}`;
}

function categoriesToForm(raw: unknown): AddonCategoryForm[] {
  return parseAddonCategories(raw).map((category) => ({
    id: category.id,
    name: category.name,
    required: category.required,
    options: category.options.map((option) => ({
      id: option.id,
      name: option.name,
      price: koboToNairaInput(option.price),
      stock: option.stock != null ? String(option.stock) : '',
    })),
  }));
}

function discountPercent(price: number, compareAt: number | null) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

function emptyPreorderForm(seed?: {
  price?: string;
  compareAtPrice?: string;
}): PreorderForm {
  return {
    startDate: '',
    startTime: '09:00',
    releaseDate: '',
    releaseTime: '12:00',
    preorderPrice: seed?.price || '',
    preorderCompareAtPrice: seed?.compareAtPrice || '',
    postPreorderPrice: seed?.price || '',
    postPreorderCompareAtPrice: seed?.compareAtPrice || '',
    phases: [],
  };
}

function splitIsoLocal(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '12:00' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '12:00' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function combineLocalDateTime(date: string, time: string): string | null {
  const d = date.trim();
  const t = time.trim() || '00:00';
  if (!d) return null;
  const parsed = new Date(`${d}T${t}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function settingsToPreorderForm(raw: unknown, fallbackPrice: string, fallbackCompare: string): PreorderForm {
  const settings = parsePreorderSettings(raw);
  if (!settings) {
    return emptyPreorderForm({ price: fallbackPrice, compareAtPrice: fallbackCompare });
  }
  const release = splitIsoLocal(settings.releaseAt);
  const start = splitIsoLocal(settings.startsAt);
  return {
    startDate: start.date,
    startTime: start.time,
    releaseDate: release.date,
    releaseTime: release.time,
    preorderPrice: koboToNairaInput(settings.preorderPrice),
    preorderCompareAtPrice:
      settings.preorderCompareAtPrice != null
        ? koboToNairaInput(settings.preorderCompareAtPrice)
        : '',
    postPreorderPrice: koboToNairaInput(settings.postPreorderPrice),
    postPreorderCompareAtPrice:
      settings.postPreorderCompareAtPrice != null
        ? koboToNairaInput(settings.postPreorderCompareAtPrice)
        : '',
    phases: settings.phases.map((phase) => {
      const phaseStart = splitIsoLocal(phase.startsAt);
      return {
        id: phase.id,
        startDate: phaseStart.date,
        startTime: phaseStart.time,
        type: phase.type,
        value:
          phase.type === 'amount' ? koboToNairaInput(phase.value) : String(phase.value),
      };
    }),
  };
}

function emptyProductForm() {
  return {
    id: '',
    name: '',
    description: '',
    price: '',
    /** Default sale price kept while a discount is active. */
    regularPrice: '',
    compareAtPrice: '',
    discountStartDate: '',
    discountStartTime: '00:00',
    discountEndDate: '',
    discountEndTime: '23:59',
    weight: '',
    imageUrls: [] as string[],
    type: 'physical' as 'physical' | 'digital' | 'gift_card',
    digitalFileUrl: '',
    digitalFileName: '',
    stock: '',
    showLimitedStock: false,
    status: 'active' as 'draft' | 'active',
    isPreorder: false,
    minOrderQuantity: '1',
    prepDaysMin: '',
    prepDaysMax: '',
    requiresCustomDelivery: false,
    discountEnabled: false,
    preorder: emptyPreorderForm(),
    variants: [] as Variant[],
    addons: [] as AddonCategoryForm[],
  };
}

function emptyTierForm() {
  return {
    id: '',
    name: '',
    description: '',
    type: 'paid' as 'paid' | 'free' | 'pickup' | 'customer_arranged',
    flatRate: '',
    minSubtotal: '',
    minItemQuantity: '',
    contactPhone: '',
  };
}

export function CreatorShopManager({
  platformPlan = null,
  platformSubscriptionActive = false,
  view = 'shop',
}: {
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
  /** Full shop, or a dedicated gift-cards / coupons management page. */
  view?: 'shop' | 'gift-cards' | 'coupons';
} = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const { isOpen, limitType, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();
  const currentPlan: PlatformPlan = getCreatorPlan(platformPlan ?? null);
  const limits = getCreatorPlanLimits({
    platformPlan,
    platformSubscriptionActive,
  });
  const productImageSlots = limits.maxProductImages;
  const isGiftCardsPage = view === 'gift-cards';
  const isCouponsPage = view === 'coupons';
  const isPromosSubpage = isGiftCardsPage || isCouponsPage;

  function goToBillingUpgrade() {
    router.push('/settings?tab=billing');
  }
  const [tab, setTab] = useState<'products' | 'gift-cards' | 'orders' | 'delivery'>(
    isGiftCardsPage || isCouponsPage ? 'gift-cards' : 'products'
  );
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'draft'>(
    'all'
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<ShopCoupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryTiers, setDeliveryTiers] = useState<DeliveryTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState(emptyCouponForm());
  const [couponError, setCouponError] = useState('');
  const [productDrawerView, setProductDrawerView] = useState<
    'details' | 'preorder' | 'discount'
  >('details');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isConvertingProduct, setIsConvertingProduct] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm());
  const [tierForm, setTierForm] = useState(emptyTierForm());
  const [deliveryComposer, setDeliveryComposer] = useState<
    'idle' | 'choose' | 'flat' | 'customer_arranged'
  >('idle');
  const [deliveryAction, setDeliveryAction] = useState<
    'saving' | 'free' | 'pickup' | 'customer_arranged' | null
  >(null);
  const [deletingTierId, setDeletingTierId] = useState<string | null>(null);
  const [productError, setProductError] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [slotPreview, setSlotPreview] = useState<Record<number, string>>({});
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<ParsedProductCsvRow[]>([]);
  const [csvParseError, setCsvParseError] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const isUploadingImage = uploadingSlot !== null;
  const isDigitalProduct = productForm.type === 'digital';
  const isGiftCardProduct = productForm.type === 'gift_card';
  const isNonPhysicalProduct = isDigitalProduct || isGiftCardProduct;

  async function fetchProducts() {
    const response = await fetch('/api/creator/products', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setProducts(data.products || []);
  }

  async function fetchCoupons() {
    const response = await fetch('/api/creator/coupons', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setCoupons(data.coupons || []);
  }

  async function fetchOrders() {
    const response = await fetch('/api/creator/orders', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setOrders(data.orders || []);
  }

  async function fetchDeliveryTiers() {
    const response = await fetch('/api/creator/delivery-tiers', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setDeliveryTiers(data.deliveryTiers || []);
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([
        fetchProducts(),
        fetchCoupons(),
        fetchOrders(),
        fetchDeliveryTiers(),
      ]);
      setLoading(false);
    })();
  }, []);

  function openCreateProduct() {
    if (products.length >= limits.maxProducts) {
      showUpgradeModal('maxProducts');
      return;
    }
    setProductForm(emptyProductForm());
    setSlotPreview({});
    setProductError('');
    setProductDrawerView('details');
    setIsProductDialogOpen(true);
  }

  function openCreateGiftCard() {
    if (!limits.canSellGiftCards) {
      showUpgradeModal('giftCards');
      return;
    }
    if (products.length >= limits.maxProducts) {
      showUpgradeModal('maxProducts');
      return;
    }
    setProductForm({
      ...emptyProductForm(),
      type: 'gift_card',
      stock: '',
      weight: '',
      showLimitedStock: false,
      isPreorder: false,
      discountEnabled: false,
      digitalFileUrl: '',
      digitalFileName: '',
      variants: [],
      addons: [],
    });
    setSlotPreview({});
    setProductError('');
    setProductDrawerView('details');
    setIsProductDialogOpen(true);
  }

  function openCreateCoupon() {
    if (!limits.canUseCoupons) {
      showUpgradeModal('coupons');
      return;
    }
    setCouponForm(emptyCouponForm());
    setCouponError('');
    setIsCouponDialogOpen(true);
  }

  function openEditCoupon(coupon: ShopCoupon) {
    if (!limits.canUseCoupons) {
      showUpgradeModal('coupons');
      return;
    }
    setCouponForm({
      id: coupon.id,
      code: coupon.code,
      type: coupon.type === 'fixed' ? 'fixed' : 'percent',
      value:
        coupon.type === 'fixed'
          ? koboToNairaInput(coupon.value)
          : String(coupon.value),
      minSubtotalNaira:
        coupon.minSubtotalKobo != null && coupon.minSubtotalKobo > 0
          ? koboToNairaInput(coupon.minSubtotalKobo)
          : '',
      maxUses: coupon.maxUses != null ? String(coupon.maxUses) : '',
      startDate: toDateInputValue(coupon.startsAt),
      endDate: toDateInputValue(coupon.endsAt),
      status: coupon.status === 'disabled' ? 'disabled' : 'active',
    });
    setCouponError('');
    setIsCouponDialogOpen(true);
  }

  function closeCouponDrawer() {
    if (isSavingCoupon) return;
    setIsCouponDialogOpen(false);
    setCouponError('');
  }

  async function saveCoupon(event: FormEvent) {
    event.preventDefault();
    if (isSavingCoupon) return;
    if (!limits.canUseCoupons) {
      showUpgradeModal('coupons');
      return;
    }

    const code = couponForm.code.trim().toUpperCase();
    if (code.length < 3) {
      setCouponError('Code must be at least 3 characters');
      return;
    }
    const valueNum = Number(couponForm.value);
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      setCouponError('Enter a valid discount value');
      return;
    }

    setIsSavingCoupon(true);
    setCouponError('');

    const payload = {
      code,
      type: couponForm.type,
      value: valueNum,
      valueIsNaira: couponForm.type === 'fixed',
      minSubtotalNaira: couponForm.minSubtotalNaira.trim() || null,
      maxUses: couponForm.maxUses.trim() || null,
      startsAt: couponForm.startDate ? `${couponForm.startDate}T00:00:00.000Z` : null,
      endsAt: couponForm.endDate ? `${couponForm.endDate}T23:59:59.999Z` : null,
      status: couponForm.status,
    };

    const response = await fetch(
      couponForm.id
        ? `/api/creator/coupons/${couponForm.id}`
        : '/api/creator/coupons',
      {
        method: couponForm.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    setIsSavingCoupon(false);

    if (!response.ok) {
      if (data.limitType === 'coupons') {
        showUpgradeModal('coupons');
        return;
      }
      setCouponError(data.error || 'Could not save coupon');
      return;
    }

    await fetchCoupons();
    setIsCouponDialogOpen(false);
    toast({
      title: couponForm.id ? 'Coupon updated' : 'Coupon created',
    });
  }

  async function toggleCouponActive(coupon: ShopCoupon) {
    if (!limits.canUseCoupons) {
      showUpgradeModal('coupons');
      return;
    }
    const nextStatus = coupon.status === 'active' ? 'disabled' : 'active';
    const response = await fetch(`/api/creator/coupons/${coupon.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (response.ok) await fetchCoupons();
  }

  async function deleteCoupon(couponId: string) {
    const response = await fetch(`/api/creator/coupons/${couponId}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      await fetchCoupons();
      toast({ title: 'Coupon deleted' });
    }
  }

  function closeCsvImport(force = false) {
    if (isImportingCsv && !force) return;
    setCsvImportOpen(false);
    setCsvRows([]);
    setCsvParseError('');
    setCsvFileName('');
    if (csvInputRef.current) csvInputRef.current.value = '';
  }

  function handleCsvFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvParseError('');
    setCsvRows([]);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseProductCsv(text);
      if (parsed.error) {
        setCsvParseError(parsed.error);
        setCsvRows([]);
        return;
      }
      setCsvRows(parsed.rows);
    };
    reader.onerror = () => {
      setCsvParseError('Could not read that file');
      setCsvRows([]);
    };
    reader.readAsText(file);
  }

  async function importCsvProducts() {
    const validRows = csvRows.filter((row) => !row.error);
    if (validRows.length === 0 || isImportingCsv) return;
    setIsImportingCsv(true);
    try {
      const response = await fetch('/api/creator/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: validRows.map((row) => ({
            name: row.name,
            description: row.description || null,
            price: row.price,
            stock: row.stock,
            weight: row.weight,
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.limitType === 'maxProducts') {
          showUpgradeModal('maxProducts');
          return;
        }
        toast({
          title: 'Import failed',
          description: data.error || 'Could not import products',
          variant: 'destructive',
        });
        return;
      }
      const created = Number(data.created || 0);
      const failedCount = Array.isArray(data.failed) ? data.failed.length : 0;
      toast({
        title:
          created === 1
            ? '1 product imported as draft'
            : `${created} products imported as drafts`,
        description:
          failedCount > 0
            ? `${failedCount} row${failedCount === 1 ? '' : 's'} skipped`
            : 'Add photos and publish when ready',
      });
      await fetchProducts();
      setIsImportingCsv(false);
      closeCsvImport(true);
    } catch {
      toast({
        title: 'Import failed',
        description: 'Could not import products',
        variant: 'destructive',
      });
    } finally {
      setIsImportingCsv(false);
    }
  }

  function openEditProduct(product: Product) {
    const addons = categoriesToForm(product.addons);
    const price = koboToNairaInput(product.price);
    const compareAtPrice = product.compareAtPrice
      ? koboToNairaInput(product.compareAtPrice)
      : '';
    const discountEnabled =
      Boolean(compareAtPrice) && !Boolean(product.isPreorder);
    const productType =
      product.type === 'digital'
        ? ('digital' as const)
        : product.type === 'gift_card'
          ? ('gift_card' as const)
          : ('physical' as const);
    const digitalKey = String(product.digitalFileUrl || '').trim();
    setProductForm({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price,
      // When a discount is live, restore target is the compare-at (old) price.
      regularPrice: discountEnabled ? compareAtPrice : price,
      compareAtPrice,
      discountStartDate: splitIsoLocal(product.discountStartsAt).date,
      discountStartTime: splitIsoLocal(product.discountStartsAt).time || '00:00',
      discountEndDate: splitIsoLocal(product.discountEndsAt).date,
      discountEndTime: splitIsoLocal(product.discountEndsAt).time || '23:59',
      weight: product.weight != null ? String(product.weight) : '',
      imageUrls: productImages(product, productImageSlots),
      type: productType,
      digitalFileUrl: digitalKey,
      digitalFileName: digitalKey
        ? digitalKey.split('/').pop() || 'download.pdf'
        : '',
      stock: product.stock != null ? String(product.stock) : '',
      showLimitedStock: Boolean(product.showLimitedStock),
      status: product.status,
      isPreorder: productType === 'physical' ? Boolean(product.isPreorder) : false,
      minOrderQuantity: String(Math.max(1, Number(product.minOrderQuantity) || 1)),
      prepDaysMin:
        product.prepDaysMin != null && Number(product.prepDaysMin) > 0
          ? String(product.prepDaysMin)
          : '',
      prepDaysMax:
        product.prepDaysMax != null && Number(product.prepDaysMax) > 0
          ? String(product.prepDaysMax)
          : '',
      requiresCustomDelivery: Boolean(product.requiresCustomDelivery),
      discountEnabled: productType === 'physical' ? discountEnabled : false,
      preorder: settingsToPreorderForm(product.preorderSettings, price, compareAtPrice),
      variants:
        productType === 'physical'
          ? product.variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
              options: variant.options.length > 0 ? [...variant.options] : [''],
            }))
          : [],
      addons: productType === 'physical' ? addons : [],
    });
    setSlotPreview({});
    setProductError('');
    setProductDrawerView('details');
    setIsProductDialogOpen(true);
  }

  function closeProductDrawer() {
    if (isSavingProduct || isUploadingImage || isUploadingPdf || isConvertingProduct) return;
    setIsProductDialogOpen(false);
    setProductDrawerView('details');
    setProductError('');
  }

  async function convertProductToService() {
    if (!productForm.id || isNonPhysicalProduct) return;
    if (
      !confirm(
        'Convert this product to a bookable service? The product will be removed and you will go to Bookings.'
      )
    ) {
      return;
    }
    setIsConvertingProduct(true);
    setProductError('');
    try {
      const response = await fetch('/api/creator/convert-offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: 'product', sourceId: productForm.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Conversion failed');
      }
      router.push(data.redirectPath || '/bookings');
    } catch (error) {
      setProductError(error instanceof Error ? error.message : 'Conversion failed');
    } finally {
      setIsConvertingProduct(false);
    }
  }

  function setProductType(nextType: 'physical' | 'digital' | 'gift_card') {
    if (nextType === 'digital' && !limits.canSellDigitalProducts) {
      goToBillingUpgrade();
      return;
    }
    if (nextType === 'gift_card' && !limits.canSellGiftCards) {
      showUpgradeModal('giftCards');
      return;
    }
    setProductForm((prev) => {
      if (prev.type === nextType) return prev;
      if (nextType === 'digital') {
        return {
          ...prev,
          type: 'digital',
          stock: '',
          weight: '',
          showLimitedStock: false,
          isPreorder: false,
          discountEnabled: false,
          variants: [],
          addons: [],
        };
      }
      if (nextType === 'gift_card') {
        return {
          ...prev,
          type: 'gift_card',
          stock: '',
          weight: '',
          showLimitedStock: false,
          isPreorder: false,
          discountEnabled: false,
          digitalFileUrl: '',
          digitalFileName: '',
          variants: [],
          addons: [],
        };
      }
      return {
        ...prev,
        type: 'physical',
        digitalFileUrl: '',
        digitalFileName: '',
      };
    });
  }

  function setPreorderEnabled(enabled: boolean) {
    if (enabled) {
      const alreadyPreorder = Boolean(productForm.isPreorder);
      const editingId = productForm.id;
      const otherPreorders = products.filter(
        (p) => p.isPreorder && p.id !== editingId
      ).length;
      if (!alreadyPreorder && otherPreorders >= limits.maxPreorderProducts) {
        showUpgradeModal('maxPreorderProducts');
        return;
      }
    }
    setProductForm((prev) => {
      if (!enabled) {
        return {
          ...prev,
          isPreorder: false,
          price: prev.preorder.postPreorderPrice || prev.price,
          compareAtPrice:
            prev.preorder.postPreorderCompareAtPrice || prev.compareAtPrice,
        };
      }
      const seeded =
        prev.preorder.preorderPrice || prev.preorder.postPreorderPrice
          ? prev.preorder
          : emptyPreorderForm({
              price: prev.price,
              compareAtPrice: prev.compareAtPrice,
            });
      return {
        ...prev,
        isPreorder: true,
        discountEnabled: false,
        compareAtPrice: '',
        preorder: seeded,
        price: seeded.postPreorderPrice || prev.regularPrice || prev.price,
        regularPrice: prev.regularPrice || prev.price,
      };
    });
    setProductDrawerView('details');
  }

  function setDiscountEnabled(enabled: boolean) {
    if (productForm.isPreorder) return;
    setProductForm((prev) => {
      if (enabled) {
        // Keep the default sale price aside; old + new prices are entered
        // independently and are not auto-filled from that default.
        return {
          ...prev,
          discountEnabled: true,
          regularPrice: prev.regularPrice || prev.price,
          compareAtPrice: '',
          price: '',
        };
      }
      // Restore the default sale price and clear strikethrough pricing.
      return {
        ...prev,
        discountEnabled: false,
        price: prev.regularPrice || prev.price,
        regularPrice: prev.regularPrice || prev.price,
        compareAtPrice: '',
      };
    });
    if (enabled) setProductDrawerView('discount');
    else setProductDrawerView('details');
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setProductError('');

    if (productForm.type === 'digital') {
      if (productForm.status === 'active' && !productForm.digitalFileUrl.trim()) {
        setProductError('Upload a PDF before publishing a digital product');
        setProductDrawerView('details');
        return;
      }
    }

    if (
      productForm.discountEnabled &&
      !productForm.isPreorder &&
      productForm.type === 'physical'
    ) {
      const oldPrice = Number(productForm.compareAtPrice);
      const newPrice = Number(productForm.price);
      if (!productForm.compareAtPrice.trim() || !Number.isFinite(oldPrice) || oldPrice <= 0) {
        setProductError('Set an old (compare-at) price for the discount');
        setProductDrawerView('discount');
        return;
      }
      if (!productForm.price.trim() || !Number.isFinite(newPrice) || newPrice < MIN_PAYABLE_NAIRA) {
        setProductError(MIN_PAYABLE_PRICE_ERROR);
        setProductDrawerView('discount');
        return;
      }
      if (oldPrice <= newPrice) {
        setProductError('Old price must be higher than the discounted price');
        setProductDrawerView('discount');
        return;
      }
    }

    let preorderSettingsPayload: Record<string, unknown> | null = null;
    if (productForm.type === 'physical' && productForm.isPreorder) {
      const startsAt = combineLocalDateTime(
        productForm.preorder.startDate,
        productForm.preorder.startTime
      );
      const releaseAt = combineLocalDateTime(
        productForm.preorder.releaseDate,
        productForm.preorder.releaseTime
      );
      if (!startsAt) {
        setProductError('Set a start date and time in preorder settings');
        setProductDrawerView('preorder');
        return;
      }
      if (!releaseAt) {
        setProductError('Set a release date and time in preorder settings');
        setProductDrawerView('preorder');
        return;
      }
      if (!productForm.preorder.preorderPrice.trim()) {
        setProductError('Set a preorder sale price in preorder settings');
        setProductDrawerView('preorder');
        return;
      }
      if (!productForm.preorder.postPreorderPrice.trim()) {
        setProductError('Set the sale price when preorder is over');
        setProductDrawerView('preorder');
        return;
      }
      for (let i = 0; i < productForm.preorder.phases.length; i += 1) {
        const phase = productForm.preorder.phases[i];
        const startsAt = combineLocalDateTime(phase.startDate, phase.startTime);
        if (!startsAt) {
          setProductError(`Discount phase ${i + 1} needs a start date and time`);
          setProductDrawerView('preorder');
          return;
        }
        if (!phase.value.trim() || Number(phase.value) <= 0) {
          setProductError(`Discount phase ${i + 1} needs a valid discount`);
          setProductDrawerView('preorder');
          return;
        }
      }
      preorderSettingsPayload = {
        startsAt,
        releaseAt,
        preorderPrice: koboToNairaInput(
          nairaInputToKobo(productForm.preorder.preorderPrice)
        ),
        preorderCompareAtPrice: productForm.preorder.preorderCompareAtPrice
          ? koboToNairaInput(
              nairaInputToKobo(productForm.preorder.preorderCompareAtPrice)
            )
          : null,
        postPreorderPrice: koboToNairaInput(
          nairaInputToKobo(productForm.preorder.postPreorderPrice)
        ),
        postPreorderCompareAtPrice: productForm.preorder.postPreorderCompareAtPrice
          ? koboToNairaInput(
              nairaInputToKobo(productForm.preorder.postPreorderCompareAtPrice)
            )
          : null,
        phases: productForm.preorder.phases.map((phase) => ({
          id: phase.id,
          startsAt: combineLocalDateTime(phase.startDate, phase.startTime),
          type: phase.type,
          value:
            phase.type === 'amount'
              ? koboToNairaInput(nairaInputToKobo(phase.value))
              : phase.value,
        })),
      };
    }

    let discountStartsAt: string | null = null;
    let discountEndsAt: string | null = null;
    if (
      productForm.type === 'physical' &&
      !productForm.isPreorder &&
      productForm.discountEnabled
    ) {
      discountStartsAt = combineLocalDateTime(
        productForm.discountStartDate,
        productForm.discountStartTime
      );
      discountEndsAt = combineLocalDateTime(
        productForm.discountEndDate,
        productForm.discountEndTime
      );
      if (productForm.discountStartDate && !discountStartsAt) {
        setProductError('Invalid discount start date/time');
        setProductDrawerView('discount');
        return;
      }
      if (productForm.discountEndDate && !discountEndsAt) {
        setProductError('Invalid discount end date/time');
        setProductDrawerView('discount');
        return;
      }
      if (
        discountStartsAt &&
        discountEndsAt &&
        new Date(discountStartsAt).getTime() >= new Date(discountEndsAt).getTime()
      ) {
        setProductError('Discount end must be after the start');
        setProductDrawerView('discount');
        return;
      }
    }

    const salePriceNaira = Number(
      productForm.isPreorder
        ? productForm.preorder.postPreorderPrice
        : productForm.discountEnabled
          ? productForm.price
          : productForm.regularPrice || productForm.price
    );
    if (!Number.isFinite(salePriceNaira) || salePriceNaira < MIN_PAYABLE_NAIRA) {
      setProductError(MIN_PAYABLE_PRICE_ERROR);
      setProductDrawerView('details');
      return;
    }
    if (productForm.isPreorder) {
      const preorderPriceNaira = Number(productForm.preorder.preorderPrice);
      if (!Number.isFinite(preorderPriceNaira) || preorderPriceNaira < MIN_PAYABLE_NAIRA) {
        setProductError(`Preorder ${MIN_PAYABLE_PRICE_ERROR.toLowerCase()}`);
        setProductDrawerView('preorder');
        return;
      }
    }

    setIsSavingProduct(true);
    const normalizeNairaField = (raw: string) =>
      koboToNairaInput(nairaInputToKobo(raw));
    const payload = {
      name: productForm.name,
      description: productForm.description,
      type: productForm.type,
      digitalFileUrl:
        productForm.type === 'digital' ? productForm.digitalFileUrl || null : null,
      price: normalizeNairaField(
        productForm.isPreorder
          ? productForm.preorder.postPreorderPrice
          : productForm.discountEnabled
            ? productForm.price
            : productForm.regularPrice || productForm.price
      ),
      compareAtPrice: productForm.isPreorder
        ? productForm.preorder.postPreorderCompareAtPrice
          ? normalizeNairaField(productForm.preorder.postPreorderCompareAtPrice)
          : null
        : productForm.discountEnabled
          ? productForm.compareAtPrice
            ? normalizeNairaField(productForm.compareAtPrice)
            : null
          : null,
      discountStartsAt: productForm.discountEnabled ? discountStartsAt : null,
      discountEndsAt: productForm.discountEnabled ? discountEndsAt : null,
      weight: isNonPhysicalProduct ? null : productForm.weight,
      imageUrls: productForm.imageUrls,
      imageUrl: productForm.imageUrls[0] || null,
      stock: isNonPhysicalProduct ? null : productForm.stock,
      showLimitedStock: isNonPhysicalProduct ? false : productForm.showLimitedStock,
      status: productForm.status,
      isPreorder: isNonPhysicalProduct ? false : productForm.isPreorder,
      minOrderQuantity: isNonPhysicalProduct
        ? 1
        : Math.max(1, Math.floor(Number(productForm.minOrderQuantity) || 1)),
      prepDaysMin: isNonPhysicalProduct
        ? null
        : productForm.prepDaysMin.trim()
          ? Math.max(0, Math.floor(Number(productForm.prepDaysMin) || 0))
          : null,
      prepDaysMax: isNonPhysicalProduct
        ? null
        : productForm.prepDaysMax.trim()
          ? Math.max(0, Math.floor(Number(productForm.prepDaysMax) || 0))
          : null,
      requiresCustomDelivery: isNonPhysicalProduct
        ? false
        : Boolean(productForm.requiresCustomDelivery),
      preorderSettings: isNonPhysicalProduct ? null : preorderSettingsPayload,
      variants:
        isNonPhysicalProduct
          ? []
          : productForm.variants
              .map((variant) => {
                const name = variant.name.trim();
                const options = variant.options
                  .map((option) => option.trim())
                  .filter(Boolean)
                  .map((option) =>
                    isColorVariantName(name) && !option.startsWith('#')
                      ? `#${option}`
                      : option
                  )
                  .filter((option) =>
                    isColorVariantName(name) ? isHexColor(option) : Boolean(option)
                  );
                return { ...variant, name, options };
              })
              .filter((variant) => variant.name && variant.options.length > 0),
      addons:
        isNonPhysicalProduct
          ? []
          : productForm.addons.map((category) => ({
              id: category.id,
              name: category.name,
              required: category.required,
              options: category.options.map((option) => ({
                id: option.id,
                name: option.name,
                price: koboToNairaInput(nairaInputToKobo(option.price)),
                stock:
                  option.stock.trim() === ''
                    ? null
                    : Math.max(0, Math.floor(Number(option.stock)) || 0),
              })),
            })),
    };

    const isEdit = Boolean(productForm.id);
    const response = await fetch(
      isEdit ? `/api/creator/products/${productForm.id}` : '/api/creator/products',
      {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    setIsSavingProduct(false);

    if (!response.ok) {
      if (
        data.limitType === 'maxProducts' ||
        data.limitType === 'maxPreorderProducts'
      ) {
        showUpgradeModal(data.limitType);
        return;
      }
      if (data.limitType === 'digitalProducts') {
        goToBillingUpgrade();
        return;
      }
      if (data.limitType === 'giftCards') {
        showUpgradeModal('giftCards');
        return;
      }
      setProductError(
        data.details || data.error || 'Could not save product'
      );
      return;
    }

    setIsProductDialogOpen(false);
    setProductDrawerView('details');
    await fetchProducts();
    toast({ title: isEdit ? 'Product updated' : 'Product created' });
  }

  async function toggleVisible(product: Product) {
    const nextStatus = product.status === 'active' ? 'draft' : 'active';
    const response = await fetch(`/api/creator/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusOnly: true, status: nextStatus }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast({
        title: 'Could not update visibility',
        description: data.error || 'Try again',
        variant: 'destructive',
      });
      return;
    }
    await fetchProducts();
  }

  async function deleteProduct(productId: string) {
    if (!confirm('Delete this product?')) return;
    const response = await fetch(`/api/creator/products/${productId}`, { method: 'DELETE' });
    if (response.ok) await fetchProducts();
  }

  async function moveProduct(productId: string, direction: -1 | 1) {
    const index = products.findIndex((product) => product.id === productId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= products.length) return;
    const next = [...products];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setProducts(next);
    await fetch('/api/creator/products/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: next.map((product) => product.id) }),
    });
  }

  async function uploadProductImage(file: File, slotIndex: number) {
    setUploadingSlot(slotIndex);
    setProductError('');
    const previewUrl = URL.createObjectURL(file);
    setSlotPreview((prev) => ({ ...prev, [slotIndex]: previewUrl }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'product-image');
    const response = await fetch('/api/creator/upload', { method: 'POST', body: formData });
    const data = await response.json();
    setUploadingSlot(null);
    setSlotPreview((prev) => {
      const next = { ...prev };
      delete next[slotIndex];
      return next;
    });
    URL.revokeObjectURL(previewUrl);

    if (!response.ok) {
      setProductError(data.error || 'Could not upload image');
      return;
    }

    setProductForm((prev) => {
      const urls = [...prev.imageUrls];
      if (slotIndex < urls.length) urls[slotIndex] = data.url;
      else urls.push(data.url);
      return { ...prev, imageUrls: urls.slice(0, productImageSlots) };
    });
  }

  async function uploadDigitalPdf(file: File) {
    if (!limits.canSellDigitalProducts) {
      goToBillingUpgrade();
      return;
    }
    setIsUploadingPdf(true);
    setProductError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'digital-product');
    const response = await fetch('/api/creator/upload', { method: 'POST', body: formData });
    const data = await response.json();
    setIsUploadingPdf(false);

    if (!response.ok) {
      if (data.limitType === 'digitalProducts') {
        goToBillingUpgrade();
        return;
      }
      setProductError(data.error || 'Could not upload PDF');
      return;
    }

    setProductForm((prev) => ({
      ...prev,
      digitalFileUrl: String(data.key || ''),
      digitalFileName: String(data.fileName || file.name),
    }));
  }

  function openImagePicker(slotIndex: number) {
    setPendingSlot(slotIndex);
    imageInputRef.current?.click();
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const slot = pendingSlot;
    event.target.value = '';
    setPendingSlot(null);
    if (file && slot != null) void uploadProductImage(file, slot);
  }

  function onPdfChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadDigitalPdf(file);
  }

  function removeImage(slotIndex: number) {
    setProductForm((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, index) => index !== slotIndex),
    }));
  }

  async function saveTier(event: FormEvent) {
    event.preventDefault();
    if (deliveryAction) return;

    const isCustomerArranged = tierForm.type === 'customer_arranged';
    if (isCustomerArranged && !tierForm.contactPhone.trim()) {
      toast({
        title: 'Phone required',
        description: 'Add a number buyers can call to arrange delivery',
        variant: 'destructive',
      });
      return;
    }

    const payload = isCustomerArranged
      ? {
          name: tierForm.name.trim() || 'Customer arranges delivery',
          description: tierForm.description || null,
          type: 'customer_arranged' as const,
          flatRate: 0,
          contactPhone: tierForm.contactPhone.trim(),
        }
      : {
          name: tierForm.name,
          description: tierForm.description,
          type: tierForm.type === 'free' ? 'free' : 'paid',
          flatRate: tierForm.type === 'paid' ? tierForm.flatRate : 0,
          minSubtotal:
            tierForm.type === 'paid' && tierForm.minSubtotal.trim()
              ? tierForm.minSubtotal
              : null,
          minItemQuantity:
            tierForm.type === 'paid' && tierForm.minItemQuantity.trim()
              ? Number(tierForm.minItemQuantity)
              : null,
          contactPhone: null,
        };
    const isEdit = Boolean(tierForm.id);
    setDeliveryAction(isCustomerArranged ? 'customer_arranged' : 'saving');

    try {
      const response = await fetch(
        isEdit ? `/api/creator/delivery-tiers/${tierForm.id}` : '/api/creator/delivery-tiers',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        toast({
          title: 'Could not save option',
          description: data.error || 'Try again',
          variant: 'destructive',
        });
        return;
      }
      setTierForm(emptyTierForm());
      setDeliveryComposer('idle');
      await fetchDeliveryTiers();
      toast({
        title: isCustomerArranged
          ? isEdit
            ? 'Contact phone updated'
            : 'Customer arranges delivery enabled'
          : isEdit
            ? 'Delivery option updated'
            : 'Delivery option added',
      });
    } catch {
      toast({
        title: 'Could not save option',
        description: 'Try again',
        variant: 'destructive',
      });
    } finally {
      setDeliveryAction(null);
    }
  }

  function startAddDelivery() {
    setTierForm(emptyTierForm());
    setDeliveryComposer('choose');
  }

  async function enableFreeDelivery() {
    if (deliveryAction) return;

    const existingFree = deliveryTiers.find((tier) => tier.type === 'free');
    if (existingFree) {
      setDeliveryComposer('idle');
      toast({ title: 'Free delivery is already enabled' });
      return;
    }
    setDeliveryAction('free');

    try {
      const response = await fetch('/api/creator/delivery-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Free delivery',
          description: null,
          type: 'free',
          flatRate: 0,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        toast({
          title: 'Could not enable free delivery',
          description: data.error || 'Try again',
          variant: 'destructive',
        });
        return;
      }
      setDeliveryComposer('idle');
      await fetchDeliveryTiers();
      toast({ title: 'Free delivery enabled' });
    } catch {
      toast({
        title: 'Could not enable free delivery',
        description: 'Try again',
        variant: 'destructive',
      });
    } finally {
      setDeliveryAction(null);
    }
  }

  async function enablePickup() {
    if (deliveryAction) return;

    const existingPickup = deliveryTiers.find((tier) => tier.type === 'pickup');
    if (existingPickup) {
      setDeliveryComposer('idle');
      toast({ title: 'Pickup is already enabled' });
      return;
    }
    setDeliveryAction('pickup');

    try {
      const response = await fetch('/api/creator/delivery-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pickup',
          description: null,
          type: 'pickup',
          flatRate: 0,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        toast({
          title: 'Could not enable pickup',
          description: data.error || 'Try again',
          variant: 'destructive',
        });
        return;
      }
      setDeliveryComposer('idle');
      await fetchDeliveryTiers();
      toast({ title: 'Pickup enabled' });
    } catch {
      toast({
        title: 'Could not enable pickup',
        description: 'Try again',
        variant: 'destructive',
      });
    } finally {
      setDeliveryAction(null);
    }
  }

  function openCustomerArrangedComposer(existing?: DeliveryTier) {
    if (existing) {
      setTierForm({
        id: existing.id,
        name: existing.name || 'Customer arranges delivery',
        description: existing.description || '',
        type: 'customer_arranged',
        flatRate: '',
        minSubtotal: '',
        minItemQuantity: '',
        contactPhone: existing.contactPhone || '',
      });
    } else {
      setTierForm({
        ...emptyTierForm(),
        type: 'customer_arranged',
        name: 'Customer arranges delivery',
      });
    }
    setDeliveryComposer('customer_arranged');
  }

  function chooseDeliveryType(type: 'paid' | 'free' | 'pickup' | 'customer_arranged') {
    if (type === 'free') {
      void enableFreeDelivery();
      return;
    }
    if (type === 'pickup') {
      void enablePickup();
      return;
    }
    if (type === 'customer_arranged') {
      const existing = deliveryTiers.find((tier) => tier.type === 'customer_arranged');
      if (existing) {
        setDeliveryComposer('idle');
        toast({ title: 'Customer arranges delivery is already enabled' });
        return;
      }
      openCustomerArrangedComposer();
      return;
    }
    setTierForm({
      ...emptyTierForm(),
      type: 'paid',
      name: '',
    });
    setDeliveryComposer('flat');
  }

  function cancelDeliveryComposer() {
    setTierForm(emptyTierForm());
    setDeliveryComposer('idle');
  }

  function editTier(tier: DeliveryTier) {
    if (tier.type === 'free' || tier.type === 'pickup') {
      return;
    }
    if (tier.type === 'customer_arranged') {
      openCustomerArrangedComposer(tier);
      return;
    }
    setTierForm({
      id: tier.id,
      name: tier.name,
      description: tier.description || '',
      type: 'paid',
      flatRate: koboToNairaInput(tier.flatRate),
      minSubtotal:
        tier.minSubtotalKobo != null ? koboToNairaInput(tier.minSubtotalKobo) : '',
      minItemQuantity:
        tier.minItemQuantity != null ? String(tier.minItemQuantity) : '',
      contactPhone: '',
    });
    setDeliveryComposer('flat');
  }

  async function deleteTier(tierId: string) {
    if (deletingTierId || deliveryAction) return;
    if (!confirm('Delete this delivery option?')) return;
    setDeletingTierId(tierId);

    try {
      const response = await fetch(`/api/creator/delivery-tiers/${tierId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchDeliveryTiers();
        if (tierForm.id === tierId) cancelDeliveryComposer();
        return;
      }

      const data = await response.json();
      toast({
        title: 'Could not delete option',
        description: data.error || 'Try again',
        variant: 'destructive',
      });
    } catch {
      toast({
        title: 'Could not delete option',
        description: 'Try again',
        variant: 'destructive',
      });
    } finally {
      setDeletingTierId(null);
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    const response = await fetch(`/api/creator/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (response.ok) await fetchOrders();
  }

  const catalogProducts = products.filter((product) => product.type !== 'gift_card');
  const giftCardProducts = products.filter((product) => product.type === 'gift_card');
  const PREVIEW_LIMIT = 2;
  const giftCardPreview = isGiftCardsPage
    ? giftCardProducts
    : giftCardProducts.slice(0, PREVIEW_LIMIT);
  const couponPreview = isCouponsPage ? coupons : coupons.slice(0, PREVIEW_LIMIT);
  const showGiftCardsViewAll =
    !isPromosSubpage && giftCardProducts.length > PREVIEW_LIMIT;
  const showCouponsViewAll = !isPromosSubpage && coupons.length > PREVIEW_LIMIT;
  const activeProducts = catalogProducts.filter(
    (product) => product.status === 'active'
  );
  const draftProducts = catalogProducts.filter(
    (product) => product.status === 'draft'
  );
  const filteredProducts =
    productFilter === 'active'
      ? activeProducts
      : productFilter === 'draft'
        ? draftProducts
        : catalogProducts;

  const productStats = [
    {
      title: 'Total products',
      value: catalogProducts.length.toLocaleString(),
      hint: 'In your shop',
      icon: Package,
      onSelect: 'all' as const,
    },
    {
      title: 'Active',
      value: activeProducts.length.toLocaleString(),
      hint: 'Live for sale',
      icon: PackageCheck,
      onSelect: 'active' as const,
    },
    {
      title: 'Draft',
      value: draftProducts.length.toLocaleString(),
      hint: 'Not published yet',
      icon: FileEdit,
      onSelect: 'draft' as const,
    },
    {
      title: 'Orders',
      value: orders.length.toLocaleString(),
      hint: 'All shop orders',
      icon: ShoppingBag,
      onSelect: null,
    },
  ];

  return (
    <div>
      <div className="foleio-dash-header">
        <div>
          {isPromosSubpage ? (
            <button
              type="button"
              className="foleio-dash-btn-ghost"
              onClick={() => router.push('/shop')}
              style={{
                marginBottom: 10,
                padding: '4px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              Back to Shop
            </button>
          ) : null}
          <h1 className="foleio-auth-title">
            {isGiftCardsPage
              ? 'Gift cards'
              : isCouponsPage
                ? 'Coupons'
                : 'Shop'}
          </h1>
          <p
            className="foleio-dash-panel-meta"
            style={{ marginBottom: 0, marginTop: 6 }}
          >
            {isGiftCardsPage
              ? 'Create and manage store credit gift cards'
              : isCouponsPage
                ? 'Create and manage discount codes for your shop'
                : 'Manage products, gift cards, orders, and delivery'}
          </p>
        </div>
      </div>

      {!isPromosSubpage ? (
      <>
      <div className="foleio-dash-stats">
        {productStats.map((stat) => {
          const Icon = stat.icon;
          const isSelected =
            tab === 'products' &&
            stat.onSelect != null &&
            productFilter === stat.onSelect;
          const content = (
            <>
              <div className="foleio-dash-stat-top">
                <span className="foleio-dash-stat-label">{stat.title}</span>
                <Icon className="foleio-dash-stat-icon h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="foleio-dash-stat-value">{stat.value}</div>
              <p className="foleio-dash-stat-change">{stat.hint}</p>
            </>
          );

          if (stat.onSelect == null) {
            return (
              <button
                key={stat.title}
                type="button"
                className={`foleio-dash-stat${tab === 'orders' ? ' is-selected' : ''}`}
                onClick={() => setTab('orders')}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  border:
                    tab === 'orders'
                      ? '1px solid rgba(17, 24, 39, 0.28)'
                      : '1px solid transparent',
                  width: '100%',
                }}
              >
                {content}
              </button>
            );
          }

          return (
            <button
              key={stat.title}
              type="button"
              className={`foleio-dash-stat${isSelected ? ' is-selected' : ''}`}
              onClick={() => {
                setTab('products');
                setProductFilter(stat.onSelect);
              }}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                border: isSelected
                  ? '1px solid rgba(17, 24, 39, 0.28)'
                  : '1px solid transparent',
                width: '100%',
              }}
            >
              {content}
            </button>
          );
        })}
      </div>

      <div className="foleio-dash-tabs" role="tablist" aria-label="Shop views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'products'}
          className={`foleio-dash-tab${tab === 'products' ? ' is-active' : ''}`}
          onClick={() => setTab('products')}
        >
          Products
          <span className="foleio-dash-tab-count">{catalogProducts.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'gift-cards'}
          className={`foleio-dash-tab${tab === 'gift-cards' ? ' is-active' : ''}`}
          onClick={() => setTab('gift-cards')}
        >
          Gift cards / Coupons
          <span className="foleio-dash-tab-count">
            {giftCardProducts.length + coupons.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'orders'}
          className={`foleio-dash-tab${tab === 'orders' ? ' is-active' : ''}`}
          onClick={() => setTab('orders')}
        >
          Orders
          <span className="foleio-dash-tab-count">{orders.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'delivery'}
          className={`foleio-dash-tab${tab === 'delivery' ? ' is-active' : ''}`}
          onClick={() => setTab('delivery')}
        >
          Delivery
          <span className="foleio-dash-tab-count">{deliveryTiers.length}</span>
        </button>
      </div>
      </>
      ) : null}

      {isPromosSubpage || tab === 'gift-cards' ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {!isPromosSubpage ? (
          <div className="foleio-dash-panel">
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <h2 className="foleio-dash-panel-title" style={{ margin: 0 }}>
                    Gift cards / Coupons
                  </h2>
                </div>
                <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
                  Sell store credit or offer discount codes. Pro features.
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  className="foleio-dash-btn-ghost"
                  onClick={openCreateGiftCard}
                  aria-disabled={!limits.canSellGiftCards}
                  style={
                    !limits.canSellGiftCards
                      ? { opacity: 0.55, cursor: 'not-allowed' }
                      : undefined
                  }
                >
                  {!limits.canSellGiftCards ? (
                    <Lock className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Gift className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  Create gift card
                  {!limits.canSellGiftCards ? (
                    <span className="foleio-dash-badge is-warning">Pro</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="foleio-dash-btn-ghost"
                  onClick={openCreateCoupon}
                  aria-disabled={!limits.canUseCoupons}
                  style={
                    !limits.canUseCoupons
                      ? { opacity: 0.55, cursor: 'not-allowed' }
                      : undefined
                  }
                >
                  {!limits.canUseCoupons ? (
                    <Lock className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Tag className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  Create coupon
                  {!limits.canUseCoupons ? (
                    <span className="foleio-dash-badge is-warning">Pro</span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>
          ) : isGiftCardsPage ? (
          <div className="foleio-dash-panel">
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 className="foleio-dash-panel-title" style={{ margin: 0 }}>
                  All gift cards
                </h2>
                <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
                  Face-value amounts fans purchase as store credit
                </p>
              </div>
              <button
                type="button"
                className="foleio-dash-btn-ghost"
                onClick={openCreateGiftCard}
                aria-disabled={!limits.canSellGiftCards}
                style={
                  !limits.canSellGiftCards
                    ? { opacity: 0.55, cursor: 'not-allowed' }
                    : undefined
                }
              >
                {!limits.canSellGiftCards ? (
                  <Lock className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <Gift className="h-4 w-4" strokeWidth={1.5} />
                )}
                Create gift card
                {!limits.canSellGiftCards ? (
                  <span className="foleio-dash-badge is-warning">Pro</span>
                ) : null}
              </button>
            </div>
          </div>
          ) : null}

          {isGiftCardsPage || !isCouponsPage ? (
          <div className="foleio-dash-panel">
            <style dangerouslySetInnerHTML={{ __html: productCardCss }} />
            <div
              style={{
                marginBottom: giftCardPreview.length > 0 || loading ? 4 : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 className="foleio-dash-panel-title" style={{ margin: 0 }}>
                  {isGiftCardsPage ? 'Gift cards' : 'Gift card list'}
                </h2>
                {!isGiftCardsPage ? (
                  <FieldInfoTip text="Face-value amounts fans purchase as store credit" />
                ) : null}
              </div>
              {showGiftCardsViewAll ? (
                <button
                  type="button"
                  className="foleio-dash-btn-ghost"
                  onClick={() => router.push('/shop/gift-cards')}
                >
                  View all
                </button>
              ) : null}
            </div>
            {loading && giftCardProducts.length === 0 ? (
              <p className="foleio-dash-empty">Loading gift cards…</p>
            ) : giftCardProducts.length === 0 ? (
              <p className="foleio-dash-empty">No gift cards yet.</p>
            ) : (
              <div className="foleio-product-card-list">
                {giftCardPreview.map((product) => {
                  const index = products.findIndex((item) => item.id === product.id);
                  const thumb = productImages(product)[0];
                  return (
                    <div key={product.id} className="foleio-product-card">
                      <div className="foleio-product-card-media">
                        {thumb ? (
                          <RemoteImage
                            src={thumb}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="foleio-product-card-body">
                        <div className="foleio-product-card-top">
                          <div style={{ minWidth: 0 }}>
                            <p className="foleio-product-card-title">
                              {product.name}
                              <span
                                className="foleio-dash-badge is-muted"
                                style={{ marginLeft: 8, verticalAlign: 'middle' }}
                              >
                                Gift card
                              </span>
                            </p>
                          </div>
                          <span className="foleio-product-card-stock">Gift card</span>
                        </div>
                        {product.description ? (
                          <p className="foleio-product-card-desc">{product.description}</p>
                        ) : (
                          <p className="foleio-product-card-desc">No description yet.</p>
                        )}
                        <div className="foleio-product-card-footer">
                          <p className="foleio-product-card-price">
                            {formatNaira(product.price)}
                          </p>
                          <div className="foleio-product-card-actions">
                            <Switch
                              checked={product.status === 'active'}
                              onCheckedChange={() => void toggleVisible(product)}
                              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#ebe8eb] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#6b7280]"
                              aria-label={
                                product.status === 'active'
                                  ? 'Hide gift card from profile'
                                  : 'Show gift card on profile'
                              }
                            />
                            {isGiftCardsPage ? (
                              <>
                                <button
                                  type="button"
                                  className="foleio-product-card-icon-btn is-ghost"
                                  disabled={index === 0}
                                  onClick={() => void moveProduct(product.id, -1)}
                                  aria-label="Move up"
                                >
                                  <ArrowUp strokeWidth={1.75} />
                                </button>
                                <button
                                  type="button"
                                  className="foleio-product-card-icon-btn is-ghost"
                                  disabled={index === products.length - 1}
                                  onClick={() => void moveProduct(product.id, 1)}
                                  aria-label="Move down"
                                >
                                  <ArrowDown strokeWidth={1.75} />
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              className="foleio-product-card-icon-btn"
                              onClick={() => openEditProduct(product)}
                              aria-label={`Edit ${product.name}`}
                            >
                              <Pencil strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              className="foleio-product-card-icon-btn is-danger"
                              onClick={() => void deleteProduct(product.id)}
                              aria-label={`Delete ${product.name}`}
                            >
                              <Trash2 strokeWidth={1.75} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          ) : null}

          {isCouponsPage || !isGiftCardsPage ? (
          <div className="foleio-dash-panel">
            {isCouponsPage ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 14,
                }}
              >
                <div>
                  <h2 className="foleio-dash-panel-title" style={{ margin: 0 }}>
                    All coupons
                  </h2>
                  <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
                    Percent or fixed discounts applied to product subtotal at checkout
                  </p>
                </div>
                <button
                  type="button"
                  className="foleio-dash-btn-ghost"
                  onClick={openCreateCoupon}
                  aria-disabled={!limits.canUseCoupons}
                  style={
                    !limits.canUseCoupons
                      ? { opacity: 0.55, cursor: 'not-allowed' }
                      : undefined
                  }
                >
                  {!limits.canUseCoupons ? (
                    <Lock className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Tag className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  Create coupon
                  {!limits.canUseCoupons ? (
                    <span className="foleio-dash-badge is-warning">Pro</span>
                  ) : null}
                </button>
              </div>
            ) : (
              <div
                style={{
                  marginBottom: couponPreview.length > 0 || loading ? 4 : 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <h2 className="foleio-dash-panel-title" style={{ margin: 0 }}>
                    Coupon codes
                  </h2>
                  <FieldInfoTip text="Percent or fixed discounts applied to product subtotal at checkout" />
                </div>
                {showCouponsViewAll ? (
                  <button
                    type="button"
                    className="foleio-dash-btn-ghost"
                    onClick={() => router.push('/shop/coupons')}
                  >
                    View all
                  </button>
                ) : null}
              </div>
            )}
            {loading && coupons.length === 0 ? (
              <p className="foleio-dash-empty">Loading coupons…</p>
            ) : coupons.length === 0 ? (
              <p className="foleio-dash-empty">No coupons yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {couponPreview.map((coupon) => {
                  const valueLabel =
                    coupon.type === 'fixed'
                      ? formatNaira(coupon.value)
                      : `${coupon.value}% off`;
                  const usesLabel =
                    coupon.maxUses != null
                      ? `${coupon.usedCount} / ${coupon.maxUses} uses`
                      : `${coupon.usedCount} uses`;
                  return (
                    <div
                      key={coupon.id}
                      className="foleio-dash-booking-row"
                      style={{ alignItems: 'center' }}
                    >
                      <div className="foleio-dash-booking-main" style={{ minWidth: 0 }}>
                        <div className="foleio-dash-booking-top">
                          <span className="foleio-dash-sub-name">{coupon.code}</span>
                          <span
                            className={`foleio-dash-badge ${
                              coupon.status === 'active' ? 'is-muted' : 'is-warning'
                            }`}
                          >
                            {coupon.status === 'active' ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <div className="foleio-dash-booking-meta">
                          <span className="foleio-dash-sub-date">{valueLabel}</span>
                          <span className="foleio-dash-sub-date">{usesLabel}</span>
                          {coupon.minSubtotalKobo ? (
                            <span className="foleio-dash-sub-date">
                              Min {formatNaira(coupon.minSubtotalKobo)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div
                        className="foleio-dash-booking-actions"
                        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                      >
                        <Switch
                          checked={coupon.status === 'active'}
                          onCheckedChange={() => void toggleCouponActive(coupon)}
                          className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#ebe8eb] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#6b7280]"
                          aria-label={
                            coupon.status === 'active'
                              ? 'Disable coupon'
                              : 'Enable coupon'
                          }
                        />
                        <button
                          type="button"
                          className="foleio-product-card-icon-btn"
                          onClick={() => openEditCoupon(coupon)}
                          aria-label={`Edit ${coupon.code}`}
                        >
                          <Pencil strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="foleio-product-card-icon-btn is-danger"
                          onClick={() => void deleteCoupon(coupon.id)}
                          aria-label={`Delete ${coupon.code}`}
                        >
                          <Trash2 strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          ) : null}
        </div>
      ) : null}

      {!isPromosSubpage && tab === 'products' ? (
        <>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="foleio-dash-panel">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2 className="foleio-dash-panel-title">Add products</h2>
                  <p className="foleio-dash-panel-meta" style={{ marginBottom: 0 }}>
                    Add a product manually or import drafts from CSV.
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="foleio-dash-btn-outline"
                    onClick={() => downloadProductCsvTemplate()}
                  >
                    <Download className="h-4 w-4" strokeWidth={1.5} />
                    Template
                  </button>
                  <button
                    type="button"
                    className="foleio-dash-btn-outline"
                    onClick={() => {
                      setCsvImportOpen(true);
                      setCsvParseError('');
                    }}
                  >
                    <Upload className="h-4 w-4" strokeWidth={1.5} />
                    Import CSV
                  </button>
                  <button
                    type="button"
                    className="foleio-dash-btn-primary"
                    onClick={openCreateProduct}
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                    Add product
                  </button>
                </div>
              </div>

              {csvImportOpen ? (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h4
                        className="foleio-dash-panel-title"
                        style={{ margin: 0, fontSize: 15 }}
                      >
                        Import products from CSV
                      </h4>
                      <p className="foleio-dash-panel-meta" style={{ marginTop: 6 }}>
                        Columns: name, description, price, stock, weight_kg. Products import as
                        drafts — add photos later, then publish.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="foleio-dash-btn-outline"
                      style={{ padding: 6, minWidth: 0 }}
                      onClick={() => closeCsvImport()}
                      disabled={isImportingCsv}
                      aria-label="Close CSV import"
                    >
                      <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>

                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={handleCsvFileChange}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <button
                      type="button"
                      className="foleio-dash-btn-outline"
                      onClick={() => csvInputRef.current?.click()}
                      disabled={isImportingCsv}
                    >
                      Choose CSV file
                    </button>
                    {csvFileName ? (
                      <span className="foleio-dash-panel-meta" style={{ alignSelf: 'center' }}>
                        {csvFileName}
                      </span>
                    ) : null}
                  </div>

                  {csvParseError ? (
                    <p style={{ margin: '0 0 12px', color: '#f87171', fontSize: 13 }}>
                      {csvParseError}
                    </p>
                  ) : null}

                  {csvRows.length > 0 ? (
                    <>
                      <div
                        style={{
                          overflowX: 'auto',
                          marginBottom: 12,
                          border: '1px solid rgba(17, 24, 39, 0.08)',
                          borderRadius: 10,
                        }}
                      >
                        <table
                          style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
                        >
                          <thead>
                            <tr style={{ textAlign: 'left', color: '#828282' }}>
                              <th style={{ padding: '8px 10px' }}>Row</th>
                              <th style={{ padding: '8px 10px' }}>Name</th>
                              <th style={{ padding: '8px 10px' }}>Price</th>
                              <th style={{ padding: '8px 10px' }}>Stock</th>
                              <th style={{ padding: '8px 10px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvRows.map((row) => (
                              <tr
                                key={row.rowNumber}
                                style={{ borderTop: '1px solid rgba(17, 24, 39, 0.08)' }}
                              >
                                <td style={{ padding: '8px 10px', color: '#6b7280' }}>
                                  {row.rowNumber}
                                </td>
                                <td style={{ padding: '8px 10px' }}>{row.name || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>
                                  {row.price != null
                                    ? `₦${row.price.toLocaleString('en-NG')}`
                                    : '—'}
                                </td>
                                <td style={{ padding: '8px 10px' }}>
                                  {row.stock != null ? row.stock : '—'}
                                </td>
                                <td
                                  style={{
                                    padding: '8px 10px',
                                    color: row.error ? '#f87171' : '#34d399',
                                  }}
                                >
                                  {row.error || 'Ready'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        <button
                          type="button"
                          className="foleio-dash-btn-primary"
                          disabled={
                            isImportingCsv ||
                            csvRows.filter((row) => !row.error).length === 0
                          }
                          onClick={() => void importCsvProducts()}
                        >
                          {isImportingCsv ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                              Importing…
                            </>
                          ) : (
                            `Import ${csvRows.filter((row) => !row.error).length} product${
                              csvRows.filter((row) => !row.error).length === 1 ? '' : 's'
                            }`
                          )}
                        </button>
                        <span className="foleio-dash-panel-meta">
                          {csvRows.filter((row) => row.error).length} invalid ·{' '}
                          {csvRows.filter((row) => !row.error).length} valid
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="foleio-dash-panel">
              <style dangerouslySetInnerHTML={{ __html: productCardCss }} />
              <div style={{ marginBottom: filteredProducts.length > 0 || loading ? 4 : 0 }}>
                <h2 className="foleio-dash-panel-title">Product list</h2>
                <p className="foleio-dash-panel-meta">
                  {productFilter === 'active'
                    ? 'Active products in your shop'
                    : productFilter === 'draft'
                      ? 'Draft products not yet published'
                      : 'All products in your shop'}
                </p>
              </div>
          {loading && products.length === 0 ? (
            <p className="foleio-dash-empty">Loading products…</p>
          ) : filteredProducts.length === 0 ? (
            <p className="foleio-dash-empty">
              {catalogProducts.length === 0
                ? 'No products yet. Add one or import a CSV.'
                : productFilter === 'active'
                  ? 'No active products yet.'
                  : productFilter === 'draft'
                    ? 'No draft products.'
                    : 'No products yet. Add one or import a CSV.'}
            </p>
          ) : (
            <div className="foleio-product-card-list">
            {filteredProducts.map((product) => {
              const index = products.findIndex((item) => item.id === product.id);
              const pricing = resolveProductPricing({
                price: product.price,
                compareAtPrice: product.compareAtPrice,
                isPreorder: product.isPreorder,
                preorderSettings: product.preorderSettings,
                discountStartsAt: product.discountStartsAt,
                discountEndsAt: product.discountEndsAt,
              });
              const pct = discountPercent(pricing.price, pricing.compareAtPrice);
              const thumb = productImages(product)[0];
              const stockCount = product.stock ?? 0;
              const isDigital = product.type === 'digital';
              const isGiftCard = product.type === 'gift_card';
              const inStock = isDigital || isGiftCard || stockCount > 0;
              const stockLabel = isDigital
                ? 'Digital'
                : isGiftCard
                  ? 'Gift card'
                  : !inStock
                    ? 'Out of stock'
                    : product.showLimitedStock
                      ? 'Limited stock'
                      : `In Stock : ${stockCount}`;
              return (
                <div key={product.id} className="foleio-product-card">
                  <div className="foleio-product-card-media">
                    {thumb ? (
                      <RemoteImage
                        src={thumb}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
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
                      <div style={{ minWidth: 0 }}>
                        <p className="foleio-product-card-title">
                          {product.name}
                          {isDigital ? (
                            <span
                              className="foleio-dash-badge is-muted"
                              style={{ marginLeft: 8, verticalAlign: 'middle' }}
                            >
                              Digital
                            </span>
                          ) : isGiftCard ? (
                            <span
                              className="foleio-dash-badge is-muted"
                              style={{ marginLeft: 8, verticalAlign: 'middle' }}
                            >
                              Gift card
                            </span>
                          ) : pricing.isPreorderActive ? (
                            <span
                              className="foleio-dash-badge is-warning"
                              style={{ marginLeft: 8, verticalAlign: 'middle' }}
                            >
                              Preorder
                            </span>
                          ) : product.isPreorder ? (
                            <span
                              className="foleio-dash-badge is-muted"
                              style={{ marginLeft: 8, verticalAlign: 'middle' }}
                            >
                              Preorder ended
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <span
                        className={`foleio-product-card-stock${inStock ? '' : ' is-out'}`}
                      >
                        {stockLabel}
                      </span>
                    </div>
                    {product.description ? (
                      <p className="foleio-product-card-desc">{product.description}</p>
                    ) : (
                      <p className="foleio-product-card-desc">No description yet.</p>
                    )}
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
                      <div className="foleio-product-card-actions">
                        <Switch
                          checked={product.status === 'active'}
                          onCheckedChange={() => void toggleVisible(product)}
                          className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#ebe8eb] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#6b7280]"
                          aria-label={
                            product.status === 'active'
                              ? 'Hide product from profile'
                              : 'Show product on profile'
                          }
                        />
                        <button
                          type="button"
                          className="foleio-product-card-icon-btn is-ghost"
                          disabled={index === 0}
                          onClick={() => void moveProduct(product.id, -1)}
                          aria-label="Move up"
                        >
                          <ArrowUp strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="foleio-product-card-icon-btn is-ghost"
                          disabled={index === products.length - 1}
                          onClick={() => void moveProduct(product.id, 1)}
                          aria-label="Move down"
                        >
                          <ArrowDown strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="foleio-product-card-icon-btn"
                          onClick={() => openEditProduct(product)}
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="foleio-product-card-icon-btn is-danger"
                          onClick={() => void deleteProduct(product.id)}
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
            </div>
          </div>
        </>
      ) : null}

      {!isPromosSubpage && tab === 'orders' ? (
        <div className="foleio-dash-panel">
          {orders.length === 0 ? (
            <p className="foleio-dash-empty">No orders yet.</p>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="foleio-dash-booking-row">
                <div className="foleio-dash-booking-main">
                  <div className="foleio-dash-booking-top">
                    <span className="foleio-dash-sub-name">
                      {order.deliveryAddress?.firstName || order.deliveryAddress?.lastName
                        ? `${order.deliveryAddress?.firstName || ''} ${order.deliveryAddress?.lastName || ''}`.trim()
                        : order.deliveryAddress?.name || 'Customer'}
                    </span>
                    <span className="foleio-dash-badge is-muted">
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="foleio-dash-booking-meta">
                    <span className="foleio-dash-sub-date">
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                    {order.deliveryTier ? (
                      <span className="foleio-dash-sub-date">
                        {order.deliveryTier.name} · {order.deliveryTier.type}
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: 'rgba(17, 24, 39, 0.06)',
                          color: '#111827',
                          fontFamily: 'var(--font-body), sans-serif',
                          fontSize: 14,
                          fontWeight: 500,
                          lineHeight: 1.35,
                        }}
                      >
                        {item.quantity}× {item.product?.name || 'Product'} ·{' '}
                        {formatNaira(item.unitPrice)}
                      </div>
                    ))}
                  </div>
                  {order.deliveryAddress?.notes ? (
                    <p className="foleio-dash-booking-notes" style={{ margin: '0 0 6px' }}>
                      Notes: {order.deliveryAddress.notes}
                    </p>
                  ) : null}
                  <div className="foleio-dash-booking-actions">
                    <label className="foleio-dash-field" style={{ margin: 0, minWidth: 160 }}>
                      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                        Status
                      </span>
                      <select
                        className="foleio-dash-input"
                        value={normalizeOrderStatus(order.status)}
                        onChange={(event) =>
                          void updateOrderStatus(order.id, event.target.value)
                        }
                        aria-label="Order status"
                      >
                        {ORDER_STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                        {!ORDER_STATUS_OPTIONS.some(
                          (status) => status.value === normalizeOrderStatus(order.status)
                        ) ? (
                          <option value={order.status}>{order.status}</option>
                        ) : null}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="foleio-dash-booking-amount">{formatNaira(order.total)}</div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {!isPromosSubpage && tab === 'delivery' ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="foleio-dash-panel">
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h3 className="foleio-dash-panel-title">Delivery</h3>
                <p className="foleio-dash-panel-meta">
                  Add flat-rate, free, pickup, or conditional delivery options for checkout.
                </p>
              </div>
              {deliveryComposer === 'idle' ? (
                <button
                  type="button"
                  className="foleio-dash-btn-primary"
                  onClick={startAddDelivery}
                  disabled={Boolean(deliveryAction || deletingTierId)}
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  Add
                </button>
              ) : (
                <button
                  type="button"
                  className="foleio-dash-btn-ghost"
                  onClick={cancelDeliveryComposer}
                  disabled={Boolean(deliveryAction || deletingTierId)}
                >
                  Cancel
                </button>
              )}
            </div>

            {deliveryComposer === 'choose' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() => chooseDeliveryType('paid')}
                  disabled={Boolean(deliveryAction || deletingTierId)}
                  style={{
                    textAlign: 'left',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid rgba(17, 24, 39, 0.12)',
                    background: 'rgba(17, 24, 39, 0.04)',
                    color: '#111827',
                    cursor: deliveryAction || deletingTierId ? 'not-allowed' : 'pointer',
                    opacity: deliveryAction || deletingTierId ? 0.65 : 1,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
                    Flat rate
                  </p>
                  <p
                    className="foleio-dash-panel-meta"
                    style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.4 }}
                  >
                    Charge a fixed fee. You can add multiple regions or options.
                  </p>
                </button>
                {!deliveryTiers.some((tier) => tier.type === 'free') ? (
                  <button
                    type="button"
                    onClick={() => chooseDeliveryType('free')}
                    disabled={Boolean(deliveryAction || deletingTierId)}
                    style={{
                      textAlign: 'left',
                      padding: 16,
                      borderRadius: 12,
                      border: '1px solid rgba(17, 24, 39, 0.12)',
                      background: 'rgba(17, 24, 39, 0.04)',
                      color: '#111827',
                      cursor: deliveryAction || deletingTierId ? 'not-allowed' : 'pointer',
                      opacity: deliveryAction || deletingTierId ? 0.65 : 1,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      {deliveryAction === 'free' ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      ) : null}
                      Free delivery
                    </p>
                    <p
                      className="foleio-dash-panel-meta"
                      style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.4 }}
                    >
                      Enable free delivery at checkout in one tap.
                    </p>
                  </button>
                ) : null}
                {!deliveryTiers.some((tier) => tier.type === 'pickup') ? (
                  <button
                    type="button"
                    onClick={() => chooseDeliveryType('pickup')}
                    disabled={Boolean(deliveryAction || deletingTierId)}
                    style={{
                      textAlign: 'left',
                      padding: 16,
                      borderRadius: 12,
                      border: '1px solid rgba(17, 24, 39, 0.12)',
                      background: 'rgba(17, 24, 39, 0.04)',
                      color: '#111827',
                      cursor: deliveryAction || deletingTierId ? 'not-allowed' : 'pointer',
                      opacity: deliveryAction || deletingTierId ? 0.65 : 1,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      {deliveryAction === 'pickup' ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      ) : null}
                      Pickup
                    </p>
                    <p
                      className="foleio-dash-panel-meta"
                      style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.4 }}
                    >
                      Let buyers collect in person — no delivery fee.
                    </p>
                  </button>
                ) : null}
                {!deliveryTiers.some((tier) => tier.type === 'customer_arranged') ? (
                  <button
                    type="button"
                    onClick={() => chooseDeliveryType('customer_arranged')}
                    disabled={Boolean(deliveryAction || deletingTierId)}
                    style={{
                      textAlign: 'left',
                      padding: 16,
                      borderRadius: 12,
                      border: '1px solid rgba(17, 24, 39, 0.12)',
                      background: 'rgba(17, 24, 39, 0.04)',
                      color: '#111827',
                      cursor: deliveryAction || deletingTierId ? 'not-allowed' : 'pointer',
                      opacity: deliveryAction || deletingTierId ? 0.65 : 1,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      {deliveryAction === 'customer_arranged' ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      ) : null}
                      Customer arranges delivery
                    </p>
                    <p
                      className="foleio-dash-panel-meta"
                      style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.4 }}
                    >
                      Buyer handles logistics — ₦0 fee, no street address required.
                    </p>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (!limits.canUseConditionalDelivery) {
                      showUpgradeModal('conditionalDelivery');
                      return;
                    }
                    chooseDeliveryType('paid');
                  }}
                  disabled={Boolean(deliveryAction || deletingTierId)}
                  aria-disabled={!limits.canUseConditionalDelivery}
                  style={{
                    textAlign: 'left',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid rgba(17, 24, 39, 0.12)',
                    background: 'rgba(17, 24, 39, 0.04)',
                    color: limits.canUseConditionalDelivery ? '#111827' : '#6b7280',
                    cursor:
                      deliveryAction || deletingTierId
                        ? 'not-allowed'
                        : limits.canUseConditionalDelivery
                          ? 'pointer'
                          : 'not-allowed',
                    opacity:
                      deliveryAction || deletingTierId
                        ? 0.65
                        : limits.canUseConditionalDelivery
                          ? 1
                          : 0.55,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      color: limits.canUseConditionalDelivery ? '#111827' : '#6b7280',
                    }}
                  >
                    {!limits.canUseConditionalDelivery ? (
                      <Lock className="h-4 w-4" strokeWidth={1.5} />
                    ) : null}
                    Conditional delivery
                    {!limits.canUseConditionalDelivery ? (
                      <span className="foleio-dash-badge is-warning">Pro</span>
                    ) : null}
                  </p>
                  <p
                    className="foleio-dash-panel-meta"
                    style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.4 }}
                  >
                    Free delivery when spend or quantity hits a threshold.
                  </p>
                </button>
              </div>
            ) : null}

            {deliveryComposer === 'flat' ? (
              <form
                onSubmit={saveTier}
                style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}
              >
                <p className="foleio-dash-panel-meta" style={{ margin: 0 }}>
                  {tierForm.id ? 'Edit flat-rate option' : 'Add a flat-rate option'}
                </p>
                <label className="foleio-dash-field">
                  <span>Name</span>
                  <input
                    className="foleio-dash-input"
                    placeholder="e.g. Lagos delivery"
                    value={tierForm.name}
                    onChange={(event) =>
                      setTierForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="foleio-dash-field">
                  <span>Description</span>
                  <textarea
                    className="foleio-dash-textarea"
                    style={{ marginTop: 0 }}
                    rows={3}
                    placeholder="Optional details for buyers"
                    value={tierForm.description}
                    onChange={(event) =>
                      setTierForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="foleio-dash-field">
                  <span>Fee (₦)</span>
                  <input
                    className="foleio-dash-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={tierForm.flatRate}
                    onChange={(event) =>
                      setTierForm((prev) => ({
                        ...prev,
                        flatRate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                {limits.canUseConditionalDelivery ? (
                  <>
                    <label className="foleio-dash-field">
                      <span>Free when spend reaches (₦, optional)</span>
                      <input
                        className="foleio-dash-input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 15000"
                        value={tierForm.minSubtotal}
                        onChange={(event) =>
                          setTierForm((prev) => ({
                            ...prev,
                            minSubtotal: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="foleio-dash-field">
                      <span>Free when quantity reaches (optional)</span>
                      <input
                        className="foleio-dash-input"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 3"
                        value={tierForm.minItemQuantity}
                        onChange={(event) =>
                          setTierForm((prev) => ({
                            ...prev,
                            minItemQuantity: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </>
                ) : (
                  <p className="foleio-dash-field-hint" style={{ margin: 0 }}>
                    Conditional free delivery (spend or quantity) is available on
                    Pro.{' '}
                    <button
                      type="button"
                      className="foleio-dash-link"
                      onClick={goToBillingUpgrade}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#111827',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      Upgrade
                    </button>
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    className="foleio-dash-btn-primary"
                    disabled={Boolean(deliveryAction || deletingTierId)}
                  >
                    {deliveryAction === 'saving' ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    ) : null}
                    {tierForm.id ? 'Update option' : 'Save option'}
                  </button>
                  <button
                    type="button"
                    className="foleio-dash-btn-ghost"
                    disabled={Boolean(deliveryAction || deletingTierId)}
                    onClick={() =>
                      tierForm.id
                        ? cancelDeliveryComposer()
                        : setDeliveryComposer('choose')
                    }
                  >
                    {tierForm.id ? 'Cancel' : 'Back'}
                  </button>
                </div>
              </form>
            ) : null}

            {deliveryComposer === 'customer_arranged' ? (
              <form
                onSubmit={saveTier}
                style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}
              >
                <p className="foleio-dash-panel-meta" style={{ margin: 0 }}>
                  {tierForm.id
                    ? 'Update the phone buyers call to arrange delivery'
                    : 'Add a phone number buyers can call to arrange delivery'}
                </p>
                <label className="foleio-dash-field">
                  <span>Contact phone</span>
                  <input
                    className="foleio-dash-input"
                    type="tel"
                    inputMode="tel"
                    placeholder="e.g. 08012345678"
                    value={tierForm.contactPhone}
                    onChange={(event) =>
                      setTierForm((prev) => ({
                        ...prev,
                        contactPhone: event.target.value,
                      }))
                    }
                    required
                    autoFocus
                  />
                </label>
                <p className="foleio-dash-field-hint" style={{ margin: 0 }}>
                  Shown on checkout, the order confirmation email, and the receipt.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    className="foleio-dash-btn-primary"
                    disabled={Boolean(deliveryAction || deletingTierId)}
                  >
                    {deliveryAction === 'customer_arranged' ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    ) : null}
                    {tierForm.id ? 'Update phone' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    className="foleio-dash-btn-ghost"
                    disabled={Boolean(deliveryAction || deletingTierId)}
                    onClick={() =>
                      tierForm.id
                        ? cancelDeliveryComposer()
                        : setDeliveryComposer('choose')
                    }
                  >
                    {tierForm.id ? 'Cancel' : 'Back'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          <div className="foleio-dash-panel">
            {deliveryTiers.length === 0 && deliveryComposer === 'idle' ? (
              <p className="foleio-dash-empty">
                No delivery options yet. Tap Add to create flat-rate, free delivery, or pickup.
              </p>
            ) : null}

            {(() => {
              const flatTiers = deliveryTiers.filter((tier) => tier.type === 'paid');
              const freeTiers = deliveryTiers.filter((tier) => tier.type === 'free');
              const pickupTiers = deliveryTiers.filter((tier) => tier.type === 'pickup');
              const customerArrangedTiers = deliveryTiers.filter(
                (tier) => tier.type === 'customer_arranged'
              );
              if (
                flatTiers.length === 0 &&
                freeTiers.length === 0 &&
                pickupTiers.length === 0 &&
                customerArrangedTiers.length === 0
              ) {
                return null;
              }
              return (
                <div style={{ display: 'grid', gap: 18 }}>
                  {flatTiers.length > 0 ? (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <h4
                          className="foleio-dash-panel-title"
                          style={{ margin: 0, fontSize: 15 }}
                        >
                          Flat rate
                        </h4>
                        <button
                          type="button"
                          className="foleio-dash-btn-ghost"
                          onClick={() => chooseDeliveryType('paid')}
                          disabled={Boolean(deliveryAction || deletingTierId)}
                        >
                          <Plus className="h-4 w-4" strokeWidth={1.5} />
                          Add
                        </button>
                      </div>
                      {flatTiers.map((tier) => (
                        <div key={tier.id} className="foleio-dash-booking-row">
                          <div className="foleio-dash-booking-main">
                            <div
                              className="foleio-dash-booking-top"
                              style={{
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                width: '100%',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  gap: 8,
                                  minWidth: 0,
                                }}
                              >
                                <span className="foleio-dash-sub-name">{tier.name}</span>
                                <span className="foleio-dash-badge is-muted">
                                  {formatNaira(tier.flatRate)}
                                </span>
                              </div>
                              <div
                                className="foleio-dash-booking-actions"
                                style={{ margin: 0, flexShrink: 0, gap: 6 }}
                              >
                                <button
                                  type="button"
                                  className="foleio-dash-btn-outline"
                                  style={{ padding: 6, minWidth: 0, height: 'auto' }}
                                  onClick={() => editTier(tier)}
                                  disabled={Boolean(deliveryAction || deletingTierId)}
                                  aria-label="Edit delivery option"
                                >
                                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                                </button>
                                <button
                                  type="button"
                                  className="foleio-dash-btn-danger"
                                  style={{ padding: 6, minWidth: 0, height: 'auto' }}
                                  onClick={() => void deleteTier(tier.id)}
                                  disabled={Boolean(deliveryAction || deletingTierId)}
                                  aria-label="Delete delivery option"
                                >
                                  {deletingTierId === tier.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  )}
                                </button>
                              </div>
                            </div>
                            {tier.description ? (
                              <p className="foleio-dash-booking-notes">{tier.description}</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {freeTiers.length > 0 ? (
                    <div style={{ display: 'grid', gap: 0 }}>
                      {freeTiers.map((tier) => (
                        <div key={tier.id} className="foleio-dash-booking-row">
                          <div className="foleio-dash-booking-main">
                            <div
                              className="foleio-dash-booking-top"
                              style={{
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                width: '100%',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  gap: 8,
                                  minWidth: 0,
                                }}
                              >
                                <span className="foleio-dash-sub-name">Free delivery</span>
                                <span className="foleio-dash-badge is-muted">Enabled</span>
                              </div>
                              <div
                                className="foleio-dash-booking-actions"
                                style={{ margin: 0, flexShrink: 0, gap: 6 }}
                              >
                                <button
                                  type="button"
                                  className="foleio-dash-btn-danger"
                                  style={{ padding: 6, minWidth: 0, height: 'auto' }}
                                  onClick={() => void deleteTier(tier.id)}
                                  disabled={Boolean(deliveryAction || deletingTierId)}
                                  aria-label="Delete free delivery"
                                >
                                  {deletingTierId === tier.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {pickupTiers.length > 0 ? (
                    <div style={{ display: 'grid', gap: 0 }}>
                      {pickupTiers.map((tier) => (
                        <div key={tier.id} className="foleio-dash-booking-row">
                          <div className="foleio-dash-booking-main">
                            <div
                              className="foleio-dash-booking-top"
                              style={{
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                width: '100%',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  gap: 8,
                                  minWidth: 0,
                                }}
                              >
                                <span className="foleio-dash-sub-name">Pickup</span>
                                <span className="foleio-dash-badge is-muted">Enabled</span>
                              </div>
                              <div
                                className="foleio-dash-booking-actions"
                                style={{ margin: 0, flexShrink: 0, gap: 6 }}
                              >
                                <button
                                  type="button"
                                  className="foleio-dash-btn-danger"
                                  style={{ padding: 6, minWidth: 0, height: 'auto' }}
                                  onClick={() => void deleteTier(tier.id)}
                                  disabled={Boolean(deliveryAction || deletingTierId)}
                                  aria-label="Delete pickup"
                                >
                                  {deletingTierId === tier.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {customerArrangedTiers.length > 0 ? (
                    <div style={{ display: 'grid', gap: 0 }}>
                      {customerArrangedTiers.map((tier) => (
                        <div key={tier.id} className="foleio-dash-booking-row">
                          <div className="foleio-dash-booking-main">
                            <div
                              className="foleio-dash-booking-top"
                              style={{
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                width: '100%',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 4,
                                  minWidth: 0,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <span className="foleio-dash-sub-name">
                                    Customer arranges delivery
                                  </span>
                                  <span className="foleio-dash-badge is-muted">Enabled</span>
                                </div>
                                {tier.contactPhone ? (
                                  <span
                                    className="foleio-dash-panel-meta"
                                    style={{ margin: 0, fontSize: 13 }}
                                  >
                                    Call {tier.contactPhone}
                                  </span>
                                ) : (
                                  <span
                                    className="foleio-dash-panel-meta"
                                    style={{ margin: 0, fontSize: 13, color: '#f97316' }}
                                  >
                                    Add a contact phone
                                  </span>
                                )}
                              </div>
                              <div
                                className="foleio-dash-booking-actions"
                                style={{ margin: 0, flexShrink: 0, gap: 6 }}
                              >
                                <button
                                  type="button"
                                  className="foleio-dash-btn-ghost"
                                  style={{ padding: 6, minWidth: 0, height: 'auto' }}
                                  onClick={() => editTier(tier)}
                                  disabled={Boolean(deliveryAction || deletingTierId)}
                                  aria-label="Edit contact phone"
                                >
                                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                                </button>
                                <button
                                  type="button"
                                  className="foleio-dash-btn-danger"
                                  style={{ padding: 6, minWidth: 0, height: 'auto' }}
                                  onClick={() => void deleteTier(tier.id)}
                                  disabled={Boolean(deliveryAction || deletingTierId)}
                                  aria-label="Delete customer arranges delivery"
                                >
                                  {deletingTierId === tier.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {isProductDialogOpen ? (
        <>
          <div
            className="foleio-dash-drawer-backdrop"
            onClick={closeProductDrawer}
            aria-hidden
          />
          <aside
            className="foleio-dash-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-drawer-title"
          >
            <div className="foleio-dash-drawer-header">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
                {productDrawerView === 'preorder' || productDrawerView === 'discount' ? (
                  <button
                    type="button"
                    className="foleio-dash-drawer-close"
                    onClick={() => setProductDrawerView('details')}
                    aria-label="Back to product details"
                    style={{ marginTop: 2 }}
                  >
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                ) : null}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2
                    id="product-drawer-title"
                    style={{
                      margin: 0,
                      fontSize:
                        productDrawerView === 'details' ? 14 : undefined,
                      fontWeight: productDrawerView === 'details' ? 500 : undefined,
                      color: productDrawerView === 'details' ? '#6b7280' : undefined,
                      lineHeight: 1.3,
                    }}
                    className={
                      productDrawerView === 'details'
                        ? undefined
                        : 'foleio-dash-panel-title'
                    }
                  >
                    {productDrawerView === 'preorder'
                      ? 'Preorder settings'
                      : productDrawerView === 'discount'
                        ? 'Discount settings'
                        : productForm.id
                          ? isGiftCardProduct
                            ? 'Edit gift card'
                            : 'Edit product'
                          : isGiftCardProduct
                            ? 'Create gift card'
                            : 'Add product'}
                  </h2>
                  <p
                    style={{
                      margin:
                        productDrawerView !== 'details' || !productForm.id
                          ? '4px 0 0'
                          : '6px 0 0',
                      fontSize:
                        productDrawerView === 'details' && productForm.id
                          ? 22
                          : 13,
                      fontWeight:
                        productDrawerView === 'details' && productForm.id
                          ? 500
                          : 400,
                      color:
                        productDrawerView === 'details' && productForm.id
                          ? '#111827'
                          : '#6b7280',
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {productDrawerView === 'preorder'
                      ? 'Release timing, pricing, and discount phases.'
                      : productDrawerView === 'discount'
                        ? 'Set old and new prices independently (default sale price is kept until you turn discount off).'
                        : productForm.id
                          ? productForm.name.trim() ||
                            (isGiftCardProduct ? 'Untitled gift card' : 'Untitled product')
                          : isGiftCardProduct
                            ? 'Set a face value fans can redeem in your shop.'
                            : 'Physical products only — image uploads go to R2.'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {productDrawerView === 'details' ? (
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      margin: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {productForm.status === 'active' ? 'Active' : 'Draft'}
                    </span>
                    <Switch
                      checked={productForm.status === 'active'}
                      onCheckedChange={(checked) =>
                        setProductForm((prev) => ({
                          ...prev,
                          status: checked ? 'active' : 'draft',
                        }))
                      }
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#ebe8eb] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#6b7280]"
                      aria-label="Active on profile"
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  className="foleio-dash-drawer-close"
                  onClick={closeProductDrawer}
                  disabled={isSavingProduct || isUploadingImage || isUploadingPdf}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="foleio-dash-drawer-body">
              <form
                onSubmit={saveProduct}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {productDrawerView === 'preorder' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className="foleio-dash-field">
                        <span>Start date</span>
                        <input
                          className="foleio-dash-input"
                          type="date"
                          value={productForm.preorder.startDate}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              preorder: {
                                ...prev.preorder,
                                startDate: event.target.value,
                              },
                            }))
                          }
                          required
                        />
                      </label>
                      <label className="foleio-dash-field">
                        <span>Start time</span>
                        <input
                          className="foleio-dash-input"
                          type="time"
                          value={productForm.preorder.startTime}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              preorder: {
                                ...prev.preorder,
                                startTime: event.target.value,
                              },
                            }))
                          }
                          required
                        />
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className="foleio-dash-field">
                        <span>Release date</span>
                        <input
                          className="foleio-dash-input"
                          type="date"
                          value={productForm.preorder.releaseDate}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              preorder: {
                                ...prev.preorder,
                                releaseDate: event.target.value,
                              },
                            }))
                          }
                          required
                        />
                      </label>
                      <label className="foleio-dash-field">
                        <span>Release time</span>
                        <input
                          className="foleio-dash-input"
                          type="time"
                          value={productForm.preorder.releaseTime}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              preorder: {
                                ...prev.preorder,
                                releaseTime: event.target.value,
                              },
                            }))
                          }
                          required
                        />
                      </label>
                    </div>

                    <p className="foleio-dash-section-label" style={{ margin: '4px 0 0' }}>
                      During preorder
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className="foleio-dash-field">
                        <span>Sale price (₦)</span>
                        <input
                          className="foleio-dash-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productForm.preorder.preorderPrice}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              preorder: {
                                ...prev.preorder,
                                preorderPrice: event.target.value,
                              },
                            }))
                          }
                          required
                        />
                      </label>
                      <label className="foleio-dash-field">
                        <span>Old price (₦, optional)</span>
                        <input
                          className="foleio-dash-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productForm.preorder.preorderCompareAtPrice}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              preorder: {
                                ...prev.preorder,
                                preorderCompareAtPrice: event.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                    </div>

                    <p className="foleio-dash-section-label" style={{ margin: '4px 0 0' }}>
                      When preorder is over
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className="foleio-dash-field">
                        <span>Sale price (₦)</span>
                        <input
                          className="foleio-dash-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productForm.preorder.postPreorderPrice}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              price: event.target.value,
                              preorder: {
                                ...prev.preorder,
                                postPreorderPrice: event.target.value,
                              },
                            }))
                          }
                          required
                        />
                      </label>
                      <label className="foleio-dash-field">
                        <span>Old price (₦, optional)</span>
                        <input
                          className="foleio-dash-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productForm.preorder.postPreorderCompareAtPrice}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              compareAtPrice: event.target.value,
                              preorder: {
                                ...prev.preorder,
                                postPreorderCompareAtPrice: event.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                    </div>

                    <div className="foleio-dash-field">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span>Discount phases</span>
                        <button
                          type="button"
                          className="foleio-dash-btn-ghost"
                          onClick={() =>
                            setProductForm((prev) => ({
                              ...prev,
                              preorder: {
                                ...prev.preorder,
                                phases: [
                                  ...prev.preorder.phases,
                                  {
                                    id: crypto.randomUUID(),
                                    startDate: '',
                                    startTime: '00:00',
                                    type: 'percent',
                                    value: '',
                                  },
                                ],
                              },
                            }))
                          }
                        >
                          <Plus className="h-4 w-4" strokeWidth={1.5} />
                          Add duration
                        </button>
                      </div>
                      <p className="foleio-dash-panel-meta" style={{ margin: '4px 0 0' }}>
                        Optional staged discounts while preorder is open. Latest started
                        phase wins until release.
                      </p>
                      {productForm.preorder.phases.map((phase, phaseIndex) => (
                        <div
                          key={phase.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            marginTop: 10,
                            padding: 10,
                            borderRadius: 10,
                            background: 'rgba(17, 24, 39, 0.04)',
                          }}
                        >
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr auto',
                              gap: 8,
                              alignItems: 'end',
                            }}
                          >
                            <label className="foleio-dash-field" style={{ margin: 0 }}>
                              <span>Starts</span>
                              <input
                                className="foleio-dash-input"
                                type="date"
                                value={phase.startDate}
                                onChange={(event) =>
                                  setProductForm((prev) => {
                                    const phases = [...prev.preorder.phases];
                                    phases[phaseIndex] = {
                                      ...phases[phaseIndex],
                                      startDate: event.target.value,
                                    };
                                    return {
                                      ...prev,
                                      preorder: { ...prev.preorder, phases },
                                    };
                                  })
                                }
                              />
                            </label>
                            <label className="foleio-dash-field" style={{ margin: 0 }}>
                              <span>Time</span>
                              <input
                                className="foleio-dash-input"
                                type="time"
                                value={phase.startTime}
                                onChange={(event) =>
                                  setProductForm((prev) => {
                                    const phases = [...prev.preorder.phases];
                                    phases[phaseIndex] = {
                                      ...phases[phaseIndex],
                                      startTime: event.target.value,
                                    };
                                    return {
                                      ...prev,
                                      preorder: { ...prev.preorder, phases },
                                    };
                                  })
                                }
                              />
                            </label>
                            <button
                              type="button"
                              className="foleio-dash-btn-danger"
                              onClick={() =>
                                setProductForm((prev) => ({
                                  ...prev,
                                  preorder: {
                                    ...prev.preorder,
                                    phases: prev.preorder.phases.filter(
                                      (_, i) => i !== phaseIndex
                                    ),
                                  },
                                }))
                              }
                              aria-label="Remove discount phase"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '120px 1fr',
                              gap: 8,
                            }}
                          >
                            <select
                              className="foleio-dash-input"
                              value={phase.type}
                              onChange={(event) =>
                                setProductForm((prev) => {
                                  const phases = [...prev.preorder.phases];
                                  phases[phaseIndex] = {
                                    ...phases[phaseIndex],
                                    type: event.target.value as 'percent' | 'amount',
                                  };
                                  return {
                                    ...prev,
                                    preorder: { ...prev.preorder, phases },
                                  };
                                })
                              }
                            >
                              <option value="percent">% off</option>
                              <option value="amount">₦ off</option>
                            </select>
                            <input
                              className="foleio-dash-input"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={
                                phase.type === 'percent' ? 'e.g. 20' : 'e.g. 500'
                              }
                              value={phase.value}
                              onChange={(event) =>
                                setProductForm((prev) => {
                                  const phases = [...prev.preorder.phases];
                                  phases[phaseIndex] = {
                                    ...phases[phaseIndex],
                                    value: event.target.value,
                                  };
                                  return {
                                    ...prev,
                                    preorder: { ...prev.preorder, phases },
                                  };
                                })
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="foleio-dash-btn-outline"
                      onClick={() => setProductDrawerView('details')}
                    >
                      Done
                    </button>
                  </>
                ) : productDrawerView === 'discount' ? (
                  <>
                    <label className="foleio-dash-field">
                      <span>Old price (₦)</span>
                      <input
                        className="foleio-dash-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.compareAtPrice}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            compareAtPrice: event.target.value,
                          }))
                        }
                        autoFocus
                      />
                    </label>
                    <label className="foleio-dash-field">
                      <span>New price (₦)</span>
                      <input
                        className="foleio-dash-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.price}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            price: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className="foleio-dash-field">
                        <span>Starts (optional)</span>
                        <input
                          className="foleio-dash-input"
                          type="date"
                          value={productForm.discountStartDate}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              discountStartDate: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="foleio-dash-field">
                        <span>Start time</span>
                        <input
                          className="foleio-dash-input"
                          type="time"
                          value={productForm.discountStartTime}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              discountStartTime: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className="foleio-dash-field">
                        <span>Ends (optional)</span>
                        <input
                          className="foleio-dash-input"
                          type="date"
                          value={productForm.discountEndDate}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              discountEndDate: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="foleio-dash-field">
                        <span>End time</span>
                        <input
                          className="foleio-dash-input"
                          type="time"
                          value={productForm.discountEndTime}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              discountEndTime: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <p className="foleio-dash-panel-meta" style={{ margin: 0 }}>
                      Default sale price (
                      {productForm.regularPrice
                        ? `₦${Number(productForm.regularPrice).toLocaleString('en-NG')}`
                        : '—'}
                      ) is kept until you turn discount off. Outside the window, the
                      old price is charged.
                    </p>
                    <button
                      type="button"
                      className="foleio-dash-btn-outline"
                      onClick={() => setProductDrawerView('details')}
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <>
                <div className="foleio-dash-field">
                  <span>{isGiftCardProduct ? 'Type' : 'Product type'}</span>
                  {isGiftCardProduct ? (
                    <p
                      className="foleio-dash-panel-meta"
                      style={{ margin: '8px 0 0', color: '#111827' }}
                    >
                      Gift card
                    </p>
                  ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <button
                      type="button"
                      className={
                        productForm.type === 'physical'
                          ? 'foleio-dash-btn-outline'
                          : 'foleio-dash-btn-ghost'
                      }
                      style={{
                        borderColor:
                          productForm.type === 'physical' ? '#111827' : undefined,
                      }}
                      onClick={() => setProductType('physical')}
                    >
                      Physical
                    </button>
                    {!limits.canSellDigitalProducts ? (
                      <button
                        type="button"
                        className="foleio-dash-btn-ghost"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          opacity: 0.55,
                          cursor: 'not-allowed',
                        }}
                        aria-disabled="true"
                        onClick={goToBillingUpgrade}
                      >
                        <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Digital
                        <span
                          className="foleio-dash-badge is-warning"
                          style={{ marginLeft: 2, verticalAlign: 'middle' }}
                        >
                          Pro
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={
                          productForm.type === 'digital'
                            ? 'foleio-dash-btn-outline'
                            : 'foleio-dash-btn-ghost'
                        }
                        style={{
                          borderColor:
                            productForm.type === 'digital' ? '#111827' : undefined,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                        onClick={() => setProductType('digital')}
                      >
                        Digital
                      </button>
                    )}
                  </div>
                  )}
                </div>

                <div className="foleio-dash-field">
                  <span>Photos</span>
                  <p className="foleio-dash-field-hint" style={{ marginTop: 4 }}>
                    Add up to {productImageSlots} photos. First photo is the main
                    image.
                  </p>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={onImageChange}
                  />
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={onPdfChange}
                  />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 8,
                      marginTop: 10,
                      maxWidth: 280,
                    }}
                  >
                    {Array.from({ length: productImageSlots }).map((_, index) => {
                      const url = productForm.imageUrls[index];
                      const busy = uploadingSlot === index;
                      const preview = slotPreview[index];
                      const canAdd =
                        !url &&
                        !busy &&
                        (index === 0 || productForm.imageUrls.length >= index);

                      return (
                        <div
                          key={index}
                          style={{
                            position: 'relative',
                            aspectRatio: '1',
                            borderRadius: 8,
                            border: '1px dashed rgba(17, 24, 39, 0.12)',
                            background: '#f3f1f4',
                            overflow: 'hidden',
                          }}
                        >
                          {url ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openImagePicker(index)}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  padding: 0,
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                }}
                                aria-label={`Replace photo ${index + 1}`}
                              >
                                <RemoteImage
                                  src={url}
                                  alt={`Product photo ${index + 1}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                  }}
                                />
                              </button>
                              <button
                                type="button"
                                className="foleio-dash-btn-danger"
                                onClick={() => removeImage(index)}
                                aria-label={`Remove photo ${index + 1}`}
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  zIndex: 1,
                                  padding: 8,
                                }}
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAdd || busy}
                              onClick={() => openImagePicker(index)}
                              aria-label={`Upload photo ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                background: 'transparent',
                                cursor: canAdd ? 'pointer' : 'not-allowed',
                                opacity: canAdd || busy ? 1 : 0.45,
                                padding: 0,
                              }}
                            >
                              {busy || preview ? (
                                <span
                                  style={{
                                    display: 'flex',
                                    height: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#6b7280',
                                    position: 'relative',
                                  }}
                                >
                                  {preview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={preview}
                                      alt=""
                                      style={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        opacity: 0.55,
                                      }}
                                    />
                                  ) : null}
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    color: '#6b7280',
                                    fontSize: 12,
                                  }}
                                >
                                  <ImagePlus className="h-5 w-5" />
                                  Add
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <label className="foleio-dash-field">
                  <span>Name</span>
                  <input
                    className="foleio-dash-input"
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder={
                      isGiftCardProduct
                        ? 'e.g. ₦10,000 gift card'
                        : isDigitalProduct
                          ? 'e.g. Brand photography preset pack'
                          : 'e.g. Soft leather journal'
                    }
                    required
                    autoFocus
                  />
                </label>

                <label className="foleio-dash-field">
                  <span>Description</span>
                  <textarea
                    className="foleio-dash-textarea"
                    style={{ marginTop: 0 }}
                    rows={3}
                    value={productForm.description}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder={
                      isGiftCardProduct
                        ? 'What buyers should know about this gift card'
                        : isDigitalProduct
                          ? 'What buyers get after they pay'
                          : 'Short details buyers see on your shop'
                    }
                  />
                </label>

                <label className="foleio-dash-field">
                  <span>
                    {isGiftCardProduct ? 'Face value (₦)' : 'Sale price (₦)'}
                  </span>
                  <input
                    className="foleio-dash-input"
                    type="number"
                    min="1000"
                    step="1"
                    placeholder="e.g. 15000"
                    value={
                      isGiftCardProduct
                        ? productForm.price
                        : productForm.isPreorder
                          ? productForm.preorder.postPreorderPrice
                          : productForm.discountEnabled
                            ? productForm.regularPrice
                            : productForm.price
                    }
                    onChange={(event) =>
                      setProductForm((prev) =>
                        isGiftCardProduct || !prev.discountEnabled
                          ? {
                              ...prev,
                              price: event.target.value,
                              regularPrice: event.target.value,
                            }
                          : { ...prev, regularPrice: event.target.value }
                      )
                    }
                    required={
                      isGiftCardProduct ||
                      (!productForm.isPreorder && !productForm.discountEnabled)
                    }
                    disabled={
                      !isGiftCardProduct &&
                      (productForm.isPreorder || productForm.discountEnabled)
                    }
                  />
                  {isGiftCardProduct ? (
                    <p className="foleio-dash-field-hint" style={{ marginTop: 4 }}>
                      Buyers receive a reusable gift card code for this amount. Unlimited
                      stock.
                    </p>
                  ) : null}
                </label>

                {isDigitalProduct ? (
                  <div className="foleio-dash-field">
                    <span>Digital file (PDF)</span>
                    <p className="foleio-dash-field-hint" style={{ marginTop: 4 }}>
                      Buyers get a download link by email after payment. Max 50MB.
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        alignItems: 'center',
                        marginTop: 8,
                      }}
                    >
                      <button
                        type="button"
                        className="foleio-dash-btn-outline"
                        disabled={isUploadingPdf || isSavingProduct}
                        onClick={() => pdfInputRef.current?.click()}
                      >
                        {isUploadingPdf
                          ? 'Uploading…'
                          : productForm.digitalFileUrl
                            ? 'Replace PDF'
                            : 'Upload PDF'}
                      </button>
                      {productForm.digitalFileName || productForm.digitalFileUrl ? (
                        <span className="foleio-dash-panel-meta" style={{ margin: 0 }}>
                          {productForm.digitalFileName || 'PDF uploaded'}
                        </span>
                      ) : (
                        <span className="foleio-dash-panel-meta" style={{ margin: 0 }}>
                          Required to publish
                        </span>
                      )}
                    </div>
                  </div>
                ) : isGiftCardProduct ? null : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="foleio-dash-field">
                    <span>Stock</span>
                    <input
                      className="foleio-dash-input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 25"
                      value={productForm.stock}
                      onChange={(event) =>
                        setProductForm((prev) => ({ ...prev, stock: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="foleio-dash-field">
                    <span>Weight kg (optional)</span>
                    <input
                      className="foleio-dash-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 0.5"
                      value={productForm.weight}
                      onChange={(event) =>
                        setProductForm((prev) => ({ ...prev, weight: event.target.value }))
                      }
                    />
                  </label>
                </div>
                )}

                {productForm.type === 'physical' ? (
                <div className="foleio-dash-field">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      Show as limited stock
                      <FieldInfoTip text='Cards show “Limited stock” instead of the count. Real stock is still tracked.' />
                    </span>
                    <Switch
                      checked={productForm.showLimitedStock}
                      onCheckedChange={(checked) =>
                        setProductForm((prev) => ({
                          ...prev,
                          showLimitedStock: checked,
                        }))
                      }
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#ebe8eb] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#6b7280]"
                      aria-label="Show as limited stock"
                    />
                  </div>
                </div>
                ) : null}

                {productForm.type === 'physical' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <label className="foleio-dash-field">
                        <span>Min order qty</span>
                        <input
                          className="foleio-dash-input"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="e.g. 1"
                          value={productForm.minOrderQuantity}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              minOrderQuantity: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="foleio-dash-field">
                        <span>Prep days min</span>
                        <input
                          className="foleio-dash-input"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Ready now"
                          value={productForm.prepDaysMin}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              prepDaysMin: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="foleio-dash-field">
                        <span>Prep days max</span>
                        <input
                          className="foleio-dash-input"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Optional"
                          value={productForm.prepDaysMax}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              prepDaysMax: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <p className="foleio-dash-field-hint" style={{ marginTop: -4 }}>
                      Prep days are an estimate only (e.g. “Takes 3–5 days”). Leave blank for
                      ready now — no calendar on products.
                    </p>
                    <div className="foleio-dash-field">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          Needs custom delivery details
                          <FieldInfoTip text="Shows an extra checkout block for logistics phone/notes. Buyer still picks a delivery option above." />
                        </span>
                        <Switch
                          checked={productForm.requiresCustomDelivery}
                          onCheckedChange={(checked) =>
                            setProductForm((prev) => ({
                              ...prev,
                              requiresCustomDelivery: checked,
                            }))
                          }
                          className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#ebe8eb] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#6b7280]"
                          aria-label="Needs custom delivery details"
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {productForm.type === 'physical' ? (
                <>
                <div className="foleio-dash-field">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>Add-ons</span>
                    <button
                      type="button"
                      className="foleio-dash-btn-ghost"
                      onClick={() =>
                        setProductForm((prev) => ({
                          ...prev,
                          addons: [
                            ...prev.addons,
                            {
                              id: crypto.randomUUID(),
                              name: '',
                              required: false,
                              options: [{ id: crypto.randomUUID(), name: '', price: '', stock: '' }],
                            },
                          ],
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                      Category
                    </button>
                  </div>
                  <p className="foleio-dash-panel-meta" style={{ margin: '4px 0 0' }}>
                    e.g. Flavours — add types under each category with a price and qty.
                    Leave qty blank for unlimited. Toggle required if buyers must choose one.
                  </p>
                  {productForm.addons.map((category, categoryIndex) => (
                    <div
                      key={category.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 10,
                        background: 'rgba(17, 24, 39, 0.04)',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto auto',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        <input
                          className="foleio-dash-input"
                          placeholder="Category (e.g. Flavours)"
                          value={category.name}
                          onChange={(event) =>
                            setProductForm((prev) => {
                              const addons = [...prev.addons];
                              addons[categoryIndex] = {
                                ...addons[categoryIndex],
                                name: event.target.value,
                              };
                              return { ...prev, addons };
                            })
                          }
                        />
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            color: '#6b7280',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={category.required}
                            onChange={(event) =>
                              setProductForm((prev) => {
                                const addons = [...prev.addons];
                                addons[categoryIndex] = {
                                  ...addons[categoryIndex],
                                  required: event.target.checked,
                                };
                                return { ...prev, addons };
                              })
                            }
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          className="foleio-dash-btn-danger"
                          onClick={() =>
                            setProductForm((prev) => ({
                              ...prev,
                              addons: prev.addons.filter((_, i) => i !== categoryIndex),
                            }))
                          }
                          aria-label="Remove category"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                      {category.options.map((option, optionIndex) => (
                        <div
                          key={option.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 88px 72px auto',
                            gap: 8,
                          }}
                        >
                          <input
                            className="foleio-dash-input"
                            placeholder="Type (e.g. Chocolate)"
                            value={option.name}
                            onChange={(event) =>
                              setProductForm((prev) => {
                                const addons = [...prev.addons];
                                const options = [...addons[categoryIndex].options];
                                options[optionIndex] = {
                                  ...options[optionIndex],
                                  name: event.target.value,
                                };
                                addons[categoryIndex] = {
                                  ...addons[categoryIndex],
                                  options,
                                };
                                return { ...prev, addons };
                              })
                            }
                          />
                          <input
                            className="foleio-dash-input"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="₦"
                            value={option.price}
                            onChange={(event) =>
                              setProductForm((prev) => {
                                const addons = [...prev.addons];
                                const options = [...addons[categoryIndex].options];
                                options[optionIndex] = {
                                  ...options[optionIndex],
                                  price: event.target.value,
                                };
                                addons[categoryIndex] = {
                                  ...addons[categoryIndex],
                                  options,
                                };
                                return { ...prev, addons };
                              })
                            }
                          />
                          <input
                            className="foleio-dash-input"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Qty"
                            value={option.stock}
                            onChange={(event) =>
                              setProductForm((prev) => {
                                const addons = [...prev.addons];
                                const options = [...addons[categoryIndex].options];
                                options[optionIndex] = {
                                  ...options[optionIndex],
                                  stock: event.target.value,
                                };
                                addons[categoryIndex] = {
                                  ...addons[categoryIndex],
                                  options,
                                };
                                return { ...prev, addons };
                              })
                            }
                          />
                          <button
                            type="button"
                            className="foleio-dash-btn-ghost"
                            disabled={category.options.length <= 1}
                            onClick={() =>
                              setProductForm((prev) => {
                                const addons = [...prev.addons];
                                const options = addons[categoryIndex].options.filter(
                                  (_, i) => i !== optionIndex
                                );
                                addons[categoryIndex] = {
                                  ...addons[categoryIndex],
                                  options:
                                    options.length > 0
                                      ? options
                                      : [
                                          {
                                            id: crypto.randomUUID(),
                                            name: '',
                                            price: '',
                                            stock: '',
                                          },
                                        ],
                                };
                                return { ...prev, addons };
                              })
                            }
                            aria-label="Remove option"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="foleio-dash-btn-ghost"
                        style={{ justifySelf: 'start' }}
                        onClick={() =>
                          setProductForm((prev) => {
                            const addons = [...prev.addons];
                            addons[categoryIndex] = {
                              ...addons[categoryIndex],
                              options: [
                                ...addons[categoryIndex].options,
                                {
                                  id: crypto.randomUUID(),
                                  name: '',
                                  price: '',
                                  stock: '',
                                },
                              ],
                            };
                            return { ...prev, addons };
                          })
                        }
                      >
                        <Plus className="h-4 w-4" strokeWidth={1.5} />
                        Add type
                      </button>
                    </div>
                  ))}
                </div>

                <div className="foleio-dash-field">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>Variants</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {(['Size', 'Color'] as const).map((preset) => {
                        const alreadyAdded = productForm.variants.some(
                          (variant) =>
                            variant.name.trim().toLowerCase() === preset.toLowerCase()
                        );
                        return (
                          <button
                            key={preset}
                            type="button"
                            className="foleio-dash-btn-ghost"
                            disabled={
                              alreadyAdded || productForm.variants.length >= 3
                            }
                            onClick={() =>
                              setProductForm((prev) => ({
                                ...prev,
                                variants: [
                                  ...prev.variants,
                                  {
                                    name: preset,
                                    options:
                                      preset === 'Size'
                                        ? ['S', 'M', 'L', 'XL']
                                        : ['#000000'],
                                  },
                                ],
                              }))
                            }
                          >
                            + {preset}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className="foleio-dash-btn-ghost"
                        disabled={productForm.variants.length >= 3}
                        onClick={() =>
                          setProductForm((prev) => ({
                            ...prev,
                            variants: [
                              ...prev.variants,
                              { name: '', options: [''] },
                            ],
                          }))
                        }
                      >
                        <Plus className="h-4 w-4" strokeWidth={1.5} />
                        Custom
                      </button>
                    </div>
                  </div>
                  {productForm.variants.map((variant, index) => {
                    const optionRows =
                      variant.options.length > 0 ? variant.options : [''];
                    const isColorVariant = isColorVariantName(variant.name);
                    const lockedName = ['size', 'color', 'colour'].includes(
                      variant.name.trim().toLowerCase()
                    );
                    return (
                      <div
                        key={variant.id || `variant-${index}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          marginTop: 8,
                          padding: 10,
                          borderRadius: 10,
                          background: 'rgba(17, 24, 39, 0.04)',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 8,
                          }}
                        >
                          <input
                            className="foleio-dash-input"
                            placeholder="Name (e.g. Style)"
                            value={variant.name}
                            disabled={lockedName}
                            readOnly={lockedName}
                            onChange={(event) => {
                              if (lockedName) return;
                              setProductForm((prev) => {
                                const variants = [...prev.variants];
                                const nextName = event.target.value;
                                const wasColor = isColorVariantName(
                                  variants[index].name
                                );
                                const nowColor = isColorVariantName(nextName);
                                let options = [...variants[index].options];
                                if (!wasColor && nowColor) {
                                  options =
                                    options.length > 0
                                      ? options.map((option) =>
                                          isHexColor(option)
                                            ? option.trim()
                                            : '#000000'
                                        )
                                      : ['#000000'];
                                }
                                variants[index] = {
                                  ...variants[index],
                                  name: nextName,
                                  options,
                                };
                                return { ...prev, variants };
                              });
                            }}
                          />
                          <button
                            type="button"
                            className="foleio-dash-btn-danger"
                            onClick={() =>
                              setProductForm((prev) => ({
                                ...prev,
                                variants: prev.variants.filter((_, i) => i !== index),
                              }))
                            }
                            aria-label="Remove variant"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {optionRows.map((option, optionIndex) => (
                            <div
                              key={`${index}-option-${optionIndex}`}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: isColorVariant
                                  ? 'auto 1fr auto'
                                  : '1fr auto',
                                gap: 8,
                                alignItems: 'center',
                              }}
                            >
                              {isColorVariant ? (
                                <input
                                  type="color"
                                  value={toColorInputValue(option || '#000000')}
                                  onChange={(event) =>
                                    setProductForm((prev) => {
                                      const variants = [...prev.variants];
                                      const current =
                                        variants[index].options.length > 0
                                          ? [...variants[index].options]
                                          : ['#000000'];
                                      current[optionIndex] = event.target.value;
                                      variants[index] = {
                                        ...variants[index],
                                        options: current,
                                      };
                                      return { ...prev, variants };
                                    })
                                  }
                                  aria-label={`Color ${optionIndex + 1}`}
                                  style={{
                                    width: 40,
                                    height: 40,
                                    padding: 0,
                                    border: '1px solid rgba(17, 24, 39, 0.12)',
                                    borderRadius: 8,
                                    background: 'transparent',
                                    cursor: 'pointer',
                                  }}
                                />
                              ) : null}
                              <input
                                className="foleio-dash-input"
                                placeholder={
                                  isColorVariant
                                    ? '#000000'
                                    : `Option ${optionIndex + 1}`
                                }
                                value={option}
                                onChange={(event) =>
                                  setProductForm((prev) => {
                                    const variants = [...prev.variants];
                                    const current =
                                      variants[index].options.length > 0
                                        ? [...variants[index].options]
                                        : [''];
                                    current[optionIndex] = isColorVariant
                                      ? normalizeHexInput(event.target.value)
                                      : event.target.value;
                                    variants[index] = {
                                      ...variants[index],
                                      options: current,
                                    };
                                    return { ...prev, variants };
                                  })
                                }
                              />
                              <button
                                type="button"
                                className="foleio-dash-btn-ghost"
                                disabled={optionRows.length <= 1}
                                onClick={() =>
                                  setProductForm((prev) => {
                                    const variants = [...prev.variants];
                                    const current =
                                      variants[index].options.length > 0
                                        ? [...variants[index].options]
                                        : [''];
                                    const next = current.filter(
                                      (_, i) => i !== optionIndex
                                    );
                                    variants[index] = {
                                      ...variants[index],
                                      options:
                                        next.length > 0
                                          ? next
                                          : [isColorVariant ? '#000000' : ''],
                                    };
                                    return { ...prev, variants };
                                  })
                                }
                                aria-label="Remove option"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="foleio-dash-btn-ghost"
                            style={{ justifySelf: 'start' }}
                            onClick={() =>
                              setProductForm((prev) => {
                                const variants = [...prev.variants];
                                const current =
                                  variants[index].options.length > 0
                                    ? [...variants[index].options]
                                    : [''];
                                variants[index] = {
                                  ...variants[index],
                                  options: [
                                    ...current,
                                    isColorVariant ? '#000000' : '',
                                  ],
                                };
                                return { ...prev, variants };
                              })
                            }
                          >
                            <Plus className="h-4 w-4" strokeWidth={1.5} />
                            Add option
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="foleio-dash-field">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      Preorder
                      <FieldInfoTip text="Set release timing and preorder pricing in setup." />
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {productForm.isPreorder ? (
                        <button
                          type="button"
                          className="foleio-dash-btn-ghost"
                          onClick={() => setProductDrawerView('preorder')}
                        >
                          Manage
                        </button>
                      ) : null}
                      <Switch
                        checked={productForm.isPreorder}
                        onCheckedChange={setPreorderEnabled}
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#ebe8eb] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#6b7280]"
                        aria-label="Enable preorder"
                      />
                    </div>
                  </div>
                </div>
                </>
                ) : null}

                {productForm.type === 'physical' ? (
                <div
                  className="foleio-dash-field"
                  style={{
                    opacity: productForm.isPreorder ? 0.45 : 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      Discount
                      <FieldInfoTip
                        text={
                          productForm.isPreorder
                            ? 'Disabled while preorder is on — set discounts in preorder settings.'
                            : 'Set old and new prices in discount setup for strikethrough pricing.'
                        }
                      />
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        pointerEvents: productForm.isPreorder ? 'none' : undefined,
                      }}
                    >
                      {productForm.discountEnabled && !productForm.isPreorder ? (
                        <button
                          type="button"
                          className="foleio-dash-btn-ghost"
                          onClick={() => setProductDrawerView('discount')}
                        >
                          Manage
                        </button>
                      ) : null}
                      <Switch
                        checked={
                          productForm.discountEnabled && !productForm.isPreorder
                        }
                        onCheckedChange={setDiscountEnabled}
                        disabled={productForm.isPreorder}
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#ebe8eb] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#6b7280]"
                        aria-label="Enable discount"
                      />
                    </div>
                  </div>
                </div>
                ) : null}

                  </>
                )}

                {productError ? (
                  <p
                    className="foleio-dash-panel-meta"
                    style={{ color: '#fca5a5', margin: 0 }}
                  >
                    {productError}
                  </p>
                ) : null}

                {productDrawerView === 'details' ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {productForm.id && productForm.type === 'physical' ? (
                    <button
                      type="button"
                      className="foleio-dash-btn-outline"
                      style={{ width: '100%' }}
                      onClick={() => void convertProductToService()}
                      disabled={
                        isSavingProduct ||
                        isUploadingImage ||
                        isUploadingPdf ||
                        isConvertingProduct
                      }
                    >
                      {isConvertingProduct ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      ) : null}
                      Convert to service
                    </button>
                  ) : null}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 8,
                    }}
                  >
                  <button
                    type="button"
                    className="foleio-dash-btn-ghost"
                    onClick={closeProductDrawer}
                    disabled={
                      isSavingProduct ||
                      isUploadingImage ||
                      isUploadingPdf ||
                      isConvertingProduct
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="foleio-dash-btn-primary"
                    disabled={
                      isSavingProduct ||
                      isUploadingImage ||
                      isUploadingPdf ||
                      isConvertingProduct
                    }
                  >
                    {isSavingProduct ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    ) : null}
                    {isGiftCardProduct ? 'Save gift card' : 'Save product'}
                  </button>
                  </div>
                </div>
                ) : null}
              </form>
            </div>
          </aside>
        </>
      ) : null}

      {isCouponDialogOpen ? (
        <>
          <div
            className="foleio-dash-drawer-backdrop"
            onClick={closeCouponDrawer}
            aria-hidden
          />
          <aside
            className="foleio-dash-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-drawer-title"
          >
            <div className="foleio-dash-drawer-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2
                  id="coupon-drawer-title"
                  className="foleio-dash-panel-title"
                  style={{ margin: 0 }}
                >
                  {couponForm.id ? 'Edit coupon' : 'Create coupon'}
                </h2>
                <p
                  className="foleio-dash-panel-meta"
                  style={{ margin: '4px 0 0' }}
                >
                  Discount applies to product subtotal before delivery.
                </p>
              </div>
              <button
                type="button"
                className="foleio-dash-drawer-close"
                onClick={closeCouponDrawer}
                aria-label="Close coupon drawer"
                disabled={isSavingCoupon}
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="foleio-dash-drawer-body">
              <form onSubmit={(event) => void saveCoupon(event)}>
                <div style={{ display: 'grid', gap: 14 }}>
                  <label className="foleio-dash-field">
                    <span>Code</span>
                    <input
                      className="foleio-dash-input"
                      value={couponForm.code}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          code: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="e.g. WELCOME10"
                      required
                    />
                  </label>

                  <div className="foleio-dash-field">
                    <span>Type</span>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <button
                        type="button"
                        className={
                          couponForm.type === 'percent'
                            ? 'foleio-dash-btn-outline'
                            : 'foleio-dash-btn-ghost'
                        }
                        style={{
                          borderColor:
                            couponForm.type === 'percent' ? '#111827' : undefined,
                        }}
                        onClick={() =>
                          setCouponForm((prev) => ({ ...prev, type: 'percent' }))
                        }
                      >
                        Percent
                      </button>
                      <button
                        type="button"
                        className={
                          couponForm.type === 'fixed'
                            ? 'foleio-dash-btn-outline'
                            : 'foleio-dash-btn-ghost'
                        }
                        style={{
                          borderColor:
                            couponForm.type === 'fixed' ? '#111827' : undefined,
                        }}
                        onClick={() =>
                          setCouponForm((prev) => ({ ...prev, type: 'fixed' }))
                        }
                      >
                        Fixed ₦
                      </button>
                    </div>
                  </div>

                  <label className="foleio-dash-field">
                    <span>
                      {couponForm.type === 'fixed' ? 'Amount (₦)' : 'Percent (%)'}
                    </span>
                    <input
                      className="foleio-dash-input"
                      type="number"
                      min={couponForm.type === 'percent' ? 1 : 1}
                      max={couponForm.type === 'percent' ? 100 : undefined}
                      step={couponForm.type === 'percent' ? 1 : 1}
                      value={couponForm.value}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          value: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <label className="foleio-dash-field">
                    <span>Minimum spend (₦, optional)</span>
                    <input
                      className="foleio-dash-input"
                      type="number"
                      min={0}
                      value={couponForm.minSubtotalNaira}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          minSubtotalNaira: event.target.value,
                        }))
                      }
                      placeholder="No minimum"
                    />
                  </label>

                  <label className="foleio-dash-field">
                    <span>Max uses (optional)</span>
                    <input
                      className="foleio-dash-input"
                      type="number"
                      min={1}
                      value={couponForm.maxUses}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          maxUses: event.target.value,
                        }))
                      }
                      placeholder="Unlimited"
                    />
                  </label>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 10,
                    }}
                  >
                    <label className="foleio-dash-field">
                      <span>Starts (optional)</span>
                      <input
                        className="foleio-dash-input"
                        type="date"
                        value={couponForm.startDate}
                        onChange={(event) =>
                          setCouponForm((prev) => ({
                            ...prev,
                            startDate: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="foleio-dash-field">
                      <span>Ends (optional)</span>
                      <input
                        className="foleio-dash-input"
                        type="date"
                        value={couponForm.endDate}
                        onChange={(event) =>
                          setCouponForm((prev) => ({
                            ...prev,
                            endDate: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div
                    className="foleio-dash-field"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <span>Active</span>
                    <Switch
                      checked={couponForm.status === 'active'}
                      onCheckedChange={(checked) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          status: checked ? 'active' : 'disabled',
                        }))
                      }
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#ebe8eb] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#6b7280]"
                    />
                  </div>

                  {couponError ? (
                    <p style={{ margin: 0, color: '#f87171', fontSize: 13 }}>
                      {couponError}
                    </p>
                  ) : null}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="foleio-dash-btn-ghost"
                      onClick={closeCouponDrawer}
                      disabled={isSavingCoupon}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="foleio-dash-btn-primary"
                      disabled={isSavingCoupon}
                    >
                      {isSavingCoupon ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      ) : null}
                      {couponForm.id ? 'Save coupon' : 'Create coupon'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </aside>
        </>
      ) : null}

      {limitType ? (
        <UpgradeModal
          isOpen={isOpen}
          onClose={closeUpgradeModal}
          limitType={limitType}
          currentPlan={currentPlan}
        />
      ) : null}
    </div>
  );
}

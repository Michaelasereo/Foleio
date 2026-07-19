'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Download,
  FileEdit,
  ImagePlus,
  Info,
  Loader2,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { RemoteImage } from '@/components/creator/RemoteImage';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { parseAddonCategories } from '@/lib/shop/product-addons';
import { parsePreorderSettings, resolveProductPricing } from '@/lib/shop/preorder';
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
  options: Array<{ id: string; name: string; price: string }>;
};

type PreorderPhaseForm = {
  id: string;
  startDate: string;
  startTime: string;
  type: 'percent' | 'amount';
  value: string;
};

type PreorderForm = {
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
  weight: number | null;
  type: string;
  imageUrl: string | null;
  imageUrls?: string[];
  stock: number | null;
  showLimitedStock?: boolean;
  status: 'draft' | 'active';
  orderIndex: number;
  isPreorder: boolean;
  preorderSettings?: unknown;
  addons: Addon[] | unknown;
  variants: Variant[];
};

const PRODUCT_IMAGE_SLOTS = 2;

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

function productImages(product: Pick<Product, 'imageUrl' | 'imageUrls'>): string[] {
  const fromArray = Array.isArray(product.imageUrls)
    ? product.imageUrls.map(String).filter(Boolean)
    : [];
  if (fromArray.length > 0) return fromArray.slice(0, PRODUCT_IMAGE_SLOTS);
  return product.imageUrl ? [product.imageUrl] : [];
}

type DeliveryTier = {
  id: string;
  name: string;
  description: string | null;
  type: 'paid' | 'free' | 'pickup' | string;
  flatRate: number;
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
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

function categoriesToForm(raw: unknown): AddonCategoryForm[] {
  return parseAddonCategories(raw).map((category) => ({
    id: category.id,
    name: category.name,
    required: category.required,
    options: category.options.map((option) => ({
      id: option.id,
      name: option.name,
      price: String(option.price / 100),
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
  return {
    releaseDate: release.date,
    releaseTime: release.time,
    preorderPrice: String(settings.preorderPrice / 100),
    preorderCompareAtPrice:
      settings.preorderCompareAtPrice != null
        ? String(settings.preorderCompareAtPrice / 100)
        : '',
    postPreorderPrice: String(settings.postPreorderPrice / 100),
    postPreorderCompareAtPrice:
      settings.postPreorderCompareAtPrice != null
        ? String(settings.postPreorderCompareAtPrice / 100)
        : '',
    phases: settings.phases.map((phase) => {
      const start = splitIsoLocal(phase.startsAt);
      return {
        id: phase.id,
        startDate: start.date,
        startTime: start.time,
        type: phase.type,
        value:
          phase.type === 'amount' ? String(phase.value / 100) : String(phase.value),
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
    weight: '',
    imageUrls: [] as string[],
    stock: '',
    showLimitedStock: false,
    status: 'draft' as 'draft' | 'active',
    isPreorder: false,
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
    type: 'paid' as 'paid' | 'free' | 'pickup',
    flatRate: '',
  };
}

export function CreatorShopManager({
  platformPlan = null,
  platformSubscriptionActive = false,
}: {
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
} = {}) {
  const { toast } = useToast();
  const { isOpen, limitType, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();
  const currentPlan: PlatformPlan = getCreatorPlan(platformPlan ?? null);
  const limits = getCreatorPlanLimits({
    platformPlan,
    platformSubscriptionActive,
  });
  const [tab, setTab] = useState<'products' | 'orders' | 'delivery'>('products');
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'draft'>(
    'all'
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryTiers, setDeliveryTiers] = useState<DeliveryTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productDrawerView, setProductDrawerView] = useState<
    'details' | 'preorder' | 'discount'
  >('details');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm());
  const [tierForm, setTierForm] = useState(emptyTierForm());
  const [deliveryComposer, setDeliveryComposer] = useState<'idle' | 'choose' | 'flat'>('idle');
  const [deliveryAction, setDeliveryAction] = useState<
    'saving' | 'free' | 'pickup' | null
  >(null);
  const [deletingTierId, setDeletingTierId] = useState<string | null>(null);
  const [productError, setProductError] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [slotPreview, setSlotPreview] = useState<Record<number, string>>({});
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<ParsedProductCsvRow[]>([]);
  const [csvParseError, setCsvParseError] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const isUploadingImage = uploadingSlot !== null;

  async function fetchProducts() {
    const response = await fetch('/api/creator/products', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setProducts(data.products || []);
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
      await Promise.all([fetchProducts(), fetchOrders(), fetchDeliveryTiers()]);
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
    const price = String(product.price / 100);
    const compareAtPrice = product.compareAtPrice
      ? String(product.compareAtPrice / 100)
      : '';
    const discountEnabled =
      Boolean(compareAtPrice) && !Boolean(product.isPreorder);
    setProductForm({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price,
      // When a discount is live, restore target is the compare-at (old) price.
      regularPrice: discountEnabled ? compareAtPrice : price,
      compareAtPrice,
      weight: product.weight != null ? String(product.weight) : '',
      imageUrls: productImages(product),
      stock: product.stock != null ? String(product.stock) : '',
      showLimitedStock: Boolean(product.showLimitedStock),
      status: product.status,
      isPreorder: Boolean(product.isPreorder),
      discountEnabled,
      preorder: settingsToPreorderForm(product.preorderSettings, price, compareAtPrice),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        options: variant.options.length > 0 ? [...variant.options] : [''],
      })),
      addons,
    });
    setSlotPreview({});
    setProductError('');
    setProductDrawerView('details');
    setIsProductDialogOpen(true);
  }

  function closeProductDrawer() {
    if (isSavingProduct || isUploadingImage) return;
    setIsProductDialogOpen(false);
    setProductDrawerView('details');
    setProductError('');
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

    if (
      productForm.discountEnabled &&
      !productForm.isPreorder
    ) {
      const oldPrice = Number(productForm.compareAtPrice);
      const newPrice = Number(productForm.price);
      if (!productForm.compareAtPrice.trim() || !Number.isFinite(oldPrice) || oldPrice <= 0) {
        setProductError('Set an old (compare-at) price for the discount');
        setProductDrawerView('discount');
        return;
      }
      if (!productForm.price.trim() || !Number.isFinite(newPrice) || newPrice < 0) {
        setProductError('Set a new discounted price');
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
    if (productForm.isPreorder) {
      const releaseAt = combineLocalDateTime(
        productForm.preorder.releaseDate,
        productForm.preorder.releaseTime
      );
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
        releaseAt,
        preorderPrice: productForm.preorder.preorderPrice,
        preorderCompareAtPrice: productForm.preorder.preorderCompareAtPrice || null,
        postPreorderPrice: productForm.preorder.postPreorderPrice,
        postPreorderCompareAtPrice:
          productForm.preorder.postPreorderCompareAtPrice || null,
        phases: productForm.preorder.phases.map((phase) => ({
          id: phase.id,
          startsAt: combineLocalDateTime(phase.startDate, phase.startTime),
          type: phase.type,
          value: phase.value,
        })),
      };
    }

    setIsSavingProduct(true);
    const payload = {
      name: productForm.name,
      description: productForm.description,
      price: productForm.isPreorder
        ? productForm.preorder.postPreorderPrice
        : productForm.discountEnabled
          ? productForm.price
          : productForm.regularPrice || productForm.price,
      compareAtPrice: productForm.isPreorder
        ? productForm.preorder.postPreorderCompareAtPrice || null
        : productForm.discountEnabled
          ? productForm.compareAtPrice || null
          : null,
      weight: productForm.weight,
      imageUrls: productForm.imageUrls,
      imageUrl: productForm.imageUrls[0] || null,
      stock: productForm.stock,
      showLimitedStock: productForm.showLimitedStock,
      status: productForm.status,
      isPreorder: productForm.isPreorder,
      preorderSettings: preorderSettingsPayload,
      variants: productForm.variants
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
      addons: productForm.addons.map((category) => ({
        id: category.id,
        name: category.name,
        required: category.required,
        options: category.options.map((option) => ({
          id: option.id,
          name: option.name,
          price: option.price,
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
      return { ...prev, imageUrls: urls.slice(0, PRODUCT_IMAGE_SLOTS) };
    });
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

  function removeImage(slotIndex: number) {
    setProductForm((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, index) => index !== slotIndex),
    }));
  }

  async function saveTier(event: FormEvent) {
    event.preventDefault();
    if (deliveryAction) return;

    const payload = {
      name: tierForm.name,
      description: tierForm.description,
      type: tierForm.type === 'free' ? 'free' : 'paid',
      flatRate: tierForm.type === 'paid' ? tierForm.flatRate : 0,
    };
    const isEdit = Boolean(tierForm.id);
    setDeliveryAction('saving');

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
      toast({ title: isEdit ? 'Delivery option updated' : 'Delivery option added' });
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

  function chooseDeliveryType(type: 'paid' | 'free' | 'pickup') {
    if (type === 'free') {
      void enableFreeDelivery();
      return;
    }
    if (type === 'pickup') {
      void enablePickup();
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
    if (tier.type === 'free' || tier.type === 'pickup') return;
    setTierForm({
      id: tier.id,
      name: tier.name,
      description: tier.description || '',
      type: 'paid',
      flatRate: String(tier.flatRate / 100),
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

  const activeProducts = products.filter((product) => product.status === 'active');
  const draftProducts = products.filter((product) => product.status === 'draft');
  const filteredProducts =
    productFilter === 'active'
      ? activeProducts
      : productFilter === 'draft'
        ? draftProducts
        : products;

  const productStats = [
    {
      title: 'Total products',
      value: products.length.toLocaleString(),
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
          <h1 className="foleio-auth-title">Shop</h1>
          <p
            className="foleio-dash-panel-meta"
            style={{ marginBottom: 0, marginTop: 6 }}
          >
            Manage products, orders, and delivery
          </p>
        </div>
      </div>

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
                      ? '1px solid rgba(250,250,250,0.35)'
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
                  ? '1px solid rgba(250,250,250,0.35)'
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
          <span className="foleio-dash-tab-count">{products.length}</span>
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

      {tab === 'products' ? (
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
                          border: '1px solid rgba(255,255,255,0.08)',
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
                                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                              >
                                <td style={{ padding: '8px 10px', color: '#adadad' }}>
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
              {products.length === 0
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
              });
              const pct = discountPercent(pricing.price, pricing.compareAtPrice);
              const thumb = productImages(product)[0];
              const stockCount = product.stock ?? 0;
              const inStock = stockCount > 0;
              const stockLabel = !inStock
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
                          {pricing.isPreorderActive ? (
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
                          className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#3a3a3a] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#adadad]"
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

      {tab === 'orders' ? (
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
                          background: 'rgba(255,255,255,0.06)',
                          color: '#f4f4f5',
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

      {tab === 'delivery' ? (
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
                  Add flat-rate, free delivery, or pickup options for checkout.
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
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f4f4f5',
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
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#f4f4f5',
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
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#f4f4f5',
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
              if (
                flatTiers.length === 0 &&
                freeTiers.length === 0 &&
                pickupTiers.length === 0
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
                      color: productDrawerView === 'details' ? '#adadad' : undefined,
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
                          ? 'Edit product'
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
                          ? '#fafafa'
                          : '#adadad',
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
                          ? productForm.name.trim() || 'Untitled product'
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
                    <span style={{ fontSize: 13, color: '#adadad', whiteSpace: 'nowrap' }}>
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
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#3a3a3a] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#adadad]"
                      aria-label="Active on profile"
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  className="foleio-dash-drawer-close"
                  onClick={closeProductDrawer}
                  disabled={isSavingProduct || isUploadingImage}
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
                            background: 'rgba(255,255,255,0.04)',
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
                    <p className="foleio-dash-panel-meta" style={{ margin: 0 }}>
                      Default sale price (
                      {productForm.regularPrice
                        ? `₦${Number(productForm.regularPrice).toLocaleString('en-NG')}`
                        : '—'}
                      ) is kept until you turn discount off.
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
                  <span>Photos</span>
                  <p className="foleio-dash-field-hint" style={{ marginTop: 4 }}>
                    Add up to 2 photos. First photo is the main image.
                  </p>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={onImageChange}
                  />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    {Array.from({ length: PRODUCT_IMAGE_SLOTS }).map((_, index) => {
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
                            borderRadius: 12,
                            border: '1px dashed rgba(255,255,255,0.18)',
                            background: '#2b2b2b',
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
                                    color: '#adadad',
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
                                    color: '#adadad',
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
                  />
                </label>

                <label className="foleio-dash-field">
                  <span>Sale price (₦)</span>
                  <input
                    className="foleio-dash-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      productForm.isPreorder
                        ? productForm.preorder.postPreorderPrice
                        : productForm.discountEnabled
                          ? productForm.regularPrice
                          : productForm.price
                    }
                    onChange={(event) =>
                      setProductForm((prev) =>
                        prev.discountEnabled
                          ? { ...prev, regularPrice: event.target.value }
                          : {
                              ...prev,
                              price: event.target.value,
                              regularPrice: event.target.value,
                            }
                      )
                    }
                    required={!productForm.isPreorder && !productForm.discountEnabled}
                    disabled={productForm.isPreorder || productForm.discountEnabled}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="foleio-dash-field">
                    <span>Stock</span>
                    <input
                      className="foleio-dash-input"
                      type="number"
                      min="0"
                      step="1"
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
                      value={productForm.weight}
                      onChange={(event) =>
                        setProductForm((prev) => ({ ...prev, weight: event.target.value }))
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
                    <span>
                      Show as limited stock
                      <span
                        className="foleio-dash-panel-meta"
                        style={{ display: 'block', margin: '4px 0 0' }}
                      >
                        Cards show “Limited stock” instead of the count. Real stock is still tracked.
                      </span>
                    </span>
                    <Switch
                      checked={productForm.showLimitedStock}
                      onCheckedChange={(checked) =>
                        setProductForm((prev) => ({
                          ...prev,
                          showLimitedStock: checked,
                        }))
                      }
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#3a3a3a] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#adadad]"
                      aria-label="Show as limited stock"
                    />
                  </div>
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
                              options: [{ id: crypto.randomUUID(), name: '', price: '' }],
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
                    e.g. Flavours — add types under each category with a price. Toggle required if
                    buyers must choose one.
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
                        background: 'rgba(255,255,255,0.04)',
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
                            color: '#adadad',
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
                            gridTemplateColumns: '1fr 100px auto',
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
                                      : [{ id: crypto.randomUUID(), name: '', price: '' }],
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
                                { id: crypto.randomUUID(), name: '', price: '' },
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
                          background: 'rgba(255,255,255,0.04)',
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
                                    border: '1px solid rgba(255,255,255,0.12)',
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
                      <span
                        title="Set release timing and preorder pricing in setup."
                        aria-label="Set release timing and preorder pricing in setup."
                        style={{
                          display: 'inline-flex',
                          color: '#adadad',
                          cursor: 'help',
                        }}
                      >
                        <Info className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </span>
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
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#3a3a3a] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#adadad]"
                        aria-label="Enable preorder"
                      />
                    </div>
                  </div>
                </div>

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
                      <span
                        title={
                          productForm.isPreorder
                            ? 'Disabled while preorder is on — set discounts in preorder settings.'
                            : 'Set old and new prices in discount setup for strikethrough pricing.'
                        }
                        aria-label={
                          productForm.isPreorder
                            ? 'Disabled while preorder is on — set discounts in preorder settings.'
                            : 'Set old and new prices in discount setup for strikethrough pricing.'
                        }
                        style={{
                          display: 'inline-flex',
                          color: '#adadad',
                          cursor: 'help',
                          pointerEvents: 'auto',
                        }}
                      >
                        <Info className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </span>
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
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#3a3a3a] [&>span]:bg-white data-[state=unchecked]:[&>span]:bg-[#adadad]"
                        aria-label="Enable discount"
                      />
                    </div>
                  </div>
                </div>
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
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    className="foleio-dash-btn-ghost"
                    onClick={closeProductDrawer}
                    disabled={isSavingProduct || isUploadingImage}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="foleio-dash-btn-primary"
                    disabled={isSavingProduct || isUploadingImage}
                  >
                    {isSavingProduct ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    ) : null}
                    Save product
                  </button>
                </div>
                ) : null}
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

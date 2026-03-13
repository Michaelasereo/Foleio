'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type Variant = {
  id?: string;
  name: string;
  options: string[];
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  weight: number | null;
  type: 'physical' | 'digital';
  imageUrl: string | null;
  digitalFileUrl: string | null;
  stock: number | null;
  status: 'draft' | 'active';
  variants: Variant[];
  createdAt: string;
};

type DeliveryTier = {
  id: string;
  name: string;
  description: string | null;
  flatRate: number;
  estimatedDays: string | null;
};

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  deliveryAddress: Record<string, string>;
  items: Array<{
    id: string;
    quantity: number;
    variantSelected: Record<string, string> | null;
    product: { id: string; name: string } | null;
  }>;
};

const STATUS_OPTIONS = ['confirmed', 'in_progress', 'shipped', 'delivered', 'cancelled'];

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

function emptyProductForm() {
  return {
    id: '',
    name: '',
    description: '',
    price: '',
    weight: '',
    type: 'physical' as 'physical' | 'digital',
    imageUrl: '',
    digitalFileUrl: '',
    digitalFileName: '',
    stock: '',
    status: 'draft' as 'draft' | 'active',
    variants: [] as Variant[],
  };
}

export function CreatorShopManager() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'products' | 'orders' | 'delivery'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryTiers, setDeliveryTiers] = useState<DeliveryTier[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm());
  const [tierForm, setTierForm] = useState({ id: '', name: '', description: '', flatRate: '', estimatedDays: '' });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
    void Promise.all([fetchProducts(), fetchOrders(), fetchDeliveryTiers()]);
  }, []);

  const activeProductsCount = useMemo(
    () => products.filter((product) => product.status === 'active').length,
    [products]
  );

  function openCreateProduct() {
    setProductForm(emptyProductForm());
    setIsProductDialogOpen(true);
  }

  function openEditProduct(product: Product) {
    setProductForm({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: String(product.price / 100),
      weight: product.weight ? String(product.weight) : '',
      type: product.type,
      imageUrl: product.imageUrl || '',
      digitalFileUrl: product.digitalFileUrl || '',
      digitalFileName: product.digitalFileUrl ? product.digitalFileUrl.split('/').pop() || '' : '',
      stock: product.stock === null ? '' : String(product.stock),
      status: product.status,
      variants: product.variants || [],
    });
    setIsProductDialogOpen(true);
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setIsSavingProduct(true);
    const payload = {
      name: productForm.name,
      description: productForm.description,
      price: productForm.price,
      weight: productForm.weight,
      type: productForm.type,
      imageUrl: productForm.imageUrl,
      digitalFileUrl: productForm.digitalFileUrl,
      stock: productForm.stock,
      status: productForm.status,
      variants: productForm.variants,
    };

    const isEdit = Boolean(productForm.id);
    const response = await fetch(isEdit ? `/api/creator/products/${productForm.id}` : '/api/creator/products', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setIsSavingProduct(false);
    if (!response.ok) return;
    setIsProductDialogOpen(false);
    await fetchProducts();
  }

  async function deleteProduct(id: string) {
    if (!window.confirm('Delete this product?')) return;
    const response = await fetch(`/api/creator/products/${id}`, { method: 'DELETE' });
    if (response.ok) await fetchProducts();
  }

  async function toggleProductStatus(product: Product) {
    const nextStatus = product.status === 'active' ? 'draft' : 'active';
    const response = await fetch(`/api/creator/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...product,
        price: product.price / 100,
        status: nextStatus,
      }),
    });
    if (response.ok) await fetchProducts();
  }

  async function uploadProductFile(file: File, type: 'product-image' | 'digital-product') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch('/api/creator/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Upload failed');
    }
    return data as { url: string; fileName?: string };
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please upload an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be under 5MB', variant: 'destructive' });
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploaded = await uploadProductFile(file, 'product-image');
      setProductForm((prev) => ({ ...prev, imageUrl: uploaded.url }));
      toast({ title: 'Product image uploaded' });
    } catch (error: any) {
      toast({
        title: 'Image upload failed',
        description: error?.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  }

  async function handlePdfUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Only PDF files are supported', variant: 'destructive' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'PDF must be under 50MB', variant: 'destructive' });
      return;
    }

    setIsUploadingPdf(true);
    try {
      const uploaded = await uploadProductFile(file, 'digital-product');
      setProductForm((prev) => ({
        ...prev,
        digitalFileUrl: uploaded.url,
        digitalFileName: uploaded.fileName || file.name,
      }));
      toast({ title: 'PDF uploaded successfully' });
    } catch (error: any) {
      toast({
        title: 'PDF upload failed',
        description: error?.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPdf(false);
      event.target.value = '';
    }
  }

  function addVariant() {
    if (productForm.variants.length >= 3) return;
    setProductForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { name: '', options: [] }],
    }));
  }

  function removeVariant(index: number) {
    setProductForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, current) => current !== index),
    }));
  }

  function updateVariant(index: number, key: 'name', value: string) {
    setProductForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, current) =>
        current === index ? { ...variant, [key]: value } : variant
      ),
    }));
  }

  function addOption(index: number, value: string) {
    const option = value.trim();
    if (!option) return;
    setProductForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, current) =>
        current === index
          ? {
              ...variant,
              options: variant.options.includes(option)
                ? variant.options
                : [...variant.options, option],
            }
          : variant
      ),
    }));
  }

  function removeOption(variantIndex: number, optionIndex: number) {
    setProductForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, current) =>
        current === variantIndex
          ? {
              ...variant,
              options: variant.options.filter((_, index) => index !== optionIndex),
            }
          : variant
      ),
    }));
  }

  async function saveTier(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: tierForm.name,
      description: tierForm.description,
      flatRate: tierForm.flatRate,
      estimatedDays: tierForm.estimatedDays,
    };
    const isEdit = Boolean(tierForm.id);
    const response = await fetch(isEdit ? `/api/creator/delivery-tiers/${tierForm.id}` : '/api/creator/delivery-tiers', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return;
    setTierForm({ id: '', name: '', description: '', flatRate: '', estimatedDays: '' });
    await fetchDeliveryTiers();
  }

  function editTier(tier: DeliveryTier) {
    setTierForm({
      id: tier.id,
      name: tier.name,
      description: tier.description || '',
      flatRate: String(tier.flatRate / 100),
      estimatedDays: tier.estimatedDays || '',
    });
  }

  async function deleteTier(id: string) {
    if (!window.confirm('Delete this delivery tier?')) return;
    const response = await fetch(`/api/creator/delivery-tiers/${id}`, { method: 'DELETE' });
    if (response.ok) await fetchDeliveryTiers();
  }

  async function updateOrderStatus(orderId: string, status: string) {
    const response = await fetch(`/api/creator/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (response.ok) await fetchOrders();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shop</h1>
          <p className="text-muted-foreground">Manage products, orders, and delivery settings.</p>
        </div>
        {tab === 'products' ? (
          <Button onClick={openCreateProduct}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2">
        {(['products', 'orders', 'delivery'] as const).map((currentTab) => (
          <button
            key={currentTab}
            onClick={() => setTab(currentTab)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium capitalize',
              tab === currentTab ? 'border-primary bg-primary/10 text-primary' : 'border-border'
            )}
            type="button"
          >
            {currentTab}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {products.length} products · {activeProductsCount} active
          </div>
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-lg bg-muted">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{formatNaira(product.price)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{product.type}</Badge>
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Stock: {product.stock === null ? 'Unlimited' : product.stock}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => toggleProductStatus(product)}>
                    {product.status === 'active' ? 'Set Draft' : 'Set Active'}
                  </Button>
                  <Button variant="outline" onClick={() => openEditProduct(product)}>
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => deleteProduct(product.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'orders' ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">Order #{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.deliveryAddress?.name} · {order.deliveryAddress?.phone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.deliveryAddress?.address}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatNaira(order.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('en-NG')}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  {order.items.map((item) => (
                    <p key={item.id} className="text-sm">
                      {item.quantity}x {item.product?.name || 'Product'}
                      {item.variantSelected ? (
                        <span className="text-muted-foreground">
                          {' '}
                          (
                          {Object.entries(item.variantSelected)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                          )
                        </span>
                      ) : null}
                    </p>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={order.status}
                    onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                    className="flex-1 rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  <Badge variant="outline">{order.status.replace('_', ' ')}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'delivery' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{tierForm.id ? 'Edit Delivery Tier' : 'Add Delivery Tier'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveTier}>
                <Input
                  placeholder="Tier name e.g. Lagos Delivery"
                  value={tierForm.name}
                  onChange={(event) => setTierForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
                <Input
                  type="number"
                  placeholder="Flat Rate (₦)"
                  value={tierForm.flatRate}
                  onChange={(event) => setTierForm((prev) => ({ ...prev, flatRate: event.target.value }))}
                  required
                />
                <Input
                  placeholder="Estimated delivery e.g. 1-3 days"
                  value={tierForm.estimatedDays}
                  onChange={(event) => setTierForm((prev) => ({ ...prev, estimatedDays: event.target.value }))}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={tierForm.description}
                  onChange={(event) => setTierForm((prev) => ({ ...prev, description: event.target.value }))}
                />
                <div className="flex gap-2">
                  <Button type="submit">{tierForm.id ? 'Update Tier' : 'Save Tier'}</Button>
                  {tierForm.id ? (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setTierForm({ id: '', name: '', description: '', flatRate: '', estimatedDays: '' })}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {deliveryTiers.map((tier) => (
              <Card key={tier.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{tier.name}</p>
                      <p className="text-sm text-muted-foreground">{formatNaira(tier.flatRate)}</p>
                      <p className="text-xs text-muted-foreground">{tier.estimatedDays || 'No ETA'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => editTier(tier)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteTier(tier.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  {tier.description ? <p className="text-sm">{tier.description}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{productForm.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveProduct}>
            <div className="flex gap-2">
              <button
                onClick={() => setProductForm((prev) => ({ ...prev, type: 'physical' }))}
                className={cn(
                  'flex-1 rounded-xl border py-2.5 text-sm font-medium',
                  productForm.type === 'physical'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border'
                )}
                type="button"
              >
                Physical Product
              </button>
              <button
                onClick={() => setProductForm((prev) => ({ ...prev, type: 'digital' }))}
                className={cn(
                  'flex-1 rounded-xl border py-2.5 text-sm font-medium',
                  productForm.type === 'digital'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border'
                )}
                type="button"
              >
                Digital Product
              </button>
            </div>

            <Input
              placeholder="Product name"
              value={productForm.name}
              onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Textarea
              placeholder="Description"
              value={productForm.description}
              onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <Input
              type="number"
              placeholder="Price in ₦"
              value={productForm.price}
              onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
              required
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Product Image</p>
              <div
                role="button"
                tabIndex={0}
                onClick={() => imageInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') imageInputRef.current?.click();
                }}
                className={cn(
                  'relative w-full max-w-[220px] aspect-square cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed',
                  isUploadingImage ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30 hover:border-primary/40'
                )}
              >
                {productForm.imageUrl ? (
                  <Image
                    src={productForm.imageUrl}
                    alt="Product"
                    width={440}
                    height={440}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8" />
                        Click to upload image
                        <span className="text-[11px] text-muted-foreground/70">JPG, PNG, WebP up to 5MB</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <Input
              type="number"
              placeholder="Stock (leave empty for unlimited)"
              value={productForm.stock}
              onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
            />
            {productForm.type === 'physical' ? (
              <Input
                type="number"
                placeholder="Weight (kg)"
                value={productForm.weight}
                onChange={(event) => setProductForm((prev) => ({ ...prev, weight: event.target.value }))}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Digital Product File (PDF only)</p>
                {productForm.digitalFileUrl ? (
                  <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-blue-900">
                        {productForm.digitalFileName || 'digital-product.pdf'}
                      </p>
                      <p className="text-xs text-blue-700">PDF uploaded</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => pdfInputRef.current?.click()}>
                      Replace
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className={cn(
                      'w-full rounded-xl border-2 border-dashed p-6 text-center',
                      isUploadingPdf ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30 hover:border-primary/40'
                    )}
                  >
                    {isUploadingPdf ? (
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        Uploading PDF...
                      </span>
                    ) : (
                      <span className="inline-flex flex-col items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-6 w-6" />
                        Click to upload your PDF
                        <span className="text-xs text-muted-foreground/70">Up to 50MB</span>
                      </span>
                    )}
                  </button>
                )}
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                {productForm.digitalFileUrl ? (
                  <a
                    href={productForm.digitalFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Preview uploaded PDF URL
                  </a>
                ) : null}
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium">Variants (max 3)</p>
              <div className="space-y-3">
                {productForm.variants.map((variant, variantIndex) => (
                  <div key={`${variant.name}-${variantIndex}`} className="space-y-3 rounded-xl bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Input
                        placeholder="Variant name e.g. Size"
                        value={variant.name}
                        onChange={(event) => updateVariant(variantIndex, 'name', event.target.value)}
                      />
                      <Button variant="outline" size="icon" onClick={() => removeVariant(variantIndex)} type="button">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((option, optionIndex) => (
                        <span
                          key={`${option}-${optionIndex}`}
                          className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                        >
                          {option}
                          <button type="button" onClick={() => removeOption(variantIndex, optionIndex)}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        placeholder="Add option..."
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addOption(variantIndex, event.currentTarget.value);
                            event.currentTarget.value = '';
                          }
                        }}
                        className="min-w-[100px] border-b border-dashed border-border bg-transparent px-2 py-1 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {productForm.variants.length < 3 ? (
                <button
                  type="button"
                  onClick={addVariant}
                  className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary"
                >
                  <Plus className="h-4 w-4" />
                  Add variant
                </button>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingProduct}>
                {isSavingProduct ? 'Saving...' : productForm.id ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CreatorShopPage() {
  return <CreatorShopManager />;
}

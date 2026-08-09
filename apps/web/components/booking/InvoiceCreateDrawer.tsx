'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import Link from 'next/link';
import {
  InvoiceDocument,
  toApiLineItems,
  type InvoiceDeliveryTierOption,
  type InvoiceDocumentData,
  type InvoiceDocLineItem,
  type InvoiceProductOption,
} from '@/components/booking/InvoiceDocument';
import { resolveDeliveryFeeKobo } from '@/lib/shop/delivery-fee';

export type InvoiceCreateServiceOption = {
  id: string;
  name: string;
  isActive?: boolean;
};

export type InvoiceCreateFormValues = {
  linkedServiceId: string;
  title: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  serviceDate: string;
  lineItems: Array<{
    id: string;
    label: string;
    amountKobo: number;
    productId?: string;
    qty?: number;
  }>;
  invoiceNumber?: string;
  notes?: string;
  deliveryFeeMode?: 'none' | 'tier' | 'custom';
  deliveryTierId?: string | null;
  deliveryFeeKobo?: number;
};

export type InvoiceCreatorProfile = {
  displayName: string;
  email?: string | null;
  phone?: string | null;
};

type InvoiceCreateDrawerProps = {
  open: boolean;
  onClose: () => void;
  services: InvoiceCreateServiceOption[];
  products?: InvoiceProductOption[];
  deliveryTiers?: InvoiceDeliveryTierOption[];
  creator: InvoiceCreatorProfile;
  saving?: boolean;
  initialValues?: Partial<InvoiceCreateFormValues> & {
    quoteRequestId?: string;
    lineItemLabel?: string;
    existingQuoteId?: string;
    startInPreview?: boolean;
    discountNaira?: number;
  };
  onSubmit: (values: InvoiceCreateFormValues) => Promise<{
    invoiceNumber?: string;
    quoteId?: string;
  } | void>;
  onUpdate?: (
    quoteId: string,
    values: InvoiceCreateFormValues
  ) => Promise<void>;
  onSend?: (quoteId: string) => Promise<void>;
};

const drawerCss = `
.foleio-invoice-create-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(17, 24, 39, 0.4);
}
.foleio-invoice-create-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 81;
  display: flex;
  flex-direction: column;
  width: min(840px, 100vw);
  background: #f5f3f4;
  color: #111827;
  font-family: var(--font-body), sans-serif;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.18);
  animation: foleio-invoice-create-in 180ms ease-out;
}
@keyframes foleio-invoice-create-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.foleio-invoice-create-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e3e6;
  background: #fcfafb;
  flex-shrink: 0;
}
.foleio-invoice-create-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}
.foleio-invoice-create-meta {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.4;
}
.foleio-invoice-create-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.06);
  color: #6b7280;
  cursor: pointer;
}
.foleio-invoice-create-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}
.foleio-invoice-create-footer {
  padding: 14px 20px;
  border-top: 1px solid #e5e3e6;
  background: #fcfafb;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
`;

function todayLabel() {
  return new Date().toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function defaultLine(): InvoiceDocLineItem {
  return {
    id: `line_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    label: 'Project item',
    detail: '',
    qty: 1,
    unitPriceNaira: 0,
  };
}

function buildDoc(
  creator: InvoiceCreatorProfile,
  services: InvoiceCreateServiceOption[],
  products: InvoiceProductOption[],
  initial?: InvoiceCreateDrawerProps['initialValues']
): InvoiceDocumentData {
  const hasInitialProducts = Array.isArray(initial?.lineItems)
    ? initial.lineItems.some((item) => Boolean(item.productId))
    : false;
  const firstService =
    initial?.linkedServiceId ||
    (!hasInitialProducts
      ? services.find((s) => s.isActive !== false)?.id || ''
      : '') ||
    '';
  const productById = new Map(products.map((p) => [p.id, p]));
  return {
    invoiceNumber:
      initial?.invoiceNumber || `#INV-${String(Date.now()).slice(-6)}`,
    issueDate: todayLabel(),
    clientName: initial?.customerName || '',
    subject: initial?.title || 'New invoice',
    companyName: creator.displayName || 'Your business',
    linkedServiceId: firstService,
    customerEmail: initial?.customerEmail || '',
    customerPhone: initial?.customerPhone || '',
    customerAddress: initial?.customerAddress || '',
    serviceDate: initial?.serviceDate || '',
    lineItems:
      Array.isArray(initial?.lineItems) && initial.lineItems.length > 0
        ? initial.lineItems.map((item) => {
            const [label, ...rest] = String(item.label || 'Item').split(' — ');
            const qty = Math.max(1, Math.round(Number(item.qty) || 1));
            const product = item.productId
              ? productById.get(item.productId)
              : null;
            return {
              id: item.id,
              label: label || 'Item',
              detail: rest.join(' — '),
              qty,
              unitPriceNaira: Math.max(0, (item.amountKobo || 0) / 100 / qty),
              productId: item.productId || null,
              productType: product?.type || null,
            };
          })
        : [
            {
              ...defaultLine(),
              label: initial?.lineItemLabel || 'Project item',
              unitPriceNaira: 0,
            },
          ],
    discountNaira: Number(initial?.discountNaira) || 0,
    paymentNote: '',
    termsNote: 'Terms: 7 days from issue date',
    companyAddress: '',
    companyCity: '',
    companyTaxId: '',
    companyEmail: creator.email || '',
    companyPhone: creator.phone || '',
    deliveryFeeMode:
      (initial?.deliveryFeeMode as InvoiceDocumentData['deliveryFeeMode']) ||
      'none',
    deliveryTierId: initial?.deliveryTierId || '',
    deliveryFeeNaira: Math.max(0, (Number(initial?.deliveryFeeKobo) || 0) / 100),
  };
}

function resolveDeliveryFeeFromDoc(
  doc: InvoiceDocumentData,
  deliveryTiers: InvoiceDeliveryTierOption[]
) {
  const hasPhysical = doc.lineItems.some(
    (row) => row.productId && row.productType === 'physical'
  );
  if (!hasPhysical || doc.deliveryFeeMode === 'none') return 0;
  if (doc.deliveryFeeMode === 'custom') {
    return Math.round(Math.max(0, doc.deliveryFeeNaira || 0) * 100);
  }
  const tier = deliveryTiers.find((t) => t.id === doc.deliveryTierId);
  if (!tier) return Math.round(Math.max(0, doc.deliveryFeeNaira || 0) * 100);
  const productSubtotalNaira = doc.lineItems
    .filter((row) => row.productId)
    .reduce((sum, row) => sum + Math.max(0, row.qty * row.unitPriceNaira), 0);
  const physicalQty = doc.lineItems
    .filter((row) => row.productId && row.productType === 'physical')
    .reduce((sum, row) => sum + Math.max(1, row.qty || 1), 0);
  return resolveDeliveryFeeKobo(
    {
      type: tier.type,
      flatRate: tier.flatRate,
      minSubtotalKobo: tier.minSubtotalKobo,
      minItemQuantity: tier.minItemQuantity,
    },
    Math.round(productSubtotalNaira * 100),
    physicalQty
  );
}

export function InvoiceCreateDrawer({
  open,
  onClose,
  services,
  products = [],
  deliveryTiers = [],
  creator,
  saving = false,
  initialValues,
  onSubmit,
  onUpdate,
  onSend,
}: InvoiceCreateDrawerProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [doc, setDoc] = useState<InvoiceDocumentData>(() =>
    buildDoc(creator, services, products, initialValues)
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(
    initialValues?.existingQuoteId || null
  );

  const activeServices = useMemo(
    () => services.filter((s) => s.isActive !== false),
    [services]
  );

  useEffect(() => {
    if (!open) return;
    setMode(initialValues?.startInPreview ? 'preview' : 'edit');
    setSavedQuoteId(initialValues?.existingQuoteId || null);
    setDoc(buildDoc(creator, services, products, initialValues));
    setLocalError(null);
  }, [
    open,
    creator,
    services,
    products,
    initialValues?.quoteRequestId,
    initialValues?.existingQuoteId,
    initialValues?.customerName,
    initialValues?.customerEmail,
    initialValues?.customerPhone,
    initialValues?.title,
    initialValues?.linkedServiceId,
    initialValues?.serviceDate,
    initialValues?.lineItemLabel,
    initialValues?.startInPreview,
    initialValues?.invoiceNumber,
    initialValues?.lineItems,
    initialValues?.discountNaira,
    initialValues?.deliveryFeeMode,
    initialValues?.deliveryTierId,
    initialValues?.deliveryFeeKobo,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, saving]);

  if (!open) return null;

  async function handleSave() {
    setLocalError(null);
    const hasProducts = doc.lineItems.some((row) => Boolean(row.productId));
    const hasServiceLines = doc.lineItems.some((row) => !row.productId);

    if (!doc.linkedServiceId && !hasProducts) {
      setLocalError('Select a booking service or add at least one shop product');
      return;
    }
    if (doc.linkedServiceId && !doc.serviceDate.trim()) {
      setLocalError('Service date is required when a booking service is selected');
      return;
    }
    if (doc.linkedServiceId && !hasServiceLines) {
      setLocalError(
        'Add a service line item for the booking, or remove the booking service'
      );
      return;
    }
    if (!doc.clientName.trim() || !doc.customerEmail.trim()) {
      setLocalError('Client name and email are required');
      return;
    }

    const hasPhysical = doc.lineItems.some(
      (row) => row.productId && row.productType === 'physical'
    );
    if (hasPhysical) {
      if (doc.deliveryFeeMode === 'tier' && !doc.deliveryTierId) {
        setLocalError('Select a delivery option or enter a custom fee');
        return;
      }
      if (doc.deliveryFeeMode === 'none') {
        setLocalError('Select a delivery option or enter a custom fee');
        return;
      }
    }

    const deliveryFeeKobo = resolveDeliveryFeeFromDoc(doc, deliveryTiers);

    try {
      const payload: InvoiceCreateFormValues = {
        linkedServiceId: doc.linkedServiceId,
        title: doc.subject.trim() || `Invoice for ${doc.clientName.trim()}`,
        customerName: doc.clientName.trim(),
        customerEmail: doc.customerEmail.trim(),
        customerPhone: doc.customerPhone.trim(),
        customerAddress: doc.customerAddress.trim(),
        serviceDate: doc.serviceDate,
        lineItems: toApiLineItems(doc.lineItems, doc.discountNaira),
        invoiceNumber: doc.invoiceNumber,
        deliveryFeeMode: hasPhysical ? doc.deliveryFeeMode : 'none',
        deliveryTierId:
          hasPhysical && doc.deliveryFeeMode === 'tier'
            ? doc.deliveryTierId || null
            : null,
        deliveryFeeKobo: hasPhysical ? deliveryFeeKobo : 0,
        notes: [
          doc.discountNaira > 0 ? `Discount: ₦${doc.discountNaira}` : null,
          doc.termsNote,
        ]
          .filter(Boolean)
          .join('\n'),
      };

      if (savedQuoteId && onUpdate) {
        await onUpdate(savedQuoteId, payload);
      } else {
        const result = await onSubmit(payload);
        if (result?.quoteId) setSavedQuoteId(result.quoteId);
        if (result?.invoiceNumber) {
          setDoc((prev) => ({
            ...prev,
            invoiceNumber: result.invoiceNumber || prev.invoiceNumber,
          }));
        }
      }
      setMode('preview');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not save invoice');
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: drawerCss }} />
      <div
        className="foleio-invoice-create-backdrop"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden="true"
      />
      <aside
        className="foleio-invoice-create-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-create-title"
      >
        <div className="foleio-invoice-create-header">
          <div>
            <h2 id="invoice-create-title" className="foleio-invoice-create-title">
              {mode === 'edit'
                ? savedQuoteId
                  ? 'Edit invoice'
                  : 'Create invoice'
                : 'Invoice preview'}
            </h2>
            <p className="foleio-invoice-create-meta">
              {mode === 'edit'
                ? 'Add a booking service and/or shop products, then save to preview.'
                : 'This is how the invoice reads. Edit again anytime from here.'}
            </p>
          </div>
          <button
            type="button"
            className="foleio-invoice-create-close"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            <X strokeWidth={1.75} />
          </button>
        </div>

        <div className="foleio-invoice-create-body">
          {localError ? (
            <p
              className="foleio-dash-panel-meta"
              style={{ color: '#b91c1c', margin: '0 0 12px' }}
            >
              {localError}
            </p>
          ) : null}

          {activeServices.length === 0 && products.length === 0 ? (
            <p className="foleio-dash-panel-meta" style={{ marginBottom: 12 }}>
              Add a booking service or shop product first.{' '}
              <Link href="/bookings?tab=services" className="underline">
                Services
              </Link>{' '}
              ·{' '}
              <Link href="/shop" className="underline">
                Shop
              </Link>
            </p>
          ) : null}

          <InvoiceDocument
            mode={mode}
            value={doc}
            onChange={mode === 'edit' ? setDoc : undefined}
            services={services}
            products={products}
            deliveryTiers={deliveryTiers}
          />
        </div>

        <div className="foleio-invoice-create-footer">
          {mode === 'preview' ? (
            <>
              <button
                type="button"
                className="foleio-dash-btn-outline"
                onClick={() => setMode('edit')}
                disabled={saving}
              >
                Edit again
              </button>
              {savedQuoteId && onSend ? (
                <button
                  type="button"
                  className="foleio-dash-btn-primary"
                  disabled={saving}
                  onClick={() => {
                    void (async () => {
                      try {
                        await onSend(savedQuoteId);
                        onClose();
                      } catch (err) {
                        setLocalError(
                          err instanceof Error ? err.message : 'Could not send'
                        );
                      }
                    })();
                  }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Send invoice
                </button>
              ) : (
                <button
                  type="button"
                  className="foleio-dash-btn-primary"
                  onClick={onClose}
                >
                  Done
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="foleio-dash-btn-outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="foleio-dash-btn-primary"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save & preview
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

'use client';

import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import {
  InvoiceDocument,
  type InvoiceDocumentData,
  type InvoiceDocLineItem,
} from '@/components/booking/InvoiceDocument';

export type InvoicePreviewData = {
  title: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string | null;
  status: string;
  serviceName?: string | null;
  serviceDate?: string | null;
  validUntil?: string | null;
  invoiceNumber?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  lineItems: Array<{
    id: string;
    label: string;
    amountKobo: number;
    productId?: string | null;
    qty?: number;
  }>;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  paymentNote?: string;
  deliveryFeeMode?: string | null;
  deliveryTierId?: string | null;
  deliveryFeeKobo?: number | null;
};

type InvoicePreviewDrawerProps = {
  open: boolean;
  onClose: () => void;
  preview: InvoicePreviewData | null;
};

const drawerCss = `
.foleio-invoice-preview-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(17, 24, 39, 0.4);
}
.foleio-invoice-preview-drawer {
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
  animation: foleio-invoice-preview-in 180ms ease-out;
}
@keyframes foleio-invoice-preview-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.foleio-invoice-preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e3e6;
  background: #fcfafb;
  flex-shrink: 0;
}
.foleio-invoice-preview-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}
.foleio-invoice-preview-meta {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.4;
}
.foleio-invoice-preview-close {
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
.foleio-invoice-preview-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}
`;

function toDocLines(
  items: InvoicePreviewData['lineItems']
): InvoiceDocLineItem[] {
  if (!items.length) {
    return [
      {
        id: 'empty',
        label: 'No items',
        detail: '',
        qty: 1,
        unitPriceNaira: 0,
      },
    ];
  }
  return items.map((item) => {
    const [label, ...rest] = String(item.label || 'Item').split(' — ');
    const qty = Math.max(1, Math.round(Number(item.qty) || 1));
    const naira = Math.max(0, (item.amountKobo || 0) / 100 / qty);
    return {
      id: item.id,
      label: label || 'Item',
      detail: rest.join(' — '),
      qty,
      unitPriceNaira: naira,
      productId: item.productId || null,
    };
  });
}

export function InvoicePreviewDrawer({
  open,
  onClose,
  preview,
}: InvoicePreviewDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const doc: InvoiceDocumentData | null = useMemo(() => {
    if (!preview) return null;
    return {
      invoiceNumber:
        preview.invoiceNumber ||
        `#${preview.status === 'draft' ? 'DRAFT' : 'INV'}`,
      issueDate: new Date().toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      clientName: preview.customerName,
      subject: preview.title,
      companyName: preview.companyName || 'Foleio merchant',
      linkedServiceId: '',
      customerEmail: preview.customerEmail || '',
      customerPhone: preview.customerPhone || '',
      customerAddress: preview.customerAddress || '',
      serviceDate: preview.serviceDate
        ? String(preview.serviceDate).slice(0, 10)
        : '',
      lineItems: toDocLines(preview.lineItems),
      discountNaira: 0,
      paymentNote: '',
      termsNote: preview.validUntil
        ? `Valid until ${String(preview.validUntil).slice(0, 10)}`
        : 'Terms: 7 days from issue date',
      companyAddress: '',
      companyCity: '',
      companyTaxId: '',
      companyEmail: preview.companyEmail || '',
      companyPhone: preview.companyPhone || '',
      deliveryFeeMode:
        preview.deliveryFeeMode === 'tier' || preview.deliveryFeeMode === 'custom'
          ? preview.deliveryFeeMode
          : 'none',
      deliveryTierId: preview.deliveryTierId || '',
      deliveryFeeNaira: Math.max(0, (Number(preview.deliveryFeeKobo) || 0) / 100),
    };
  }, [preview]);

  if (!open || !doc) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: drawerCss }} />
      <div
        className="foleio-invoice-preview-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="foleio-invoice-preview-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-preview-title"
      >
        <div className="foleio-invoice-preview-header">
          <div>
            <h2 id="invoice-preview-title" className="foleio-invoice-preview-title">
              Invoice preview
            </h2>
            <p className="foleio-invoice-preview-meta">
              Client-facing layout for this invoice.
            </p>
          </div>
          <button
            type="button"
            className="foleio-invoice-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X strokeWidth={1.75} />
          </button>
        </div>

        <div className="foleio-invoice-preview-body">
          <InvoiceDocument mode="preview" value={doc} />
        </div>
      </aside>
    </>
  );
}

export function InvoicePreviewTrigger({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="foleio-dash-panel"
      style={{
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <div className="foleio-dash-sub-name">View preview</div>
        <p className="foleio-dash-panel-meta" style={{ margin: '4px 0 0' }}>
          Open the invoice design preview.
        </p>
      </div>
      <button
        type="button"
        className="foleio-dash-btn-outline"
        onClick={onClick}
        disabled={disabled}
      >
        Preview
      </button>
    </div>
  );
}

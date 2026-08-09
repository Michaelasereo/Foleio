'use client';

import type { CSSProperties, ReactNode } from 'react';
import { formatNaira, koboToNaira } from '@foleio/utils';
import { resolveDeliveryFeeKobo } from '@/lib/shop/delivery-fee';

/** `formatNaira` expects naira; product prices and totals here are stored in kobo. */
function formatKobo(kobo: number) {
  return formatNaira(koboToNaira(kobo));
}

export type InvoiceDocLineItem = {
  id: string;
  label: string;
  detail: string;
  qty: number;
  unitPriceNaira: number;
  productId?: string | null;
  productType?: string | null;
};

export type InvoiceDeliveryTierOption = {
  id: string;
  name: string;
  type: string;
  flatRate: number;
  minSubtotalKobo?: number | null;
  minItemQuantity?: number | null;
};

export type InvoiceProductOption = {
  id: string;
  name: string;
  price: number;
  type: string;
  stock?: number | null;
  status?: string;
};

export type InvoiceDocumentData = {
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  subject: string;
  companyName: string;
  linkedServiceId: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  serviceDate: string;
  lineItems: InvoiceDocLineItem[];
  discountNaira: number;
  paymentNote: string;
  termsNote: string;
  companyAddress: string;
  companyCity: string;
  companyTaxId: string;
  companyEmail: string;
  companyPhone: string;
  deliveryFeeMode: 'none' | 'tier' | 'custom';
  deliveryTierId: string;
  deliveryFeeNaira: number;
};

type InvoiceDocumentProps = {
  mode: 'edit' | 'preview';
  value: InvoiceDocumentData;
  onChange?: (next: InvoiceDocumentData) => void;
  services?: Array<{ id: string; name: string; isActive?: boolean }>;
  products?: InvoiceProductOption[];
  deliveryTiers?: InvoiceDeliveryTierOption[];
  /** Customer pay actions under PAYMENT (preview mode). */
  paySlot?: ReactNode;
};

function nairaInput(raw: string) {
  const n = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function asNaira(value: number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatNairaAmount(value: number | null | undefined) {
  return asNaira(value).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function lineTotalNaira(item: InvoiceDocLineItem) {
  return Math.max(0, (item.qty || 0) * (item.unitPriceNaira || 0));
}

export function invoiceDocTotals(
  items: InvoiceDocLineItem[],
  discountNaira = 0,
  deliveryFeeNaira = 0
) {
  const subtotal = items.reduce((sum, row) => sum + lineTotalNaira(row), 0);
  const discount = Math.min(subtotal, Math.max(0, discountNaira || 0));
  const delivery = Math.max(0, deliveryFeeNaira || 0);
  const total = Math.max(0, subtotal - discount + delivery);
  return {
    subtotalNaira: subtotal,
    subtotalKobo: Math.round(subtotal * 100),
    discountNaira: discount,
    discountKobo: Math.round(discount * 100),
    deliveryFeeNaira: delivery,
    deliveryFeeKobo: Math.round(delivery * 100),
    totalNaira: total,
    totalKobo: Math.round(total * 100),
    balanceDueNaira: total,
  };
}

export function toApiLineItems(
  items: InvoiceDocLineItem[],
  discountNaira = 0
) {
  const lines = items.map((item) => {
    const base: {
      id: string;
      label: string;
      amountKobo: number;
      productId?: string;
      qty?: number;
    } = {
      id: item.id,
      label: item.detail?.trim()
        ? `${item.label.trim() || 'Item'} — ${item.detail.trim()}`
        : item.label.trim() || 'Item',
      amountKobo: Math.round(lineTotalNaira(item) * 100),
    };
    if (item.productId) {
      base.productId = item.productId;
      base.qty = Math.max(1, Math.round(item.qty || 1));
    }
    return base;
  });

  const subtotalKobo = lines.reduce((sum, row) => sum + row.amountKobo, 0);
  let remainingDiscountKobo = Math.min(
    subtotalKobo,
    Math.round(Math.max(0, discountNaira || 0) * 100)
  );

  for (let i = lines.length - 1; i >= 0 && remainingDiscountKobo > 0; i -= 1) {
    const cut = Math.min(lines[i].amountKobo, remainingDiscountKobo);
    lines[i] = {
      ...lines[i],
      amountKobo: lines[i].amountKobo - cut,
    };
    remainingDiscountKobo -= cut;
  }

  return lines;
}

const fieldBase: CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  padding: 0,
  outline: 'none',
};

const ghostEdit: CSSProperties = {
  ...fieldBase,
  borderBottom: '1px dashed #d4d0d4',
  borderRadius: 0,
  paddingBottom: 2,
};


function RequiredMark() {
  return (
    <span style={{ color: '#dc2626', marginLeft: 2 }} aria-hidden="true">
      *
    </span>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#6b7280',
        marginBottom: 2,
      }}
    >
      {children}
      {required ? <RequiredMark /> : null}
    </div>
  );
}

function InvoiceDocField({
  editable,
  val,
  onVal,
  placeholder,
  style,
  multiline,
}: {
  editable: boolean;
  val: string;
  onVal: (v: string) => void;
  placeholder?: string;
  style?: CSSProperties;
  multiline?: boolean;
}) {
  if (!editable) {
    return <span style={style}>{val || placeholder || '—'}</span>;
  }
  if (multiline) {
    return (
      <textarea
        value={val}
        placeholder={placeholder}
        rows={3}
        onChange={(e) => onVal(e.target.value)}
        style={{ ...ghostEdit, resize: 'vertical', ...style }}
      />
    );
  }
  return (
    <input
      value={val}
      placeholder={placeholder}
      onChange={(e) => onVal(e.target.value)}
      style={{ ...ghostEdit, ...style }}
    />
  );
}

export function InvoiceDocument({
  mode,
  value,
  onChange,
  services = [],
  products = [],
  deliveryTiers = [],
  paySlot,
}: InvoiceDocumentProps) {
  const editable = Boolean(mode === 'edit' && onChange);
  const activeServices = services.filter((s) => s.isActive !== false);
  const activeProducts = products.filter((p) => p.status !== 'draft');
  const hasPhysicalProduct = value.lineItems.some(
    (row) => row.productId && row.productType === 'physical'
  );
  const productSubtotalNaira = value.lineItems
    .filter((row) => row.productId)
    .reduce((sum, row) => sum + lineTotalNaira(row), 0);
  const physicalQty = value.lineItems
    .filter((row) => row.productId && row.productType === 'physical')
    .reduce((sum, row) => sum + Math.max(1, row.qty || 1), 0);

  const deliveryFeeNaira =
    value.deliveryFeeMode === 'none'
      ? 0
      : value.deliveryFeeMode === 'custom'
        ? asNaira(value.deliveryFeeNaira)
        : (() => {
            const tier = deliveryTiers.find((t) => t.id === value.deliveryTierId);
            if (!tier) return asNaira(value.deliveryFeeNaira);
            return (
              resolveDeliveryFeeKobo(
                {
                  type: tier.type,
                  flatRate: tier.flatRate,
                  minSubtotalKobo: tier.minSubtotalKobo,
                  minItemQuantity: tier.minItemQuantity,
                },
                Math.round(productSubtotalNaira * 100),
                physicalQty
              ) / 100
            );
          })();

  const totals = invoiceDocTotals(
    value.lineItems || [],
    asNaira(value.discountNaira),
    hasPhysicalProduct || value.deliveryFeeMode !== 'none'
      ? deliveryFeeNaira
      : 0
  );

  function patch(partial: Partial<InvoiceDocumentData>) {
    if (!onChange) return;
    onChange({ ...value, ...partial });
  }

  function patchLine(id: string, partial: Partial<InvoiceDocLineItem>) {
    if (!onChange) return;
    onChange({
      ...value,
      lineItems: value.lineItems.map((row) =>
        row.id === id ? { ...row, ...partial } : row
      ),
    });
  }

  function addLine() {
    if (!onChange) return;
    onChange({
      ...value,
      lineItems: [
        ...value.lineItems,
        {
          id: `line_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
          label: 'Project item',
          detail: '',
          qty: 1,
          unitPriceNaira: 0,
        },
      ],
    });
  }

  function addProduct(productId: string) {
    if (!onChange || !productId) return;
    const product = activeProducts.find((p) => p.id === productId);
    if (!product) return;
    const nextItems = [
      ...value.lineItems,
      {
        id: `line_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        label: product.name,
        detail: '',
        qty: 1,
        unitPriceNaira: Math.max(0, product.price / 100),
        productId: product.id,
        productType: product.type,
      },
    ];
    const needsDelivery = nextItems.some(
      (row) => row.productId && row.productType === 'physical'
    );
    onChange({
      ...value,
      lineItems: nextItems,
      deliveryFeeMode: needsDelivery
        ? value.deliveryFeeMode === 'none'
          ? 'tier'
          : value.deliveryFeeMode
        : 'none',
      deliveryFeeNaira: needsDelivery ? value.deliveryFeeNaira : 0,
      deliveryTierId: needsDelivery ? value.deliveryTierId : '',
    });
  }

  function removeLine(id: string) {
    if (!onChange || value.lineItems.length <= 1) return;
    const nextItems = value.lineItems.filter((row) => row.id !== id);
    const needsDelivery = nextItems.some(
      (row) => row.productId && row.productType === 'physical'
    );
    onChange({
      ...value,
      lineItems: nextItems,
      deliveryFeeMode: needsDelivery ? value.deliveryFeeMode : 'none',
      deliveryFeeNaira: needsDelivery ? value.deliveryFeeNaira : 0,
      deliveryTierId: needsDelivery ? value.deliveryTierId : '',
    });
  }

  function Text({
    val,
    onVal,
    placeholder,
    style,
    multiline,
  }: {
    val: string;
    onVal: (v: string) => void;
    placeholder?: string;
    style?: CSSProperties;
    multiline?: boolean;
  }) {
    if (!editable) {
      return (
        <span style={style}>{val || placeholder || '—'}</span>
      );
    }
    if (multiline) {
      return (
        <textarea
          value={val}
          placeholder={placeholder}
          rows={3}
          onChange={(e) => onVal(e.target.value)}
          style={{ ...ghostEdit, resize: 'vertical', ...style }}
        />
      );
    }
    return (
      <input
        value={val}
        placeholder={placeholder}
        onChange={(e) => onVal(e.target.value)}
        style={{ ...ghostEdit, ...style }}
      />
    );
  }

  return (
    <div
      className="foleio-invoice-doc"
      style={{
        background: '#fcfafb',
        color: '#111827',
        border: '1px solid #e5e3e6',
        borderRadius: 6,
        padding: '28px 28px 20px',
        fontFamily: 'var(--font-body), system-ui, sans-serif',
      }}
    >
      {editable ? (
        <div style={{ marginBottom: 18, display: 'grid', gap: 12 }}>
          <label
            style={{
              display: 'grid',
              gap: 6,
              fontSize: 12,
              color: '#6b7280',
              fontWeight: 500,
            }}
          >
            Booking service (optional if you add products)
            <select
              className="foleio-dash-input"
              value={value.linkedServiceId}
              onChange={(e) => patch({ linkedServiceId: e.target.value })}
              style={{ maxWidth: 360 }}
            >
              <option value="">No booking service</option>
              {activeServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {activeProducts.length > 0 ? (
            <label
              style={{
                display: 'grid',
                gap: 6,
                fontSize: 12,
                color: '#6b7280',
                fontWeight: 500,
              }}
            >
              Add shop product
              <select
                className="foleio-dash-input"
                value=""
                onChange={(e) => {
                  addProduct(e.target.value);
                  e.target.value = '';
                }}
                style={{ maxWidth: 360 }}
              >
                <option value="">Select product…</option>
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatKobo(p.price)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 8,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 'clamp(40px, 8vw, 64px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 0.9,
            color: '#111827',
          }}
        >
          INVOICE
        </h2>
        <div
          style={{
            textAlign: 'right',
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '0.02em',
            maxWidth: '46%',
          }}
        >
          <InvoiceDocField editable={editable}
            val={value.companyName}
            onVal={(v) => patch({ companyName: v })}
            placeholder="Your business name"
            style={{
              textAlign: 'right',
              fontWeight: 700,
              fontSize: 18,
              textTransform: 'uppercase',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 28,
          fontSize: 13,
          color: '#4b5563',
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <InvoiceDocField editable={editable}
            val={value.issueDate}
            onVal={(v) => patch({ issueDate: v })}
            placeholder="Date"
          />
          <div>
            <FieldLabel required>Client name</FieldLabel>
            <InvoiceDocField editable={editable}
              val={value.clientName}
              onVal={(v) => patch({ clientName: v })}
              placeholder="Client name"
              style={{ fontWeight: 600, color: '#111827' }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gap: 6, textAlign: 'right' }}>
          <InvoiceDocField editable={editable}
            val={value.invoiceNumber}
            onVal={(v) => patch({ invoiceNumber: v })}
            placeholder="#INV-0001"
            style={{ textAlign: 'right' }}
          />
          <InvoiceDocField editable={editable}
            val={value.subject}
            onVal={(v) => patch({ subject: v })}
            placeholder="Invoice subject"
            style={{ textAlign: 'right', fontWeight: 600, color: '#111827' }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) 56px 100px 96px',
          gap: 8,
          fontSize: 11,
          color: '#9ca3af',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: '1px solid #e5e3e6',
        }}
      >
        <span>Description</span>
        <span style={{ textAlign: 'right' }}>Qty</span>
        <span style={{ textAlign: 'right' }}>Rate</span>
        <span style={{ textAlign: 'right' }}>Total</span>
      </div>

      <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
        {value.lineItems.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) 56px 100px 96px',
              gap: 8,
              alignItems: 'start',
              fontSize: 14,
            }}
          >
            <div>
              <InvoiceDocField editable={editable}
                val={item.label}
                onVal={(v) => patchLine(item.id, { label: v })}
                placeholder="Project item"
                style={{ fontWeight: 600, color: '#111827' }}
              />
              <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
                <InvoiceDocField editable={editable}
                  val={item.detail}
                  onVal={(v) => patchLine(item.id, { detail: v })}
                  placeholder="Sub item / notes"
                />
              </div>
              {editable ? (
                <button
                  type="button"
                  onClick={() => removeLine(item.id)}
                  style={{
                    marginTop: 4,
                    border: 'none',
                    background: 'none',
                    color: '#9ca3af',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div style={{ textAlign: 'right' }}>
              {editable ? (
                <input
                  inputMode="numeric"
                  value={String(item.qty)}
                  onChange={(e) =>
                    patchLine(item.id, {
                      qty: Math.max(0, Math.round(Number(e.target.value) || 0)),
                    })
                  }
                  style={{ ...ghostEdit, textAlign: 'right' }}
                />
              ) : (
                item.qty
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {editable ? (
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={
                    asNaira(item.unitPriceNaira) === 0
                      ? '0.00'
                      : String(asNaira(item.unitPriceNaira))
                  }
                  onChange={(e) =>
                    patchLine(item.id, {
                      unitPriceNaira: nairaInput(e.target.value),
                    })
                  }
                  onFocus={(e) => {
                    if (asNaira(item.unitPriceNaira) === 0) {
                      e.currentTarget.select();
                    }
                  }}
                  style={{ ...ghostEdit, textAlign: 'right' }}
                />
              ) : (
                formatNairaAmount(item.unitPriceNaira)
              )}
            </div>
            <div style={{ textAlign: 'right', fontWeight: 600 }}>
              {formatNairaAmount(lineTotalNaira(item))}
            </div>
          </div>
        ))}
      </div>

      {editable ? (
        <button
          type="button"
          className="foleio-dash-btn-ghost"
          onClick={addLine}
          style={{ marginBottom: 16 }}
        >
          + Add line item
        </button>
      ) : null}

      {hasPhysicalProduct || value.deliveryFeeMode !== 'none' ? (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 0',
            borderTop: '1px solid #e5e3e6',
            display: 'grid',
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#111827',
            }}
          >
            DELIVERY
          </div>
          {editable ? (
            <>
              <select
                className="foleio-dash-input"
                value={value.deliveryFeeMode}
                onChange={(e) => {
                  const mode = e.target.value as 'tier' | 'custom' | 'none';
                  patch({
                    deliveryFeeMode: mode === 'none' ? 'tier' : mode,
                    deliveryFeeNaira:
                      mode === 'custom' ? value.deliveryFeeNaira : 0,
                  });
                }}
                style={{ maxWidth: 360 }}
              >
                <option value="tier">Delivery option</option>
                <option value="custom">Custom fee</option>
              </select>
              {value.deliveryFeeMode === 'tier' ? (
                <select
                  className="foleio-dash-input"
                  value={value.deliveryTierId}
                  onChange={(e) => patch({ deliveryTierId: e.target.value })}
                  style={{ maxWidth: 360 }}
                >
                  <option value="">Select delivery option…</option>
                  {deliveryTiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.type === 'paid'
                        ? ` — ${formatKobo(t.flatRate)}`
                        : ` — ${t.type.replace(/_/g, ' ')}`}
                    </option>
                  ))}
                </select>
              ) : (
                <label
                  style={{
                    display: 'grid',
                    gap: 4,
                    fontSize: 12,
                    color: '#6b7280',
                    maxWidth: 200,
                  }}
                >
                  Custom fee (₦)
                  <input
                    className="foleio-dash-input"
                    inputMode="decimal"
                    placeholder="Enter amount"
                    value={
                      asNaira(value.deliveryFeeNaira) === 0
                        ? ''
                        : String(asNaira(value.deliveryFeeNaira))
                    }
                    onChange={(e) =>
                      patch({ deliveryFeeNaira: nairaInput(e.target.value) })
                    }
                  />
                </label>
              )}
            </>
          ) : (
            <p className="foleio-dash-panel-meta" style={{ margin: 0 }}>
              {formatNaira(totals.deliveryFeeNaira)}
            </p>
          )}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 28,
        }}
      >
        <div
          style={{
            width: 'min(280px, 100%)',
            display: 'grid',
            gap: 6,
            fontSize: 13,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              color: '#6b7280',
            }}
          >
            <span>SUBTOTAL:</span>
            <span style={{ color: '#111827' }}>
              {formatNaira(totals.subtotalNaira)}
            </span>
          </div>
          {(hasPhysicalProduct || totals.deliveryFeeKobo > 0) && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                color: '#6b7280',
              }}
            >
              <span>DELIVERY:</span>
              <span style={{ color: '#111827' }}>
                {formatNaira(totals.deliveryFeeNaira)}
              </span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'center',
              color: '#6b7280',
            }}
          >
            <span>DISCOUNT:</span>
            {editable ? (
              <input
                inputMode="decimal"
                placeholder="Enter amount"
                value={
                  asNaira(value.discountNaira) === 0
                    ? ''
                    : String(asNaira(value.discountNaira))
                }
                onChange={(e) =>
                  patch({ discountNaira: nairaInput(e.target.value) })
                }
                style={{
                  ...ghostEdit,
                  width: 96,
                  textAlign: 'right',
                  color: '#111827',
                }}
              />
            ) : (
              <span style={{ color: '#111827' }}>
                {formatNairaAmount(totals.discountNaira)}
              </span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              color: '#6b7280',
            }}
          >
            <span>TOTAL:</span>
            <span style={{ color: '#111827' }}>
              {formatNaira(totals.totalNaira)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              marginTop: 4,
              paddingTop: 8,
              borderTop: '1px solid #e5e3e6',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            <span>BALANCE DUE (NGN):</span>
            <span>{formatNaira(totals.totalNaira)}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: 24,
          marginBottom: 24,
          paddingTop: 8,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              PAYMENT
            </span>
            <span style={{ fontSize: 11, color: '#6b7280' }}>
              {value.invoiceNumber || 'INV'}
            </span>
          </div>

          {mode === 'preview' ? (
            <div style={{ marginBottom: 12 }}>
              {paySlot || (
                <button
                  type="button"
                  disabled
                  style={{
                    width: '100%',
                    background: '#111827',
                    color: '#fcfafb',
                    border: 'none',
                    borderRadius: 6,
                    padding: '12px 16px',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'default',
                    opacity: 0.85,
                  }}
                >
                  Pay here
                </button>
              )}
            </div>
          ) : null}

          {editable ? (
            <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 8 }}>
              <InvoiceDocField
                editable={editable}
                val={value.termsNote}
                onVal={(v) => patch({ termsNote: v })}
                placeholder="Terms: 7 days from issue date"
              />
            </div>
          ) : value.termsNote ? (
            <p
              style={{
                margin: '0 0 8px',
                fontSize: 12,
                color: '#6b7280',
              }}
            >
              {value.termsNote}
            </p>
          ) : null}

          {editable ? (
            <div
              style={{
                display: 'grid',
                gap: 10,
                marginTop: 4,
                fontSize: 12,
              }}
            >
              <div>
                <FieldLabel required>Client email</FieldLabel>
                <InvoiceDocField
                  editable={editable}
                  val={value.customerEmail}
                  onVal={(v) => patch({ customerEmail: v })}
                  placeholder="client@email.com"
                />
              </div>
              <div>
                <FieldLabel>Client phone</FieldLabel>
                <InvoiceDocField
                  editable={editable}
                  val={value.customerPhone}
                  onVal={(v) => patch({ customerPhone: v })}
                  placeholder="Optional WhatsApp / phone"
                />
              </div>
              <div>
                <FieldLabel>Client address</FieldLabel>
                <InvoiceDocField
                  editable={editable}
                  val={value.customerAddress}
                  onVal={(v) => patch({ customerAddress: v })}
                  placeholder="Optional address"
                />
              </div>
              <div>
                <FieldLabel required={Boolean(value.linkedServiceId)}>
                  Service date
                </FieldLabel>
                <input
                  type="date"
                  value={value.serviceDate || ''}
                  onChange={(e) => patch({ serviceDate: e.target.value })}
                  style={{ ...ghostEdit, width: '100%' }}
                  disabled={!editable}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#6b7280',
                display: 'grid',
                gap: 2,
              }}
            >
              {value.customerEmail ? <span>{value.customerEmail}</span> : null}
              {value.customerPhone ? <span>{value.customerPhone}</span> : null}
              {value.customerAddress ? <span>{value.customerAddress}</span> : null}
              {value.serviceDate ? <span>Service {value.serviceDate}</span> : null}
            </div>
          )}
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              marginBottom: 8,
              color: '#111827',
            }}
          >
            TERMS & CONDITIONS
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              lineHeight: 1.45,
              color: '#6b7280',
            }}
          >
            Payment confirms the booking for the listed service. Deposit invoices
            require the remaining balance before the service date unless otherwise
            agreed. Quotes expire on the stated validity date. Contact the merchant
            for changes or cancellations.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          paddingTop: 14,
          borderTop: '1px solid #e5e3e6',
          fontSize: 11,
          color: '#6b7280',
        }}
      >
        <div>
          <FieldLabel>Business name</FieldLabel>
          <InvoiceDocField
            editable={editable}
            val={value.companyName}
            onVal={(v) => patch({ companyName: v })}
            placeholder="Business name"
            style={{
              fontWeight: 600,
              color: '#111827',
              textTransform: 'uppercase',
            }}
          />
        </div>
        <div>
          <FieldLabel>Business email</FieldLabel>
          <InvoiceDocField
            editable={editable}
            val={value.companyEmail}
            onVal={(v) => patch({ companyEmail: v })}
            placeholder="Email"
          />
        </div>
      </div>

      <p
        style={{
          margin: '16px 0 0',
          textAlign: 'center',
          fontSize: 10,
          letterSpacing: '0.04em',
          color: '#9ca3af',
        }}
      >
        Powered by Foleio (Product of Quiet Technologies)
      </p>
    </div>
  );
}

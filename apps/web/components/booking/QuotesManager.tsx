'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, Loader2, Pencil, Plus } from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import {
  InvoiceCreateDrawer,
  type InvoiceCreateFormValues,
} from '@/components/booking/InvoiceCreateDrawer';
import { InvoicePreviewDrawer } from '@/components/booking/InvoicePreviewDrawer';

type QuoteLineItem = {
  id: string;
  label: string;
  amountKobo: number;
  productId?: string | null;
  qty?: number;
};
type QuoteMilestone = {
  id: string;
  label: string;
  dueDate?: string | null;
  status: 'pending' | 'done';
};

type ServiceOption = { id: string; name: string; isActive: boolean };
type ProductOption = {
  id: string;
  name: string;
  price: number;
  type: string;
  stock?: number | null;
  status?: string;
};
type DeliveryTierOption = {
  id: string;
  name: string;
  type: string;
  flatRate: number;
  minSubtotalKobo?: number | null;
  minItemQuantity?: number | null;
};

type QuoteRequestRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  brief: string;
  status: string;
  preferredDate?: string | null;
  budgetMinKobo?: number | null;
  budgetMaxKobo?: number | null;
  linkedServiceId?: string | null;
  linkedService?: { id: string; name: string } | null;
  createdAt: string;
};

type QuoteRow = {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  status: string;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  depositType?: string | null;
  depositValue?: number | null;
  lineItems: QuoteLineItem[];
  milestones: QuoteMilestone[];
  serviceDate?: string | null;
  validUntil?: string | null;
  publicToken: string;
  quoteRequestId?: string | null;
  linkedServiceId?: string | null;
  notes?: string | null;
  deliveryFeeMode?: string | null;
  deliveryTierId?: string | null;
  deliveryFeeKobo?: number | null;
  updatedAt: string;
};

type InboxTab = 'requests' | 'invoices';

type CreateInitial = Partial<InvoiceCreateFormValues> & {
  quoteRequestId?: string;
  lineItemLabel?: string;
  existingQuoteId?: string;
  startInPreview?: boolean;
  discountNaira?: number;
};

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function parseInboxTab(raw: string | null): InboxTab {
  if (raw === 'invoices' || raw === 'quotes') return 'invoices';
  return 'requests';
}

type QuotesManagerProps = {
  initialServices?: ServiceOption[];
  initialProducts?: ProductOption[];
  initialDeliveryTiers?: DeliveryTierOption[];
  creator?: {
    displayName: string;
    email?: string | null;
    phone?: string | null;
  };
};

export function QuotesManager({
  initialServices = [],
  initialProducts = [],
  initialDeliveryTiers = [],
  creator = { displayName: 'Your business' },
}: QuotesManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inbox, setInbox] = useState<InboxTab>(() =>
    parseInboxTab(searchParams.get('tab'))
  );
  const [requests, setRequests] = useState<QuoteRequestRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [services] = useState<ServiceOption[]>(initialServices);
  const [products] = useState<ProductOption[]>(initialProducts);
  const [deliveryTiers] = useState<DeliveryTierOption[]>(initialDeliveryTiers);
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitial, setCreateInitial] = useState<CreateInitial>({});

  const activeServices = useMemo(
    () => services.filter((s) => s.isActive !== false),
    [services]
  );

  const previewQuote = useMemo(
    () => quotes.find((q) => q.id === previewQuoteId) || null,
    [quotes, previewQuoteId]
  );

  const previewServiceName = useMemo(() => {
    if (!previewQuote?.linkedServiceId) return null;
    return (
      services.find((s) => s.id === previewQuote.linkedServiceId)?.name || null
    );
  }, [previewQuote?.linkedServiceId, services]);

  const setInboxTab = useCallback(
    (next: InboxTab) => {
      setInbox(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', next);
      router.replace(`/invoices?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    setInbox(parseInboxTab(searchParams.get('tab')));
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, quoteRes] = await Promise.all([
        fetch('/api/creator/quote-requests'),
        fetch('/api/creator/quotes'),
      ]);
      const reqData = await reqRes.json();
      const quoteData = await quoteRes.json();
      if (!reqRes.ok) throw new Error(reqData.error || 'Failed to load requests');
      if (!quoteRes.ok) throw new Error(quoteData.error || 'Failed to load quotes');
      setRequests(reqData.requests || []);
      setQuotes(
        (quoteData.quotes || []).map((q: QuoteRow) => ({
          ...q,
          lineItems: Array.isArray(q.lineItems) ? q.lineItems : [],
          milestones: Array.isArray(q.milestones) ? q.milestones : [],
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreateDrawer(prefill?: CreateInitial) {
    setCreateInitial(prefill || {});
    setCreateOpen(true);
  }

  function openCreateFromRequest(req: QuoteRequestRow) {
    openCreateDrawer({
      quoteRequestId: req.id,
      linkedServiceId: req.linkedServiceId || req.linkedService?.id || '',
      title: `Invoice for ${req.customerName}`,
      customerName: req.customerName || '',
      customerEmail: req.customerEmail || '',
      customerPhone: req.customerPhone || '',
      customerAddress: '',
      serviceDate: req.preferredDate
        ? String(req.preferredDate).slice(0, 10)
        : '',
      lineItemLabel: req.brief?.slice(0, 80) || 'Project',
    });
  }

  function openEditInvoice(quote: QuoteRow) {
    openCreateDrawer({
      existingQuoteId: quote.id,
      linkedServiceId: quote.linkedServiceId || '',
      title: quote.title,
      customerName: quote.customerName || '',
      customerEmail: quote.customerEmail || '',
      customerPhone: quote.customerPhone || '',
      customerAddress: quote.customerAddress || '',
      serviceDate: quote.serviceDate
        ? String(quote.serviceDate).slice(0, 10)
        : '',
      lineItems: quote.lineItems.map((item) => ({
        id: item.id,
        label: item.label,
        amountKobo: item.amountKobo,
        ...(item.productId ? { productId: item.productId, qty: item.qty || 1 } : {}),
      })),
      invoiceNumber: `#INV-${quote.id.slice(-6).toUpperCase()}`,
      notes: quote.notes || undefined,
      deliveryFeeMode:
        (quote.deliveryFeeMode as InvoiceCreateFormValues['deliveryFeeMode']) ||
        'none',
      deliveryTierId: quote.deliveryTierId || null,
      deliveryFeeKobo: quote.deliveryFeeKobo || 0,
      startInPreview: false,
    });
  }

  function openPreviewInvoice(quote: QuoteRow) {
    setPreviewQuoteId(quote.id);
  }

  async function createInvoice(values: InvoiceCreateFormValues) {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        linkedServiceId: values.linkedServiceId || null,
        title: values.title,
        customerName: values.customerName,
        customerEmail: values.customerEmail,
        customerPhone: values.customerPhone,
        customerAddress: values.customerAddress,
        serviceDate: values.serviceDate || null,
        notes: values.notes || null,
        lineItems: values.lineItems,
        deliveryFeeMode: values.deliveryFeeMode || 'none',
        deliveryTierId: values.deliveryTierId || null,
        deliveryFeeKobo: values.deliveryFeeKobo || 0,
      };
      if (createInitial.quoteRequestId) {
        body.quoteRequestId = createInitial.quoteRequestId;
      }
      const res = await fetch('/api/creator/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create invoice');
      await load();
      setInboxTab('invoices');
      return {
        quoteId: data.quote.id as string,
        invoiceNumber:
          values.invoiceNumber ||
          `#INV-${String(data.quote.id || '').slice(-6).toUpperCase()}`,
      };
    } catch (err) {
      throw err instanceof Error ? err : new Error('Create failed');
    } finally {
      setSaving(false);
    }
  }

  async function updateInvoiceFromDrawer(
    quoteId: string,
    values: InvoiceCreateFormValues
  ) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/creator/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedServiceId: values.linkedServiceId || null,
          title: values.title,
          customerName: values.customerName,
          customerEmail: values.customerEmail,
          customerPhone: values.customerPhone,
          customerAddress: values.customerAddress,
          serviceDate: values.serviceDate || null,
          notes: values.notes || null,
          lineItems: values.lineItems,
          deliveryFeeMode: values.deliveryFeeMode || 'none',
          deliveryTierId: values.deliveryTierId || null,
          deliveryFeeKobo: values.deliveryFeeKobo || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update invoice');
      await load();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function sendInvoice(quoteId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/creator/quotes/${quoteId}/send`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      await load();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Send failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="foleio-dash-panel" style={{ padding: 24 }}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {error ? (
        <p className="foleio-dash-panel-meta" style={{ color: '#f87171' }}>
          {error}
        </p>
      ) : null}

      <div className="foleio-dash-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={inbox === 'requests'}
          className={`foleio-dash-tab${inbox === 'requests' ? ' is-active' : ''}`}
          onClick={() => setInboxTab('requests')}
        >
          Quote requests
          <span className="foleio-dash-tab-count">{requests.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={inbox === 'invoices'}
          className={`foleio-dash-tab${inbox === 'invoices' ? ' is-active' : ''}`}
          onClick={() => setInboxTab('invoices')}
        >
          Invoices
          <span className="foleio-dash-tab-count">{quotes.length}</span>
        </button>
      </div>

      {inbox === 'requests' ? (
        <div className="foleio-dash-panel">
          {requests.length === 0 ? (
            <p className="foleio-dash-panel-meta" style={{ padding: 20 }}>
              No quote requests yet. Clients can request from your public profile.
            </p>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="foleio-dash-booking-row"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => openCreateFromRequest(req)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCreateFromRequest(req);
                  }
                }}
              >
                <div className="foleio-dash-booking-main">
                  <div className="foleio-dash-booking-top">
                    <span className="foleio-dash-sub-name">{req.customerName}</span>
                    <span className="foleio-dash-badge is-muted">
                      {statusLabel(req.status)}
                    </span>
                  </div>
                  <p className="foleio-dash-booking-notes">{req.brief}</p>
                  <div className="foleio-dash-booking-meta">
                    <span>{req.customerEmail}</span>
                    {req.customerPhone ? <span>{req.customerPhone}</span> : null}
                    {req.linkedService ? (
                      <span>{req.linkedService.name}</span>
                    ) : null}
                  </div>
                  <div className="foleio-dash-booking-actions">
                    <button
                      type="button"
                      className="foleio-dash-btn-outline"
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateFromRequest(req);
                      }}
                    >
                      Build invoice
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            className="foleio-dash-panel"
            style={{
              padding: 16,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div className="foleio-dash-sub-name">New invoice</div>
              <p className="foleio-dash-panel-meta" style={{ margin: '4px 0 0' }}>
                Opens the invoice design to edit and preview.
              </p>
              {activeServices.length === 0 ? (
                <p className="foleio-dash-panel-meta" style={{ margin: '8px 0 0' }}>
                  No services yet.{' '}
                  <Link href="/bookings?tab=services" className="underline">
                    Set one up in Bookings → Services
                  </Link>
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="foleio-dash-btn-primary"
              onClick={() => openCreateDrawer()}
              disabled={saving}
            >
              <Plus className="h-4 w-4" /> New invoice
            </button>
          </div>

          <div className="foleio-dash-panel">
            {quotes.length === 0 ? (
              <p className="foleio-dash-panel-meta" style={{ padding: 20 }}>
                No invoices yet.
              </p>
            ) : (
              quotes.map((q) => (
                <div key={q.id} className="foleio-dash-booking-row">
                  <div className="foleio-dash-booking-main">
                    <div className="foleio-dash-booking-top">
                      <span className="foleio-dash-sub-name">{q.title}</span>
                      <span className="foleio-dash-badge is-muted">
                        {statusLabel(q.status)}
                      </span>
                    </div>
                    <div className="foleio-dash-booking-meta">
                      <span>{q.customerName}</span>
                      <span>{formatNaira(q.totalAmount)}</span>
                    </div>
                    <div className="foleio-dash-booking-actions">
                      <button
                        type="button"
                        className="foleio-dash-btn-ghost"
                        aria-label="Edit invoice"
                        title="Edit"
                        disabled={saving}
                        onClick={() => openEditInvoice(q)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="foleio-dash-btn-outline"
                        disabled={saving}
                        onClick={() => openPreviewInvoice(q)}
                      >
                        <Eye className="h-4 w-4" /> Preview
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <InvoiceCreateDrawer
        key={
          createOpen
            ? createInitial.existingQuoteId ||
              createInitial.quoteRequestId ||
              `blank-${createInitial.customerEmail || 'new'}`
            : 'closed'
        }
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateInitial({});
        }}
        services={services}
        products={products}
        deliveryTiers={deliveryTiers}
        creator={creator}
        saving={saving}
        initialValues={createInitial}
        onSubmit={createInvoice}
        onUpdate={updateInvoiceFromDrawer}
        onSend={sendInvoice}
      />

      <InvoicePreviewDrawer
        open={Boolean(previewQuote)}
        onClose={() => setPreviewQuoteId(null)}
        preview={
          previewQuote
            ? {
                title: previewQuote.title,
                customerName: previewQuote.customerName,
                customerEmail: previewQuote.customerEmail,
                customerPhone: previewQuote.customerPhone,
                customerAddress: previewQuote.customerAddress,
                status: previewQuote.status,
                serviceName: previewServiceName,
                serviceDate: previewQuote.serviceDate,
                validUntil: previewQuote.validUntil,
                companyName: creator.displayName,
                companyEmail: creator.email || undefined,
                companyPhone: creator.phone || undefined,
                invoiceNumber: `#INV-${previewQuote.id.slice(-6).toUpperCase()}`,
                lineItems: previewQuote.lineItems,
                totalAmount: previewQuote.totalAmount,
                depositAmount: previewQuote.depositAmount,
                balanceAmount: previewQuote.balanceAmount,
                deliveryFeeMode: previewQuote.deliveryFeeMode || 'none',
                deliveryTierId: previewQuote.deliveryTierId || null,
                deliveryFeeKobo: previewQuote.deliveryFeeKobo || 0,
              }
            : null
        }
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import {
  createPriceListItem,
  deletePriceListItem,
  getMyPriceList,
  togglePriceListItemActive,
  updatePriceListItem,
} from '@/lib/actions/priceList';

export type ServiceAddon = {
  id: string;
  name: string;
  price: number; // kobo
};

export type ServiceItem = {
  id: string;
  serviceType: string | null;
  category: string | null;
  name: string;
  description: string | null;
  sessionDescription: string | null;
  calendlyLink: string | null;
  price: number;
  durationMinutes: number | null;
  addons?: ServiceAddon[] | null;
  inclusions?: string[] | null;
  coverImageUrl?: string | null;
  depositType?: string | null;
  depositValue?: number | null;
  allowPayInFull?: boolean | null;
  orderIndex: number;
  categoryOrderIndex: number;
  isActive: boolean;
};

type FormState = {
  name: string;
  description: string;
  priceNaira: string;
  durationMinutes: string;
  addons: AddonDraft[];
  inclusionsText: string;
  coverImageUrl: string;
  depositEnabled: boolean;
  depositType: 'percent' | 'fixed';
  depositValue: string;
  allowPayInFull: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  priceNaira: '',
  durationMinutes: '',
  addons: [],
  inclusionsText: '',
  coverImageUrl: '',
  depositEnabled: false,
  depositType: 'percent',
  depositValue: '40',
  allowPayInFull: true,
};

type AddonDraft = {
  id: string;
  name: string;
  priceNaira: string;
};

function newAddonId() {
  return `addon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseAddons(raw: unknown): ServiceAddon[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name || '').trim();
      const price = Number(row.price);
      const id = String(row.id || newAddonId());
      if (!name || !Number.isFinite(price) || price < 0) return null;
      return { id, name, price };
    })
    .filter(Boolean) as ServiceAddon[];
}

export function BookingsServicesManager({
  creatorId: _creatorId,
  initialPriceList,
}: {
  creatorId: string;
  initialPriceList: ServiceItem[];
}) {
  const [items, setItems] = useState<ServiceItem[]>(initialPriceList);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    setItems(initialPriceList);
  }, [initialPriceList]);

  async function reload() {
    setLoading(true);
    try {
      const result = await getMyPriceList();
      if (result.success && result.data) {
        setItems(result.data as ServiceItem[]);
      }
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(item: ServiceItem) {
    setEditing(item);
    const inclusions = Array.isArray(item.inclusions)
      ? item.inclusions.filter((row) => typeof row === 'string')
      : [];
    setForm({
      name: item.name,
      description: item.description || '',
      priceNaira: String(Math.round(item.price / 100)),
      durationMinutes: item.durationMinutes ? String(item.durationMinutes) : '',
      addons: parseAddons(item.addons).map((addon) => ({
        id: addon.id,
        name: addon.name,
        priceNaira: String(Math.round(addon.price / 100)),
      })),
      inclusionsText: inclusions.join('\n'),
      coverImageUrl: item.coverImageUrl || '',
      depositEnabled: Boolean(item.depositType),
      depositType: item.depositType === 'fixed' ? 'fixed' : 'percent',
      depositValue:
        item.depositType === 'fixed'
          ? String(Math.round((item.depositValue || 0) / 100))
          : String(item.depositValue || 40),
      allowPayInFull: item.allowPayInFull !== false,
    });
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  function addAddonRow() {
    setForm((f) => ({
      ...f,
      addons: [...f.addons, { id: newAddonId(), name: '', priceNaira: '' }],
    }));
  }

  function updateAddon(id: string, patch: Partial<AddonDraft>) {
    setForm((f) => ({
      ...f,
      addons: f.addons.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  function removeAddon(id: string) {
    setForm((f) => ({
      ...f,
      addons: f.addons.filter((row) => row.id !== id),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    const priceNaira = Number(form.priceNaira);
    if (!name) {
      setError('Service name is required.');
      return;
    }
    if (!Number.isFinite(priceNaira) || priceNaira < 1) {
      setError('Enter a valid price of at least ₦1.');
      return;
    }

    const duration = form.durationMinutes.trim()
      ? Number(form.durationMinutes)
      : null;
    if (duration !== null && (!Number.isFinite(duration) || duration < 1)) {
      setError('Duration must be a positive number of minutes.');
      return;
    }

    const addons: ServiceAddon[] = [];
    for (const row of form.addons) {
      const addonName = row.name.trim();
      const addonPrice = Number(row.priceNaira);
      if (!addonName && !row.priceNaira.trim()) continue;
      if (!addonName) {
        setError('Each add-on needs a name.');
        return;
      }
      if (!Number.isFinite(addonPrice) || addonPrice < 0) {
        setError(`Enter a valid price for add-on “${addonName}”.`);
        return;
      }
      addons.push({
        id: row.id,
        name: addonName,
        price: Math.round(addonPrice * 100),
      });
    }

    const inclusions = form.inclusionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    let depositType: 'percent' | 'fixed' | null = null;
    let depositValue: number | null = null;
    if (form.depositEnabled) {
      depositType = form.depositType;
      const raw = Number(form.depositValue);
      if (!Number.isFinite(raw) || raw <= 0) {
        setError('Enter a valid deposit amount.');
        return;
      }
      if (depositType === 'percent') {
        if (raw > 100) {
          setError('Deposit percent must be between 1 and 100.');
          return;
        }
        depositValue = Math.round(raw);
      } else {
        depositValue = Math.round(raw * 100);
      }
    }

    const payload = {
      serviceType: 'general' as const,
      name,
      category: null,
      description: form.description.trim() || null,
      sessionDescription: null,
      calendlyLink: '',
      price: Math.round(priceNaira * 100),
      durationMinutes: duration,
      addons,
      inclusions,
      coverImageUrl: form.coverImageUrl.trim() || null,
      depositType,
      depositValue,
      allowPayInFull: form.allowPayInFull,
    };

    setSaving(true);
    try {
      if (editing) {
        const result = await updatePriceListItem(editing.id, payload);
        if (result?.error) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createPriceListItem(payload);
        if (result?.error) {
          setError(result.error);
          return;
        }
      }
      await reload();
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not save service. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this service?')) return;
    setTogglingId(id);
    try {
      await deletePriceListItem(id);
      await reload();
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggle(id: string) {
    setTogglingId(id);
    try {
      await togglePriceListItemActive(id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isActive: !item.isActive } : item
        )
      );
    } finally {
      setTogglingId(null);
    }
  }

  const activeCount = items.filter((item) => item.isActive).length;

  return (
    <div>
      <div className="foleio-dash-panel" style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <h2 className="foleio-dash-panel-title">Your services</h2>
            <p className="foleio-dash-panel-meta" style={{ marginBottom: 0 }}>
              {items.length === 0
                ? 'Add services clients can book'
                : `${activeCount} active · ${items.length} total`}
            </p>
          </div>
          <button type="button" className="foleio-dash-btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add service
          </button>
        </div>
      </div>

      <div className="foleio-dash-panel">
        {loading && items.length === 0 ? (
          <p className="foleio-dash-empty">Loading services…</p>
        ) : items.length === 0 ? (
          <p className="foleio-dash-empty">
            No services yet. Add one to start taking bookings.
          </p>
        ) : (
          items.map((item) => {
            const addons = parseAddons(item.addons);
            return (
              <div key={item.id} className="foleio-dash-booking-row">
                <div className="foleio-dash-booking-main">
                  <div className="foleio-dash-booking-top">
                    <span className="foleio-dash-sub-name">{item.name}</span>
                    <span
                      className={`foleio-dash-badge ${item.isActive ? 'is-success' : 'is-muted'}`}
                    >
                      {item.isActive ? 'Active' : 'Off'}
                    </span>
                  </div>
                  <div className="foleio-dash-booking-meta">
                    {item.durationMinutes ? (
                      <span className="foleio-dash-sub-date">
                        {item.durationMinutes} min
                      </span>
                    ) : null}
                    {addons.length > 0 ? (
                      <span className="foleio-dash-sub-date">
                        {addons.length} add-on{addons.length === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="foleio-dash-booking-notes">{item.description}</p>
                  ) : null}
                </div>
                <div className="foleio-dash-booking-amount">
                  {formatNaira(item.price / 100)}
                </div>
                <div className="foleio-dash-booking-actions">
                  <button
                    type="button"
                    className="foleio-dash-btn-ghost"
                    onClick={() => handleToggle(item.id)}
                    disabled={togglingId === item.id}
                  >
                    {item.isActive ? 'Turn off' : 'Turn on'}
                  </button>
                  <button
                    type="button"
                    className="foleio-dash-btn-outline"
                    onClick={() => openEdit(item)}
                    disabled={togglingId === item.id}
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    className="foleio-dash-btn-danger"
                    onClick={() => handleDelete(item.id)}
                    disabled={togglingId === item.id}
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalOpen ? (
        <>
          <div
            className="foleio-dash-drawer-backdrop"
            onClick={closeModal}
            aria-hidden
          />
          <aside
            className="foleio-dash-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-drawer-title"
          >
            <div className="foleio-dash-drawer-header">
              <div>
                <h2 id="service-drawer-title" className="foleio-dash-panel-title">
                  {editing ? 'Edit service' : 'Add service'}
                </h2>
                <p className="foleio-dash-panel-meta" style={{ marginBottom: 0 }}>
                  Name, price, and optional add-ons for your booking page.
                </p>
              </div>
              <button
                type="button"
                className="foleio-dash-drawer-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="foleio-dash-drawer-body">
              <form
                onSubmit={handleSave}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <label className="foleio-dash-field">
                  <span>Service name</span>
                  <input
                    className="foleio-dash-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Brand Photoshoot"
                    required
                    autoFocus
                  />
                </label>

                <label className="foleio-dash-field">
                  <span>Price (₦)</span>
                  <input
                    className="foleio-dash-input"
                    type="number"
                    min={1}
                    step={1}
                    value={form.priceNaira}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priceNaira: e.target.value }))
                    }
                    placeholder="45000"
                    required
                  />
                </label>

                <label className="foleio-dash-field">
                  <span>Duration minutes (optional)</span>
                  <input
                    className="foleio-dash-input"
                    type="number"
                    min={1}
                    step={1}
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, durationMinutes: e.target.value }))
                    }
                    placeholder="60"
                  />
                </label>

                <label className="foleio-dash-field">
                  <span>Description (optional)</span>
                  <textarea
                    className="foleio-dash-textarea"
                    style={{ marginTop: 0 }}
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="What clients get with this service"
                  />
                </label>

                <label className="foleio-dash-field">
                  <span>What&apos;s included (one per line)</span>
                  <textarea
                    className="foleio-dash-textarea"
                    style={{ marginTop: 0 }}
                    rows={3}
                    value={form.inclusionsText}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, inclusionsText: e.target.value }))
                    }
                    placeholder={'Trial session\nTravel within Lagos'}
                  />
                </label>

                <label className="foleio-dash-field">
                  <span>Cover image URL (optional)</span>
                  <input
                    className="foleio-dash-input"
                    value={form.coverImageUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, coverImageUrl: e.target.value }))
                    }
                    placeholder="https://…"
                  />
                  <p className="foleio-dash-field-hint">
                    Upload via Settings → Portfolio or paste an image URL.
                  </p>
                </label>

                <div className="foleio-dash-field">
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.depositEnabled}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          depositEnabled: e.target.checked,
                        }))
                      }
                    />
                    <span>Require or offer a deposit</span>
                  </label>
                  {form.depositEnabled ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      <label className="foleio-dash-field" style={{ margin: 0 }}>
                        <span>Deposit type</span>
                        <select
                          className="foleio-dash-select"
                          value={form.depositType}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              depositType: e.target.value as 'percent' | 'fixed',
                            }))
                          }
                        >
                          <option value="percent">Percent of total</option>
                          <option value="fixed">Fixed amount (₦)</option>
                        </select>
                      </label>
                      <label className="foleio-dash-field" style={{ margin: 0 }}>
                        <span>
                          {form.depositType === 'percent'
                            ? 'Percent'
                            : 'Amount (₦)'}
                        </span>
                        <input
                          className="foleio-dash-input"
                          type="number"
                          min={1}
                          value={form.depositValue}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              depositValue: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label
                        style={{
                          gridColumn: '1 / -1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.allowPayInFull}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              allowPayInFull: e.target.checked,
                            }))
                          }
                        />
                        <span>Allow clients to pay in full</span>
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className="foleio-dash-field">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span>Add-ons</span>
                    <button
                      type="button"
                      className="foleio-dash-btn-ghost"
                      onClick={addAddonRow}
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                      Add add-on
                    </button>
                  </div>
                  <p className="foleio-dash-panel-meta" style={{ margin: 0 }}>
                    Optional extras clients can add to this service.
                  </p>

                  {form.addons.length === 0 ? (
                    <p className="foleio-dash-panel-meta" style={{ margin: 0 }}>
                      No add-ons yet.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {form.addons.map((addon) => (
                        <div
                          key={addon.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 110px auto',
                            gap: 8,
                            alignItems: 'center',
                          }}
                        >
                          <input
                            className="foleio-dash-input"
                            value={addon.name}
                            onChange={(e) =>
                              updateAddon(addon.id, { name: e.target.value })
                            }
                            placeholder="Add-on name"
                          />
                          <input
                            className="foleio-dash-input"
                            type="number"
                            min={0}
                            step={1}
                            value={addon.priceNaira}
                            onChange={(e) =>
                              updateAddon(addon.id, { priceNaira: e.target.value })
                            }
                            placeholder="Price"
                          />
                          <button
                            type="button"
                            className="foleio-dash-btn-danger"
                            onClick={() => removeAddon(addon.id)}
                            aria-label="Remove add-on"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error ? (
                  <p
                    className="foleio-dash-panel-meta"
                    style={{ color: '#fca5a5', margin: 0 }}
                  >
                    {error}
                  </p>
                ) : null}

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
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="foleio-dash-btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    ) : null}
                    {editing ? 'Save changes' : 'Add service'}
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

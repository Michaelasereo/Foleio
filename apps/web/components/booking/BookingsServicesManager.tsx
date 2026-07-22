'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import {
  createPriceListItem,
  deletePriceListItem,
  getMyPriceList,
  togglePriceListItemActive,
  updatePriceListItem,
} from '@/lib/actions/priceList';
import { RemoteImage } from '@/components/creator/RemoteImage';
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { FieldInfoTip } from '@/components/ui/FieldInfoTip';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import {
  getCreatorPlan,
  getCreatorPlanLimits,
  type PlatformPlan,
} from '@/lib/utils/plan-limits';

export type ServiceAddon = {
  id: string;
  name: string;
  price: number; // kobo
};

export type ServiceLocationOption = ServiceAddon;

export type ServiceItem = {
  id: string;
  serviceType: string | null;
  category: string | null;
  name: string;
  description: string | null;
  location?: string | null;
  sessionDescription: string | null;
  calendlyLink: string | null;
  price: number;
  durationMinutes: number | null;
  addons?: ServiceAddon[] | null;
  locationOptions?: ServiceLocationOption[] | null;
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
  location: string;
  priceNaira: string;
  durationMinutes: string;
  addons: AddonDraft[];
  locationOptions: AddonDraft[];
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
  location: '',
  priceNaira: '',
  durationMinutes: '',
  addons: [],
  locationOptions: [],
  inclusionsText: '',
  coverImageUrl: '',
  depositEnabled: false,
  depositType: 'percent',
  depositValue: '40',
  allowPayInFull: true,
};

const LOCATION_PRESETS = ['Studio', 'Lekki', 'Surulere'] as const;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type AddonDraft = {
  id: string;
  name: string;
  priceNaira: string;
};

function newAddonId() {
  return `addon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newLocationId() {
  return `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  platformPlan = null,
  platformSubscriptionActive = false,
}: {
  creatorId: string;
  initialPriceList: ServiceItem[];
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
}) {
  const [items, setItems] = useState<ServiceItem[]>(initialPriceList);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOpen, limitType, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();
  const currentPlan: PlatformPlan = getCreatorPlan(platformPlan ?? null);
  const limits = getCreatorPlanLimits({
    platformPlan,
    platformSubscriptionActive,
  });

  useEffect(() => {
    setItems(initialPriceList);
  }, [initialPriceList]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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

  function resetImagePreview() {
    setImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function openCreate() {
    if (items.length >= limits.maxServices) {
      showUpgradeModal('maxServices');
      return;
    }
    setEditing(null);
    setForm(EMPTY_FORM);
    resetImagePreview();
    setError('');
    setModalOpen(true);
  }

  function openEdit(item: ServiceItem) {
    setEditing(item);
    const inclusions = Array.isArray(item.inclusions)
      ? item.inclusions.filter((row) => typeof row === 'string')
      : [];
    resetImagePreview();
    setForm({
      name: item.name,
      description: item.description || '',
      location: item.location || '',
      priceNaira: String(Math.round(item.price / 100)),
      durationMinutes: item.durationMinutes ? String(item.durationMinutes) : '',
      addons: parseAddons(item.addons).map((addon) => ({
        id: addon.id,
        name: addon.name,
        priceNaira: String(Math.round(addon.price / 100)),
      })),
      locationOptions: parseAddons(item.locationOptions).map((opt) => ({
        id: opt.id,
        name: opt.name,
        priceNaira: String(Math.round(opt.price / 100)),
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
    if (saving || uploadingImage) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    resetImagePreview();
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

  function addLocationRow(presetName?: string) {
    setForm((f) => {
      if (presetName) {
        const exists = f.locationOptions.some(
          (row) => row.name.trim().toLowerCase() === presetName.toLowerCase()
        );
        if (exists) return f;
      }
      return {
        ...f,
        locationOptions: [
          ...f.locationOptions,
          {
            id: newLocationId(),
            name: presetName || '',
            priceNaira: '',
          },
        ],
      };
    });
  }

  function updateLocationOption(id: string, patch: Partial<AddonDraft>) {
    setForm((f) => ({
      ...f,
      locationOptions: f.locationOptions.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  }

  function removeLocationOption(id: string) {
    setForm((f) => ({
      ...f,
      locationOptions: f.locationOptions.filter((row) => row.id !== id),
    }));
  }

  async function handleCoverImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Use a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image must be under 5MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    resetImagePreview();
    setImagePreview(previewUrl);
    setUploadingImage(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'service-image');
      const response = await fetch('/api/creator/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Upload failed');
      }
      const url = payload.url as string;
      setForm((f) => ({ ...f, coverImageUrl: url }));
      setImagePreview((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err) {
      setImagePreview((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingImage(false);
    }
  }

  function clearCoverImage() {
    resetImagePreview();
    setForm((f) => ({ ...f, coverImageUrl: '' }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (uploadingImage) {
      setError('Wait for the image upload to finish.');
      return;
    }

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

    const locationOptions: ServiceLocationOption[] = [];
    for (const row of form.locationOptions) {
      const locName = row.name.trim();
      const locPrice = Number(row.priceNaira);
      if (!locName && !row.priceNaira.trim()) continue;
      if (!locName) {
        setError('Each location needs a name.');
        return;
      }
      if (!Number.isFinite(locPrice) || locPrice < 0) {
        setError(`Enter a valid fee for location “${locName}”.`);
        return;
      }
      locationOptions.push({
        id: row.id,
        name: locName,
        price: Math.round(locPrice * 100),
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
      location: form.location.trim() || null,
      sessionDescription: null,
      calendlyLink: '',
      price: Math.round(priceNaira * 100),
      durationMinutes: duration,
      addons,
      locationOptions,
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
          if (
            'limitType' in result &&
            result.limitType === 'maxServices'
          ) {
            showUpgradeModal('maxServices');
            return;
          }
          setError(result.error);
          return;
        }
      }
      await reload();
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      resetImagePreview();
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
            const locationOptions = parseAddons(item.locationOptions);
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
                    {locationOptions.length > 0 ? (
                      <span className="foleio-dash-sub-date">
                        {locationOptions.length} location
                        {locationOptions.length === 1 ? '' : 's'}
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
                    disabled={saving || uploadingImage}
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
                  <span>Location (optional)</span>
                  <input
                    className="foleio-dash-input"
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    placeholder="Lagos — or Available in Lagos, Abuja & PH"
                    maxLength={500}
                  />
                  <p className="foleio-dash-field-hint">
                    A place name, or copy for multiple locations.
                  </p>
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

                <div className="foleio-dash-field">
                  <span>Cover image (optional)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleCoverImageSelected}
                  />
                  {(imagePreview || form.coverImageUrl) ? (
                    <div style={{ marginTop: 8 }}>
                      {imagePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imagePreview}
                          alt=""
                          style={{
                            width: '100%',
                            maxWidth: 240,
                            aspectRatio: '16/10',
                            objectFit: 'cover',
                            borderRadius: 10,
                            opacity: uploadingImage ? 0.7 : 1,
                          }}
                        />
                      ) : (
                        <RemoteImage
                          src={form.coverImageUrl}
                          alt=""
                          style={{
                            width: '100%',
                            maxWidth: 240,
                            aspectRatio: '16/10',
                            objectFit: 'cover',
                            borderRadius: 10,
                          }}
                        />
                      )}
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginTop: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          className="foleio-dash-btn-outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? (
                            <Loader2
                              className="h-4 w-4 animate-spin"
                              strokeWidth={1.5}
                            />
                          ) : (
                            <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
                          )}
                          {uploadingImage ? 'Uploading…' : 'Replace'}
                        </button>
                        <button
                          type="button"
                          className="foleio-dash-btn-ghost"
                          onClick={clearCoverImage}
                          disabled={uploadingImage}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="foleio-dash-btn-outline"
                      style={{ marginTop: 8, width: 'fit-content' }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
                      )}
                      {uploadingImage ? 'Uploading…' : 'Upload image'}
                    </button>
                  )}
                  <p className="foleio-dash-field-hint">
                    JPG, PNG, or WebP · max 5MB. Shows on your public services.
                  </p>
                </div>

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
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      Add-ons
                      <FieldInfoTip text="Optional extras clients can add to this service." />
                    </span>
                    <button
                      type="button"
                      className="foleio-dash-btn-ghost"
                      onClick={addAddonRow}
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                      Add add-on
                    </button>
                  </div>

                  {form.addons.length > 0 ? (
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
                  ) : null}
                </div>

                <div className="foleio-dash-field">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
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
                      Locations / studio fees
                      <FieldInfoTip text="Clients pick one location. Fee is added to the service price." />
                    </span>
                    <button
                      type="button"
                      className="foleio-dash-btn-ghost"
                      onClick={() => addLocationRow()}
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                      Add location
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    {LOCATION_PRESETS.map((preset) => {
                      const alreadyAdded = form.locationOptions.some(
                        (row) =>
                          row.name.trim().toLowerCase() === preset.toLowerCase()
                      );
                      return (
                        <button
                          key={preset}
                          type="button"
                          className="foleio-dash-btn-ghost"
                          disabled={alreadyAdded}
                          onClick={() => addLocationRow(preset)}
                        >
                          + {preset}
                        </button>
                      );
                    })}
                  </div>

                  {form.locationOptions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {form.locationOptions.map((opt) => (
                        <div
                          key={opt.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 110px auto',
                            gap: 8,
                            alignItems: 'center',
                          }}
                        >
                          <input
                            className="foleio-dash-input"
                            value={opt.name}
                            onChange={(e) =>
                              updateLocationOption(opt.id, {
                                name: e.target.value,
                              })
                            }
                            placeholder="Location name"
                          />
                          <input
                            className="foleio-dash-input"
                            type="number"
                            min={0}
                            step={1}
                            value={opt.priceNaira}
                            onChange={(e) =>
                              updateLocationOption(opt.id, {
                                priceNaira: e.target.value,
                              })
                            }
                            placeholder="Fee ₦"
                          />
                          <button
                            type="button"
                            className="foleio-dash-btn-danger"
                            onClick={() => removeLocationOption(opt.id)}
                            aria-label="Remove location"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
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
                    disabled={saving || uploadingImage}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="foleio-dash-btn-primary"
                    disabled={saving || uploadingImage}
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

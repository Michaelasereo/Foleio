'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Briefcase, ImagePlus, Loader2, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react';
import { EmptyState } from '@/components/demo/EmptyState';
import styles from '@/components/demo/demo-dashboard.module.css';
import { formatNaira } from '@foleio/utils';
import { serializeServiceGallery, serviceGalleryUrls } from '@/lib/booking/service-images';
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
  minNoticeDays?: number | null;
  pricingType?: string | null;
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
  galleryUrls: string[];
  depositEnabled: boolean;
  depositType: 'percent' | 'fixed';
  depositValue: string;
  allowPayInFull: boolean;
  minNoticeDays: string;
  pricingType: 'fixed' | 'quote';
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
  galleryUrls: [],
  depositEnabled: false,
  depositType: 'percent',
  depositValue: '40',
  allowPayInFull: true,
  minNoticeDays: '',
  pricingType: 'fixed',
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

function formatDuration(minutes: number | null | undefined) {
  if (!minutes || minutes < 1) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hourLabel = hours ? `${hours} hour${hours === 1 ? '' : 's'}` : '';
  const minuteLabel = mins ? `${mins} minute${mins === 1 ? '' : 's'}` : '';
  return [hourLabel, minuteLabel].filter(Boolean).join(' ');
}

function depositLine(item: ServiceItem) {
  if (item.pricingType === 'quote') return 'Request a quote';
  if (!item.depositType || item.depositValue == null) return 'Paid in full to book';
  if (item.depositType === 'percent') {
    const amount = Math.round((item.price * Number(item.depositValue)) / 100);
    return `${formatNaira(amount / 100)} deposit to book`;
  }
  return `${formatNaira(Number(item.depositValue) / 100)} deposit to book`;
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
  upcomingCounts = {},
  publicPath = '/dashboard',
  onItemsChange,
}: {
  creatorId: string;
  initialPriceList: ServiceItem[];
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
  upcomingCounts?: Record<string, number>;
  publicPath?: string;
  onItemsChange?: (items: ServiceItem[]) => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ServiceItem[]>(initialPriceList);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slotPreview, setSlotPreview] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSlotRef = useRef(0);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [addonsOpenId, setAddonsOpenId] = useState<string | null>(null);
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
    onItemsChange?.(items);
  }, [items, onItemsChange]);

  useEffect(() => {
    return () => {
      if (slotPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(slotPreview);
      }
    };
  }, [slotPreview]);

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
    setSlotPreview((prev) => {
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
      galleryUrls: serviceGalleryUrls(item.coverImageUrl),
      depositEnabled: Boolean(item.depositType),
      depositType: item.depositType === 'fixed' ? 'fixed' : 'percent',
      depositValue:
        item.depositType === 'fixed'
          ? String(Math.round((item.depositValue || 0) / 100))
          : String(item.depositValue || 40),
      allowPayInFull: item.allowPayInFull !== false,
      minNoticeDays:
        item.minNoticeDays != null && item.minNoticeDays > 0
          ? String(item.minNoticeDays)
          : '',
      pricingType: item.pricingType === 'quote' ? 'quote' : 'fixed',
    });
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    if (saving || uploadingSlot != null) return;
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

    const slot = uploadSlotRef.current;
    const previewUrl = URL.createObjectURL(file);
    resetImagePreview();
    setSlotPreview(previewUrl);
    setUploadingSlot(slot);
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
      setForm((current) => {
        const next = [...current.galleryUrls];
        next[slot] = url;
        return { ...current, galleryUrls: next.slice(0, 3) };
      });
      setSlotPreview((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err) {
      setSlotPreview((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingSlot(null);
    }
  }

  function removeGalleryImage(index: number) {
    resetImagePreview();
    setForm((current) => ({
      ...current,
      galleryUrls: current.galleryUrls.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (uploadingSlot != null) {
      setError('Wait for the image upload to finish.');
      return;
    }

    const name = form.name.trim();
    const priceNaira = Number(form.priceNaira || 0);
    if (!name) {
      setError('Service name is required.');
      return;
    }
    if (form.pricingType === 'quote') {
      if (!Number.isFinite(priceNaira) || priceNaira < 0) {
        setError('Enter a valid starting price (or 0).');
        return;
      }
    } else if (!Number.isFinite(priceNaira) || priceNaira < 1000) {
      setError('Enter a valid price of at least ₦1,000.');
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
      serviceType: (form.pricingType === 'quote' ? 'quote' : 'general') as
        | 'general'
        | 'quote',
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
      coverImageUrl: serializeServiceGallery(form.galleryUrls),
      depositType,
      depositValue,
      allowPayInFull: form.allowPayInFull,
      minNoticeDays: form.minNoticeDays.trim()
        ? Math.max(0, Math.floor(Number(form.minNoticeDays) || 0))
        : null,
      pricingType: form.pricingType,
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

  async function convertServiceToProduct() {
    if (!editing) return;
    if (
      !confirm(
        'Convert this service to a shop product? The service will be removed and you will go to Shop.'
      )
    ) {
      return;
    }
    setIsConverting(true);
    setError('');
    try {
      const response = await fetch('/api/creator/convert-offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: 'service', sourceId: editing.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Conversion failed');
      }
      router.push(data.redirectPath || '/shop');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setIsConverting(false);
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

  return (
    <div>
      <section className={styles.card}>
        <div className={styles.svcHead}>
          <h2>Your services</h2>
          <button type="button" className={styles.solid} onClick={openCreate}>
            Add service
          </button>
        </div>
        {loading && items.length === 0 ? (
          <p className={styles.quiet}>Loading services…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={Briefcase} title="No services yet" body="Add one to start taking bookings." />
        ) : (
          items.map((item) => {
            const addons = [...parseAddons(item.addons), ...parseAddons(item.locationOptions)];
            const [firstAddon, ...moreAddons] = addons;
            const upcoming = upcomingCounts[item.name] || 0;
            const duration = formatDuration(item.durationMinutes);
            const meta = [
              duration,
              item.isActive
                ? upcoming > 0
                  ? `${upcoming} upcoming booking${upcoming === 1 ? '' : 's'}`
                  : ''
                : 'turned off',
            ].filter(Boolean).join(' · ');
            return (
              <div key={item.id} className={styles.svcRow}>
                <div>
                  <p className={styles.svcName}>{item.name}</p>
                  {meta ? <p className={styles.svcMeta}>{meta}</p> : null}
                </div>
                <div className={styles.svcPrice}>
                  <strong>{item.pricingType === 'quote' ? 'Quote' : formatNaira(item.price / 100)}</strong>
                  <span>{depositLine(item)}</span>
                </div>
                <span className={styles.liveLabel}>
                  {item.isActive ? 'Live' : 'Off'}
                  <button
                    type="button"
                    className={`${styles.switch} ${item.isActive ? styles.switchOn : ''}`}
                    aria-pressed={item.isActive}
                    aria-label={item.isActive ? `Turn off ${item.name}` : `Turn on ${item.name}`}
                    onClick={() => void handleToggle(item.id)}
                    disabled={togglingId === item.id}
                  >
                    <i />
                  </button>
                </span>
                <button type="button" className={styles.ghost} onClick={() => openEdit(item)} disabled={togglingId === item.id}>
                  Edit
                </button>
                <div className={styles.menu}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label={`More actions for ${item.name}`}
                    aria-expanded={menuId === item.id}
                    onClick={() => {
                      setAddonsOpenId(null);
                      setMenuId((current) => (current === item.id ? null : item.id));
                    }}
                  >
                    <MoreHorizontal strokeWidth={1.75} size={16} />
                  </button>
                  {menuId === item.id ? (
                    <div className={styles.menuPop}>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuId(null);
                          void handleDelete(item.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
                {firstAddon ? (
                  <div className={styles.addonLine}>
                    <span className={styles.addonLabel}>Add-ons</span>
                    <span className={styles.addonChip}>
                      {firstAddon.name}
                      <b>+{formatNaira(firstAddon.price / 100)}</b>
                    </span>
                    {moreAddons.length > 0 ? (
                      <span className={styles.addonMore}>
                        <button
                          type="button"
                          className={styles.addonMoreBtn}
                          aria-expanded={addonsOpenId === item.id}
                          onClick={() => {
                            setMenuId(null);
                            setAddonsOpenId((current) => (current === item.id ? null : item.id));
                          }}
                        >
                          More
                        </button>
                        {addonsOpenId === item.id ? (
                          <span className={styles.addonPop}>
                            {moreAddons.map((addon) => (
                              <span key={addon.id} className={styles.addonChip}>
                                {addon.name}
                                <b>+{formatNaira(addon.price / 100)}</b>
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
        {items.length > 0 ? (
          <div className={styles.svcFoot}>
            <span>Turning a service off hides it from your page. Bookings already made stay.</span>
            <Link href={publicPath} className={styles.textLink}>
              Preview your page
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </div>
        ) : null}
      </section>

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
                    disabled={saving || uploadingSlot != null}
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
                <div className="foleio-dash-field">
                  <span>Photos</span>
                  <p className="foleio-dash-field-hint" style={{ marginTop: 4 }}>
                    Add up to 3 photos. The first photo is the cover.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleCoverImageSelected}
                  />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 8,
                      marginTop: 10,
                    }}
                  >
                    {Array.from({ length: 3 }).map((_, index) => {
                      const url = form.galleryUrls[index];
                      const busy = uploadingSlot === index;
                      const canAdd =
                        !url &&
                        !busy &&
                        (index === 0 || form.galleryUrls.length >= index);
                      return (
                        <div
                          key={index}
                          style={{
                            position: 'relative',
                            aspectRatio: '1',
                            borderRadius: 12,
                            border: '1px dashed rgba(17, 24, 39, 0.12)',
                            background: '#f3f1f4',
                            overflow: 'hidden',
                          }}
                        >
                          {url ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  uploadSlotRef.current = index;
                                  fileInputRef.current?.click();
                                }}
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
                                  alt={`Service photo ${index + 1}`}
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
                                onClick={() => removeGalleryImage(index)}
                                aria-label={`Remove photo ${index + 1}`}
                                disabled={uploadingSlot != null}
                                style={{
                                  position: 'absolute',
                                  top: 6,
                                  right: 6,
                                  zIndex: 1,
                                  width: 24,
                                  height: 24,
                                  border: 'none',
                                  borderRadius: 999,
                                  background: 'rgba(23, 23, 23, 0.72)',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                }}
                              >
                                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAdd || uploadingSlot != null}
                              onClick={() => {
                                uploadSlotRef.current = index;
                                fileInputRef.current?.click();
                              }}
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
                              {busy ? (
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
                                  {slotPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={slotPreview}
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
                  <p className="foleio-dash-field-hint">
                    JPG, PNG, or WebP · max 5MB.
                  </p>
                </div>

                <label className="foleio-dash-field">
                  <span>Service name</span>
                  <input
                    className="foleio-dash-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Brand Photoshoot"
                    required
                  />
                </label>

                <label className="foleio-dash-field">
                  <span>Pricing</span>
                  <select
                    className="foleio-dash-input"
                    value={form.pricingType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pricingType:
                          e.target.value === 'quote' ? 'quote' : 'fixed',
                      }))
                    }
                  >
                    <option value="fixed">Fixed price (book a date)</option>
                    <option value="quote">Custom quote (request intake)</option>
                  </select>
                  <p className="foleio-dash-field-hint">
                    Quote services show “Request a quote” on your public profile.
                  </p>
                </label>

                <label className="foleio-dash-field">
                  <span>
                    {form.pricingType === 'quote'
                      ? 'Starting price (₦, optional)'
                      : 'Price (₦)'}
                  </span>
                  <input
                    className="foleio-dash-input"
                    type="number"
                    min={form.pricingType === 'quote' ? 0 : 1000}
                    step={1}
                    value={form.priceNaira}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priceNaira: e.target.value }))
                    }
                    placeholder={form.pricingType === 'quote' ? '0' : '45000'}
                    required={form.pricingType !== 'quote'}
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
                      <label className="foleio-dash-field" style={{ gridColumn: '1 / -1' }}>
                        <span>Minimum notice (days)</span>
                        <input
                          className="foleio-dash-input"
                          type="number"
                          min={0}
                          step={1}
                          placeholder="Optional — greys early calendar dates"
                          value={form.minNoticeDays}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              minNoticeDays: e.target.value,
                            }))
                          }
                        />
                        <p className="foleio-dash-field-hint" style={{ marginTop: 4 }}>
                          Clients cannot book sooner than today + this many days.
                        </p>
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
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {editing ? (
                    <button
                      type="button"
                      className="foleio-dash-btn-outline"
                      style={{ width: '100%' }}
                      onClick={() => void convertServiceToProduct()}
                      disabled={saving || uploadingSlot != null || isConverting}
                    >
                      {isConverting ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      ) : null}
                      Convert to product
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
                    onClick={closeModal}
                    disabled={saving || uploadingSlot != null || isConverting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="foleio-dash-btn-primary"
                    disabled={saving || uploadingSlot != null || isConverting}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    ) : null}
                    {editing ? 'Save changes' : 'Add service'}
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

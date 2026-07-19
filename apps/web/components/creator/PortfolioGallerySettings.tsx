'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  createPortfolioItem,
  createPortfolioSection,
  deletePortfolioItem,
  deletePortfolioSection,
  ensureGallerySection,
  getMyPortfolio,
  updatePortfolioSection,
} from '@/lib/actions/portfolio';
import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_GALLERY_ITEMS,
  categorySections,
  isHomeSection,
} from '@/lib/creator/portfolio-gallery';
import { RemoteImage } from '@/components/creator/RemoteImage';
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import {
  getCreatorPlan,
  getCreatorPlanLimits,
  type PlatformPlan,
} from '@/lib/utils/plan-limits';

type GalleryItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
  orderIndex: number;
};

type PortfolioSectionRow = {
  id: string;
  name: string;
  orderIndex: number;
  items: GalleryItem[];
};

const SLOT_COUNT = MAX_GALLERY_ITEMS;

function sortItems(items: GalleryItem[]): GalleryItem[] {
  return [...items]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .slice(0, SLOT_COUNT);
}

type PortfolioGallerySettingsProps = {
  initialSectionId?: string | null;
  initialItems?: GalleryItem[];
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean;
};

export function PortfolioGallerySettings({
  initialSectionId = null,
  initialItems = [],
  platformPlan = null,
  platformSubscriptionActive = false,
}: PortfolioGallerySettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadGen = useRef(0);
  const [sections, setSections] = useState<PortfolioSectionRow[]>(() =>
    initialSectionId
      ? [
          {
            id: initialSectionId,
            name: 'Home',
            orderIndex: 0,
            items: sortItems(initialItems),
          },
        ]
      : []
  );
  const [activeSectionId, setActiveSectionId] = useState(initialSectionId || '');
  const [loading, setLoading] = useState(
    initialItems.length === 0 && !initialSectionId
  );
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [slotPreview, setSlotPreview] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const plan: PlatformPlan = getCreatorPlan(platformPlan);
  const limits = getCreatorPlanLimits({
    platformPlan,
    platformSubscriptionActive,
  });
  const canAddCategories = limits.maxPortfolioCategories > 0;
  const { isOpen, limitType, showUpgradeModal, closeUpgradeModal } =
    useUpgradeModal();

  const orderedSections = [...sections].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );
  const categories = categorySections(orderedSections);
  const activeSection =
    orderedSections.find((s) => s.id === activeSectionId) ||
    orderedSections[0] ||
    null;
  const items = activeSection ? sortItems(activeSection.items) : [];
  const sectionId = activeSection?.id || '';
  const filledCount = items.length;
  const row2Unlocked = filledCount >= 3;
  const galleryLive = filledCount >= 3;
  const isActiveHome = activeSection
    ? isHomeSection(orderedSections, activeSection)
    : true;
  const atCategoryCap = categories.length >= limits.maxPortfolioCategories;

  function setActiveItems(
    updater: (prev: GalleryItem[]) => GalleryItem[],
    targetSectionId = sectionId
  ) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === targetSectionId
          ? { ...section, items: sortItems(updater(section.items)) }
          : section
      )
    );
  }

  async function loadGallery(opts?: { blank?: boolean; selectId?: string }) {
    const gen = ++loadGen.current;
    const blank = Boolean(opts?.blank) && sections.length === 0;
    if (blank) setLoading(true);
    setError('');
    try {
      const ensured = await ensureGallerySection();
      if (gen !== loadGen.current) return;
      if (ensured.error || !ensured.data) {
        setError(ensured.error || 'Could not load gallery');
        return;
      }

      const result = await getMyPortfolio();
      if (gen !== loadGen.current) return;
      if (result.error || !result.data) {
        setError(result.error || 'Could not load gallery');
        return;
      }

      const nextSections: PortfolioSectionRow[] = result.data.map((section) => ({
        id: section.id,
        name: section.name,
        orderIndex: section.orderIndex,
        items: sortItems(
          section.items.map((item) => ({
            id: item.id,
            imageUrl: item.imageUrl,
            caption: item.caption,
            orderIndex: item.orderIndex,
          }))
        ),
      }));
      setSections(nextSections);

      const preferId = opts?.selectId;
      const homeId = nextSections.sort((a, b) => a.orderIndex - b.orderIndex)[0]
        ?.id;
      const keepActive =
        preferId ||
        (activeSectionId &&
          nextSections.some((s) => s.id === activeSectionId) &&
          activeSectionId) ||
        homeId ||
        '';
      setActiveSectionId(keepActive);
    } catch (err) {
      if (gen !== loadGen.current) return;
      setError(err instanceof Error ? err.message : 'Could not load gallery');
    } finally {
      if (gen === loadGen.current) setLoading(false);
    }
  }

  useEffect(() => {
    void loadGallery({ blank: initialItems.length === 0 && !initialSectionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  function slotState(index: number): 'filled' | 'empty' | 'locked' {
    if (index < filledCount) return 'filled';
    if (index >= 3 && !row2Unlocked) return 'locked';
    if (index === filledCount && filledCount < SLOT_COUNT) return 'empty';
    return 'locked';
  }

  function openFilePicker(slotIndex: number) {
    if (slotState(slotIndex) !== 'empty' || !sectionId) return;
    setPendingSlot(slotIndex);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const slot = pendingSlot;
    setPendingSlot(null);
    if (!file || slot === null || !sectionId) return;

    setUploadingSlot(slot);
    setError('');

    const previewUrl = URL.createObjectURL(file);
    setSlotPreview((prev) => ({ ...prev, [slot]: previewUrl }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'portfolio');
      const response = await fetch('/api/creator/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Upload failed');
      }
      const url = payload.url as string;
      const result = await createPortfolioItem({
        sectionId,
        imageUrl: url,
        caption: null,
        priceListItemId: null,
      });
      if (result.error || !result.data) {
        throw new Error(result.error || 'Could not save image');
      }

      const saved = result.data;
      setActiveItems((prev) => [
        ...prev,
        {
          id: saved.id,
          imageUrl: saved.imageUrl,
          caption: saved.caption,
          orderIndex: saved.orderIndex,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSlotPreview((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      window.setTimeout(() => URL.revokeObjectURL(previewUrl), 0);
      setUploadingSlot(null);
    }
  }

  async function handleDelete(item: GalleryItem) {
    if (!confirm('Remove this photo from your gallery?')) return;
    setDeleting(true);
    setError('');
    const previous = items;
    setLightbox(null);
    setActiveItems((prev) => prev.filter((row) => row.id !== item.id));
    try {
      const result = await deletePortfolioItem(item.id);
      if (result.error) {
        throw new Error(result.error);
      }
    } catch (err) {
      setActiveItems(() => previous);
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  function startAddCategory() {
    if (!canAddCategories) {
      showUpgradeModal('maxPortfolioCategories');
      return;
    }
    if (atCategoryCap) {
      showUpgradeModal('maxPortfolioCategories');
      return;
    }
    setAddingCategory(true);
    setNewCategoryName('');
    setError('');
  }

  async function submitAddCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setError('Category name is required');
      return;
    }
    if (name.length > MAX_CATEGORY_NAME_LENGTH) {
      setError(`Max ${MAX_CATEGORY_NAME_LENGTH} characters`);
      return;
    }
    setSavingCategory(true);
    setError('');
    try {
      const result = await createPortfolioSection(name);
      if ('limitType' in result && result.limitType) {
        showUpgradeModal(result.limitType);
        return;
      }
      if (result.error || !result.data) {
        throw new Error(result.error || 'Could not create category');
      }
      setAddingCategory(false);
      setNewCategoryName('');
      await loadGallery({ selectId: result.data.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create category');
    } finally {
      setSavingCategory(false);
    }
  }

  async function submitRename(section: PortfolioSectionRow) {
    const name = renameValue.trim();
    if (!name) {
      setError('Category name is required');
      return;
    }
    if (name.length > MAX_CATEGORY_NAME_LENGTH) {
      setError(`Max ${MAX_CATEGORY_NAME_LENGTH} characters`);
      return;
    }
    setSavingCategory(true);
    setError('');
    try {
      const result = await updatePortfolioSection(section.id, { name });
      if (result.error || !result.data) {
        throw new Error(result.error || 'Could not rename category');
      }
      setSections((prev) =>
        prev.map((row) =>
          row.id === section.id ? { ...row, name: result.data!.name } : row
        )
      );
      setRenamingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename');
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleDeleteCategory(section: PortfolioSectionRow) {
    if (
      !confirm(
        `Delete “${section.name}”? Photos in this category will be removed.`
      )
    ) {
      return;
    }
    setSavingCategory(true);
    setError('');
    try {
      const result = await deletePortfolioSection(section.id);
      if (result.error) throw new Error(result.error);
      const homeId = orderedSections.find((s) =>
        isHomeSection(orderedSections, s)
      )?.id;
      await loadGallery({ selectId: homeId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete category');
    } finally {
      setSavingCategory(false);
    }
  }

  if (loading) {
    return (
      <div className="foleio-dash-panel">
        <p className="foleio-dash-empty">Loading gallery…</p>
      </div>
    );
  }

  return (
    <div className="foleio-dash-panel">
      <h2 className="foleio-dash-panel-title">Portfolio gallery</h2>
      <p className="foleio-dash-panel-meta">
        {isActiveHome
          ? galleryLive
            ? filledCount === 6
              ? 'Your Home gallery (6 photos) is live on your public page.'
              : `Home is live with ${filledCount} photo${filledCount === 1 ? '' : 's'}. Add all 6 for the second public row.`
            : `Add at least 3 photos to show Home. ${filledCount}/3 so far.`
          : galleryLive
            ? filledCount === 6
              ? `“${activeSection?.name}” is live with 6 photos.`
              : `“${activeSection?.name}” is live with ${filledCount} photos. Add all 6 for the second public row.`
            : `Add at least 3 photos for “${activeSection?.name}” to appear publicly. ${filledCount}/3 so far.`}
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 14,
          alignItems: 'center',
        }}
        role="tablist"
        aria-label="Portfolio sections"
      >
        {orderedSections.map((section) => {
          const home = isHomeSection(orderedSections, section);
          const selected = section.id === sectionId;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setActiveSectionId(section.id);
                setRenamingId(null);
                setAddingCategory(false);
              }}
              style={{
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                background: selected ? '#fafafa' : 'rgba(255,255,255,0.08)',
                color: selected ? '#18181b' : '#fafafa',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {home ? 'Home' : section.name}
            </button>
          );
        })}
        <button
          type="button"
          className="foleio-dash-btn-outline"
          style={{ padding: '7px 10px', fontSize: 13 }}
          onClick={startAddCategory}
          disabled={savingCategory}
        >
          <Plus className="h-3.5 w-3.5" />
          Add category
          {!canAddCategories ? <Lock className="h-3.5 w-3.5" /> : null}
        </button>
      </div>

      {addingCategory ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) =>
              setNewCategoryName(e.target.value.slice(0, MAX_CATEGORY_NAME_LENGTH))
            }
            maxLength={MAX_CATEGORY_NAME_LENGTH}
            placeholder="Category name"
            className="foleio-dash-input"
            style={{ maxWidth: 200 }}
            autoFocus
          />
          <span className="foleio-dash-panel-meta" style={{ margin: 0 }}>
            {newCategoryName.length}/{MAX_CATEGORY_NAME_LENGTH}
          </span>
          <button
            type="button"
            className="foleio-dash-btn-primary"
            disabled={savingCategory}
            onClick={() => void submitAddCategory()}
          >
            {savingCategory ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create'
            )}
          </button>
          <button
            type="button"
            className="foleio-dash-btn-ghost"
            onClick={() => setAddingCategory(false)}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {!isActiveHome && activeSection ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
            alignItems: 'center',
          }}
        >
          {renamingId === activeSection.id ? (
            <>
              <input
                type="text"
                value={renameValue}
                onChange={(e) =>
                  setRenameValue(e.target.value.slice(0, MAX_CATEGORY_NAME_LENGTH))
                }
                maxLength={MAX_CATEGORY_NAME_LENGTH}
                className="foleio-dash-input"
                style={{ maxWidth: 200 }}
                autoFocus
              />
              <button
                type="button"
                className="foleio-dash-btn-primary"
                disabled={savingCategory}
                onClick={() => void submitRename(activeSection)}
              >
                Save
              </button>
              <button
                type="button"
                className="foleio-dash-btn-ghost"
                onClick={() => setRenamingId(null)}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="foleio-dash-btn-outline"
                style={{ padding: '7px 10px', fontSize: 13 }}
                onClick={() => {
                  setRenamingId(activeSection.id);
                  setRenameValue(activeSection.name);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
              <button
                type="button"
                className="foleio-dash-btn-danger"
                style={{ padding: '7px 10px', fontSize: 13 }}
                disabled={savingCategory}
                onClick={() => void handleDeleteCategory(activeSection)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete category
              </button>
            </>
          )}
        </div>
      ) : null}

      {!canAddCategories && categories.length > 0 ? (
        <p className="foleio-dash-panel-meta" style={{ marginTop: 10 }}>
          Categories stay editable, but only Home shows on your public page until
          you upgrade to Pro.
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => void handleFileSelected(e)}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
          marginTop: 16,
        }}
      >
        {Array.from({ length: SLOT_COUNT }).map((_, index) => {
          const state = slotState(index);
          const item = state === 'filled' ? items[index] : null;
          const busy = uploadingSlot === index;
          const preview = slotPreview[index];

          return (
            <button
              key={`${sectionId}-${index}`}
              type="button"
              disabled={state === 'locked' || busy || !sectionId}
              onClick={() => {
                if (item) setLightbox(item);
                else if (state === 'empty') openFilePicker(index);
              }}
              aria-label={
                item
                  ? `View photo ${index + 1}`
                  : state === 'locked'
                    ? `Slot ${index + 1} locked`
                    : `Upload photo ${index + 1}`
              }
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 12,
                border:
                  state === 'locked'
                    ? '1px dashed rgba(255,255,255,0.08)'
                    : '1px dashed rgba(255,255,255,0.18)',
                background: state === 'locked' ? '#1a1a1a' : '#2b2b2b',
                overflow: 'hidden',
                cursor: state === 'locked' ? 'not-allowed' : 'pointer',
                padding: 0,
                opacity: state === 'locked' ? 0.55 : 1,
              }}
            >
              {item ? (
                <RemoteImage
                  src={item.imageUrl}
                  alt={item.caption || `Gallery photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : preview || busy ? (
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
              ) : state === 'locked' ? (
                <span
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: '#828282',
                    fontSize: 12,
                  }}
                >
                  <Lock className="h-4 w-4" />
                  {index >= 3 ? 'Unlock with 3' : '—'}
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
          );
        })}
      </div>

      {error ? (
        <p
          className="foleio-dash-panel-meta"
          style={{ color: '#fca5a5', marginTop: 12 }}
        >
          {error}{' '}
          <button
            type="button"
            className="foleio-dash-btn-ghost"
            style={{ display: 'inline', padding: '0 6px' }}
            onClick={() => void loadGallery({ blank: sections.length === 0 })}
          >
            Retry
          </button>
        </p>
      ) : null}

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo"
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: 560,
              width: '100%',
              background: '#212121',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="foleio-dash-btn-outline"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1,
                padding: 8,
              }}
            >
              <X className="h-4 w-4" />
            </button>
            <RemoteImage
              src={lightbox.imageUrl}
              alt={lightbox.caption || 'Gallery photo'}
              style={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 10,
                background: '#111',
              }}
            />
            {lightbox.caption ? (
              <p className="foleio-dash-panel-meta" style={{ marginTop: 12 }}>
                {lightbox.caption}
              </p>
            ) : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                className="foleio-dash-btn-danger"
                disabled={deleting}
                onClick={() => void handleDelete(lightbox)}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remove
              </button>
              <button
                type="button"
                className="foleio-dash-btn-outline"
                onClick={() => setLightbox(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {limitType ? (
        <UpgradeModal
          isOpen={isOpen}
          onClose={closeUpgradeModal}
          limitType={limitType}
          currentPlan={plan}
        />
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';

interface PriceListItem {
  id: string;
  serviceType?: string | null;
  category: string | null;
  name: string;
  description: string | null;
  location?: string | null;
  sessionDescription?: string | null;
  calendlyLink?: string | null;
  price: number;
  durationMinutes: number | null;
  addons?: Array<{ id: string; name: string; price: number }> | null;
  inclusions?: string[] | null;
  coverImageUrl?: string | null;
  depositType?: string | null;
  depositValue?: number | null;
  allowPayInFull?: boolean | null;
}

interface GroupedPriceList {
  category: string | null;
  items: PriceListItem[];
}

interface PriceListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceList: GroupedPriceList[];
  onSelectItem: (item: PriceListItem) => void;
  creatorName: string;
  initialSelectedId?: string | null;
}

const drawerCss = `
.foleio-book-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.55);
}
.foleio-book-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 81;
  display: flex;
  flex-direction: column;
  width: min(420px, 100vw);
  background: #212121;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.35);
  animation: foleio-book-drawer-in 180ms ease-out;
}
@keyframes foleio-book-drawer-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.foleio-book-drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 0;
  flex-shrink: 0;
}
.foleio-book-drawer-title {
  margin: 0;
  color: #f4f4f5;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}
.foleio-book-drawer-meta {
  margin: 6px 0 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}
.foleio-book-drawer-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
  cursor: pointer;
}
.foleio-book-drawer-close:hover {
  color: #f4f4f5;
  opacity: 0.9;
}
.foleio-book-drawer-close svg {
  width: 18px;
  height: 18px;
}
.foleio-book-drawer-body {
  flex: 1;
  overflow: auto;
  padding: 16px 20px 24px;
}
.foleio-book-drawer-group {
  margin-bottom: 18px;
}
.foleio-book-drawer-group:last-child {
  margin-bottom: 0;
}
.foleio-book-drawer-group-label {
  margin: 0 0 8px;
  color: #828282;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.foleio-book-option {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  width: 100%;
  padding: 14px;
  margin: 0 0 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: #1a1816;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.foleio-book-option:last-child {
  margin-bottom: 0;
}
.foleio-book-option:hover {
  border-color: rgba(255, 255, 255, 0.1);
}
.foleio-book-option.is-selected {
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
}
.foleio-book-option-radio {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  flex-shrink: 0;
  border-radius: 999px;
  border: 1.5px solid #5c6070;
  display: flex;
  align-items: center;
  justify-content: center;
}
.foleio-book-option.is-selected .foleio-book-option-radio {
  border-color: #fff;
}
.foleio-book-option-radio i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #fff;
  opacity: 0;
}
.foleio-book-option.is-selected .foleio-book-option-radio i {
  opacity: 1;
}
.foleio-book-option-main {
  flex: 1;
  min-width: 0;
}
.foleio-book-option-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.foleio-book-option-name {
  margin: 0;
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 500;
}
.foleio-book-option-price {
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}
.foleio-book-option-desc {
  margin: 6px 0 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}
.foleio-book-option-meta {
  margin: 8px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #828282;
  font-size: 12px;
  font-weight: 500;
}
.foleio-book-option-meta svg {
  width: 12px;
  height: 12px;
}
.foleio-book-drawer-footer {
  flex-shrink: 0;
  padding: 16px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.foleio-book-drawer-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
}
.foleio-book-drawer-summary strong {
  color: #f4f4f5;
  font-size: 16px;
  font-weight: 600;
}
.foleio-book-drawer-actions {
  display: flex;
  gap: 8px;
}
.foleio-book-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.foleio-book-btn.is-ghost {
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: #f4f4f5;
}
.foleio-book-btn.is-primary {
  flex: 1;
  border: 1px solid #fff;
  background: #fff;
  color: #001035;
}
.foleio-book-btn:hover { opacity: 0.92; }
.foleio-book-btn:disabled {
  opacity: 0.45;
  pointer-events: none;
}
.foleio-book-drawer-empty {
  margin: 24px 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
}
`;

export function PriceListModal({
  open,
  onOpenChange,
  priceList,
  onSelectItem,
  creatorName,
  initialSelectedId = null,
}: PriceListModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const groups = priceList ?? [];

  useEffect(() => {
    if (open) {
      setSelectedItemId(initialSelectedId);
    } else {
      setSelectedItemId(null);
    }
  }, [open, initialSelectedId]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const selectedItem = groups
    .flatMap((g) => g.items)
    .find((item) => item.id === selectedItemId);

  const formatPrice = (priceInKobo: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);

  if (!open) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: drawerCss }} />
      <div
        className="foleio-book-drawer-backdrop"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <aside
        className="foleio-book-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-service-drawer-title"
      >
        <div className="foleio-book-drawer-header">
          <div>
            <h2 id="book-service-drawer-title" className="foleio-book-drawer-title">
              Book a service
            </h2>
            <p className="foleio-book-drawer-meta">
              Choose from {creatorName}&apos;s offerings
            </p>
          </div>
          <button
            type="button"
            className="foleio-book-drawer-close"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X strokeWidth={1.75} />
          </button>
        </div>

        <div className="foleio-book-drawer-body">
          {groups.length === 0 ? (
            <p className="foleio-book-drawer-empty">No services available right now.</p>
          ) : (
            groups.map((group) => (
              <div key={group.category || 'uncategorized'} className="foleio-book-drawer-group">
                {group.category ? (
                  <h3 className="foleio-book-drawer-group-label">{group.category}</h3>
                ) : null}
                {group.items.map((item) => {
                  const selected = selectedItemId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`foleio-book-option${selected ? ' is-selected' : ''}`}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <span className="foleio-book-option-radio" aria-hidden>
                        <i />
                      </span>
                      <span className="foleio-book-option-main">
                        <span className="foleio-book-option-top">
                          <span className="foleio-book-option-name">{item.name}</span>
                          <span className="foleio-book-option-price">
                            {formatPrice(item.price)}
                          </span>
                        </span>
                        {item.description ? (
                          <span className="foleio-book-option-desc">{item.description}</span>
                        ) : null}
                        {item.location ? (
                          <span
                            className="foleio-book-option-location"
                            style={{
                              display: 'block',
                              marginTop: 6,
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: 'rgba(0,0,0,0.28)',
                              color: 'rgba(255,255,255,0.88)',
                              fontSize: 12,
                              lineHeight: 1.4,
                            }}
                          >
                            {item.location}
                          </span>
                        ) : null}
                        {item.durationMinutes ? (
                          <span className="foleio-book-option-meta">
                            <Clock strokeWidth={1.75} />
                            {item.durationMinutes} min
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="foleio-book-drawer-footer">
          {selectedItem ? (
            <div className="foleio-book-drawer-summary">
              <span>{selectedItem.name}</span>
              <strong>{formatPrice(selectedItem.price)}</strong>
            </div>
          ) : null}
          <div className="foleio-book-drawer-actions">
            <button
              type="button"
              className="foleio-book-btn is-ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="foleio-book-btn is-primary"
              disabled={!selectedItem}
              onClick={() => {
                if (selectedItem) onSelectItem(selectedItem);
              }}
            >
              Continue to booking
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

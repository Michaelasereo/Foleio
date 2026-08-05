'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import {
  getCreatorPlan,
  getCreatorPlanLimits,
  type PlatformPlan,
} from '@/lib/utils/plan-limits';

export type CreatorReviewRow = {
  id: string;
  customerName: string;
  location: string | null;
  quote: string;
  rating?: number;
  orderIndex: number;
  isActive: boolean;
};

type CreatorReviewsSettingsProps = {
  initialReviews?: CreatorReviewRow[];
  initialReviewsEnabled?: boolean;
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean;
};

type ReviewFormState = {
  customerName: string;
  location: string;
  quote: string;
};

const emptyForm = (): ReviewFormState => ({
  customerName: '',
  location: '',
  quote: '',
});

export function CreatorReviewsSettings({
  initialReviews = [],
  initialReviewsEnabled = true,
  platformPlan = null,
  platformSubscriptionActive = false,
}: CreatorReviewsSettingsProps) {
  const loadGen = useRef(0);
  const [reviews, setReviews] = useState<CreatorReviewRow[]>(() =>
    [...initialReviews].sort((a, b) => a.orderIndex - b.orderIndex)
  );
  const [reviewsEnabled, setReviewsEnabled] = useState(initialReviewsEnabled);
  const [loading, setLoading] = useState(initialReviews.length === 0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReviewFormState>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const plan: PlatformPlan = getCreatorPlan(platformPlan);
  const limits = getCreatorPlanLimits({
    platformPlan,
    platformSubscriptionActive,
  });
  const canUseReviews = limits.maxReviews > 0;
  const { isOpen, limitType, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();

  async function loadReviews(opts?: { blank?: boolean }) {
    const gen = ++loadGen.current;
    const blank = Boolean(opts?.blank) && reviews.length === 0;
    if (blank) setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/creator/reviews', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (gen !== loadGen.current) return;
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load reviews');
      }
      const rows = (payload.reviews || []) as CreatorReviewRow[];
      setReviews([...rows].sort((a, b) => a.orderIndex - b.orderIndex));
      if (typeof payload.reviewsEnabled === 'boolean') {
        setReviewsEnabled(payload.reviewsEnabled);
      }
    } catch (err) {
      if (gen !== loadGen.current) return;
      setError(err instanceof Error ? err.message : 'Could not load reviews');
    } finally {
      if (gen === loadGen.current) setLoading(false);
    }
  }

  useEffect(() => {
    void loadReviews({ blank: initialReviews.length === 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleReviewsEnabled(next: boolean) {
    if (!canUseReviews) {
      showUpgradeModal('maxReviews');
      return;
    }
    setTogglingEnabled(true);
    setError('');
    const previous = reviewsEnabled;
    setReviewsEnabled(next);
    try {
      const response = await fetch('/api/creator/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewsEnabled: next }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setReviewsEnabled(previous);
        throw new Error(payload?.error || 'Could not update reviews setting');
      }
      if (typeof payload.reviewsEnabled === 'boolean') {
        setReviewsEnabled(payload.reviewsEnabled);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update reviews setting');
    } finally {
      setTogglingEnabled(false);
    }
  }

  function startEdit(review: CreatorReviewRow) {
    setEditingId(review.id);
    setEditForm({
      customerName: review.customerName,
      location: review.location || '',
      quote: review.quote,
    });
    setError('');
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/creator/reviews/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: editForm.customerName,
          location: editForm.location || null,
          quote: editForm.quote,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update review');
      }
      setEditingId(null);
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update review');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(review: CreatorReviewRow) {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/creator/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !review.isActive }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update review');
      }
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update review');
    } finally {
      setSaving(false);
    }
  }

  async function deleteReview(reviewId: string) {
    if (!window.confirm('Delete this review?')) return;
    setDeletingId(reviewId);
    setError('');
    try {
      const response = await fetch(`/api/creator/reviews/${reviewId}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not delete review');
      }
      if (editingId === reviewId) setEditingId(null);
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete review');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="foleio-dash-panel" style={{ marginTop: 14 }}>
        <p className="foleio-dash-empty">Loading reviews…</p>
      </div>
    );
  }

  return (
    <div className="foleio-dash-panel" style={{ marginTop: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <h2 className="foleio-dash-panel-title" style={{ margin: 0 }}>
          Customer reviews
        </h2>
        <button
          type="button"
          className={`foleio-avail-toggle${canUseReviews && reviewsEnabled ? ' is-on' : ''}`}
          disabled={togglingEnabled || saving}
          aria-pressed={canUseReviews ? reviewsEnabled : false}
          aria-label="Show reviews on public page"
          onClick={() => {
            if (!canUseReviews) {
              showUpgradeModal('maxReviews');
              return;
            }
            void toggleReviewsEnabled(!reviewsEnabled);
          }}
        >
          <span />
        </button>
      </div>
      <p className="foleio-dash-panel-meta">
        {!canUseReviews
          ? 'Reviews are unavailable on this plan.'
          : reviewsEnabled
            ? `Customers leave reviews after a completed booking or delivered order. ${reviews.length}/${limits.maxReviews} used.`
            : `Reviews are hidden from your public page. You can still hide or delete them here. ${reviews.length}/${limits.maxReviews} used.`}
      </p>

      {error ? (
        <p className="foleio-dash-error" style={{ marginTop: 12 }}>
          {error}
        </p>
      ) : null}

      {reviews.length === 0 ? (
        <p className="foleio-dash-empty" style={{ marginTop: 16 }}>
          No reviews yet. They appear here when customers submit from their email link.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          {reviews.map((review) => (
            <div key={review.id} className="foleio-dash-booking-row">
              <div className="foleio-dash-booking-main">
                {editingId === review.id ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input
                      className="foleio-dash-input"
                      value={editForm.customerName}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          customerName: e.target.value,
                        }))
                      }
                      placeholder="Customer name"
                    />
                    <input
                      className="foleio-dash-input"
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      placeholder="Location (optional)"
                    />
                    <textarea
                      className="foleio-dash-input"
                      value={editForm.quote}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, quote: e.target.value }))
                      }
                      placeholder="Quote"
                      rows={3}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="foleio-dash-btn-outline"
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="foleio-dash-btn"
                        onClick={() => void saveEdit()}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="foleio-dash-booking-top">
                      <span className="foleio-dash-sub-name">{review.customerName}</span>
                      {review.rating ? (
                        <span className="foleio-dash-badge is-muted">
                          {'★'.repeat(Math.min(5, Math.max(1, review.rating)))}
                        </span>
                      ) : null}
                      {!review.isActive ? (
                        <span className="foleio-dash-badge is-muted">Hidden</span>
                      ) : null}
                    </div>
                    {review.location ? (
                      <p className="foleio-dash-panel-meta" style={{ margin: '4px 0 0' }}>
                        {review.location}
                      </p>
                    ) : null}
                    <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.45 }}>
                      {review.quote}
                    </p>
                  </>
                )}
              </div>
              {editingId === review.id ? null : (
                <div className="foleio-dash-booking-actions">
                  <button
                    type="button"
                    className="foleio-dash-btn-ghost"
                    onClick={() => void toggleActive(review)}
                    disabled={saving || Boolean(deletingId)}
                  >
                    {review.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    className="foleio-dash-btn-outline"
                    style={{ padding: 6, minWidth: 0 }}
                    onClick={() => startEdit(review)}
                    disabled={saving || Boolean(deletingId)}
                    aria-label="Edit review"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    className="foleio-dash-btn-danger"
                    style={{ padding: 6, minWidth: 0 }}
                    onClick={() => void deleteReview(review.id)}
                    disabled={saving || Boolean(deletingId)}
                    aria-label="Delete review"
                  >
                    {deletingId === review.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

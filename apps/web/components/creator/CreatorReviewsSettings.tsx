'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<ReviewFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReviewFormState>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const plan: PlatformPlan = getCreatorPlan(platformPlan);
  const limits = getCreatorPlanLimits({
    platformPlan,
    platformSubscriptionActive,
  });
  const atCap = reviews.length >= limits.maxReviews;
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

  function startAdd() {
    if (!canUseReviews || atCap) {
      showUpgradeModal('maxReviews');
      return;
    }
    setShowAddForm(true);
    setAddForm(emptyForm());
    setEditingId(null);
    setError('');
  }

  async function submitAdd() {
    const customerName = addForm.customerName.trim();
    const location = addForm.location.trim();
    const quote = addForm.quote.trim();
    if (!customerName) {
      setError('Customer name is required');
      return;
    }
    if (!quote) {
      setError('Review quote is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/creator/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, location, quote }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 403 && payload?.limitType === 'maxReviews') {
        showUpgradeModal('maxReviews');
        return;
      }
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not add review');
      }
      setShowAddForm(false);
      setAddForm(emptyForm());
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add review');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(review: CreatorReviewRow) {
    setEditingId(review.id);
    setEditForm({
      customerName: review.customerName,
      location: review.location || '',
      quote: review.quote,
    });
    setShowAddForm(false);
    setError('');
  }

  async function submitEdit(reviewId: string) {
    const customerName = editForm.customerName.trim();
    const location = editForm.location.trim();
    const quote = editForm.quote.trim();
    if (!customerName) {
      setError('Customer name is required');
      return;
    }
    if (!quote) {
      setError('Review quote is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/creator/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, location, quote }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save review');
      }
      setEditingId(null);
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review');
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

  async function handleDelete(reviewId: string) {
    if (!confirm('Delete this review?')) return;
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
          ? 'Add up to 10 customer testimonials on your public page with Pro.'
          : reviewsEnabled
            ? `Add testimonials from customers. Active reviews appear on your public page. ${reviews.length}/${limits.maxReviews} used.`
            : `Reviews are hidden from your public page. You can still manage them here. ${reviews.length}/${limits.maxReviews} used.`}
      </p>
      {!showAddForm ? (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="foleio-dash-btn-ghost"
            onClick={startAdd}
            disabled={saving || Boolean(deletingId)}
            aria-disabled={!canUseReviews}
            style={
              !canUseReviews ? { opacity: 0.55, cursor: 'not-allowed' } : undefined
            }
          >
            {!canUseReviews ? (
              <Lock className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add review
            {!canUseReviews ? (
              <span className="foleio-dash-badge is-warning">Pro</span>
            ) : null}
          </button>
        </div>
      ) : null}

      {showAddForm ? (
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          <input
            type="text"
            value={addForm.customerName}
            onChange={(e) => setAddForm((prev) => ({ ...prev, customerName: e.target.value }))}
            placeholder="Customer name"
            className="foleio-dash-input"
            autoFocus
          />
          <input
            type="text"
            value={addForm.location}
            onChange={(e) => setAddForm((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="Location (optional)"
            className="foleio-dash-input"
          />
          <textarea
            value={addForm.quote}
            onChange={(e) => setAddForm((prev) => ({ ...prev, quote: e.target.value }))}
            placeholder="What they said about your work"
            className="foleio-dash-input"
            rows={3}
            style={{ resize: 'vertical', minHeight: 72 }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="foleio-dash-btn-primary"
              onClick={() => void submitAdd()}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save review'}
            </button>
            <button
              type="button"
              className="foleio-dash-btn-ghost"
              onClick={() => {
                setShowAddForm(false);
                setAddForm(emptyForm());
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {canUseReviews && reviews.length === 0 && !showAddForm ? (
        <p className="foleio-dash-panel-meta" style={{ marginTop: 16, marginBottom: 0 }}>
          No reviews yet. Add your first customer testimonial.
        </p>
      ) : null}

      {reviews.length > 0 ? (
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          {reviews.map((review) => {
            const isEditing = editingId === review.id;
            const busy = saving || deletingId === review.id;

            return (
              <div
                key={review.id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  opacity: review.isActive ? 1 : 0.65,
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <input
                      type="text"
                      value={editForm.customerName}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, customerName: e.target.value }))
                      }
                      className="foleio-dash-input"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="Location (optional)"
                      className="foleio-dash-input"
                    />
                    <textarea
                      value={editForm.quote}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, quote: e.target.value }))
                      }
                      className="foleio-dash-input"
                      rows={3}
                      style={{ resize: 'vertical', minHeight: 72 }}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="foleio-dash-btn-primary"
                        disabled={busy}
                        onClick={() => void submitEdit(review.id)}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="foleio-dash-btn-ghost"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      style={{
                        margin: 0,
                        color: '#f4f4f5',
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.4,
                      }}
                    >
                      {review.customerName}
                      {review.location ? (
                        <span
                          style={{
                            marginLeft: 8,
                            color: '#828282',
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          · {review.location}
                        </span>
                      ) : null}
                    </p>
                    <p
                      className="foleio-dash-panel-meta"
                      style={{ margin: '8px 0 0', fontStyle: 'italic', lineHeight: 1.5 }}
                    >
                      “{review.quote}”
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginTop: 12,
                        alignItems: 'center',
                      }}
                    >
                      <button
                        type="button"
                        className="foleio-dash-btn-outline"
                        style={{ padding: '7px 10px', fontSize: 13 }}
                        disabled={busy}
                        onClick={() => startEdit(review)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="foleio-dash-btn-outline"
                        style={{ padding: '7px 10px', fontSize: 13 }}
                        disabled={busy}
                        onClick={() => void toggleActive(review)}
                      >
                        {review.isActive ? 'Hide on profile' : 'Show on profile'}
                      </button>
                      <button
                        type="button"
                        className="foleio-dash-btn-danger"
                        style={{ padding: '7px 10px', fontSize: 13 }}
                        disabled={busy}
                        onClick={() => void handleDelete(review.id)}
                      >
                        {deletingId === review.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                      {!review.isActive ? (
                        <span className="foleio-dash-panel-meta" style={{ margin: 0 }}>
                          Hidden from public page
                        </span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p
          className="foleio-dash-panel-meta"
          style={{ color: '#fca5a5', marginTop: 12, marginBottom: 0 }}
        >
          {error}{' '}
          <button
            type="button"
            className="foleio-dash-btn-ghost"
            style={{ display: 'inline', padding: '0 6px' }}
            onClick={() => void loadReviews({ blank: reviews.length === 0 })}
          >
            Retry
          </button>
        </p>
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

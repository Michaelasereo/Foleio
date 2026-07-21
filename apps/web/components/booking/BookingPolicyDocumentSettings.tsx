'use client';

import { useRef, useState } from 'react';
import { ExternalLink, FileText, Loader2, Link2, Trash2, Upload } from 'lucide-react';
import {
  clearBookingPolicyDocument,
  setBookingPolicyLink,
  type BookingPolicyDocument,
} from '@/lib/actions/booking-policy-document';

type Mode = 'file' | 'link';

type Props = {
  initial?: BookingPolicyDocument | null;
};

export function BookingPolicyDocumentSettings({ initial = null }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [policy, setPolicy] = useState<BookingPolicyDocument>(
    initial ?? {
      bookingPolicyType: null,
      bookingPolicyFileUrl: null,
      bookingPolicyFileName: null,
      bookingPolicyLinkUrl: null,
    }
  );
  const [mode, setMode] = useState<Mode>(
    initial?.bookingPolicyType === 'link' ? 'link' : 'file'
  );
  const [linkUrl, setLinkUrl] = useState(initial?.bookingPolicyLinkUrl || '');
  const [pendingName, setPendingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const hasPolicy = Boolean(
    (policy.bookingPolicyType === 'file' && policy.bookingPolicyFileUrl) ||
      (policy.bookingPolicyType === 'link' && policy.bookingPolicyLinkUrl)
  );

  const chooseLabel = saving
    ? 'Uploading…'
    : pendingName || policy.bookingPolicyFileName || 'Choose a file';

  async function handleUpload(file: File) {
    setError('');
    setSaved(false);
    setPendingName(file.name);
    setSaving(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/creator/booking-policy/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Upload failed');
        setPendingName('');
        return;
      }
      setPolicy({
        bookingPolicyType: 'file',
        bookingPolicyFileUrl: data.data.bookingPolicyFileUrl,
        bookingPolicyFileName: data.data.bookingPolicyFileName,
        bookingPolicyLinkUrl: null,
      });
      setMode('file');
      setLinkUrl('');
      setPendingName('');
      setSaved(true);
    } catch {
      setError('Upload failed. Please try again.');
      setPendingName('');
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSaveLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const result = await setBookingPolicyLink(linkUrl);
      if (result.error || !result.data) {
        setError(result.error || 'Could not save link');
        return;
      }
      setPolicy(result.data);
      setMode('link');
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const result = await clearBookingPolicyDocument();
      if (result.error || !result.data) {
        setError(result.error || 'Could not clear policy');
        return;
      }
      setPolicy(result.data);
      setLinkUrl('');
      setPendingName('');
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="foleio-dash-panel" style={{ marginTop: 20 }}>
      <h2 className="foleio-dash-panel-title">Booking policy</h2>
      <p className="foleio-dash-panel-meta" style={{ marginBottom: 20, maxWidth: 520 }}>
        Upload a PDF/DOC or paste a Google Doc link. Clients see “Read my booking
        policy” under Book on your public page.
      </p>

      <div
        role="tablist"
        aria-label="Booking policy source"
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 18,
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          className={mode === 'file' ? 'foleio-dash-btn-primary' : 'foleio-dash-btn-outline'}
          style={{ minHeight: 44, padding: '0 18px' }}
          onClick={() => setMode('file')}
          disabled={saving}
        >
          Upload file
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'link'}
          className={mode === 'link' ? 'foleio-dash-btn-primary' : 'foleio-dash-btn-outline'}
          style={{ minHeight: 44, padding: '0 18px' }}
          onClick={() => setMode('link')}
          disabled={saving}
        >
          Google Doc link
        </button>
      </div>

      {mode === 'file' ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={saving}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
            aria-hidden
            tabIndex={-1}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              minHeight: 140,
              padding: '28px 20px',
              borderRadius: 12,
              border: '1px dashed rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.03)',
              color: '#f4f4f5',
              cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {saving ? (
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#adadad' }} />
            ) : (
              <Upload className="h-6 w-6" style={{ color: '#adadad' }} />
            )}
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.35,
                textAlign: 'center',
                wordBreak: 'break-word',
              }}
            >
              {chooseLabel}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#828282',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              PDF, DOC, or DOCX · max 10MB
            </span>
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSaveLink(e)} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label
              htmlFor="booking-policy-link"
              style={{
                display: 'block',
                marginBottom: 8,
                color: '#828282',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              Google Docs / Drive URL
            </label>
            <input
              id="booking-policy-link"
              className="foleio-dash-input"
              type="url"
              placeholder="https://docs.google.com/document/d/…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div>
            <button
              type="submit"
              className="foleio-dash-btn-primary"
              disabled={saving || !linkUrl.trim()}
              style={{ minHeight: 44, padding: '0 20px' }}
            >
              {saving ? (
                <>
                  <Loader2 className="inline h-4 w-4 animate-spin" style={{ marginRight: 8 }} />
                  Saving…
                </>
              ) : (
                <>
                  <Link2 className="inline h-4 w-4" style={{ marginRight: 8 }} />
                  Save link
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {hasPolicy ? (
        <div
          style={{
            marginTop: 18,
            padding: '16px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <FileText
              className="h-5 w-5 shrink-0"
              style={{ color: '#adadad', marginTop: 2 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  color: '#f4f4f5',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                {policy.bookingPolicyType === 'file'
                  ? policy.bookingPolicyFileName || 'Uploaded policy'
                  : 'Google Doc link'}
              </p>
              {(policy.bookingPolicyType === 'link' && policy.bookingPolicyLinkUrl) ||
              (policy.bookingPolicyType === 'file' && policy.bookingPolicyFileUrl) ? (
                <a
                  href={
                    policy.bookingPolicyType === 'link'
                      ? policy.bookingPolicyLinkUrl!
                      : policy.bookingPolicyFileUrl!
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    color: '#adadad',
                    fontSize: 13,
                  }}
                >
                  Open policy <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            <button
              type="button"
              className="foleio-dash-btn-ghost"
              onClick={() => void handleClear()}
              disabled={saving}
              aria-label="Remove booking policy"
              style={{ padding: 10, minHeight: 40, minWidth: 40 }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p style={{ marginTop: 14, color: '#f87171', fontSize: 13 }}>{error}</p>
      ) : null}
      {saved && !error ? (
        <p style={{ marginTop: 14, color: '#4ade80', fontSize: 13 }}>Saved.</p>
      ) : null}
    </div>
  );
}

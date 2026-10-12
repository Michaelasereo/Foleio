'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import styles from '@/components/demo/demo-dashboard.module.css';
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

  const policyName =
    policy.bookingPolicyType === 'file'
      ? policy.bookingPolicyFileName || 'Booking policy'
      : 'Google Doc link';
  const policyHref =
    policy.bookingPolicyType === 'link'
      ? policy.bookingPolicyLinkUrl
      : policy.bookingPolicyFileUrl;

  return (
    <section className={styles.card}>
      <h2 className={styles.sideTitle}>Booking policy</h2>
      <p className={styles.quiet}>Clients see “Read my booking policy” before they book.</p>
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
      {hasPolicy ? (
        <a className={styles.policyFile} href={policyHref || undefined} target="_blank" rel="noopener noreferrer">
          <span className={styles.policyBadge}>{policy.bookingPolicyType === 'link' ? 'LINK' : 'PDF'}</span>
          <span>
            <strong>{policyName}</strong>
            <span>On your booking page</span>
          </span>
        </a>
      ) : null}
      <div className={styles.policyActions}>
        <button type="button" className={styles.ghost} disabled={saving} onClick={() => fileInputRef.current?.click()}>
          {saving && mode === 'file' ? 'Uploading…' : hasPolicy ? 'Replace file' : 'Upload file'}
        </button>
        <button type="button" className={styles.textLink} disabled={saving} onClick={() => setMode((current) => (current === 'link' ? 'file' : 'link'))}>
          {mode === 'link' ? 'Hide link' : 'Use a Google Doc link'}
        </button>
        {hasPolicy ? (
          <button type="button" className={styles.textLink} disabled={saving} onClick={() => void handleClear()}>
            Remove
          </button>
        ) : null}
      </div>
      {mode === 'link' ? (
        <form onSubmit={(e) => void handleSaveLink(e)} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <input
            id="booking-policy-link"
            className="foleio-dash-input"
            type="url"
            placeholder="https://docs.google.com/document/d/…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            disabled={saving}
            required
            aria-label="Google Docs or Drive URL"
          />
          <button type="submit" className={styles.solid} disabled={saving || !linkUrl.trim()} style={{ width: 'fit-content' }}>
            {saving ? 'Saving…' : 'Save link'}
          </button>
        </form>
      ) : null}
      <p className={styles.quiet}>PDF, DOC, or DOCX, up to 10MB.</p>
      {error ? <p className={styles.quiet} style={{ color: '#be123c' }}>{error}</p> : null}
      {saved && !error ? <p className={styles.quiet}>Saved.</p> : null}
      {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
    </section>
  );
}

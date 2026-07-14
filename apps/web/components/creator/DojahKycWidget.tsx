'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

const DOJAH_SCRIPT_SRC = 'https://widget.dojah.io/widget.js';

type DojahKycWidgetProps = {
  creatorId: string;
  userId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  verified: boolean;
  onVerified: () => void;
};

function loadDojahScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Connect) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${DOJAH_SCRIPT_SRC}"]`
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.Connect) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Dojah widget script'))
      );
    });
  }

  return new Promise((resolve, reject) => {
    // Docs: do not use async or defer on the Dojah script tag
    const script = document.createElement('script');
    script.src = DOJAH_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Dojah widget script'));
    document.body.appendChild(script);
  });
}

function buildReferenceId(creatorId: string) {
  // Docs: reference_id character length must be greater than 10
  const ref = `foleio_${creatorId}_${Date.now().toString(36)}`;
  return ref.length > 10 ? ref : `${ref}_kyc`;
}

export function DojahKycWidget({
  creatorId,
  userId,
  email,
  firstName,
  lastName,
  verified,
  onVerified,
}: DojahKycWidgetProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const confirmingRef = useRef(false);

  const appId = process.env.NEXT_PUBLIC_DOJAH_APP_ID?.trim() || '';
  const publicKey = process.env.NEXT_PUBLIC_DOJAH_PUBLIC_KEY?.trim() || '';
  const widgetId = process.env.NEXT_PUBLIC_DOJAH_WIDGET_ID?.trim() || '';
  const configured = Boolean(appId && publicKey && widgetId);

  useEffect(() => {
    let cancelled = false;
    loadDojahScript()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Could not load identity verification');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const confirmReference = useCallback(
    async (referenceId: string, widgetResponse?: unknown) => {
      if (confirmingRef.current) return;
      confirmingRef.current = true;
      setConfirming(true);
      setError('');
      try {
        const res = await fetch('/api/creator/kyc/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference_id: referenceId,
            widget: widgetResponse || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.verified) {
          throw new Error(
            data.message || data.error || 'Identity verification not complete yet'
          );
        }
        onVerified();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not confirm verification');
      } finally {
        confirmingRef.current = false;
        setConfirming(false);
        setOpening(false);
      }
    },
    [onVerified]
  );

  const openWidget = useCallback(async () => {
    setError('');
    if (!configured) {
      setError(
        'Dojah is not configured. Add NEXT_PUBLIC_DOJAH_APP_ID, NEXT_PUBLIC_DOJAH_PUBLIC_KEY, and NEXT_PUBLIC_DOJAH_WIDGET_ID.'
      );
      return;
    }
    if (!scriptReady || !window.Connect) {
      setError('Identity verification is still loading. Try again in a moment.');
      return;
    }

    setOpening(true);
    const referenceId = buildReferenceId(creatorId);

    try {
      // Docs: https://docs.dojah.io/sdks/javascript-library
      const options: Record<string, unknown> = {
        app_id: appId,
        p_key: publicKey,
        type: 'custom',
        reference_id: referenceId,
        user_data: {
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName ? { last_name: lastName } : {}),
          residence_country: 'NG',
          ...(email ? { email } : {}),
        },
        metadata: {
          creator_id: creatorId,
          user_id: userId,
        },
        config: {
          widget_id: widgetId,
          webhook: true,
        },
        onSuccess(response: {
          reference_id?: string;
          status?: boolean;
          verification_status?: string;
        }) {
          // Prefer Dojah's reference_id from the callback (often DJ-…).
          const ref = String(response?.reference_id || referenceId).trim();
          console.info('[Dojah] onSuccess', {
            reference_id: ref,
            status: response?.status,
            verification_status: response?.verification_status,
          });
          if (ref) {
            // Give sandbox a moment to index before confirming via API.
            window.setTimeout(() => void confirmReference(ref, response), 1500);
          }
        },
        onError(err: unknown) {
          console.error('[Dojah] onError', err);
          setError('Verification could not be completed. Please try again.');
          setOpening(false);
        },
        onClose() {
          setOpening(false);
        },
      };

      const connect = new window.Connect(options);
      connect.setup();
      connect.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not open verification');
      setOpening(false);
    }
  }, [
    appId,
    configured,
    confirmReference,
    creatorId,
    email,
    firstName,
    lastName,
    publicKey,
    scriptReady,
    userId,
    widgetId,
  ]);

  if (verified) {
    return (
      <div
        className="foleio-dash-booking-row"
        style={{ borderTop: 'none', paddingTop: 4 }}
      >
        <div className="foleio-dash-booking-main">
          <p className="foleio-dash-booking-name">Identity verified</p>
          <div className="foleio-dash-booking-meta">
            <span>You can add your payout bank account next</span>
          </div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#86efac',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
          Done
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8, maxWidth: 420 }}>
      <p className="foleio-dash-panel-meta" style={{ marginBottom: 12 }}>
        Verify your identity with Dojah before adding a bank account. Clients can only
        book you after both steps are complete.
      </p>

      <button
        type="button"
        className="foleio-dash-btn-primary"
        onClick={() => void openWidget()}
        disabled={opening || confirming || !scriptReady}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {opening || confirming || !scriptReady ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
        ) : (
          <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
        )}
        {confirming
          ? 'Confirming…'
          : opening
            ? 'Verification open…'
            : !scriptReady
              ? 'Loading…'
              : 'Verify identity'}
      </button>

      {error ? (
        <p
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            color: '#fca5a5',
            fontSize: 13,
          }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

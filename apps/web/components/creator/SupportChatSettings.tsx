'use client';

import { useState } from 'react';
import { Copy, Loader2, Mail, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { FOLEIO_SUPPORT_EMAIL } from '@/lib/config/support';

type FeedbackCategory = 'feedback' | 'bug' | 'question' | 'other';

export function SupportChatSettings({
  creatorName,
  creatorEmail,
}: {
  creatorName?: string;
  creatorEmail?: string | null;
}) {
  const { toast } = useToast();
  const [category, setCategory] = useState<FeedbackCategory>('feedback');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function copySupportEmail() {
    try {
      await navigator.clipboard.writeText(FOLEIO_SUPPORT_EMAIL);
      toast({ title: 'Support email copied' });
    } catch {
      toast({
        title: 'Could not copy',
        description: FOLEIO_SUPPORT_EMAIL,
        variant: 'destructive',
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      toast({
        title: 'Add a bit more detail',
        description: 'Please write at least a short message (10+ characters).',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/creator/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: trimmed,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not send feedback');
      }
      setMessage('');
      setCategory('feedback');
      toast({
        title: 'Message sent',
        description: 'Thanks — we’ll get back to you by email.',
      });
    } catch (error) {
      toast({
        title: 'Could not send',
        description:
          error instanceof Error ? error.message : 'Please try again or email us directly.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="foleio-dash-settings">
      <div className="foleio-dash-panel" style={{ maxWidth: 560 }}>
        <h2 className="foleio-dash-panel-title">Chat with us</h2>
        <p className="foleio-dash-panel-meta">
          Questions, bugs, or product ideas — we read every message.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: '#f3f1f4',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#ebe8eb',
              color: '#111827',
              flexShrink: 0,
            }}
          >
            <Mail className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="foleio-dash-panel-meta" style={{ margin: 0 }}>
              Support email
            </p>
            <a
              href={`mailto:${FOLEIO_SUPPORT_EMAIL}?subject=${encodeURIComponent('Foleio support')}`}
              style={{
                display: 'inline-block',
                marginTop: 4,
                color: '#111827',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                wordBreak: 'break-all',
              }}
            >
              {FOLEIO_SUPPORT_EMAIL}
            </a>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="foleio-dash-btn-ghost"
                style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                onClick={copySupportEmail}
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                Copy email
              </button>
              <a
                href={`mailto:${FOLEIO_SUPPORT_EMAIL}?subject=${encodeURIComponent('Foleio support')}`}
                className="foleio-dash-btn-ghost"
                style={{
                  height: 34,
                  padding: '0 12px',
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
                Open mail app
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="foleio-dash-panel" style={{ maxWidth: 560 }}>
        <h2 className="foleio-dash-panel-title">Send feedback</h2>
        <p className="foleio-dash-panel-meta">
          Tell us what’s working, what’s broken, or what you want next.
        </p>

        <form onSubmit={handleSubmit} className="foleio-dash-settings-stack" style={{ marginTop: 16 }}>
          <label className="foleio-dash-field">
            Topic
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              className="foleio-dash-input"
            >
              <option value="feedback">Product feedback</option>
              <option value="bug">Bug / something broke</option>
              <option value="question">Question</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="foleio-dash-field">
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="foleio-dash-input"
              rows={6}
              maxLength={4000}
              placeholder={
                creatorName
                  ? `Hi, I’m ${creatorName}…`
                  : 'Describe what you need help with…'
              }
              style={{ resize: 'vertical', minHeight: 120 }}
            />
            <p className="foleio-dash-field-hint">
              Replies go to {creatorEmail || 'your account email'}.
            </p>
          </label>

          <button
            type="submit"
            className="foleio-dash-btn-primary"
            disabled={sending || message.trim().length < 10}
            style={{ width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send message'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

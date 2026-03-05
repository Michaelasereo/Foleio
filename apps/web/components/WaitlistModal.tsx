'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type WaitlistModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  initialEmail: string;
};

export function WaitlistModal({
  open,
  onOpenChange,
  initialName = '',
  initialEmail,
}: WaitlistModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(initialName || '');
    setEmail(initialEmail);
    setIsSubmitting(false);
    setIsSuccess(false);
    setErrorMessage('');
  }, [open, initialName, initialEmail]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email }),
      });

      // API returns 400 for duplicates; treat it as success UX.
      if (!response.ok && response.status !== 400) {
        throw new Error('Failed to join waitlist');
      }

      setIsSuccess(true);
    } catch (error) {
      setErrorMessage('Could not submit right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-orange-200 bg-[#FFF7ED] p-6 shadow-2xl">
        <button
          type="button"
          aria-label="Close waitlist modal"
          className="mb-2 ml-auto block text-sm text-orange-700 hover:text-orange-900"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>

        {!isSuccess ? (
          <>
            <h2 className="font-display text-3xl text-orange-950">
              You're early — we love that. 🧡
            </h2>
            <p className="mt-3 font-sans text-sm text-orange-900">
              Foleio is currently in a closed pilot phase while we make sure
              everything works perfectly at scale. Drop your details below and
              we'll reach out as soon as we open up.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 font-sans">
              <div>
                <label className="mb-1 block text-sm text-orange-900">
                  Full Name
                </label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="John Doe"
                  required
                  className="border-orange-300 bg-white/80"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-orange-900">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="border-orange-300 bg-white/80"
                />
              </div>

              {errorMessage ? (
                <p className="text-sm text-red-600">{errorMessage}</p>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-600 text-white hover:bg-orange-700"
              >
                {isSubmitting ? 'Submitting...' : 'Request Access'}
              </Button>
            </form>
          </>
        ) : (
          <div className="py-8 text-center">
            <h2 className="font-display text-3xl text-orange-950">
              You're on the list! We'll be in touch soon. 🎉
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}

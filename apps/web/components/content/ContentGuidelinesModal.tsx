'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface ContentGuidelinesModalProps {
  open: boolean;
  onClose: () => void;
  requireAcceptance?: boolean;
  onAccepted?: () => Promise<void> | void;
  loading?: boolean;
}

export function ContentGuidelinesModal({
  open,
  onClose,
  requireAcceptance = false,
  onAccepted,
  loading = false,
}: ContentGuidelinesModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !requireAcceptance) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(event) => {
          if (requireAcceptance) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (requireAcceptance) event.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">Foleio Content Guidelines</DialogTitle>
        <DialogDescription className="sr-only">
          Review Foleio content standards and accept the policy before publishing.
        </DialogDescription>
        {!requireAcceptance && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-bold">Content Guidelines</h2>
          <p className="text-sm text-muted-foreground">
            {requireAcceptance
              ? "Before you publish, please read and agree to Foleio's content standards."
              : "Foleio's content standards for creators."}
          </p>
        </div>

        <div className="mb-6 space-y-3 rounded-xl bg-muted/50 p-4 text-sm">
          <p className="font-semibold text-foreground">
            Foleio is a space for knowledge, creativity and community. We expect all creators to:
          </p>
          <div className="space-y-2 text-muted-foreground">
            <p>✓ Share content that educates, inspires or entertains</p>
            <p>✓ Be respectful to your audience and other creators</p>
            <p>✓ Only upload content you own or have rights to share</p>
            <p>✗ No harassment, hate speech or targeted abuse</p>
            <p>✗ No spam, misleading or fraudulent content</p>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-primary transition-opacity hover:opacity-80"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Hide full policy
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                View full content policy
              </>
            )}
          </button>

          {showDetails && (
            <div className="space-y-2 border-t border-border pt-3 text-muted-foreground">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Strictly prohibited content
              </p>
              <p>✗ Sexually explicit or pornographic content of any kind</p>
              <p>✗ Nudity presented in a sexual context</p>
              <p>✗ Any content that sexualizes, exploits or endangers minors</p>
              <p>✗ Non-consensual intimate content</p>
              <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="text-xs font-medium text-red-700">
                  Violations result in immediate permanent removal. Content involving minors is
                  reported to the relevant authorities with no exceptions.
                </p>
              </div>
            </div>
          )}
        </div>

        {requireAcceptance ? (
          <>
            <label className="mb-6 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span className="text-sm text-foreground">
                I have read and agree to Foleio&apos;s Content Guidelines. I understand that
                violations will result in permanent account removal.
              </span>
            </label>
            <Button
              disabled={!accepted || loading}
              onClick={async () => {
                await onAccepted?.();
              }}
              className="w-full"
            >
              {loading ? 'Saving...' : 'Continue to Upload'}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={onClose} className="w-full">
            Got it
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

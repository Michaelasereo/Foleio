'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface OnboardingGateModalProps {
  open: boolean;
  userEmail?: string;
}

export function OnboardingGateModal({ open, userEmail }: OnboardingGateModalProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogTitle>Complete onboarding to continue</DialogTitle>
        <DialogDescription>
          {userEmail
            ? `You're signed in as ${userEmail}.`
            : 'Your account is signed in.'}{' '}
          Please complete onboarding before using the dashboard.
        </DialogDescription>

        <div className="space-y-3 pt-2">
          <Button className="w-full" onClick={() => router.push('/onboard')}>
            Go to onboarding
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            This step is required and cannot be skipped.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

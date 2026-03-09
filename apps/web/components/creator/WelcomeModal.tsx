'use client';

import { useRouter } from 'next/navigation';
import { Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProfileCardPreview } from '@/components/creator/ProfileCardPreview';

interface WelcomeModalProps {
  creator: {
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
  };
  onClose: () => void;
}

export function WelcomeModal({ creator, onClose }: WelcomeModalProps) {
  const router = useRouter();

  async function markSeen() {
    await fetch('/api/creator/seen-welcome', { method: 'POST' });
  }

  async function handleShare() {
    await markSeen();
    onClose();
    router.push('/settings?tab=profile&share=true');
  }

  async function handleSkip() {
    await markSeen();
    onClose();
  }

  return (
    <Dialog open>
      <DialogContent
        className="max-w-sm text-center"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Welcome to Foleio</DialogTitle>
        <DialogDescription className="sr-only">
          Welcome new creators and guide them to share their profile card.
        </DialogDescription>
        <div className="mb-4 text-5xl">🎉</div>

        <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
          You&apos;re live on Foleio!
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Welcome to the family, {creator.displayName}. Your world is now open.
          Share it with your audience and let them know you&apos;re here.
        </p>

        <div className="mb-6 flex justify-center">
          <div className="h-48 w-28 overflow-hidden rounded-2xl border-2 border-primary/20 shadow-lg">
            <ProfileCardPreview template="world" creator={creator} size="thumbnail" scale={28 / 108} />
          </div>
        </div>

        <Button onClick={handleShare} className="mb-3 w-full" size="lg">
          <Share2 className="mr-2 h-4 w-4" />
          Share my profile card
        </Button>

        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          type="button"
        >
          I&apos;ll do this later
        </button>
      </DialogContent>
    </Dialog>
  );
}

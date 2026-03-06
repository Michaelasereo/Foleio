'use client';

import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { MILESTONE_EMOJIS, MILESTONE_LABELS, type Milestone } from '@/lib/utils/milestones';

type MilestoneItem = {
  id: string;
  milestone: Milestone;
  achievedAt: string;
  label: string;
  emoji: string;
  creatorName: string;
  username: string;
};

export function MilestoneCelebration() {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const activeMilestone = useMemo(() => milestones[index] || null, [milestones, index]);

  useEffect(() => {
    let mounted = true;

    const loadMilestones = async () => {
      try {
        const response = await fetch('/api/creator/milestones', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as { milestones?: MilestoneItem[] };
        if (mounted) {
          setMilestones(data.milestones || []);
        }
      } catch (error) {
        console.error('Failed to load milestones:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadMilestones();
    return () => {
      mounted = false;
    };
  }, []);

  const shareProfileLink = async () => {
    if (!activeMilestone) return;
    const profileUrl = `${window.location.origin}/creator/${activeMilestone.username}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: 'Link copied! Share it everywhere 🧡',
      });
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: 'Copy failed',
        description: 'Please copy your profile URL manually.',
        variant: 'destructive',
      });
    }
  };

  const markSeenAndContinue = async () => {
    if (!activeMilestone) return;

    try {
      await fetch('/api/creator/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone: activeMilestone.milestone }),
      });
    } catch (error) {
      console.error('Failed to mark milestone seen:', error);
    }

    if (index < milestones.length - 1) {
      setIndex((prev) => prev + 1);
    } else {
      setMilestones([]);
      setIndex(0);
    }
  };

  if (isLoading || !activeMilestone) {
    return null;
  }

  const milestoneLabel =
    MILESTONE_LABELS[activeMilestone.milestone] || activeMilestone.label || 'New milestone unlocked';
  const milestoneEmoji =
    MILESTONE_EMOJIS[activeMilestone.milestone] || activeMilestone.emoji || '🎉';
  const profilePath = `foleio.com/${activeMilestone.username}`;
  const achievedDate = new Date(activeMilestone.achievedAt).toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={
              {
                left: `${(i * 13) % 100}%`,
                animationDelay: `${(i % 10) * 0.15}s`,
                animationDuration: `${3 + (i % 5) * 0.45}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="text-center">
          <p className="text-5xl">{milestoneEmoji}</p>
          <h2 className="font-display mt-2 text-4xl font-bold text-foreground">You did it! 🎉</h2>
          <p className="mt-2 text-base text-muted-foreground">{milestoneLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeMilestone.creatorName} · {achievedDate}
          </p>
        </div>

        <div
          id="share-card"
          style={{
            background: 'linear-gradient(135deg, #F97316, #F59E0B)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            color: 'white',
            marginTop: '20px',
          }}
        >
          <p style={{ fontSize: '48px', margin: '0 0 8px' }}>{milestoneEmoji}</p>
          <h2 style={{ fontFamily: 'serif', fontSize: '24px', margin: '0 0 8px' }}>
            {activeMilestone.creatorName}
          </h2>
          <p style={{ fontSize: '16px', margin: '0 0 16px', opacity: 0.9 }}>{milestoneLabel}</p>
          <p style={{ fontSize: '12px', opacity: 0.75 }}>{profilePath}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={shareProfileLink} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Share this win
          </Button>
          <Button onClick={markSeenAndContinue} variant="outline">
            Continue
          </Button>
        </div>
      </div>

      <style jsx>{`
        .confetti-piece {
          position: absolute;
          top: -12px;
          width: 10px;
          height: 16px;
          border-radius: 2px;
          background: hsl(var(--primary));
          opacity: 0.9;
          animation-name: confettiFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .confetti-piece:nth-child(3n) {
          background: hsl(var(--accent));
        }
        .confetti-piece:nth-child(3n + 1) {
          background: hsl(var(--secondary));
        }
        @keyframes confettiFall {
          0% {
            transform: translateY(-15vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(540deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

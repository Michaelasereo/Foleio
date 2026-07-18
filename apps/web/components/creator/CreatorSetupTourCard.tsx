'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, ListChecks, X } from 'lucide-react';

const STEPS = [
  {
    id: 'cover',
    label: 'Update cover image',
    href: '/dashboard',
  },
  {
    id: 'bio',
    label: 'Update bio',
    href: '/settings?tab=profile',
  },
  {
    id: 'payments',
    label: 'Update payment details',
    href: '/earnings',
  },
  {
    id: 'bookings-shop',
    label: 'Setup bookings / shop',
    href: '/bookings',
  },
  {
    id: 'policy',
    label: 'Read our creator policy',
    href: '/dashboard/policy',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

function minimizedKey(creatorId: string) {
  return `foleio-setup-tour-minimized:${creatorId}`;
}

function dismissedKey(creatorId: string) {
  return `foleio-setup-tour-dismissed:${creatorId}`;
}

function doneKey(creatorId: string) {
  return `foleio-setup-tour-done:${creatorId}`;
}

function readDoneSteps(creatorId: string): Set<StepId> {
  try {
    const raw = window.localStorage.getItem(doneKey(creatorId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    const valid = new Set(STEPS.map((step) => step.id));
    return new Set(
      parsed.filter(
        (id): id is StepId => typeof id === 'string' && valid.has(id as StepId)
      )
    );
  } catch {
    return new Set();
  }
}

function writeDoneSteps(creatorId: string, done: Set<StepId>) {
  try {
    window.localStorage.setItem(doneKey(creatorId), JSON.stringify([...done]));
  } catch {
    // ignore
  }
}

function readMinimized(creatorId: string): boolean {
  try {
    return (
      window.localStorage.getItem(dismissedKey(creatorId)) === '1' ||
      window.localStorage.getItem(minimizedKey(creatorId)) === '1'
    );
  } catch {
    return false;
  }
}

export function CreatorSetupTourCard({
  creatorId,
}: {
  creatorId?: string | null;
}) {
  // Defer localStorage-driven UI until after mount to avoid SSR/client HTML drift.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [minimized, setMinimized] = useState(false);
  const [done, setDone] = useState<Set<StepId>>(() => new Set());

  useEffect(() => {
    if (!creatorId || !mounted) return;
    setMinimized(readMinimized(creatorId));
    setDone(readDoneSteps(creatorId));
  }, [creatorId, mounted]);

  function minimize() {
    if (creatorId) {
      try {
        window.localStorage.setItem(minimizedKey(creatorId), '1');
        window.localStorage.removeItem(dismissedKey(creatorId));
      } catch {
        // ignore
      }
    }
    setMinimized(true);
  }

  function expand() {
    if (creatorId) {
      try {
        window.localStorage.removeItem(minimizedKey(creatorId));
        window.localStorage.removeItem(dismissedKey(creatorId));
      } catch {
        // ignore
      }
    }
    setMinimized(false);
  }

  function markDone(stepId: StepId) {
    setDone((prev) => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      if (creatorId) writeDoneSteps(creatorId, next);
      return next;
    });
  }

  if (!mounted || !creatorId) return null;

  const doneCount = done.size;
  const total = STEPS.length;

  if (minimized) {
    return (
      <button
        type="button"
        className="foleio-setup-tour-fab"
        aria-label={`Open setup tour (${doneCount} of ${total} done)`}
        onClick={expand}
      >
        <ListChecks strokeWidth={1.75} />
        {doneCount > 0 ? (
          <span className="foleio-setup-tour-fab-badge">{doneCount}</span>
        ) : null}
      </button>
    );
  }

  return (
    <aside className="foleio-setup-tour" aria-label="Creator setup tour">
      <div className="foleio-setup-tour-header">
        <div>
          <p className="foleio-setup-tour-title">Setup tour</p>
          <p className="foleio-setup-tour-meta">
            {doneCount === total
              ? 'All steps complete'
              : `${doneCount} of ${total} complete`}
          </p>
        </div>
        <button
          type="button"
          className="foleio-setup-tour-close"
          aria-label="Minimize setup tour"
          onClick={minimize}
        >
          <X strokeWidth={1.75} />
        </button>
      </div>
      <nav className="foleio-setup-tour-list">
        {STEPS.map((step, index) => {
          const isDone = done.has(step.id);
          return (
            <Link
              key={step.id}
              href={step.href}
              className={`foleio-setup-tour-item${isDone ? ' is-done' : ''}`}
              onClick={() => markDone(step.id)}
            >
              {isDone ? (
                <CheckCircle2
                  className="foleio-setup-tour-check"
                  strokeWidth={1.75}
                  aria-hidden
                />
              ) : (
                <span className="foleio-setup-tour-index">{index + 1}</span>
              )}
              <span className="foleio-setup-tour-label">{step.label}</span>
              <ChevronRight
                className="foleio-setup-tour-arrow"
                strokeWidth={1.75}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

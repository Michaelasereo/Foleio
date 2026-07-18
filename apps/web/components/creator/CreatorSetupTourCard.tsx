'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ListChecks,
  Percent,
  X,
} from 'lucide-react';

const SETUP_STEPS = [
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
] as const;

const FEES_STEP = {
  id: 'policy',
  label: 'Review platform fees',
  href: '/dashboard/policy',
} as const;

const STEPS = [...SETUP_STEPS, FEES_STEP] as const;

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
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [minimized, setMinimized] = useState(false);
  const [listOpen, setListOpen] = useState(false);
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
    setListOpen(false);
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

  function openSetupStep(stepId: StepId) {
    markDone(stepId);
    minimize();
  }

  if (!mounted || !creatorId) return null;

  const setupDoneCount = SETUP_STEPS.filter((step) => done.has(step.id)).length;
  const setupComplete = setupDoneCount === SETUP_STEPS.length;
  const nextSetupStep = SETUP_STEPS.find((step) => !done.has(step.id)) ?? null;

  // After setup is finished, keep only the same small floating fees shortcut.
  if (setupComplete) {
    return (
      <Link
        href={FEES_STEP.href}
        className="foleio-setup-tour-fab"
        aria-label="Review platform fees"
        title="Review platform fees"
        onClick={() => markDone(FEES_STEP.id)}
      >
        <Percent strokeWidth={1.75} />
      </Link>
    );
  }

  if (minimized) {
    return (
      <button
        type="button"
        className="foleio-setup-tour-fab"
        aria-label={`Open setup tour (${setupDoneCount} of ${SETUP_STEPS.length} done)`}
        onClick={expand}
      >
        <ListChecks strokeWidth={1.75} />
        {setupDoneCount > 0 ? (
          <span className="foleio-setup-tour-fab-badge">{setupDoneCount}</span>
        ) : null}
      </button>
    );
  }

  return (
    <aside className="foleio-setup-tour" aria-label="Creator setup tour">
      <div className="foleio-setup-tour-header">
        <div>
          <p className="foleio-setup-tour-title">Setup</p>
          <p className="foleio-setup-tour-meta">
            {setupDoneCount}/{SETUP_STEPS.length} complete
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

      {nextSetupStep ? (
        <Link
          href={nextSetupStep.href}
          className="foleio-setup-tour-next"
          onClick={() => openSetupStep(nextSetupStep.id)}
        >
          <span className="foleio-setup-tour-next-label">
            Next: {nextSetupStep.label}
          </span>
          <ChevronRight className="foleio-setup-tour-arrow" strokeWidth={1.75} />
        </Link>
      ) : null}

      <button
        type="button"
        className="foleio-setup-tour-toggle"
        aria-expanded={listOpen}
        onClick={() => setListOpen((open) => !open)}
      >
        {listOpen ? 'Hide steps' : 'All steps'}
        {listOpen ? (
          <ChevronUp strokeWidth={1.75} />
        ) : (
          <ChevronDown strokeWidth={1.75} />
        )}
      </button>

      {listOpen ? (
        <nav className="foleio-setup-tour-list">
          {SETUP_STEPS.map((step, index) => {
            const isDone = done.has(step.id);
            return (
              <Link
                key={step.id}
                href={step.href}
                className={`foleio-setup-tour-item${isDone ? ' is-done' : ''}`}
                onClick={() => openSetupStep(step.id)}
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
          <Link
            href={FEES_STEP.href}
            className={`foleio-setup-tour-item${
              done.has(FEES_STEP.id) ? ' is-done' : ''
            }`}
            onClick={() => markDone(FEES_STEP.id)}
          >
            {done.has(FEES_STEP.id) ? (
              <CheckCircle2
                className="foleio-setup-tour-check"
                strokeWidth={1.75}
                aria-hidden
              />
            ) : (
              <span className="foleio-setup-tour-index">
                {SETUP_STEPS.length + 1}
              </span>
            )}
            <span className="foleio-setup-tour-label">{FEES_STEP.label}</span>
            <ChevronRight
              className="foleio-setup-tour-arrow"
              strokeWidth={1.75}
            />
          </Link>
        </nav>
      ) : null}
    </aside>
  );
}

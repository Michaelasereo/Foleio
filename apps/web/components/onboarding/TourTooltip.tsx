'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

interface TourStep {
  target: string;
  title?: string;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TourTooltipProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
  onDone: () => void;
}

const TOOLTIP_WIDTH = 280;
const TOOLTIP_OFFSET = 14;
const SPOTLIGHT_PADDING = 8;

type Coordinates = { top: number; left: number };

export function TourTooltip({
  steps,
  currentStep,
  onNext,
  onSkip,
  onDone,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<Coordinates | null>(null);
  const [isFading, setIsFading] = useState(false);

  const step = steps[currentStep];

  const updatePositions = useMemo(
    () => () => {
      if (!step) {
        setTargetRect(null);
        setTooltipCoords(null);
        return;
      }

      const targetElement = document.querySelector(step.target) as HTMLElement | null;
      if (!targetElement) {
        setTargetRect(null);
        setTooltipCoords(null);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current?.offsetHeight || 180;

      let top = rect.top;
      let left = rect.left;

      if (step.position === 'right') {
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + TOOLTIP_OFFSET;
      } else if (step.position === 'left') {
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
      } else if (step.position === 'top') {
        top = rect.top - tooltipHeight - TOOLTIP_OFFSET;
        left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      } else {
        top = rect.bottom + TOOLTIP_OFFSET;
        left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      }

      const viewportPadding = 12;
      const clampedLeft = Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - TOOLTIP_WIDTH - viewportPadding)
      );
      const clampedTop = Math.max(
        viewportPadding,
        Math.min(top, window.innerHeight - tooltipHeight - viewportPadding)
      );

      setTargetRect(rect);
      setTooltipCoords({ top: clampedTop, left: clampedLeft });
    },
    [step]
  );

  useEffect(() => {
    if (!step) return;

    const targetElement = document.querySelector(step.target) as HTMLElement | null;
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }

    const timer = setTimeout(updatePositions, 120);
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions, true);
    };
  }, [step, updatePositions]);

  useEffect(() => {
    updatePositions();
  }, [currentStep, updatePositions]);

  if (!step || !targetRect || !tooltipCoords) {
    return null;
  }

  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    setIsFading(true);
    window.setTimeout(() => {
      onNext();
      setIsFading(false);
    }, 150);
  };

  const handleDone = () => {
    setIsFading(true);
    window.setTimeout(() => {
      onDone();
      setIsFading(false);
    }, 150);
  };

  const arrowStyles: CSSProperties =
    step.position === 'right'
      ? {
          left: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: '8px solid #1C1008',
        }
      : step.position === 'left'
        ? {
            right: -8,
            top: '50%',
            transform: 'translateY(-50%)',
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderLeft: '8px solid #1C1008',
          }
        : step.position === 'top'
          ? {
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #1C1008',
            }
          : {
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid #1C1008',
            };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: targetRect.top - SPOTLIGHT_PADDING,
          left: targetRect.left - SPOTLIGHT_PADDING,
          width: targetRect.width + SPOTLIGHT_PADDING * 2,
          height: targetRect.height + SPOTLIGHT_PADDING * 2,
          borderRadius: 12,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          border: '1px solid rgba(249,115,22,0.75)',
          zIndex: 9998,
          pointerEvents: 'none',
          transition: 'top 150ms ease, left 150ms ease, width 150ms ease, height 150ms ease',
        }}
      />

      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          zIndex: 9999,
          top: tooltipCoords.top,
          left: tooltipCoords.left,
          width: TOOLTIP_WIDTH,
          background: '#1C1008',
          color: '#F5F0E8',
          borderRadius: 14,
          padding: '16px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
          opacity: isFading ? 0 : 1,
          transform: isFading ? 'translateY(4px)' : 'translateY(0)',
          transition: 'opacity 150ms ease, transform 150ms ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            ...arrowStyles,
          }}
        />

        <button
          onClick={onSkip}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'transparent',
            border: 'none',
            color: 'rgba(245,240,232,0.45)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
          aria-label="Close onboarding tour"
        >
          ×
        </button>

        {step.title ? (
          <p
            style={{
              marginBottom: 8,
              fontWeight: 700,
              color: '#F5F0E8',
            }}
          >
            {step.title}
          </p>
        ) : null}

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: '#F5F0E8',
            marginBottom: 14,
            paddingRight: 16,
          }}
        >
          {step.text}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                color: 'rgba(245,240,232,0.6)',
                marginBottom: 6,
              }}
            >
              {currentStep + 1} of {steps.length}
            </p>
            <div style={{ display: 'flex', gap: 4 }}>
              {steps.map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: index === currentStep ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    background:
                      index === currentStep ? '#F97316' : 'rgba(245,240,232,0.25)',
                    transition: 'width 200ms ease',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isLastStep ? (
              <button
                onClick={onSkip}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(245,240,232,0.6)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
            ) : null}
            <button
              onClick={isLastStep ? handleDone : handleNext}
              style={{
                background: '#F97316',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 999,
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isLastStep ? "Let's go 🧡" : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export type { TourStep };

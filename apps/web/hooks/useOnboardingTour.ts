'use client';

import { useState } from 'react';

export function useOnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  function startTour() {
    setCurrentStep(0);
    setIsActive(true);
  }

  function nextStep(totalSteps: number) {
    setCurrentStep((step) => Math.min(step + 1, totalSteps - 1));
  }

  async function markTourComplete() {
    if (isCompleting) return;
    setIsCompleting(true);
    try {
      await fetch('/api/creator/tour-complete', {
        method: 'POST',
      });
    } finally {
      setIsCompleting(false);
    }
  }

  async function skipTour() {
    setIsActive(false);
    await markTourComplete();
  }

  async function completeTour() {
    setIsActive(false);
    await markTourComplete();
  }

  return {
    isActive,
    currentStep,
    startTour,
    nextStep,
    skipTour,
    completeTour,
  };
}

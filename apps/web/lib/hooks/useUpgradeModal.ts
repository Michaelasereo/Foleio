import { useState } from 'react';
import type { PLAN_LIMIT_MESSAGES } from '@/lib/utils/plan-limits';

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [limitType, setLimitType] = useState<keyof typeof PLAN_LIMIT_MESSAGES | null>(null);

  function showUpgradeModal(type: keyof typeof PLAN_LIMIT_MESSAGES) {
    setLimitType(type);
    setIsOpen(true);
  }

  function closeUpgradeModal() {
    setIsOpen(false);
    setLimitType(null);
  }

  return { isOpen, limitType, showUpgradeModal, closeUpgradeModal };
}

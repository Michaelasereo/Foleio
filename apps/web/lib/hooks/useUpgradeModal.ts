'use client';

import { useRouter } from 'next/navigation';
import type { PLAN_LIMIT_MESSAGES } from '@/lib/utils/plan-limits';

/**
 * Pro upsell helper. Opens Billing settings instead of the legacy upgrade modal.
 * Keep the same return shape so existing call sites keep working.
 */
export function useUpgradeModal() {
  const router = useRouter();

  function showUpgradeModal(_type?: keyof typeof PLAN_LIMIT_MESSAGES) {
    router.push('/settings?tab=billing');
  }

  function closeUpgradeModal() {
    // No-op: modal no longer used.
  }

  return {
    isOpen: false,
    limitType: null as keyof typeof PLAN_LIMIT_MESSAGES | null,
    showUpgradeModal,
    closeUpgradeModal,
  };
}

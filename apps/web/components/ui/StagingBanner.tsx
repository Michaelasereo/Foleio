import { shouldShowStagingBanner } from '@/lib/config/runtime-environment';

export function StagingBanner() {
  if (!shouldShowStagingBanner()) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center py-2 text-xs font-semibold tracking-wide">
      ⚠️ STAGING — Test data only · Paystack test mode · Not real transactions
    </div>
  );
}

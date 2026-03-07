export function StagingBanner() {
  if (process.env.NEXT_PUBLIC_ENV !== 'staging') return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 py-2 text-center text-xs font-semibold tracking-wide text-white">
      ⚠️ STAGING ENVIRONMENT — Test data only · Paystack test mode · Not real transactions
    </div>
  );
}

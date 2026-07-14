/**
 * Book / charge unlock: optional Dojah KYC + bank → Paystack subaccount ACTIVE.
 */
export type PaymentsReadyInput = {
  bvnVerified?: boolean | null;
  paystackSubaccountCode?: string | null;
  subaccountStatus?: string | null;
};

export function isPaymentsReady(
  creator: PaymentsReadyInput,
  opts?: { requireKyc?: boolean }
): boolean {
  const requireKyc = opts?.requireKyc ?? true;
  if (requireKyc && !creator.bvnVerified) return false;
  return (
    Boolean(creator.paystackSubaccountCode) &&
    creator.subaccountStatus === 'ACTIVE'
  );
}

import { redirect } from 'next/navigation';

/** Billing lives under Settings → Billing. */
export default function CreatorBillingPage() {
  redirect('/settings?tab=billing');
}

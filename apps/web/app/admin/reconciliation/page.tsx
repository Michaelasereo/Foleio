import { redirect } from 'next/navigation';

export default function ReconciliationRedirectPage() {
  redirect('/admin/webhooks');
}

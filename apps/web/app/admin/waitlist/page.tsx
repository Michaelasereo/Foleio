import { redirect } from 'next/navigation';

export default function AdminWaitlistRedirectPage() {
  redirect('/admin/access');
}

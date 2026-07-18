import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DashboardCreatorPolicy } from '@/components/creator/DashboardCreatorPolicy';

export const metadata = {
  title: 'Creator policy · Foleio',
  description: 'Platform fees and creator policy for Foleio.',
};

export default function DashboardCreatorPolicyPage() {
  return (
    <div>
      <div className="foleio-dash-header">
        <div>
          <Link
            href="/dashboard"
            className="foleio-dash-btn-ghost"
            style={{ marginBottom: 12 }}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Back to dashboard
          </Link>
          <h1 className="foleio-auth-title">Creator policy</h1>
          <p
            className="foleio-dash-panel-meta"
            style={{ marginBottom: 0, marginTop: 6 }}
          >
            What Foleio charges — and the full agreement if you need it
          </p>
        </div>
      </div>

      <div className="foleio-dash-panel">
        <DashboardCreatorPolicy />
      </div>
    </div>
  );
}

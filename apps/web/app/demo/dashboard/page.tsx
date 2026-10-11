import type { Metadata } from 'next';
import { DemoDashboard } from '@/components/demo/DemoDashboard';

export const metadata: Metadata = {
  title: 'Dashboard demo',
  description: 'Placeholder layout for the new Foleio dashboard.',
};

export default function DemoDashboardPage() {
  return <DemoDashboard />;
}

import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';

export default function NotFound() {
  return (
    <FoleioStatusPage
      title="Page not found"
      description="This page doesn’t exist or may have been moved."
      primaryAction={{ label: 'Go home', href: '/' }}
      secondaryAction={{ label: 'Sign in', href: '/login', variant: 'outline' }}
    />
  );
}

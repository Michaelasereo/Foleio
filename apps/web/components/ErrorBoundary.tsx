'use client';

import { Component, type ReactNode } from 'react';
import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <FoleioStatusPage
          title="Something went wrong"
          description={
            this.state.error?.message || 'An unexpected error occurred.'
          }
          primaryAction={{
            label: 'Try again',
            onClick: () => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            },
          }}
          secondaryAction={{ label: 'Go home', href: '/', variant: 'outline' }}
        />
      );
    }

    return this.props.children;
  }
}

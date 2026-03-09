'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {process.env.NODE_ENV === 'development'
            ? error.message
            : 'Please try again or contact support.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

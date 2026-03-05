export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const config: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-200 text-gray-800',
    canceled: 'bg-gray-200 text-gray-800',
    disputed: 'bg-red-100 text-red-800',
    service_day: 'bg-blue-100 text-blue-800',
    first_payout_done: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${config[normalized] || 'bg-gray-200 text-gray-800'}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

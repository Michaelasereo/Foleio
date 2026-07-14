'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Play, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { statusBadgeClass } from '@/lib/admin/format';

interface FailedWebhook {
  id: string;
  event: string;
  attempt: number;
  maxAttempts: number;
  failedAt: string;
  error: string;
  reference?: string;
  amount?: number;
}

interface ReconciliationStats {
  totalFailed: number;
  totalProcessed: number;
  totalRevenue: number;
  recentFailures: FailedWebhook[];
  receivedToday: number;
  failedToday: number;
  retryQueueSize: number;
  webhookEvents: Array<{ id: string; event: string; createdAt: string }>;
  webhookLoggingAvailable: boolean;
}

export default function AdminWebhooksPage({ embedded = false }: { embedded?: boolean }) {
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/reconciliation/stats', { cache: 'no-store' });
      if (response.ok) {
        const data = (await response.json()) as ReconciliationStats;
        setStats(data);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load webhook stats',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const retryWebhook = async (webhookId: string) => {
    setProcessing(webhookId);
    try {
      const response = await fetch('/api/admin/reconciliation/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId }),
      });

      if (!response.ok) throw new Error('retry failed');
      toast({ title: 'Retry queued', description: 'Webhook retry added to queue.' });
      await loadStats();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to retry webhook',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading webhooks...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        {!embedded ? <h2 className="foleio-admin-title">Webhooks</h2> : <span />}
        <Button variant="outline" size="sm" className="border-white/10 bg-transparent" onClick={loadStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Received today', value: stats?.receivedToday || 0 },
          { label: 'Failed today', value: stats?.failedToday || 0, danger: true },
          { label: 'Retry queue', value: stats?.retryQueueSize || 0, warn: true },
        ].map((card) => (
          <div key={card.label} className="rounded-[14px] border border-white/5 bg-[#212121] p-4">
            <p className="text-xs uppercase tracking-wide text-[#828282]">{card.label}</p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                card.danger ? 'text-red-400' : card.warn ? 'text-amber-400' : 'text-[#f4f4f5]'
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-[14px] border border-white/5 bg-[#212121] p-5">
        <h3 className="text-base font-semibold text-[#f4f4f5]">Reconciliation</h3>
        <p className="mt-1 text-sm text-[#828282]">Failed webhooks and manual retry controls</p>
        <div className="mt-4">
          {stats?.recentFailures?.length ? (
            <div className="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-[#1a1816]">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[#828282]">Event</TableHead>
                    <TableHead className="text-[#828282]">Reference</TableHead>
                    <TableHead className="text-[#828282]">Amount</TableHead>
                    <TableHead className="text-[#828282]">Attempts</TableHead>
                    <TableHead className="text-[#828282]">Error</TableHead>
                    <TableHead className="text-[#828282]">Failed at</TableHead>
                    <TableHead className="text-[#828282]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentFailures.map((webhook) => (
                    <TableRow key={webhook.id} className="border-white/5">
                      <TableCell>
                        <Badge variant="outline" className="border-white/10">
                          {webhook.event}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{webhook.reference || 'N/A'}</TableCell>
                      <TableCell>
                        {webhook.amount ? `₦${(webhook.amount / 100).toLocaleString()}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`border ${statusBadgeClass('pending')}`}>
                          {webhook.attempt}/{webhook.maxAttempts}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={webhook.error}>
                        {webhook.error}
                      </TableCell>
                      <TableCell>{new Date(webhook.failedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 bg-transparent"
                          onClick={() => retryWebhook(webhook.id)}
                          disabled={processing === webhook.id}
                        >
                          {processing === webhook.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert className="border-white/10 bg-white/[0.03] text-[#adadad]">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No failed webhooks found.</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-white/5 bg-[#212121] p-5">
        <h3 className="text-base font-semibold text-[#f4f4f5]">Latest events</h3>
        <p className="mt-1 text-sm text-[#828282]">Last 20 webhook events received</p>
        <div className="mt-4">
          {stats?.webhookLoggingAvailable ? (
            <div className="space-y-2">
              {stats.webhookEvents.map((event) => (
                <div key={event.id} className="rounded-md border border-white/5 p-2 text-sm">
                  <p className="font-medium text-[#f4f4f5]">{event.event}</p>
                  <p className="text-xs text-[#828282]">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Alert className="border-white/10 bg-white/[0.03] text-[#adadad]">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Webhook logging coming soon.</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

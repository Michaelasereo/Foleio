'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Play, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function AdminWebhooksPage() {
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
        <h2 className="text-2xl font-semibold">Webhooks</h2>
        <Button variant="outline" size="sm" onClick={loadStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Received Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats?.receivedToday || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Failed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-600">{stats?.failedToday || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Retry Queue Size</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-600">{stats?.retryQueueSize || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Reconciliation</CardTitle>
          <CardDescription>Failed webhooks and manual retry controls</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentFailures?.length ? (
            <div className="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50">
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Failed At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentFailures.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      <Badge variant="outline">{webhook.event}</Badge>
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
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No failed webhooks found.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Latest Events</CardTitle>
          <CardDescription>Last 20 webhook events received</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.webhookLoggingAvailable ? (
            <div className="space-y-2">
              {stats.webhookEvents.map((event) => (
                <div key={event.id} className="rounded-md border p-2 text-sm">
                  <p className="font-medium">{event.event}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Webhook logging coming soon.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

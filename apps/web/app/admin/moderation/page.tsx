'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type QueueData = {
  flaggedVideos: Array<{
    id: string;
    title: string;
    flaggedReason: string | null;
    flaggedAt: string | null;
    creator: { id: string; username: string; displayName: string };
  }>;
  thumbnailRejections: Array<{
    id: string;
    reporterEmail: string | null;
    details: string | null;
    createdAt: string;
    content: {
      id: string;
      title: string;
      creator: { username: string; displayName: string };
    } | null;
  }>;
  fanReports: Array<{
    id: string;
    reason: string;
    details: string | null;
    reporterEmail: string | null;
    createdAt: string;
    content: {
      id: string;
      title: string;
      creator: { id: string; username: string; displayName: string };
    } | null;
  }>;
};

export default function AdminModerationPage() {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueData>({
    flaggedVideos: [],
    thumbnailRejections: [],
    fanReports: [],
  });
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadQueue() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/moderation/queue', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok) {
        setQueue(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  const counts = useMemo(
    () => ({
      flaggedVideos: queue.flaggedVideos.length,
      thumbnailRejections: queue.thumbnailRejections.length,
      fanReports: queue.fanReports.length,
    }),
    [queue]
  );

  async function runAction(url: string, payload: Record<string, string>, actionId: string) {
    setActionLoadingId(actionId);
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await loadQueue();
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Moderation</h1>
        <p className="text-sm text-muted-foreground">
          Review flagged content and community reports.
        </p>
      </div>

      <Tabs defaultValue="videos">
        <TabsList>
          <TabsTrigger value="videos">
            Flagged Videos <Badge className="ml-2">{counts.flaggedVideos}</Badge>
          </TabsTrigger>
          <TabsTrigger value="thumbnails">
            Thumbnail Rejections <Badge className="ml-2">{counts.thumbnailRejections}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reports">
            Fan Reports <Badge className="ml-2">{counts.fanReports}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-3">
          {loading ? <p>Loading...</p> : null}
          {queue.flaggedVideos.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Creator: {item.creator.displayName} (@{item.creator.username})
                </p>
                <p className="text-sm">Reason: {item.flaggedReason || 'Under review'}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={actionLoadingId === `approve-${item.id}`}
                    onClick={() =>
                      runAction(
                        '/api/admin/moderation/approve',
                        { contentId: item.id },
                        `approve-${item.id}`
                      )
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actionLoadingId === `remove-${item.id}`}
                    onClick={() => {
                      if (window.confirm('Remove this content? This action cannot be undone.')) {
                        void runAction(
                          '/api/admin/moderation/remove',
                          { contentId: item.id },
                          `remove-${item.id}`
                        );
                      }
                    }}
                  >
                    Remove Content
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoadingId === `ban-${item.creator.id}`}
                    onClick={() => {
                      if (window.confirm('Ban this creator and unpublish all content?')) {
                        void runAction(
                          '/api/admin/moderation/ban',
                          { creatorId: item.creator.id, reason: 'Content guidelines violation' },
                          `ban-${item.creator.id}`
                        );
                      }
                    }}
                  >
                    Ban Creator
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/creator/${item.creator.username}`} target="_blank">
                      View Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="thumbnails" className="space-y-3">
          {queue.thumbnailRejections.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-4">
                <p className="text-sm font-medium">{item.content?.title || 'Unknown content'}</p>
                <p className="text-xs text-muted-foreground">
                  {item.content?.creator.displayName || item.reporterEmail || 'Unknown uploader'}
                </p>
                <p className="mt-2 text-sm">{item.details || 'Rejected by moderation'}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="space-y-3">
          {queue.fanReports.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 pt-4">
                <p className="font-medium">{item.content?.title || 'Unknown content'}</p>
                <p className="text-sm text-muted-foreground">
                  Reason: {item.reason}
                  {item.reporterEmail ? ` • Reporter: ${item.reporterEmail}` : ''}
                </p>
                {item.details ? <p className="text-sm">{item.details}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      runAction(
                        '/api/admin/moderation/dismiss-report',
                        { reportId: item.id },
                        `dismiss-${item.id}`
                      )
                    }
                  >
                    Dismiss
                  </Button>
                  {item.content ? (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm('Remove this content? This action cannot be undone.')) {
                            void runAction(
                              '/api/admin/moderation/remove',
                              { contentId: item.content!.id, reason: 'Removed after fan reports' },
                              `remove-from-report-${item.id}`
                            );
                          }
                        }}
                      >
                        Remove Content
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm('Ban this creator and unpublish all content?')) {
                            void runAction(
                              '/api/admin/moderation/ban',
                              {
                                creatorId: item.content!.creator.id,
                                reason: 'Escalated fan reports',
                              },
                              `ban-from-report-${item.id}`
                            );
                          }
                        }}
                      >
                        Ban Creator
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

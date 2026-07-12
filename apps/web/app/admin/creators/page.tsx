'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type CreatorHealthRow, type CreatorHealthStatus } from '@/lib/admin/creator-health';
import { formatMoneyFromKobo, statusBadgeClass } from '@/lib/admin/format';

type Filter = 'all' | CreatorHealthStatus;

function relativeDate(date: Date | null): string {
  if (!date) return 'No activity yet';
  if (Number.isNaN(date.getTime())) return 'No activity yet';
  const now = Date.now();
  const diff = date.getTime() - now;
  const abs = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < hour) return rtf.format(Math.round(diff / minute), 'minute');
  if (abs < day) return rtf.format(Math.round(diff / hour), 'hour');
  if (abs < week) return rtf.format(Math.round(diff / day), 'day');
  if (abs < month) return rtf.format(Math.round(diff / week), 'week');
  if (abs < year) return rtf.format(Math.round(diff / month), 'month');
  return rtf.format(Math.round(diff / year), 'year');
}

function statusBadge(status: CreatorHealthStatus) {
  if (status === 'healthy') {
    return <Badge className={`border ${statusBadgeClass('active')}`}>Healthy</Badge>;
  }
  if (status === 'at_risk') {
    return <Badge className={`border ${statusBadgeClass('pending')}`}>At Risk</Badge>;
  }
  return <Badge className={`border ${statusBadgeClass('failed')}`}>Inactive</Badge>;
}

function scoreBarClass(status: CreatorHealthStatus) {
  if (status === 'healthy') return 'bg-green-500';
  if (status === 'at_risk') return 'bg-amber-500';
  return 'bg-red-500';
}

function filterCreators(creators: CreatorHealthRow[], filter: Filter) {
  if (filter === 'all') return creators;
  return creators.filter((creator) => creator.healthStatus === filter);
}

function getEmptyMessage(filter: Filter) {
  if (filter === 'inactive') return 'No inactive creators - great sign! 🎉';
  if (filter === 'at_risk') return 'No at-risk creators right now. Nice momentum! 🎉';
  if (filter === 'healthy') return 'No healthy creators yet. Keep nurturing creator success.';
  return 'No creators found yet.';
}

export default function AdminCreatorsPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [creators, setCreators] = useState<CreatorHealthRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    type CreatorHealthApiRow = Omit<CreatorHealthRow, 'createdAt' | 'lastContentDate'> & {
      createdAt: string;
      lastContentDate: string | null;
    };

    async function load() {
      const response = await fetch('/api/admin/creators', { cache: 'no-store' });
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { creators: CreatorHealthApiRow[] };
      const normalizedCreators: CreatorHealthRow[] = data.creators.map((creator) => ({
        ...creator,
        createdAt: new Date(creator.createdAt),
        lastContentDate: creator.lastContentDate ? new Date(creator.lastContentDate) : null,
      }));
      setCreators(normalizedCreators);
      setLoading(false);
    }
    void load();
  }, []);

  const filtered = useMemo(() => filterCreators(creators, activeFilter), [creators, activeFilter]);

  const totalCreators = creators.length;
  const healthyCount = creators.filter((creator) => creator.healthScore >= 80).length;
  const atRiskCount = creators.filter(
    (creator) => creator.healthScore >= 40 && creator.healthScore < 80
  ).length;
  const inactiveCount = creators.filter((creator) => creator.healthScore < 40).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Creator Health Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCreators}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Healthy Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{healthyCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{atRiskCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{inactiveCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'healthy', label: 'Healthy' },
          { key: 'at_risk', label: 'At Risk' },
          { key: 'inactive', label: 'Inactive' },
        ].map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={activeFilter === tab.key ? 'default' : 'outline'}
            className={activeFilter === tab.key ? 'bg-primary text-primary-foreground' : ''}
            onClick={() => setActiveFilter(tab.key as Filter)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading creators...</p> : null}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {getEmptyMessage(activeFilter)}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="max-h-[70vh] overflow-auto p-0">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50">
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Payments</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Subscribers</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Health Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((creator) => (
                    <TableRow key={creator.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                            {creator.avatarUrl ? (
                              <img
                                src={creator.avatarUrl}
                                alt={creator.displayName}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              creator.displayName.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{creator.displayName}</p>
                            <p className="text-xs text-muted-foreground">@{creator.username}</p>
                            <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                              {creator.category}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{relativeDate(creator.createdAt)}</TableCell>
                      <TableCell>
                        {creator.paymentsReady ? (
                          <div className="space-y-1">
                            <Badge className={`border ${statusBadgeClass('active')}`}>
                              Subaccount ready
                            </Badge>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {(creator.paystackSubaccountCode || '').slice(0, 12)}…
                            </p>
                          </div>
                        ) : (
                          <Badge className={`border ${statusBadgeClass('pending')}`}>
                            {creator.hasBankAccount ? creator.subaccountStatus : 'No bank'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{creator.contentCount}</TableCell>
                      <TableCell>{creator.activeSubscribers}</TableCell>
                      <TableCell>{formatMoneyFromKobo(creator.totalEarned)}</TableCell>
                      <TableCell>{relativeDate(creator.lastContentDate)}</TableCell>
                      <TableCell>
                        <div className="w-36 space-y-2">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full ${scoreBarClass(creator.healthStatus)}`}
                              style={{ width: `${creator.healthScore}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{creator.healthScore}/100</span>
                            {statusBadge(creator.healthStatus)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Button asChild size="sm" variant="outline">
                            <a href={`mailto:${creator.email}`}>Email</a>
                          </Button>
                          <Button asChild size="sm">
                            <Link href={`/creator/${creator.username}`} target="_blank">
                              View Profile
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-3 md:hidden">
            {filtered.map((creator) => (
              <Card key={creator.id}>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{creator.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{creator.username}</p>
                      <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                        {creator.category}
                      </Badge>
                    </div>
                    {statusBadge(creator.healthStatus)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-muted-foreground">Joined</p>
                    <p>{relativeDate(creator.createdAt)}</p>
                    <p className="text-muted-foreground">Payments</p>
                    <p>
                      {creator.paymentsReady
                        ? 'Subaccount ready'
                        : creator.hasBankAccount
                          ? creator.subaccountStatus
                          : 'No bank'}
                    </p>
                    <p className="text-muted-foreground">Content</p>
                    <p>{creator.contentCount}</p>
                    <p className="text-muted-foreground">Subscribers</p>
                    <p>{creator.activeSubscribers}</p>
                    <p className="text-muted-foreground">Earnings</p>
                    <p>{formatMoneyFromKobo(creator.totalEarned)}</p>
                    <p className="text-muted-foreground">Last Active</p>
                    <p>{relativeDate(creator.lastContentDate)}</p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span>Health Score</span>
                      <span className="font-medium">{creator.healthScore}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${scoreBarClass(creator.healthStatus)}`}
                        style={{ width: `${creator.healthScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <a href={`mailto:${creator.email}`}>Email</a>
                    </Button>
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/creator/${creator.username}`} target="_blank">
                        View Profile
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

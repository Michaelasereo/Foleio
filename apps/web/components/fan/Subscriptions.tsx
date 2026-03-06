'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@foleio/utils';
import Link from 'next/link';

interface FanSubscriptionsProps {
  subscriptions: any[];
}

export function FanSubscriptions({ subscriptions }: FanSubscriptionsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Subscriptions</h1>
        <p className="text-muted-foreground">
          Manage your creator subscriptions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {subscriptions.map((sub) => (
          <Card key={sub.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{sub.creator.displayName}</CardTitle>
                <Badge
                  variant={
                    sub.status === 'active' ? 'default' : 'secondary'
                  }
                >
                  {sub.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">
                    {sub.plan?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-medium">
                    {formatNaira((sub.plan?.price || 0) / 100)}/month
                  </span>
                </div>
                {sub.currentPeriodEnd && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Renews:</span>
                    <span>
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="pt-4 flex gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/creator/${sub.creator.username}`}>
                      View Profile
                    </Link>
                  </Button>
                  {sub.status === 'active' && (
                    <Button variant="destructive" className="flex-1">
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {subscriptions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You don't have any active subscriptions yet.
            </p>
            <Button asChild>
              <Link href="/">Browse Creators</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


'use client';

import { useActionState } from 'react';
import { requestPayout } from '@/lib/actions/payment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatNaira } from '@foleio/utils';
import { useToast } from '@/components/ui/use-toast';

interface PayoutPageProps {
  creator: any;
  payouts: any[];
}

export function PayoutPage({ creator, payouts }: PayoutPageProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(requestPayout, {
    success: false,
    message: '',
  });

  if (state.message) {
    toast({
      title: state.success ? 'Success' : 'Error',
      description: state.message,
      variant: state.success ? 'default' : 'destructive',
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payouts</h1>
        <p className="text-muted-foreground">
          Request payouts from your earnings
        </p>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Available Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-4">
            {formatNaira(Number(creator.currentBalance) / 100)}
          </div>
          <p className="text-sm text-muted-foreground">
            Minimum payout: ₦1,000
          </p>
        </CardContent>
      </Card>

      {/* Request Payout */}
      {Number(creator.currentBalance) >= 1000 && (
        <Card>
          <CardHeader>
            <CardTitle>Request Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="creatorId" value={creator.id} />
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Amount (₦)
                </label>
                <Input
                  type="number"
                  name="amount"
                  min="1000"
                  max={Number(creator.currentBalance) / 100}
                  step="100"
                  required
                  placeholder="Enter amount"
                />
              </div>
              <Button
                type="submit"
                disabled={Number(creator.currentBalance) < 1000}
              >
                Request Payout
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payouts.length === 0 ? (
              <p className="text-muted-foreground">No payouts yet</p>
            ) : (
              payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between border-b pb-4"
                >
                  <div>
                    <p className="font-medium">
                      {formatNaira(payout.amount / 100)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      payout.status === 'success'
                        ? 'default'
                        : payout.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {payout.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNaira } from '@odim/utils';
import { SubscriptionCheckout } from '@/components/payment/SubscriptionCheckout';

interface CreatorProfileProps {
  creator: any;
}

export function CreatorProfile({ creator }: CreatorProfileProps) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(creator.creatorPlans[0]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="mb-8">
        <div className="flex items-start gap-6">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
            {creator.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{creator.displayName}</h1>
            {creator.bio && (
              <p className="text-muted-foreground mb-4">{creator.bio}</p>
            )}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{creator.creatorLinks?.length || 0} Links</span>
              <span>{creator.contentCount} content</span>
            </div>
          </div>
          <Button onClick={() => setShowCheckout(true)}>
            Subscribe
          </Button>
        </div>
      </div>

      {/* Subscription Plans */}
      {creator.creatorPlans.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Subscription Plans</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {creator.creatorPlans.map((plan: any) => (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : ''
                }`}
                onClick={() => {
                  setSelectedPlan(plan);
                  setShowCheckout(true);
                }}
              >
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="text-2xl font-bold">
                    {formatNaira(plan.price / 100)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {plan.description}
                    </p>
                  )}
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <ul className="space-y-2">
                      {plan.features.map((feature: string, i: number) => (
                        <li key={i} className="text-sm">
                          • {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Content</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {creator.content.map((item: any) => (
            <Card key={item.id} className="overflow-hidden">
              {item.thumbnailUrl && (
                <div className="aspect-video bg-muted" />
              )}
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline">{item.type}</Badge>
                  <span className="text-muted-foreground">
                    {item.viewCount} views
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {showCheckout && selectedPlan && (
        <SubscriptionCheckout
          creator={creator}
          plans={creator.creatorPlans}
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}


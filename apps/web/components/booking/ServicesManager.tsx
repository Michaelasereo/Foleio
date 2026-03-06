'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Service {
  id: string;
  category: string | null;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number | null;
  isActive: boolean;
}

interface ServicesManagerProps {
  services: Service[];
}

export function ServicesManager({ services }: ServicesManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Services</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No services available.</p>
        ) : (
          services.map((service) => (
            <div key={service.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-xs text-muted-foreground">
                  ₦{(service.price / 100).toLocaleString()}
                  {service.durationMinutes ? ` • ${service.durationMinutes} min` : ''}
                </p>
              </div>
              <Badge variant={service.isActive ? 'default' : 'secondary'}>
                {service.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

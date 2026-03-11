'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface PriceListItem {
  id: string;
  serviceType?: string | null;
  category: string | null;
  name: string;
  description: string | null;
  sessionDescription?: string | null;
  calendlyLink?: string | null;
  price: number;
  durationMinutes: number | null;
}

interface GroupedPriceList {
  category: string | null;
  items: PriceListItem[];
}

interface PriceListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceList: GroupedPriceList[];
  onSelectItem: (item: PriceListItem) => void;
  creatorName: string;
}

export function PriceListModal({
  open,
  onOpenChange,
  priceList,
  onSelectItem,
  creatorName,
}: PriceListModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedItem = priceList
    .flatMap((g) => g.items)
    .find((item) => item.id === selectedItemId);

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  function handleContinue() {
    if (selectedItem) {
      onSelectItem(selectedItem);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Services</DialogTitle>
          <DialogDescription>
            Select a service from {creatorName}&apos;s offerings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            value={selectedItemId || ''}
            onValueChange={setSelectedItemId}
          >
            {priceList.map((group) => (
              <div key={group.category || 'uncategorized'} className="space-y-3">
                {group.category && (
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b pb-2">
                    {group.category}
                  </h4>
                )}
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={`relative flex items-start p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedItemId === item.id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary'
                          : 'hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <RadioGroupItem
                        value={item.id}
                        id={item.id}
                        className="mt-1"
                      />
                      <div className="ml-3 flex-1">
                        <Label
                          htmlFor={item.id}
                          className="font-medium cursor-pointer"
                        >
                          {item.name}
                        </Label>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                        {item.durationMinutes && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {item.durationMinutes} mins
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold text-lg ${
                            selectedItemId === item.id
                              ? 'text-primary'
                              : 'text-foreground'
                          }`}
                        >
                          {formatPrice(item.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Selected item summary */}
        {selectedItem && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Selected:</span>
              <Badge variant="secondary">{selectedItem.name}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Total:</span>
              <span className="font-bold text-xl text-primary">
                {formatPrice(selectedItem.price)}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!selectedItem}>
            Continue to Booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


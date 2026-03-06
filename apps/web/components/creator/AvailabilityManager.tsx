'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, X, Plus } from 'lucide-react';
import {
  addAvailabilityDate,
  removeAvailabilityDate,
  getAvailabilityDates,
} from '@/lib/actions/availability';
import { createClient } from '@/lib/supabase/client';
import { prisma } from '@foleio/database';

interface AvailabilityDate {
  id: string;
  date: Date;
  isAvailable: boolean;
  maxBookings: number | null;
}

export function AvailabilityManager() {
  const [dates, setDates] = useState<AvailabilityDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  useEffect(() => {
    loadCreatorAndDates();
  }, []);

  async function loadCreatorAndDates() {
    setIsLoading(true);
    try {
      // Get creator ID from session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      // Fetch creator ID
      const response = await fetch('/api/creator/me');
      if (response.ok) {
        const data = await response.json();
        if (data.creator?.id) {
          setCreatorId(data.creator.id);
          await loadDates(data.creator.id);
        }
      }
    } catch (error) {
      console.error('Error loading creator:', error);
    }
    setIsLoading(false);
  }

  async function loadDates(id?: string) {
    const cId = id || creatorId;
    if (!cId) return;
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3); // Next 3 months
    
    const result = await getAvailabilityDates(cId, startDate, endDate);
    if (result.success && result.data) {
      setDates(result.data);
    }
  }

  async function handleAddDate() {
    if (!selectedDate) return;
    
    setIsAdding(true);
    try {
      const date = new Date(selectedDate);
      const result = await addAvailabilityDate(date);
      if (result.success) {
        await loadDates();
        setSelectedDate('');
      }
    } catch (error) {
      console.error('Error adding date:', error);
    }
    setIsAdding(false);
  }

  async function handleRemoveDate(date: Date) {
    try {
      const result = await removeAvailabilityDate(date);
      if (result.success) {
        await loadDates();
      }
    } catch (error) {
      console.error('Error removing date:', error);
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const today = new Date().toISOString().split('T')[0];

  // Group dates by month
  const groupedDates = dates.reduce((acc, d) => {
    const monthYear = new Date(d.date).toLocaleDateString('en-NG', {
      month: 'long',
      year: 'numeric',
    });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(d);
    return acc;
  }, {} as Record<string, AvailabilityDate[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Availability
        </CardTitle>
        <CardDescription>
          Set the dates you&apos;re available for bookings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new date */}
        <div className="flex gap-2">
          <input
            type="date"
            min={today}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button onClick={handleAddDate} disabled={!selectedDate || isAdding}>
            <Plus className="h-4 w-4 mr-2" />
            {isAdding ? 'Adding...' : 'Add Date'}
          </Button>
        </div>

        {/* Available dates list */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading availability...
          </div>
        ) : dates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No available dates set.</p>
            <p className="text-sm">Add dates when you&apos;re available for bookings.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedDates).map(([monthYear, monthDates]) => (
              <div key={monthYear}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  {monthYear}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {monthDates.map((d) => (
                    <Badge
                      key={d.id}
                      variant="secondary"
                      className="flex items-center gap-1 px-3 py-1.5"
                    >
                      {formatDate(d.date)}
                      <button
                        onClick={() => handleRemoveDate(d.date)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {dates.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4">
            {dates.length} date{dates.length !== 1 ? 's' : ''} available for booking
          </p>
        )}
      </CardContent>
    </Card>
  );
}


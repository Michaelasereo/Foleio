'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Repeat,
  Settings,
  Plus,
  Trash2,
  Copy,
  Save,
  Check,
  X,
  Users,
  CheckCircle2
} from 'lucide-react';

interface Availability {
  id: string;
  date: string;
  isAvailable: boolean;
  maxBookings: number | null;
  notes?: string;
  bufferTime?: number; // minutes before/after bookings
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  maxBookings: number;
}

interface RecurringPattern {
  daysOfWeek: number[]; // 0-6, Sunday = 0
  timeSlots: TimeSlot[];
  isActive: boolean;
}

interface AvailabilityManagerProps {
  creatorId: string;
  availability: Availability[];
}

export function AvailabilityManager({ creatorId, availability }: AvailabilityManagerProps) {
  console.log('AvailabilityManager received availability data:', availability);

  // Convert serialized dates back to Date objects with validation
  const initialProcessedAvailability = availability
    .filter(item => item.date && typeof item.date === 'string')
    .map(item => {
      try {
        const date = new Date(item.date);
        // Validate the date is not invalid
        if (isNaN(date.getTime())) {
          console.warn('Invalid date found in availability data:', item.date);
          return null;
        }
        return {
          ...item,
          date
        };
      } catch (error) {
        console.warn('Error parsing date in availability data:', item.date, error);
        return null;
      }
    })
    .filter((item): item is Availability => item !== null);

  const [processedAvailability, setProcessedAvailability] = useState<Availability[]>(initialProcessedAvailability);

  console.log('Initial processed availability:', initialProcessedAvailability);

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [singleSelectedDate, setSingleSelectedDate] = useState<Date | undefined>(new Date());
  const [currentAvailability, setCurrentAvailability] = useState<Availability | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple'>('single');

  useEffect(() => {
    if (selectionMode === 'single' && singleSelectedDate) {
      const dateStr = singleSelectedDate.toISOString().split('T')[0];
      const existing = processedAvailability.find(a => a.date.toISOString().split('T')[0] === dateStr);
      setCurrentAvailability(existing || null);
    } else if (selectionMode === 'multiple') {
      // For multiple selection, don't show individual date details
      setCurrentAvailability(null);
    }
  }, [singleSelectedDate, selectionMode, processedAvailability]);

  const handleToggleAvailability = async (isAvailable: boolean) => {
    if (selectionMode === 'single' && !singleSelectedDate) return;
    if (selectionMode === 'multiple' && selectedDates.length === 0) return;

    const datesToUpdate = selectionMode === 'single'
      ? [singleSelectedDate!]
      : selectedDates;

    if (datesToUpdate.length === 1) {
      setIsUpdating(true);
    } else {
      setIsBulkUpdating(true);
    }
    setMessage('');

    try {
      const dateStrings = datesToUpdate.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        console.log('Converting date:', date, 'to string:', dateStr);
        return dateStr;
      });

      console.log('Sending bulk update with dates:', dateStrings);

      const response = await fetch('/api/availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: dateStrings,
          isAvailable,
          maxBookings: isAvailable ? 5 : null // Default max bookings when available
        })
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        result = { error: 'Invalid response format' };
      }

      console.log('Bulk API response status:', response.status);
      console.log('Bulk API response body:', result);

      if (response.ok) {
        const count = result.updated || datesToUpdate.length;
        setMessage(isAvailable
          ? `${count} date${count > 1 ? 's' : ''} marked as available`
          : `${count} date${count > 1 ? 's' : ''} marked as unavailable`
        );

        // Update local state to reflect changes immediately
        if (selectionMode === 'single') {
          setCurrentAvailability(result.availability);
        } else {
          // Update the processedAvailability to reflect the bulk changes
          setProcessedAvailability(prev => {
            const updated = [...prev];
            datesToUpdate.forEach(date => {
              const dateStr = date.toISOString().split('T')[0];
              const existingIndex = updated.findIndex(item =>
                item.date.toISOString().split('T')[0] === dateStr
              );

              if (existingIndex >= 0) {
                // Update existing entry
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  isAvailable,
                  maxBookings: isAvailable ? 5 : null
                };
              } else {
                // Add new entry with temporary ID
                updated.push({
                  id: `bulk-${dateStr}`,
                  date,
                  isAvailable,
                  maxBookings: isAvailable ? 5 : null
                });
              }
            });
            return updated;
          });

          // Clear selections after showing success
          setTimeout(() => {
            setSelectedDates([]);
            setMessage('');
          }, 3000);
        }
      } else {
        console.error('Bulk update failed:', result);
        setMessage(result.error || 'Failed to update availability. Please check your authentication.');
      }
    } catch (error) {
      setMessage('An unexpected error occurred');
    } finally {
      setIsUpdating(false);
      setIsBulkUpdating(false);
    }
  };

  const getAvailabilityForDate = (date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const result = processedAvailability.find(a => {
        try {
          const aDateStr = a.date.toISOString().split('T')[0];
          const matches = aDateStr === dateStr;
          if (matches) {
            console.log('Found availability for date', dateStr, ':', a);
          }
          return matches;
        } catch (error) {
          console.warn('Error comparing date in availability data:', a.date, error);
          return false;
        }
      });
      if (!result) {
        console.log('No availability found for date', dateStr, 'in', processedAvailability.length, 'records');
      }
      return result;
    } catch (error) {
      console.warn('Error processing date for availability lookup:', date, error);
      return undefined;
    }
  };

  const handleModeSwitch = (mode: 'single' | 'multiple') => {
    setSelectionMode(mode);
    setSelectedDates([]);
    setMessage('');
  };

  const handleClearSelection = () => {
    setSelectedDates([]);
    setMessage('');
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate =>
      selectedDate.toDateString() === date.toDateString()
    );
  };

  const isDateInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Availability Management</h2>
        <p className="text-muted-foreground">
          Set your available dates for customer bookings
        </p>
      </div>

      {/* Selection Mode Tabs */}
      <Tabs value={selectionMode} onValueChange={(value) => handleModeSwitch(value as 'single' | 'multiple')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Single Date</TabsTrigger>
          <TabsTrigger value="multiple">Multi-Select</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar - Single Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Select Date
                </CardTitle>
                <CardDescription>
                  Click on a date to manage availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={singleSelectedDate}
                  onSelect={setSingleSelectedDate}
                  disabled={isDateInPast}
                  modifiers={{
                    available: (date) => {
                      try {
                        const avail = getAvailabilityForDate(date);
                        return avail?.isAvailable || false;
                      } catch (error) {
                        console.warn('Error checking availability for date:', date, error);
                        return false;
                      }
                    },
                    unavailable: (date) => {
                      try {
                        const avail = getAvailabilityForDate(date);
                        return avail && !avail.isAvailable;
                      } catch (error) {
                        console.warn('Error checking unavailability for date:', date, error);
                        return false;
                      }
                    }
                  }}
                  modifiersClassNames={{
                    available: 'bg-green-100 text-green-900',
                    unavailable: 'bg-red-100 text-red-900'
                  }}
                  className="rounded-md border"
                />

                <div className="mt-4 flex gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 rounded"></div>
                    <span>Unavailable</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="multiple" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar - Multi-Select Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Select Multiple Dates
                </CardTitle>
                <CardDescription>
                  Click dates to select/deselect them for bulk operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  disabled={isDateInPast}
                    modifiers={{
                      available: (date) => {
                        try {
                          const avail = getAvailabilityForDate(date);
                          return avail?.isAvailable || false;
                        } catch (error) {
                          console.warn('Error checking availability for date:', date, error);
                          return false;
                        }
                      },
                      unavailable: (date) => {
                        try {
                          const avail = getAvailabilityForDate(date);
                          return avail && !avail.isAvailable;
                        } catch (error) {
                          console.warn('Error checking unavailability for date:', date, error);
                          return false;
                        }
                      },
                      selected: (date) => {
                        try {
                          return isDateSelected(date);
                        } catch (error) {
                          console.warn('Error checking date selection:', date, error);
                          return false;
                        }
                      }
                    }}
                  modifiersClassNames={{
                    available: 'bg-green-100 text-green-900',
                    unavailable: 'bg-red-100 text-red-900',
                    selected: 'bg-blue-100 text-blue-900 border-blue-300'
                  }}
                  className="rounded-md border"
                />

                <div className="mt-4 space-y-2">
                  <div className="flex gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-100 rounded"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-100 rounded"></div>
                      <span>Unavailable</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                      <span>Selected</span>
                    </div>
                  </div>

                  {selectedDates.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearSelection}
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Selected: {selectedDates
                          .sort((a, b) => a.getTime() - b.getTime())
                          .map(date => date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          }))
                          .join(', ')
                        }
                      </div>
                    </div>
                  )}

                  {selectedDates.length === 0 && (
                    <div className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-lg">
                      Click on dates in the calendar above to select them for bulk operations.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Date Details & Controls */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectionMode === 'single' ? (
              singleSelectedDate ? singleSelectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Select a Date'
            ) : (
              selectedDates.length > 0
                ? `${selectedDates.length} Date${selectedDates.length > 1 ? 's' : ''} Selected`
                : 'Bulk Availability Management'
            )}
          </CardTitle>
          <CardDescription>
            {selectionMode === 'single'
              ? 'Manage availability for this date'
              : 'Set availability for multiple dates at once'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectionMode === 'single' && singleSelectedDate && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant={currentAvailability?.isAvailable ? 'default' : 'secondary'}>
                  {currentAvailability?.isAvailable ? 'Available' : 'Unavailable'}
                </Badge>
                {currentAvailability?.maxBookings && (
                  <Badge variant="outline">
                    Max {currentAvailability.maxBookings} bookings
                  </Badge>
                )}
              </div>

                {message && (
                  <Alert className={message.includes('marked as') ? 'border-green-200 bg-green-50' : ''}>
                    <div className="flex items-center gap-2">
                      {message.includes('marked as') && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      <AlertDescription className={message.includes('marked as') ? 'text-green-800' : ''}>
                        {message}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                <div className="flex gap-3">
                <Button
                  onClick={() => handleToggleAvailability(true)}
                  disabled={isUpdating || isDateInPast(singleSelectedDate)}
                  className="flex-1"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Mark Available
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleToggleAvailability(false)}
                  disabled={isUpdating || isDateInPast(singleSelectedDate)}
                  className="flex-1"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Mark Unavailable
                </Button>
              </div>

              {isDateInPast(singleSelectedDate) && (
                <Alert>
                  <AlertDescription>
                    Cannot modify availability for past dates.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {selectionMode === 'multiple' && (
              <>
                {message && (
                  <Alert className={message.includes('marked as') ? 'border-green-200 bg-green-50' : ''}>
                    <div className="flex items-center gap-2">
                      {message.includes('marked as') && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      <AlertDescription className={message.includes('marked as') ? 'text-green-800 font-medium' : ''}>
                        {message}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {selectedDates.length === 0
                    ? 'Select dates on the calendar to perform bulk operations'
                    : `${selectedDates.length} date${selectedDates.length > 1 ? 's' : ''} ready for bulk update`
                  }
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleToggleAvailability(true)}
                    disabled={isBulkUpdating || selectedDates.length === 0}
                    className="flex-1"
                  >
                    {isBulkUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Set All Available
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleToggleAvailability(false)}
                    disabled={isBulkUpdating || selectedDates.length === 0}
                    className="flex-1"
                  >
                    {isBulkUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Set All Unavailable
                  </Button>
                </div>

                {selectedDates.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Selected dates: {selectedDates.map(date =>
                      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    ).join(', ')}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Availability Overview</CardTitle>
          <CardDescription>Your current availability status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {processedAvailability.filter(a => a.isAvailable).length}
              </div>
              <div className="text-sm text-gray-500">Available Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {processedAvailability.filter(a => !a.isAvailable).length}
              </div>
              <div className="text-sm text-gray-500">Unavailable Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {processedAvailability.length}
              </div>
              <div className="text-sm text-gray-500">Total Configured</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

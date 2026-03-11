'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function AddDummyDataPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAddDummyData() {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/add-dummy-data', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add dummy data');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Add Dummy Data</h1>
        <p className="text-muted-foreground">
          Add sample data to preview your creator profile
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dummy Data Generator</CardTitle>
          <CardDescription>
            This will add:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>2 Services (Full Makeup Application, Bridal Makeup Package)</li>
              <li>4 Creator Links (Instagram, TikTok, YouTube, Services)</li>
              <li>3 Tutorial Videos</li>
              <li>2 Regular Content Items</li>
              <li>1 Intro Video (set to first tutorial)</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleAddDummyData}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Dummy Data...
              </>
            ) : (
              'Add Dummy Data'
            )}
          </Button>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">Error</p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">Success!</p>
              </div>
              <div className="text-sm text-green-800 space-y-1">
                <p>✅ Services: {result.data?.priceListItems || 0}</p>
                <p>✅ Creator Links: {result.data?.links || 0}</p>
                <p>✅ Tutorial Videos: {result.data?.tutorials || 0}</p>
                <p>✅ Regular Content: {result.data?.regularContent || 0}</p>
                <p>✅ Intro Video: {result.data?.introVideoSet ? 'Set' : 'Already exists'}</p>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.href = '/creator/shosglam'}
              >
                View Public Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


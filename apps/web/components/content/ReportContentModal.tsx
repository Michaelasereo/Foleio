'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const REASONS = [
  'Sexually explicit content',
  'Spam or misleading',
  'Harmful or dangerous',
  'Copyright violation',
  'Other',
];

export function ReportContentModal({
  open,
  onOpenChange,
  contentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submitReport() {
    if (!reason) {
      setError('Please select a reason');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/content/${contentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          details: details.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setReason('');
      setDetails('');
      setEmail('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Details (optional)</Label>
            <Textarea
              value={details}
              onChange={(event) => setDetails(event.target.value.slice(0, 200))}
              placeholder="Add more context (max 200 chars)"
            />
          </div>

          <div className="space-y-2">
            <Label>Email (optional)</Label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Get notified of outcome"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button onClick={submitReport} disabled={loading} className="w-full">
            {loading ? 'Submitting...' : 'Submit report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

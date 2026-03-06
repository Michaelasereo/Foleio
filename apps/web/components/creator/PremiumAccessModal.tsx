'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, KeyRound, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DefaultThumbnail } from '@/components/ui/DefaultThumbnail';

interface Content {
  id: string;
  title: string;
  description: string | null;
  type: string;
  thumbnailUrl: string | null;
}

interface PremiumAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: Content;
  creatorName: string;
  onVerified: (contentId: string) => void;
}

type Step = 'enter_email' | 'enter_code' | 'verifying' | 'success' | 'error';

export function PremiumAccessModal({
  open,
  onOpenChange,
  content,
  creatorName,
  onVerified,
}: PremiumAccessModalProps) {
  const [step, setStep] = useState<Step>('enter_email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/premium/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      toast({
        title: 'Code Sent!',
        description: 'Check your email for the verification code',
      });
      
      setStep('enter_code');
    } catch (error) {
      console.error('Send code error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send code');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send verification code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter the 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setStep('verifying');
    setErrorMessage('');

    try {
      const response = await fetch('/api/premium/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          email,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setStep('success');
      
      // Notify parent of successful verification
      setTimeout(() => {
        onVerified(content.id);
      }, 1500);

    } catch (error) {
      console.error('Verify code error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Verification failed');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setStep('enter_code');
    setCode('');
    setErrorMessage('');
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/premium/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend code');
      }

      toast({
        title: 'Code Resent!',
        description: 'Check your email for the new verification code',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && step !== 'verifying') {
      setStep('enter_email');
      setEmail('');
      setCode('');
      setErrorMessage('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            Premium Content
          </DialogTitle>
          <DialogDescription>
            Verify your email to access &ldquo;{content.title}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Enter Email */}
        {step === 'enter_email' && (
          <form onSubmit={handleSendCode} className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                {content.thumbnailUrl && (
                  <img src={content.thumbnailUrl} alt={content.title} className="w-16 h-12 object-cover rounded" />
                )}
                {!content.thumbnailUrl && (
                  <div className="w-16 overflow-hidden rounded">
                    <DefaultThumbnail title={content.title} size="sm" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{content.title}</p>
                  <p className="text-xs text-muted-foreground">{creatorName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll send a verification code to this email
              </p>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 2: Enter Code */}
        {step === 'enter_code' && (
          <form onSubmit={handleVerifyCode} className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                We sent a code to <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
                required
              />
              <p className="text-xs text-muted-foreground text-center">
                Code expires in 15 minutes
              </p>
            </div>

            <DialogFooter className="flex-col gap-2">
              <Button type="submit" disabled={isLoading || code.length !== 6} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Verify Code
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleResendCode}
                disabled={isLoading}
                className="w-full"
              >
                Didn&apos;t receive code? Resend
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Verifying State */}
        {step === 'verifying' && (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Verifying your code...</p>
          </div>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-4 font-semibold">Access Granted!</p>
            <p className="text-sm text-muted-foreground">Loading your content...</p>
          </div>
        )}

        {/* Error State */}
        {step === 'error' && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <p className="mt-4 font-semibold">Verification Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
            </div>
            <DialogFooter className="flex-col gap-2">
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              <Button variant="ghost" onClick={handleResendCode} disabled={isLoading} className="w-full">
                {isLoading ? 'Sending...' : 'Resend Code'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


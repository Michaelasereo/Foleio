'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Compass,
  LayoutTemplate,
  User,
  Wallet,
} from 'lucide-react';
import { createCreatorProfile } from '@/lib/actions/creator';
import { AuthLumaLayout } from '@/components/auth/AuthLumaLayout';
import {
  authButtonClass,
  authCss,
  authMutedClass,
} from '@/components/auth/styles';
import { INDUSTRY_OPTIONS } from '@/lib/constants/industries';
import { useToast } from '@/components/ui/use-toast';

const USE_CASES = [
  { value: 'bookings', label: 'Bookings', icon: CalendarDays },
  { value: 'earnings', label: 'Manage earnings', icon: Wallet },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'portfolio', label: 'Portfolio', icon: LayoutTemplate },
  { value: 'discover', label: 'Get discovered', icon: Compass },
] as const;

const STEP_TITLES = [
  'What do you want to use Foleio for mostly?',
  'What is your business category?',
  'Claim your username',
] as const;

function normalizeUsername(raw: string) {
  return raw
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 30);
}

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [useCases, setUseCases] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

  useEffect(() => {
    async function validateOnboardingAccess() {
      const params = new URLSearchParams(window.location.search);
      const isPreview = params.get('preview') === '1';
      const previewStep = Number(params.get('step') || '1');

      if (isPreview) {
        if (previewStep >= 1 && previewStep <= 3) {
          setStep(previewStep);
        }
        setIsCheckingAccess(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/onboarding-status', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          router.replace('/login');
          return;
        }

        const data: {
          authenticated?: boolean;
          hasCompletedOnboarding?: boolean;
        } = await response.json();

        if (!data.authenticated) {
          router.replace('/login');
          return;
        }

        if (data.hasCompletedOnboarding) {
          router.replace('/dashboard');
          return;
        }

        // Prefill username from signup metadata when available
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const metaUsername = user?.user_metadata?.username;
        if (typeof metaUsername === 'string' && metaUsername) {
          setUsername(normalizeUsername(metaUsername));
        }
      } catch {
        router.replace('/login');
        return;
      } finally {
        setIsCheckingAccess(false);
      }
    }

    void validateOnboardingAccess();
  }, [router]);

  useEffect(() => {
    const claimed = normalizeUsername(username);
    if (claimed.length < 3) {
      setUsernameAvailable(false);
      setUsernameChecking(false);
      setUsernameStatus(claimed.length === 0 ? 'idle' : 'invalid');
      return;
    }

    setUsernameChecking(true);
    setUsernameStatus('checking');
    setUsernameAvailable(false);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(claimed)}`
        );
        const data = (await res.json()) as {
          available?: boolean;
          reason?: string;
        };
        if (data.available) {
          setUsernameAvailable(true);
          setUsernameStatus('available');
        } else {
          setUsernameAvailable(false);
          setUsernameStatus(data.reason === 'invalid' ? 'invalid' : 'taken');
        }
      } catch {
        setUsernameAvailable(false);
        setUsernameStatus('idle');
      } finally {
        setUsernameChecking(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [username]);

  function toggleUseCase(value: string) {
    setUseCases((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  async function handleComplete() {
    const claimed = normalizeUsername(username);
    if (claimed.length < 3) {
      toast({
        title: 'Username required',
        description: 'Use at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const isPreview =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('preview') === '1';

      if (isPreview) {
        toast({
          title: 'Preview mode',
          description: 'Onboarding submit is disabled in preview.',
        });
        return;
      }

      const result: {
        success?: boolean;
        error?: string;
      } = await createCreatorProfile(
        {
          displayName: claimed,
          username: claimed,
          category: category || 'other',
          useCases,
          bio: '',
        },
        { skipBankSetup: true },
        {
          planName: 'Basic Plan',
          planPrice: 5000,
          planDescription: '',
          planFeatures: [],
        },
        { platformPlan: 'starter' }
      );

      if (!result?.success) {
        toast({
          title: 'Could not finish setup',
          description: result?.error || 'Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const completeResponse = await fetch('/api/creator/complete-onboarding', {
        method: 'POST',
      });

      if (!completeResponse.ok) {
        throw new Error('Failed to complete onboarding');
      }

      toast({
        title: 'You are in',
        description: 'Your Foleio profile is ready.',
      });
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingAccess) {
    return (
      <div className="foleio-auth-root flex min-h-screen items-center justify-center">
        <style dangerouslySetInnerHTML={{ __html: authCss }} />
        <p className={authMutedClass}>Loading…</p>
      </div>
    );
  }

  return (
    <AuthLumaLayout title={STEP_TITLES[step - 1]}>
      <div className="foleio-onboard-progress" aria-hidden>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`foleio-onboard-progress-seg${n <= step ? ' is-active' : ''}`}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="foleio-onboard-chips" role="group" aria-label="Use cases">
          {USE_CASES.map((item) => {
            const Icon = item.icon;
            const selected = useCases.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                className={`foleio-onboard-chip${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() => toggleUseCase(item.value)}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="foleio-onboard-chips" role="group" aria-label="Business category">
          {INDUSTRY_OPTIONS.map((item) => {
            const selected = category === item.value;
            return (
              <button
                key={item.value}
                type="button"
                className={`foleio-onboard-chip${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() => setCategory(item.value)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {step === 3 ? (
        <div>
          <div className="foleio-onboard-username">
            <User className="foleio-auth-row-icon ml-3 h-5 w-5" strokeWidth={1.5} />
            <span className="foleio-onboard-username-prefix">@</span>
            <input
              className="foleio-onboard-username-input"
              placeholder="yourname"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
            />
              {usernameAvailable ? (
              <BadgeCheck
                className="foleio-onboard-username-verified h-5 w-5"
                strokeWidth={1.5}
                aria-label="Username available"
              />
            ) : null}
          </div>
          <p className="foleio-onboard-hint">
            {usernameStatus === 'taken'
              ? 'That username is taken. Try another.'
              : usernameStatus === 'invalid'
                ? 'Use at least 3 letters, numbers, hyphens, or underscores.'
                : usernameChecking
                  ? 'Checking availability…'
                  : `This will be your public link: foleio.com/creator/@${username || 'yourname'}`}
          </p>
        </div>
      ) : null}

      <div className="foleio-onboard-actions">
        {step > 1 ? (
          <button
            type="button"
            className="foleio-onboard-back"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </button>
        ) : null}

        {step < 3 ? (
          <button
            type="button"
            className={authButtonClass}
            disabled={
              (step === 1 && useCases.length === 0) ||
              (step === 2 && !category)
            }
            onClick={() => setStep((s) => Math.min(3, s + 1))}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className={authButtonClass}
            disabled={
              isLoading ||
              normalizeUsername(username).length < 3 ||
              !usernameAvailable
            }
            onClick={() => void handleComplete()}
          >
            {isLoading ? 'Finishing…' : 'Finish setup'}
          </button>
        )}
      </div>
    </AuthLumaLayout>
  );
}

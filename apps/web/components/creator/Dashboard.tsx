'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  DollarSign,
  Package,
} from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { WelcomeModal } from '@/components/creator/WelcomeModal';
import { OnboardingGateModal } from '@/components/creator/OnboardingGateModal';
import { TourTooltip, type TourStep } from '@/components/onboarding/TourTooltip';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import { getCreatorPlan } from '@/lib/utils/plan-limits';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

type UpcomingBooking = {
  id: string;
  customerName: string;
  bookingDate: string | Date;
  totalAmount: number;
  status: string;
  priceListItem?: { name: string } | null;
};

interface CreatorDashboardProps {
  creator: any;
  profileIncomplete?: boolean;
  analytics: any;
  bookingStats: {
    totalBookings: number;
    upcomingBookings: number;
  };
  upcomingBookings: UpcomingBooking[];
}

export function CreatorDashboard({
  creator,
  profileIncomplete = false,
  analytics,
  bookingStats,
  upcomingBookings,
}: CreatorDashboardProps) {
  const [creatorState, setCreatorState] = useState(creator);
  const { isOpen, limitType, closeUpgradeModal } = useUpgradeModal();
  const { isActive, currentStep, startTour, nextStep, skipTour, completeTour } =
    useOnboardingTour();
  const hasStartedTourRef = useRef(false);
  const currentPlan = getCreatorPlan(creatorState.platformPlan ?? null);

  const tourSteps = useMemo<TourStep[]>(
    () => [
      {
        target: '[data-tour="dashboard"]',
        text: 'This is your home base. See your bookings, earnings, and performance at a glance.',
        position: 'bottom',
      },
      {
        target: '[data-tour="earnings"]',
        text: 'Track revenue, open Analytics from the Earnings tab, and connect your bank so payments can settle to you.',
        position: 'bottom',
      },
      {
        target: '[data-tour="creator-profile"]',
        text: "Update your profile photo and share your profile card with your audience.",
        position: 'right',
      },
    ],
    []
  );

  useEffect(() => {
    const shouldStartTour =
      !profileIncomplete &&
      Boolean(creatorState.hasSeenWelcome) &&
      !Boolean(creatorState.hasCompletedTour);

    if (!shouldStartTour || hasStartedTourRef.current) return;

    const timer = window.setTimeout(() => {
      startTour();
      hasStartedTourRef.current = true;
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    creatorState.hasCompletedTour,
    creatorState.hasSeenWelcome,
    profileIncomplete,
    startTour,
  ]);

  const formatChange = (change: string | null | undefined) => {
    if (!change) return { text: '—', tone: '' };
    if (change.startsWith('+')) return { text: change, tone: 'is-up' };
    if (change.startsWith('-')) return { text: change, tone: 'is-down' };
    return { text: change, tone: '' };
  };

  const handleSkipTour = () => {
    void skipTour();
    setCreatorState((prev: any) => ({
      ...prev,
      hasCompletedTour: true,
    }));
  };

  const handleCompleteTour = () => {
    void completeTour();
    setCreatorState((prev: any) => ({
      ...prev,
      hasCompletedTour: true,
    }));
  };

  const stats = [
    {
      title: 'Total Bookings',
      value: Number(bookingStats?.totalBookings || 0).toLocaleString(),
      change: null as string | null,
      icon: CalendarDays,
    },
    {
      title: 'Total Earnings',
      value: formatNaira(Number(analytics?.totalRevenue || 0) / 100),
      change: analytics?.percentageChanges?.earnings || null,
      icon: DollarSign,
    },
    {
      title: 'Upcoming Bookings',
      value: Number(bookingStats?.upcomingBookings || 0).toLocaleString(),
      change: null as string | null,
      icon: CalendarClock,
    },
    {
      title: 'Total products sold',
      value:
        analytics?.shopSetup === true
          ? Number(analytics?.productsSold || 0).toLocaleString()
          : 'N/A',
      change: null as string | null,
      icon: Package,
    },
  ];

  return (
    <div>
      {profileIncomplete ? (
        <OnboardingGateModal open userEmail={creatorState?.email || undefined} />
      ) : null}
      {!profileIncomplete && !creatorState.hasSeenWelcome ? (
        <WelcomeModal
          creator={creatorState}
          onClose={() =>
            setCreatorState((prev: any) => ({
              ...prev,
              hasSeenWelcome: true,
            }))
          }
        />
      ) : null}

      <div className="foleio-dash-header">
        <h1 className="foleio-auth-title">
          Welcome back, {creatorState.displayName}
        </h1>
      </div>

      <div className="foleio-dash-stats">
        {stats.map((stat) => {
          const change = formatChange(stat.change);
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="foleio-dash-stat">
              <div className="foleio-dash-stat-top">
                <span className="foleio-dash-stat-label">{stat.title}</span>
                <Icon className="foleio-dash-stat-icon h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="foleio-dash-stat-value">{stat.value}</div>
              {stat.change !== null ? (
                <p className={`foleio-dash-stat-change ${change.tone}`}>
                  {change.text} from last month
                </p>
              ) : (
                <p className="foleio-dash-stat-change">This account</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="foleio-dash-panel">
        <h2 className="foleio-dash-panel-title">Upcoming bookings this month</h2>
        <p className="foleio-dash-panel-meta">
          {upcomingBookings.length > 0
            ? `Showing your next ${Math.min(upcomingBookings.length, 2)}`
            : 'Your next bookings will show here'}
        </p>
        {upcomingBookings.length === 0 ? (
          <p className="foleio-dash-empty">No upcoming bookings this month.</p>
        ) : (
          upcomingBookings.slice(0, 2).map((booking) => (
            <div key={booking.id} className="foleio-dash-sub-row">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="foleio-dash-sub-name truncate">
                  {booking.customerName}
                </span>
                <span className="foleio-dash-sub-badge w-fit">
                  {booking.priceListItem?.name || 'Booking'}
                </span>
              </div>
              <div className="text-right">
                <div className="foleio-dash-sub-date">
                  {new Date(booking.bookingDate).toLocaleDateString()}
                </div>
                <div className="foleio-dash-sub-name mt-1">
                  {formatNaira(Number(booking.totalAmount || 0) / 100)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {limitType ? (
        <UpgradeModal
          isOpen={isOpen}
          onClose={closeUpgradeModal}
          limitType={limitType}
          currentPlan={currentPlan}
        />
      ) : null}
      {isActive ? (
        <TourTooltip
          steps={tourSteps}
          currentStep={currentStep}
          onNext={() => nextStep(tourSteps.length)}
          onSkip={handleSkipTour}
          onDone={handleCompleteTour}
        />
      ) : null}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, ArrowRight, CheckCircle } from 'lucide-react';

interface OnboardingPromptProps {
  userEmail: string;
  completedSteps?: number;
  totalSteps?: number;
}

export function OnboardingPrompt({
  userEmail,
  completedSteps = 0,
  totalSteps = 4
}: OnboardingPromptProps) {
  const router = useRouter();

  const handleStartOnboarding = () => {
    router.push('/onboard');
  };

  const handleContinueOnboarding = () => {
    router.push('/onboard');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Foleio! 🎉
        </h1>
        <p className="text-lg text-gray-600">
          You're logged in as <span className="font-medium text-primary">{userEmail}</span>
        </p>
        <p className="text-gray-500 mt-2">
          Complete your creator setup to start monetizing your content
        </p>
      </div>

      {/* Onboarding Progress Card */}
      <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {completedSteps > 0 ? 'Continue Your Setup' : 'Complete Your Creator Profile'}
          </CardTitle>
          <CardDescription className="text-base">
            {completedSteps > 0
              ? `You've completed ${completedSteps} of ${totalSteps} steps.`
              : 'Set up your creator account to unlock all features.'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Indicator */}
          {completedSteps > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Setup Progress</span>
                <span>{completedSteps}/{totalSteps} steps</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Setup Benefits */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900">Monetize Your Content</h4>
                <p className="text-sm text-gray-600">Set up subscription plans and earn from your audience</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900">Custom Profile</h4>
                <p className="text-sm text-gray-600">Create your professional creator profile and branding</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900">Payment Integration</h4>
                <p className="text-sm text-gray-600">Connect your bank account for instant payouts</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900">Analytics Dashboard</h4>
                <p className="text-sm text-gray-600">Track your growth and earnings in real-time</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={completedSteps > 0 ? handleContinueOnboarding : handleStartOnboarding}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg font-medium"
            >
              {completedSteps > 0 ? 'Continue Setup' : 'Start Creator Setup'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/')}
              size="lg"
              className="px-8 py-3 text-lg"
            >
              Browse Content First
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              Takes only 5-10 minutes to complete • All data is securely stored
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats (if any partial data exists) */}
      {completedSteps > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">{completedSteps}</div>
              <div className="text-sm text-gray-600">Steps Completed</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-500 mb-1">{totalSteps - completedSteps}</div>
              <div className="text-sm text-gray-600">Steps Remaining</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500 mb-1">5-10m</div>
              <div className="text-sm text-gray-600">Time to Complete</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

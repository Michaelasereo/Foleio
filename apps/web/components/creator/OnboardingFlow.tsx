'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Palette, Link as LinkIcon, Upload, DollarSign } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete?: () => void;
  initialData?: {
    username?: string;
    displayName?: string;
    bio?: string;
    category?: string;
    instagramHandle?: string;
    tiktokHandle?: string;
  };
}

const steps = [
  {
    id: 'basics',
    title: 'Basic Information',
    description: 'Set up your creator profile basics',
    icon: User,
    fields: ['username', 'displayName', 'bio', 'category']
  },
  {
    id: 'social',
    title: 'Social Media',
    description: 'Connect your social media accounts',
    icon: LinkIcon,
    fields: ['instagramHandle', 'tiktokHandle']
  },
  {
    id: 'pricing',
    title: 'Pricing Setup',
    description: 'Set your subscription pricing (optional)',
    icon: DollarSign,
    fields: ['subscriptionPrice']
  }
];

export function OnboardingFlow({ onComplete, initialData = {} }: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(() => {
    // Try to restore step from localStorage
    if (typeof window !== 'undefined') {
      const savedStep = localStorage.getItem('onboarding-step');
      return savedStep ? parseInt(savedStep, 10) : 0;
    }
    return 0;
  });
  const [formData, setFormData] = useState({
    username: initialData.username || '',
    displayName: initialData.displayName || '',
    bio: initialData.bio || '',
    category: initialData.category || 'makeup',
    instagramHandle: initialData.instagramHandle || '',
    tiktokHandle: initialData.tiktokHandle || '',
    subscriptionPrice: 5000, // Default 50 NGN
    avatarUrl: '',
    bannerUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      localStorage.setItem('onboarding-step', nextStep.toString());
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      localStorage.setItem('onboarding-step', prevStep.toString());
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/creator/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        // Clear onboarding step from localStorage
        localStorage.removeItem('onboarding-step');

        // Show success message
        setSubmitMessage('Profile setup completed successfully! Redirecting to dashboard...');

        // Redirect to dashboard after successful onboarding
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh(); // Force refresh to update the UI
        }, 1500);

        // Also call onComplete if provided (for backward compatibility)
        if (onComplete) onComplete();
      } else {
        const errorData = await response.json();
        setSubmitMessage(`Error: ${errorData.error || 'Failed to update profile'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'basics':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="your_creator_name"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                This will be your unique URL: foleio.com/{formData.username || 'username'}
              </p>
            </div>

            <div>
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="Your Display Name"
                required
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell fans about yourself..."
                rows={3}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.bio.length}/160 characters
              </p>
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="makeup">Makeup Artist</option>
                <option value="hair">Hair Stylist</option>
                <option value="fashion">Fashion Designer</option>
                <option value="fitness">Fitness Coach</option>
                <option value="cooking">Chef/Cooking</option>
                <option value="music">Musician</option>
                <option value="art">Artist</option>
                <option value="photography">Photographer</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        );

      case 'social':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="instagramHandle">Instagram Handle</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                  @
                </span>
                <Input
                  id="instagramHandle"
                  value={formData.instagramHandle}
                  onChange={(e) => handleInputChange('instagramHandle', e.target.value)}
                  placeholder="your_instagram"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Link your Instagram for cross-promotion
              </p>
            </div>

            <div>
              <Label htmlFor="tiktokHandle">TikTok Handle</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                  @
                </span>
                <Input
                  id="tiktokHandle"
                  value={formData.tiktokHandle}
                  onChange={(e) => handleInputChange('tiktokHandle', e.target.value)}
                  placeholder="your_tiktok"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Connect your TikTok for viral content
              </p>
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="subscriptionPrice">Monthly Subscription Price (Optional)</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                  ₦
                </span>
                <Input
                  id="subscriptionPrice"
                  type="number"
                  value={formData.subscriptionPrice}
                  onChange={(e) => handleInputChange('subscriptionPrice', parseInt(e.target.value) || 0)}
                  placeholder="5000"
                  className="rounded-l-none"
                  min="1000"
                  max="100000"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Set your monthly subscription price (minimum ₦1,000) - you can set this up later
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Pricing Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Popular creators charge ₦2,000 - ₦10,000/month</li>
                <li>• You keep 70% of subscription revenue</li>
                <li>• You can change this anytime</li>
                <li>• Free content is still allowed</li>
              </ul>
            </div>
          </div>
        );

      case 'media':
        return (
          <div className="space-y-4">
            <div>
              <Label>Profile Picture</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">Upload your profile picture</p>
                <p className="text-sm text-gray-500">JPG, PNG up to 5MB</p>
                <Button variant="outline" className="mt-4">
                  Choose File
                </Button>
              </div>
            </div>

            <div>
              <Label>Banner Image</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">Upload your banner image</p>
                <p className="text-sm text-gray-500">JPG, PNG up to 10MB (recommended: 1200x400px)</p>
                <Button variant="outline" className="mt-4">
                  Choose File
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              You can skip these for now and upload them later from your dashboard.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Foleio! 🎉
          </h1>
          <p className="text-gray-600">
            Let's set up your creator profile in just a few steps
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-xs mt-1 ${
                  index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <currentStepData.icon className="w-6 h-6 text-blue-500" />
              <div>
                <CardTitle>{currentStepData.title}</CardTitle>
                <CardDescription>{currentStepData.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderStepContent()}

            {submitMessage && (
              <div className={`p-4 rounded-lg mt-6 ${submitMessage.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {submitMessage}
              </div>
            )}

            {currentStep === steps.length - 1 && (
              <p className="text-sm text-muted-foreground mt-6">
                By completing onboarding you agree to our{' '}
                <a href="/legal/terms" target="_blank" rel="noreferrer" className="text-primary underline">
                  Terms of Service
                </a>
                {' '}and{' '}
                <a href="/legal/creator-agreement" target="_blank" rel="noreferrer" className="text-primary underline">
                  Creator Agreement
                </a>
                .
              </p>
            )}

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                Back
              </Button>

              <Button
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {currentStep === steps.length - 1 ? (
                  isSubmitting ? 'Setting up...' : 'Complete Setup'
                ) : (
                  'Next'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

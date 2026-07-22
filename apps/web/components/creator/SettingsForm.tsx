'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateCreatorProfile } from '@/lib/actions/creator';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Camera, ImageIcon, Loader2, X } from 'lucide-react';

const profileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  bio: z.string().optional(),
  instagramHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface SettingsFormProps {
  creator: {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    instagramHandle: string | null;
    tiktokHandle: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
  };
  publicUrl?: string;
}

export function SettingsForm({ creator, publicUrl }: SettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(creator.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState<string | null>(creator.bannerUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: creator.username,
      displayName: creator.displayName,
      bio: creator.bio || '',
      instagramHandle: creator.instagramHandle || '',
      tiktokHandle: creator.tiktokHandle || '',
      avatarUrl: creator.avatarUrl || '',
      bannerUrl: creator.bannerUrl || '',
    },
  });

  async function uploadImage(file: File, type: 'avatar' | 'banner'): Promise<string | null> {
    try {
      console.log(`🔍 DEBUG: Starting ${type} upload`);
      console.log('File:', file.name, file.type, file.size, 'bytes');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type); // ✅ FIXED: Add missing type parameter

      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.type}, ${value.size} bytes)` : value);
      }

      const response = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      });

      console.log(`📊 Response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error('📋 API Error details:', errorData);
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
          console.error('📋 Raw error:', errorText);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Upload successful:', data);

      const imageUrl = data.data?.url;
      if (imageUrl) {
        console.log('🔗 Returned URL:', imageUrl);
        return imageUrl;
      } else {
        throw new Error('No URL returned from upload');
      }

    } catch (error: any) {
      console.error(`❌ Upload error for ${type}:`, error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingAvatar(true);
    const url = await uploadImage(file, 'avatar'); // ✅ FIXED: Pass type parameter
    if (url) {
      setAvatarUrl(url);
      form.setValue('avatarUrl', url);
    }
    setIsUploadingAvatar(false);
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 20MB for banner)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 20MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingBanner(true);
    const url = await uploadImage(file, 'banner'); // ✅ FIXED: Pass type parameter
    if (url) {
      setBannerUrl(url);
      form.setValue('bannerUrl', url);
    }
    setIsUploadingBanner(false);
  }

  function removeAvatar() {
    setAvatarUrl(null);
    form.setValue('avatarUrl', '');
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  }

  function removeBanner() {
    setBannerUrl(null);
    form.setValue('bannerUrl', '');
    if (bannerInputRef.current) {
      bannerInputRef.current.value = '';
    }
  }

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);
    try {
      const result = await updateCreatorProfile(creator.id, {
        ...data,
        avatarUrl: avatarUrl || undefined,
        bannerUrl: bannerUrl || undefined,
      });

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update profile',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your profile information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Banner Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Banner Image</label>
              <div 
                className="relative w-full h-32 md:h-40 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => bannerInputRef.current?.click()}
              >
                {bannerUrl ? (
                  <>
                    <img
                      src={bannerUrl}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBanner();
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    {isUploadingBanner ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 mb-2" />
                        <span className="text-sm">Click to upload banner image</span>
                        <span className="text-xs text-muted-foreground/70">Recommended: 1500x500px</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                  disabled={isUploadingBanner}
                />
              </div>
            </div>

            {/* Profile Picture Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile Picture</label>
              <div className="flex items-center gap-4">
                <div 
                  className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarUrl ? (
                    <>
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                      {isUploadingAvatar ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <span className="text-2xl font-bold">
                          {creator.displayName.charAt(0)}
                        </span>
                      )}
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Change Photo
                      </>
                    )}
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeAvatar}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="your-username" 
                      {...field}
                      onChange={(e) => {
                        // Convert to lowercase and replace spaces with hyphens
                        const value = e.target.value.toLowerCase().replace(/\s+/g, '-');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Your profile URL: {publicUrl ? publicUrl.split('/').slice(0, -1).join('/') : ''}/{field.value || 'username'}
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your display name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagramHandle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram Handle</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="@username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tiktokHandle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TikTok Handle</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="@username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading || isUploadingAvatar || isUploadingBanner}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

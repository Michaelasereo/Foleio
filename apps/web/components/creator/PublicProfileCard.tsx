'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Check } from 'lucide-react';
import { ProfileCardModal } from '@/components/creator/ProfileCardModal';

interface PublicProfileCardProps {
  publicUrl: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

export function PublicProfileCard({
  publicUrl,
  username,
  displayName,
  avatarUrl,
  bio,
}: PublicProfileCardProps) {
  const [copied, setCopied] = useState(false);
  const [profileCardOpen, setProfileCardOpen] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Profile</CardTitle>
        <CardDescription>
          Share this link with your fans to let them view your profile and book your services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input value={publicUrl} readOnly className="flex-1 font-mono text-sm" />
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Preview
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Your username: <span className="font-mono">@{username}</span>
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => setProfileCardOpen(true)}>
            Create Profile Card
          </Button>
        </div>
      </CardContent>

      <ProfileCardModal
        open={profileCardOpen}
        onOpenChange={setProfileCardOpen}
        creator={{
          username,
          displayName,
          avatarUrl,
          bio,
        }}
      />
    </Card>
  );
}


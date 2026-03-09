'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import { Check, Download, Link2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShareCardPreview } from '@/components/journal/ShareCardPreview';
import { useToast } from '@/components/ui/use-toast';

type ShareTemplate = 'default' | 'dark' | 'minimal' | 'bold';

export function ShareCardModal({
  isOpen,
  onClose,
  entry,
  creator,
}: {
  isOpen: boolean;
  onClose: () => void;
  entry: {
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    coverImage?: string | null;
    readTime: number;
    tags?: string[];
  };
  creator: { displayName: string; username: string; avatarUrl?: string | null };
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<ShareTemplate>('default');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function handleDownload() {
    setDownloading(true);

    try {
      const element = document.getElementById('profile-card-download');
      if (!element) {
        throw new Error('Card preview not found');
      }

      const canvas = await html2canvas(element, {
        scale: 1080 / 240,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `foleio-${creator.username}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast({
        title: 'Card downloaded 🧡',
        description: 'Share it on Instagram Stories, WhatsApp Status or X',
      });
    } catch (_err) {
      toast({
        title: 'Download failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyLink() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const url = `${baseUrl}/creator/${creator.username}`;
    await navigator.clipboard.writeText(url);

    setCopied(true);
    toast({
      title: 'Link copied!',
      description: url,
    });

    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="sr-only">Share your entry</DialogTitle>
        <DialogDescription className="sr-only">
          Pick a template for your entry card, then download it or copy your profile link.
        </DialogDescription>
        <h3 className="mb-4 text-lg font-bold font-display">Share your entry</h3>

        <div className="mb-6 grid grid-cols-4 gap-3">
          {(['default', 'dark', 'minimal', 'bold'] as ShareTemplate[]).map((template) => (
            <button
              key={template}
              onClick={() => setSelectedTemplate(template)}
              className={`aspect-[1.91/1] overflow-hidden rounded-xl border-2 transition-all ${
                selectedTemplate === template
                  ? 'scale-105 border-primary shadow-lg'
                  : 'border-border hover:border-primary/50'
              }`}
              type="button"
            >
              <ShareCardPreview
                template={template}
                title={entry.title}
                creatorName={creator.displayName}
                readTime={entry.readTime}
                size="thumbnail"
              />
            </button>
          ))}
        </div>

        <div id="profile-card-download" className="mb-6 overflow-hidden rounded-2xl shadow-lg">
          <ShareCardPreview
            template={selectedTemplate}
            title={entry.title}
            subtitle={entry.subtitle}
            creatorName={creator.displayName}
            creatorAvatar={creator.avatarUrl}
            coverImage={entry.coverImage}
            readTime={entry.readTime}
            tags={entry.tags}
            size="full"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <Button onClick={handleDownload} disabled={downloading} className="flex-1">
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Card
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleCopyLink} className="flex-1">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Copy Profile Link
              </>
            )}
          </Button>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Card is 1080×1920px · perfect for Instagram Stories & WhatsApp Status
        </p>
      </DialogContent>
    </Dialog>
  );
}

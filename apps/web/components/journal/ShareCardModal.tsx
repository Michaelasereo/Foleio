'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Link2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShareCardPreview } from '@/components/journal/ShareCardPreview';

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

  async function handleDownloadCard() {
    const cardElement = document.getElementById('share-card');
    if (!cardElement) return;

    const canvas = await html2canvas(cardElement, {
      width: 1200,
      height: 628,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
    });

    const link = document.createElement('a');
    link.download = `${entry.slug}-share-card.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/creator/${creator.username}/journal/${entry.slug}`;
    await navigator.clipboard.writeText(url);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
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

        <div className="mb-6 overflow-hidden rounded-2xl shadow-lg">
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

        <div className="flex gap-3">
          <Button onClick={handleDownloadCard} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download Image
          </Button>
          <Button variant="outline" onClick={handleCopyLink} className="flex-1">
            <Link2 className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          1200×628px · Optimised for Instagram, X, WhatsApp, LinkedIn
        </p>
      </DialogContent>
    </Dialog>
  );
}

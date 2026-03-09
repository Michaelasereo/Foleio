'use client';

import { Check, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface CollectionInlineDetailsProps {
  collectionId: string;
  initialTitle: string;
  initialDescription: string | null;
}

export function CollectionInlineDetails({
  collectionId,
  initialTitle,
  initialDescription,
}: CollectionInlineDetailsProps) {
  const { toast } = useToast();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');

  const savePatch = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save');
    }
    toast({ title: 'Saved', description: 'Saved ✓' });
  };

  const handleSaveTitle = async () => {
    const next = title.trim();
    if (!next) {
      setTitle(initialTitle);
      setEditingTitle(false);
      return;
    }
    try {
      await savePatch({ title: next });
      setEditingTitle(false);
    } catch {
      setTitle(initialTitle);
      setEditingTitle(false);
    }
  };

  const handleSaveDescription = async () => {
    try {
      await savePatch({ description: description.trim() || null });
      setEditingDescription(false);
    } catch {
      setDescription(initialDescription ?? '');
      setEditingDescription(false);
    }
  };

  return (
    <div className="space-y-2">
      {editingTitle ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => void handleSaveTitle()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSaveTitle();
              if (event.key === 'Escape') {
                setTitle(initialTitle);
                setEditingTitle(false);
              }
            }}
            className="w-full max-w-md border-b-2 border-primary bg-transparent text-2xl font-bold outline-none"
          />
          <button onClick={() => void handleSaveTitle()} type="button">
            <Check className="h-5 w-5 text-green-600" />
          </button>
          <button onClick={() => setEditingTitle(false)} type="button">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div className="group flex items-center gap-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <button
            onClick={() => setEditingTitle(true)}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            type="button"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {editingDescription ? (
        <input
          autoFocus
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => void handleSaveDescription()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleSaveDescription();
            if (event.key === 'Escape') {
              setDescription(initialDescription ?? '');
              setEditingDescription(false);
            }
          }}
          className="w-full max-w-2xl border-b border-primary bg-transparent text-sm text-muted-foreground outline-none"
          placeholder="Add a collection description"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingDescription(true)}
          className="text-left text-muted-foreground hover:text-foreground"
        >
          {description || 'Add a collection description'}
        </button>
      )}
    </div>
  );
}

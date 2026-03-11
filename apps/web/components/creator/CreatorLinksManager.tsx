'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, GripVertical, Link, Instagram, Youtube, Twitter, FileText } from 'lucide-react';
import {
  createCreatorLink,
  updateCreatorLink,
  deleteCreatorLink,
  toggleCreatorLinkActive,
  getMyCreatorLinks,
} from '@/lib/actions/links';

const linkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url: z.string().min(1, 'URL is required'),
  linkType: z.enum(['instagram', 'tiktok', 'twitter', 'youtube', 'price_list', 'custom']),
});

type LinkInput = z.infer<typeof linkSchema>;

interface CreatorLink {
  id: string;
  label: string;
  url: string;
  linkType: string;
  icon: string | null;
  orderIndex: number;
  isActive: boolean;
}

const linkTypeOptions = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'tiktok', label: 'TikTok', icon: Link },
  { value: 'price_list', label: 'Services', icon: FileText },
  { value: 'custom', label: 'Custom Link', icon: Link },
];

function getLinkIcon(linkType: string) {
  const option = linkTypeOptions.find((o) => o.value === linkType);
  if (option) {
    const Icon = option.icon;
    return <Icon className="h-4 w-4" />;
  }
  return <Link className="h-4 w-4" />;
}

export function CreatorLinksManager() {
  const [links, setLinks] = useState<CreatorLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<CreatorLink | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<LinkInput>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      label: '',
      url: '',
      linkType: 'custom',
    },
  });

  const selectedLinkType = form.watch('linkType');

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    setIsLoading(true);
    const result = await getMyCreatorLinks();
    if (result.success && result.data) {
      setLinks(result.data);
    }
    setIsLoading(false);
  }

  async function onSubmit(data: LinkInput) {
    setIsSaving(true);
    try {
      if (editingLink) {
        await updateCreatorLink(editingLink.id, data);
      } else {
        await createCreatorLink(data);
      }
      await loadLinks();
      setIsDialogOpen(false);
      setEditingLink(null);
      form.reset();
    } catch (error) {
      console.error('Error saving link:', error);
    }
    setIsSaving(false);
  }

  async function handleDelete(linkId: string) {
    if (!confirm('Are you sure you want to delete this link?')) return;
    await deleteCreatorLink(linkId);
    await loadLinks();
  }

  async function handleToggleActive(linkId: string) {
    await toggleCreatorLinkActive(linkId);
    await loadLinks();
  }

  function openEditDialog(link: CreatorLink) {
    setEditingLink(link);
    form.reset({
      label: link.label,
      url: link.url,
      linkType: link.linkType as any,
    });
    setIsDialogOpen(true);
  }

  function openNewDialog() {
    setEditingLink(null);
    form.reset({
      label: '',
      url: '',
      linkType: 'custom',
    });
    setIsDialogOpen(true);
  }

  // Auto-fill URL pattern based on link type
  function handleLinkTypeChange(value: string) {
    form.setValue('linkType', value as any);
    
    if (value === 'price_list') {
      form.setValue('label', 'View Services');
      form.setValue('url', '#price-list'); // Special marker
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Links</CardTitle>
            <CardDescription>
              Add links to display on your public profile (like Linktree)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingLink ? 'Edit Link' : 'Add New Link'}
                </DialogTitle>
                <DialogDescription>
                  {editingLink
                    ? 'Update the link details below.'
                    : 'Add a new link to your profile.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="linkType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link Type</FormLabel>
                        <Select
                          onValueChange={handleLinkTypeChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select link type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {linkTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <option.icon className="h-4 w-4" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Follow me on Instagram" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {selectedLinkType !== 'price_list' && (
                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={
                                selectedLinkType === 'instagram'
                                  ? 'https://instagram.com/yourhandle'
                                  : 'https://...'
                              }
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Full URL including https://
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {selectedLinkType === 'price_list' && (
                    <p className="text-sm text-muted-foreground">
                      This will open your services modal on your public profile.
                    </p>
                  )}
                  <DialogFooter>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? 'Saving...' : editingLink ? 'Update' : 'Add Link'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No links added yet.</p>
            <p className="text-sm">Add links to your social profiles and important pages.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  link.isActive ? 'bg-background' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div className="flex items-center gap-2">
                    {getLinkIcon(link.linkType)}
                    <div>
                      <span className="font-medium">{link.label}</span>
                      {link.url !== '#price-list' && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {link.url}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={link.isActive}
                    onCheckedChange={() => handleToggleActive(link.id)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(link)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, X, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { createSection, addContentToSection } from '@/lib/actions/collection';
import { useRouter } from 'next/navigation';

interface Section {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  parentSectionId: string | null;
  subsections: Array<{
    id: string;
    title: string;
    description: string | null;
    orderIndex: number;
    sectionContents: Array<{
      id: string;
      orderIndex: number;
      content: {
        id: string;
        title: string;
        type: string;
      };
    }>;
  }>;
  sectionContents: Array<{
    id: string;
    orderIndex: number;
    content: {
      id: string;
      title: string;
      type: string;
    };
  }>;
}

interface CollectionSectionManagerProps {
  collectionId: string;
  sections: Section[];
  collectionContent: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  allContent: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

export function CollectionSectionManager({
  collectionId,
  sections: initialSections,
  collectionContent,
  allContent,
}: CollectionSectionManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [sections, setSections] = useState(initialSections);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [creatingSection, setCreatingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  const [parentSectionId, setParentSectionId] = useState<string | undefined>(undefined);
  const [addingContent, setAddingContent] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string>('');

  const videosInSections = new Set<string>();
  for (const section of sections) {
    for (const sectionContent of section.sectionContents) {
      videosInSections.add(sectionContent.content.id);
    }
    for (const subsection of section.subsections) {
      for (const sectionContent of subsection.sectionContents) {
        videosInSections.add(sectionContent.content.id);
      }
    }
  }
  const unsectionedVideos = collectionContent.filter(
    (content) => !videosInSections.has(content.id)
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleCreateSection = async () => {
    if (!sectionTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Section title is required',
        variant: 'destructive',
      });
      return;
    }

    setCreatingSection(true);
    try {
      const result = await createSection({
        collectionId,
        parentSectionId: parentSectionId || undefined,
        title: sectionTitle,
        description: sectionDescription || undefined,
        orderIndex: sections.length,
      });

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create section',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Section created successfully!',
      });

      setSectionTitle('');
      setSectionDescription('');
      setParentSectionId(undefined);
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setCreatingSection(false);
    }
  };

  const handleAddContent = async (sectionId: string) => {
    if (!selectedContent) {
      toast({
        title: 'Error',
        description: 'Please select content to add',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await addContentToSection({
        sectionId,
        contentId: selectedContent,
        orderIndex: 0,
      });

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add content',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Content added to section!',
      });

      setSelectedContent('');
      setAddingContent(null);
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const renderSection = (section: Section, level = 0) => {
    const isExpanded = expandedSections.has(section.id);
    const hasSubsections = section.subsections.length > 0;
    const hasContent = section.sectionContents.length > 0;

    return (
      <div key={section.id} className={level > 0 ? 'ml-8 mt-4' : ''}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 flex-1">
                {hasSubsections && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection(section.id)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <div className="flex-1">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  {section.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {section.description}
                    </p>
                  )}
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingContent(section.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Content
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Content to Section</DialogTitle>
                    <DialogDescription>
                      Select content to add to this section
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Select
                      value={selectedContent}
                      onValueChange={setSelectedContent}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select content" />
                      </SelectTrigger>
                      <SelectContent>
                        {allContent.map((content) => (
                          <SelectItem key={content.id} value={content.id}>
                            {content.title} ({content.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => handleAddContent(section.id)}
                      disabled={!selectedContent}
                      className="w-full"
                    >
                      Add to Section
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          {hasContent && (
            <CardContent>
              <div className="space-y-2">
                {section.sectionContents.map((sectionContent) => (
                  <div
                    key={sectionContent.id}
                    className="flex items-center gap-2 p-2 border rounded"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{sectionContent.content.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {sectionContent.content.type}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {hasSubsections && isExpanded && (
          <div className="mt-4 space-y-4">
            {section.subsections.map((subsection) => renderSection(subsection as Section, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Sections</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Section</DialogTitle>
              <DialogDescription>
                Add a new section to organize your content
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Parent Section (Optional)</label>
                <Select
                  value={parentSectionId || 'none'}
                  onValueChange={(value) => setParentSectionId(value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Top-level section)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top-level section)</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  placeholder="Section title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  value={sectionDescription}
                  onChange={(e) => setSectionDescription(e.target.value)}
                  placeholder="Section description"
                />
              </div>
              <Button
                onClick={handleCreateSection}
                disabled={creatingSection || !sectionTitle.trim()}
                className="w-full"
              >
                {creatingSection ? 'Creating...' : 'Create Section'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No sections yet. Create your first section to organize your content!
            </p>
            {unsectionedVideos.length > 0 && (
              <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Unsectioned Videos
                </p>
                {unsectionedVideos.map((content) => (
                  <div
                    key={content.id}
                    className="flex items-center justify-between rounded border bg-background p-2"
                  >
                    <span className="text-sm">{content.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {content.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => renderSection(section))}
        </div>
      )}
    </div>
  );
}


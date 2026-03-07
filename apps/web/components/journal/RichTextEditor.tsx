'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Bold, Italic, Heading2, Quote, List, Minus } from 'lucide-react';

export function RichTextEditor({
  content,
  onChange,
  placeholder,
}: {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      CharacterCount,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || 'Start writing...' }),
    ],
    content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-lg max-w-none focus:outline-none prose-headings:font-display prose-headings:font-bold prose-p:text-foreground prose-p:leading-relaxed prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-a:text-primary min-h-[400px]',
      },
    },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-xl bg-muted/50 p-2">
        {[
          {
            icon: Bold,
            action: () => editor?.chain().focus().toggleBold().run(),
            active: editor?.isActive('bold'),
            label: 'Bold',
          },
          {
            icon: Italic,
            action: () => editor?.chain().focus().toggleItalic().run(),
            active: editor?.isActive('italic'),
            label: 'Italic',
          },
          {
            icon: Heading2,
            action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
            active: editor?.isActive('heading', { level: 2 }),
            label: 'Heading',
          },
          {
            icon: Quote,
            action: () => editor?.chain().focus().toggleBlockquote().run(),
            active: editor?.isActive('blockquote'),
            label: 'Quote',
          },
          {
            icon: List,
            action: () => editor?.chain().focus().toggleBulletList().run(),
            active: editor?.isActive('bulletList'),
            label: 'List',
          },
          {
            icon: Minus,
            action: () => editor?.chain().focus().setHorizontalRule().run(),
            active: false,
            label: 'Divider',
          },
        ].map(({ icon: Icon, action, active, label }) => (
          <button
            key={label}
            onClick={action}
            title={label}
            type="button"
            className={`rounded-lg p-2 text-sm transition-colors ${
              active ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

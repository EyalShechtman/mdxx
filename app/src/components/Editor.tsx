'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-text-style';
import { TableKit } from '@tiptap/extension-table';
import { PageBreak } from '@/extensions/page-break';
import { CommentMark, type CommentData } from '@/extensions/comment-mark';
import { StyledSpan } from '@/extensions/styled-span';
import { BlockId } from '@/extensions/block-id';
import { Toolbar } from './Toolbar';
import { CommentSidebar } from './CommentSidebar';
import { CommentDialog } from './CommentDialog';
import { StyleDialog } from './StyleDialog';
import { BlockIdDialog } from './BlockIdDialog';
import { MarkdownPanel } from './MarkdownPanel';
import { htmlToMdxx } from '@/lib/html-to-mdxx';

const AGENT_INSTRUCTIONS = `# mdxx Document Format

This is an mdxx file. It has 3 sections separated by lines of 40+ dashes.

## Section 1: Content (Markdown)

Standard CommonMark markdown with these extensions:

### Block IDs
Append \`~id\` at the end of any block line to tag it for styling.
\`\`\`
## Revenue Overview ~section-revenue
Some paragraph text ~intro-paragraph
\`\`\`

### Comment Anchors
Wrap inline text with \`{{commentId}}...{{/commentId}}\` to attach a comment.
\`\`\`
The {{c1}}enterprise segment{{/c1}} showed strong growth.
\`\`\`
The comment's metadata (author, text, date) is defined in Section 2.

### Styled Spans
Wrap inline text with \`[text]{~styleId}\` to apply a named style.
\`\`\`
Our [cloud platform]{~emphasis} continues to grow.
\`\`\`
The style's properties are defined in Section 2.

### Page Breaks
Insert \`{{pagebreak}}\` on its own line to force a page break.

### Other Markdown
All standard CommonMark is supported: headings (#-####), bold (**), italic (*),
strikethrough (~~), inline code (\\\`), code blocks (\\\`\\\`\\\`lang), links [text](url),
images ![alt](src), blockquotes (>), bullet lists (-), ordered lists (1.),
task lists (- [x]), tables (| col |), and horizontal rules (***).

## Section 2: Styles & Metadata

Define styles and metadata using \`@id { ... }\` blocks.

### Comment Definitions
\`\`\`
@c1 {
  type: comment
  author: "Igor"
  date: "2026-03-29"
  text: "Can we break this down by sub-segment?"
}
\`\`\`

### Element Styles (applied to blocks via ~id or spans via {~id})
\`\`\`
@section-revenue {
  font-size: 24px
  color: #1a1a2e
}
@emphasis {
  font-weight: bold
  color: #e63946
}
\`\`\`

### Page Styles
\`\`\`
@page {
  size: letter
  margin: 1in
}
\`\`\`

### Special Blocks
- \`@defaults { ... }\` — base styles inherited by all elements
- \`@header { ... }\` / \`@footer { ... }\` — page header/footer with \`content: "Page {{page}} of {{pages}}"\`
- \`@abstract { ... }\` — document abstract/summary metadata

## Section 3: Agent Instructions (this section)

This section is for AI/agent context. It is never rendered.
Put any instructions here that help an AI understand and edit this document.

## How to Edit This Document

- To change content: edit Section 1 using markdown syntax above
- To add a comment: wrap text with {{id}}...{{/id}} in Section 1, add @id definition in Section 2
- To style a block: add ~id to end of line in Section 1, add @id { props } in Section 2
- To style inline text: wrap with [text]{~id} in Section 1, add @id { props } in Section 2
- To add a page break: insert {{pagebreak}} on its own line
- Section separators must be 40+ dashes on their own line
`;

interface EditorProps {
  initialContent: string;
  initialComments?: CommentData[];
  onChange: (html: string) => void;
  onCommentsChange?: (comments: CommentData[]) => void;
  onTitleChange?: (title: string) => void;
}

export function Editor({ initialContent, initialComments, onChange, onCommentsChange, onTitleChange }: EditorProps) {
  const [comments, setCommentsRaw] = useState<CommentData[]>(initialComments ?? []);
  const onCommentsChangeRef = useRef(onCommentsChange);
  onCommentsChangeRef.current = onCommentsChange;
  const setComments: typeof setCommentsRaw = useCallback((action) => {
    setCommentsRaw((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      onCommentsChangeRef.current?.(next);
      return next;
    });
  }, []);
  const [showComments, setShowComments] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [markdownSource, setMarkdownSource] = useState('');
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showStyleDialog, setShowStyleDialog] = useState(false);
  const [showBlockIdDialog, setShowBlockIdDialog] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Color,
      TableKit,
      PageBreak,
      CommentMark,
      StyledSpan,
      BlockId,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      updateMarkdownSource(html);
      // Extract title from first H1
      if (onTitleChange) {
        let title = '';
        editor.state.doc.descendants((node) => {
          if (!title && node.type.name === 'heading' && node.attrs.level === 1) {
            title = node.textContent;
          }
        });
        if (title) onTitleChange(title);
      }
    },
    editorProps: {
      attributes: {
        class: 'mdxx-editor-content outline-none',
      },
    },
  });

  const buildFullMdxx = useCallback((html: string) => {
    const content = htmlToMdxx(html);

    // Build Section 2: Styles
    const styleLines: string[] = [];

    // Collect comment definitions
    for (const c of comments) {
      styleLines.push(`@${c.id} {`);
      styleLines.push(`  type: comment`);
      styleLines.push(`  author: "${c.author}"`);
      styleLines.push(`  date: "${c.date}"`);
      if (c.resolved) styleLines.push(`  resolved: true`);
      styleLines.push(`  text: "${c.text}"`);
      styleLines.push(`}`);
      styleLines.push('');
    }

    // Collect style IDs from the editor
    if (editor) {
      const styleIds = new Set<string>();
      editor.state.doc.descendants((node) => {
        node.marks.forEach(mark => {
          if (mark.type.name === 'styledSpan' && mark.attrs.styleId) {
            styleIds.add(mark.attrs.styleId);
          }
        });
      });
      for (const id of styleIds) {
        styleLines.push(`@${id} {`);
        styleLines.push(`  /* custom styles */`);
        styleLines.push(`}`);
        styleLines.push('');
      }
    }

    const separator = '----------------------------------------';
    const section2 = styleLines.length > 0 ? styleLines.join('\n') : '';
    const section3 = AGENT_INSTRUCTIONS;

    return `${content.trimEnd()}\n\n${separator}\n\n${section2}${separator}\n\n${section3}`;
  }, [comments, editor]);

  const updateMarkdownSource = useCallback((html: string) => {
    setMarkdownSource(buildFullMdxx(html));
  }, [buildFullMdxx]);

  const nextCommentId = useCallback(() => {
    const nums = comments.map(c => {
      const match = c.id.match(/^c(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });
    return `c${Math.max(0, ...nums) + 1}`;
  }, [comments]);

  const handleAddComment = useCallback(() => {
    if (!editor || editor.state.selection.empty) return;
    setShowCommentDialog(true);
  }, [editor]);

  const handleSubmitComment = useCallback((author: string, text: string) => {
    if (!editor) return;
    const id = nextCommentId();
    const newComment: CommentData = {
      id,
      author,
      text,
      date: new Date().toISOString().split('T')[0],
      resolved: false,
    };
    editor.commands.setComment(id);
    setComments(prev => [...prev, newComment]);
    setShowCommentDialog(false);
    setShowComments(true);
  }, [editor, nextCommentId]);

  const handleResolveComment = useCallback((id: string) => {
    setComments(prev =>
      prev.map(c => c.id === id ? { ...c, resolved: !c.resolved } : c)
    );
  }, []);

  const handleDeleteComment = useCallback((id: string) => {
    if (!editor) return;
    // Remove the mark from the document
    const { doc, tr } = editor.state;
    doc.descendants((node, pos) => {
      node.marks.forEach(mark => {
        if (mark.type.name === 'comment' && mark.attrs.commentId === id) {
          tr.removeMark(pos, pos + node.nodeSize, mark);
        }
      });
    });
    editor.view.dispatch(tr);
    setComments(prev => prev.filter(c => c.id !== id));
  }, [editor]);

  const handleAddStyle = useCallback(() => {
    if (!editor || editor.state.selection.empty) return;
    setShowStyleDialog(true);
  }, [editor]);

  const handleSubmitStyle = useCallback((styleId: string) => {
    if (!editor) return;
    editor.commands.setStyledSpan(styleId);
    setShowStyleDialog(false);
  }, [editor]);

  const handleTagBlock = useCallback(() => {
    if (!editor) return;
    setShowBlockIdDialog(true);
  }, [editor]);

  const handleSubmitBlockId = useCallback((blockId: string | null) => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const resolvedPos = editor.state.doc.resolve(from);
    const node = resolvedPos.parent;
    editor.commands.updateAttributes(node.type.name, { blockId });
    setShowBlockIdDialog(false);
  }, [editor]);

  const getCurrentBlockId = useCallback((): string | null => {
    if (!editor) return null;
    const { from } = editor.state.selection;
    const resolvedPos = editor.state.doc.resolve(from);
    return resolvedPos.parent.attrs.blockId ?? null;
  }, [editor]);

  const getCurrentBlockType = useCallback((): string => {
    if (!editor) return 'block';
    const { from } = editor.state.selection;
    const resolvedPos = editor.state.doc.resolve(from);
    const name = resolvedPos.parent.type.name;
    const labels: Record<string, string> = {
      heading: 'heading',
      paragraph: 'paragraph',
      blockquote: 'blockquote',
      bulletList: 'list',
      orderedList: 'list',
      codeBlock: 'code block',
      table: 'table',
    };
    return labels[name] ?? 'block';
  }, [editor]);

  const existingStyleIds = useCallback((): string[] => {
    if (!editor) return [];
    const ids = new Set<string>();
    editor.state.doc.descendants((node) => {
      node.marks.forEach(mark => {
        if (mark.type.name === 'styledSpan' && mark.attrs.styleId) {
          ids.add(mark.attrs.styleId);
        }
      });
    });
    return Array.from(ids);
  }, [editor]);

  const getCommentTexts = useCallback((): Record<string, string> => {
    if (!editor) return {};
    const texts: Record<string, string> = {};
    editor.state.doc.descendants((node) => {
      node.marks.forEach(mark => {
        if (mark.type.name === 'comment' && mark.attrs.commentId) {
          const id = mark.attrs.commentId;
          const text = node.textContent;
          if (text) {
            texts[id] = (texts[id] ?? '') + text;
          }
        }
      });
    });
    return texts;
  }, [editor]);

  const commentTexts = getCommentTexts();
  const activeCommentCount = comments.filter(c => !c.resolved).length;

  return (
    <div className="flex h-full bg-white">
      <div className="flex flex-col flex-1 min-w-0">
        <Toolbar
          editor={editor}
          onAddComment={handleAddComment}
          onAddStyle={handleAddStyle}
          onTagBlock={handleTagBlock}
          onToggleComments={() => setShowComments(v => !v)}
          onToggleMarkdown={() => setShowMarkdown(v => !v)}
          showMarkdown={showMarkdown}
          commentCount={activeCommentCount}
        />
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-12 py-8 min-h-full">
            <EditorContent editor={editor} />
          </div>
        </div>
        {showMarkdown && (
          <MarkdownPanel
            markdown={markdownSource}
            onClose={() => setShowMarkdown(false)}
          />
        )}
      </div>

      {showComments && (
        <CommentSidebar
          editor={editor}
          comments={comments}
          commentTexts={commentTexts}
          onResolve={handleResolveComment}
          onDelete={handleDeleteComment}
          onClose={() => setShowComments(false)}
        />
      )}

      {showCommentDialog && (
        <CommentDialog
          onSubmit={handleSubmitComment}
          onCancel={() => setShowCommentDialog(false)}
        />
      )}

      {showStyleDialog && (
        <StyleDialog
          onSubmit={handleSubmitStyle}
          onCancel={() => setShowStyleDialog(false)}
          existingIds={existingStyleIds()}
        />
      )}

      {showBlockIdDialog && (
        <BlockIdDialog
          currentId={getCurrentBlockId()}
          blockType={getCurrentBlockType()}
          onSubmit={handleSubmitBlockId}
          onCancel={() => setShowBlockIdDialog(false)}
        />
      )}
    </div>
  );
}

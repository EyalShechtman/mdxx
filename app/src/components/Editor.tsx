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
import { TextStyle, Color, FontFamily, FontSize } from '@tiptap/extension-text-style';
import { TableKit } from '@tiptap/extension-table';
import { PageBreak } from '@/extensions/page-break';
import { CommentMark, type CommentData, type CommentReply } from '@/extensions/comment-mark';
import { StyledSpan } from '@/extensions/styled-span';
import { BlockId } from '@/extensions/block-id';
import { Toolbar } from './Toolbar';
import { CommentSidebar } from './CommentSidebar';
import { CommentDialog } from './CommentDialog';
import { StyleDialog } from './StyleDialog';
import { BlockIdDialog } from './BlockIdDialog';
import { MarkdownPanel } from './MarkdownPanel';
import { ZoomStatusBar } from './ZoomStatusBar';
import { CommentPopover } from './CommentPopover';
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
![Chart](chart.png) ~chart1
\`\`\`
Use lowercase-kebab-case for all IDs.

### Comment Anchors
Wrap inline text with \`{{commentId}}...{{/commentId}}\` to attach a comment.
\`\`\`
The {{c1}}enterprise segment{{/c1}} showed strong growth.
\`\`\`
The comment's metadata (author, text, date) is defined in Section 2 using \`@comment:id\`.

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

Define styles and metadata using \`@blockname { key: value; }\` blocks.
Properties are separated by semicolons. String values use quotes.

### Comment Definitions
\`\`\`
@comment:c1 {
  author: "Igor";
  date: "2026-03-29";
  text: "Can we break this down by sub-segment?";
  resolved: false;
}
\`\`\`

### Element Styles
Applied to blocks tagged with \`~id\` or inline spans with \`[text]{~id}\`.
\`\`\`
@section-revenue {
  font-size: 24pt;
  color: #1a1a2e;
  margin-bottom: 12pt;
}
@emphasis {
  font-weight: 700;
  color: #e63946;
  background: #fff0f0;
}
\`\`\`

### Abstract Blocks & Inheritance
Define reusable style bases with \`@.name\`, then inherit with \`inherit: .name\`.
\`\`\`
@.heading-base {
  font-family: "Inter";
  font-weight: 700;
  color: #1a1a1a;
}
@title {
  inherit: .heading-base;
  font-size: 32pt;
  color: #0a0a0a;
}
\`\`\`
The element's own properties override inherited ones.

### Page Layout
\`\`\`
@page {
  size: letter;
  orientation: portrait;
  margin: 1in;
  columns: 2;
  column-gap: 24pt;
}
\`\`\`
Page properties: \`size\` (letter, a4, a5), \`orientation\` (portrait, landscape),
\`margin\` / \`margin-top\` / \`margin-bottom\` / \`margin-left\` / \`margin-right\`,
\`columns\` (number), \`column-gap\`.

### Header & Footer
Repeated on every page. Use \`{{page}}\` and \`{{pages}}\` for page numbers.
\`\`\`
@header {
  content: "Report — Confidential";
  font-size: 8pt;
  color: #999999;
  align: right;
  border-bottom: 1px solid #cccccc;
}
@footer {
  content: "Page {{page}} of {{pages}}";
  font-size: 8pt;
  align: center;
}
\`\`\`
Properties: \`content\`, \`font-size\`, \`color\`, \`align\`, \`border-bottom\`, \`border-top\`.

### Document Defaults
Base styles inherited by all elements.
\`\`\`
@defaults {
  font-family: "Inter";
  font-size: 11pt;
  color: #1a1a1a;
  line-height: 1.6;
  heading-font-family: "Inter";
  heading-color: #1a1a1a;
  heading-1-size: 26pt;
  heading-2-size: 20pt;
  heading-3-size: 16pt;
  link-color: #0066cc;
  code-font-family: "Fira Code";
  code-font-size: 10pt;
}
\`\`\`

### Properties Reference

**Typography** (any element):
font-family, font-size, font-weight, font-style, color, background,
text-align (or align), text-transform, text-decoration, letter-spacing, line-height.

**Spacing & Borders** (any element):
margin, margin-top/bottom/left/right, padding, padding-top/bottom/left/right,
border, border-top/bottom/left/right, border-radius, shadow, width, max-width.

**Image-specific** (\`![alt](src) ~id\`):
width, max-width, height, align (left/center/right), object-fit (cover/contain/fill),
caption ("quoted text"), caption-font-size, caption-color,
border, border-radius, shadow, margin.

**Table-specific** (table tagged with \`~id\`):
border-style (minimal/full/none), header-bg, header-font-weight,
cell-padding, stripe (alternating row color), column-widths (e.g. "25% 25% 25% 25%").

**List-specific** (list tagged with \`~id\`):
list-style (disc/decimal/none), indent, item-spacing.

**Code block-specific** (code block tagged with \`~id\`):
line-numbers (true/false), highlight-lines ("3-5 8"), theme (dark/light).

## Section 3: Agent Instructions (this section)

This section is for AI/agent context. It is never rendered.
Put any instructions here that help an AI understand and edit this document.

## How to Edit This Document

- To change content: edit Section 1 using standard Markdown
- To style a block: add \`~id\` to end of line in Section 1, add \`@id { props }\` in Section 2
- To style inline text: wrap with \`[text]{~id}\` in Section 1, add \`@id { props }\` in Section 2
- To add a comment: wrap text with \`{{id}}...{{/id}}\` in Section 1, add \`@comment:id { ... }\` in Section 2
- To add a page break: insert \`{{pagebreak}}\` on its own line
- To reuse styles: define \`@.base { ... }\` then use \`inherit: .base\` in element blocks
- To control layout: edit the \`@page { ... }\` block (columns, margins, size)
- Section separators must be 40+ dashes on their own line
- Never put styling in Section 1. Never put content in Section 2.
`;

interface EditorProps {
  initialContent: string;
  initialComments?: CommentData[];
  onChange: (html: string) => void;
  onCommentsChange?: (comments: CommentData[]) => void;
  onTitleChange?: (title: string) => void;
  onSave?: () => void;
  onBuildMdxx?: (fn: () => string) => void;
}

export function Editor({ initialContent, initialComments, onChange, onCommentsChange, onTitleChange, onSave, onBuildMdxx }: EditorProps) {
  const [comments, setComments] = useState<CommentData[]>(initialComments ?? []);
  const onCommentsChangeRef = useRef(onCommentsChange);
  onCommentsChangeRef.current = onCommentsChange;
  const commentsInitializedRef = useRef(false);
  useEffect(() => {
    if (!commentsInitializedRef.current) {
      commentsInitializedRef.current = true;
      return;
    }
    onCommentsChangeRef.current?.(comments);
  }, [comments]);
  const [showComments, setShowComments] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [markdownSource, setMarkdownSource] = useState('');
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showStyleDialog, setShowStyleDialog] = useState(false);
  const [showBlockIdDialog, setShowBlockIdDialog] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [hoveredComment, setHoveredComment] = useState<CommentData | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const popoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      FontFamily,
      FontSize,
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
      handleClick: (view, pos) => {
        const resolved = view.state.doc.resolve(pos);
        const marks = resolved.marks();
        const commentMark = marks.find(m => m.type.name === 'comment');
        if (commentMark) {
          const id = commentMark.attrs.commentId;
          setActiveCommentId(id);
          setShowComments(true);
        } else {
          setActiveCommentId(null);
        }
        return false;
      },
    },
  });

  const buildFullMdxx = useCallback((html: string) => {
    const { markdown: content, inlineStyles } = htmlToMdxx(html);

    // Build Section 2: Styles
    const styleLines: string[] = [];

    // Collect comment definitions
    for (const c of comments) {
      styleLines.push(`@comment:${c.id} {`);
      styleLines.push(`  author: "${c.author}"`);
      styleLines.push(`  date: "${c.date}"`);
      if (c.resolved) styleLines.push(`  resolved: true`);
      if (c.editedAt) styleLines.push(`  edited-at: "${c.editedAt}"`);
      styleLines.push(`  text: "${c.text}"`);
      if (c.replies) {
        for (const r of c.replies) {
          styleLines.push(`  reply:${r.id}.author: "${r.author}"`);
          styleLines.push(`  reply:${r.id}.date: "${r.date}"`);
          styleLines.push(`  reply:${r.id}.text: "${r.text}"`);
        }
      }
      styleLines.push(`}`);
      styleLines.push('');
    }

    // Collect style IDs from the editor
    const styleIds = new Set<string>();
    if (editor) {
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

    // Generate style blocks for auto-generated inline styles (font/size)
    for (const entry of inlineStyles) {
      // Skip if already covered by a user-named style
      if (!styleIds.has(entry.id)) {
        styleLines.push(`@${entry.id} {`);
        for (const [key, value] of Object.entries(entry.properties)) {
          styleLines.push(`  ${key}: ${value};`);
        }
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
      replies: [],
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

  const handleEditComment = useCallback((id: string, newText: string) => {
    setComments(prev =>
      prev.map(c => c.id === id ? { ...c, text: newText, editedAt: new Date().toISOString().split('T')[0] } : c)
    );
  }, []);

  const handleReplyComment = useCallback((commentId: string, author: string, text: string) => {
    setComments(prev =>
      prev.map(c => {
        if (c.id !== commentId) return c;
        const replyNums = c.replies.map(r => {
          const match = r.id.match(/^r(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        });
        const newReply: CommentReply = {
          id: `r${Math.max(0, ...replyNums) + 1}`,
          author,
          text,
          date: new Date().toISOString().split('T')[0],
        };
        return { ...c, replies: [...c.replies, newReply] };
      })
    );
  }, []);

  const handlePopoverReply = useCallback((commentId: string) => {
    setHoveredComment(null);
    setPopoverPosition(null);
    setActiveCommentId(commentId);
    setShowComments(true);
  }, []);

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

  // Sync active comment highlight classes on the DOM
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    // Toggle the parent class
    wrapper.classList.toggle('has-active-comment', !!activeCommentId);

    // Remove previous active markers
    wrapper.querySelectorAll('.comment-active').forEach(el => {
      el.classList.remove('comment-active');
    });

    // Add active class to matching comment spans
    if (activeCommentId) {
      wrapper.querySelectorAll(`[data-comment-id="${activeCommentId}"]`).forEach(el => {
        el.classList.add('comment-active');
      });
    }
  }, [activeCommentId]);

  // Hover popover for comment highlights
  const commentsRef = useRef(comments);
  commentsRef.current = comments;

  const cancelPopoverClose = useCallback(() => {
    if (popoverTimerRef.current) {
      clearTimeout(popoverTimerRef.current);
      popoverTimerRef.current = null;
    }
  }, []);

  const schedulePopoverClose = useCallback(() => {
    cancelPopoverClose();
    popoverTimerRef.current = setTimeout(() => {
      setHoveredComment(null);
      setPopoverPosition(null);
    }, 200);
  }, [cancelPopoverClose]);

  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    const handleMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement;
      const commentId = target.getAttribute('data-comment-id');
      if (!commentId) return;
      cancelPopoverClose();
      const comment = commentsRef.current.find(c => c.id === commentId);
      if (!comment) return;
      const rect = target.getBoundingClientRect();
      setHoveredComment(comment);
      setPopoverPosition({ top: rect.top, left: rect.left });
    };

    const handleMouseLeave = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.getAttribute('data-comment-id')) return;
      schedulePopoverClose();
    };

    const observer = new MutationObserver(() => {
      wrapper.querySelectorAll('.mdxx-comment-highlight').forEach(span => {
        span.removeEventListener('mouseenter', handleMouseEnter);
        span.removeEventListener('mouseleave', handleMouseLeave);
        span.addEventListener('mouseenter', handleMouseEnter);
        span.addEventListener('mouseleave', handleMouseLeave);
      });
    });

    observer.observe(wrapper, { childList: true, subtree: true });

    // Initial bind
    wrapper.querySelectorAll('.mdxx-comment-highlight').forEach(span => {
      span.addEventListener('mouseenter', handleMouseEnter);
      span.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      observer.disconnect();
      wrapper.querySelectorAll('.mdxx-comment-highlight').forEach(span => {
        span.removeEventListener('mouseenter', handleMouseEnter);
        span.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [cancelPopoverClose, schedulePopoverClose]);

  // Cmd+S / Ctrl+S keyboard shortcut
  useEffect(() => {
    if (!onSave) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'm') {
        e.preventDefault();
        handleAddComment();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, handleAddComment]);

  // Register mdxx builder with the file context
  const onBuildMdxxRef = useRef(onBuildMdxx);
  onBuildMdxxRef.current = onBuildMdxx;
  useEffect(() => {
    if (!onBuildMdxxRef.current) return;
    onBuildMdxxRef.current(() => {
      const html = editor?.getHTML() ?? '';
      return buildFullMdxx(html);
    });
  }, [editor, buildFullMdxx]);

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
        <div className="flex-1 overflow-auto bg-[#e8e8e8]">
          <div
            className="flex flex-col items-center py-6"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              minHeight: `${100 / (zoom / 100)}%`,
            }}
          >
            <div
              ref={editorWrapperRef}
              className="mdxx-page bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)]"
              style={{
                width: '816px',
                minHeight: '1056px',
                padding: '96px 96px',
              }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
        <ZoomStatusBar zoom={zoom} onZoomChange={setZoom} />
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
          activeCommentId={activeCommentId}
          onSetActiveComment={setActiveCommentId}
          onResolve={handleResolveComment}
          onDelete={handleDeleteComment}
          onEdit={handleEditComment}
          onReply={handleReplyComment}
          onClose={() => setShowComments(false)}
        />
      )}

      <CommentPopover
        comment={hoveredComment}
        position={popoverPosition}
        onResolve={handleResolveComment}
        onReply={handlePopoverReply}
        onMouseEnter={cancelPopoverClose}
        onMouseLeave={schedulePopoverClose}
      />

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

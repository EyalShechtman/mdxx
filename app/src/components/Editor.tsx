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
import { ClaudeSidebar } from './ClaudeSidebar';
import { CommentDialog } from './CommentDialog';
import { MarkdownPanel } from './MarkdownPanel';
import { ZoomStatusBar } from './ZoomStatusBar';
import { CommentPopover } from './CommentPopover';
import { SettingsDialog } from './SettingsDialog';
import { htmlToMdxx } from '@/lib/html-to-mdxx';
import { sendMessage, parseStructuredResponse, type ClaudeConfig } from '@/lib/claude-api';
import { loadClaudeSettings, saveClaudeSettings } from '@/lib/claude-settings';
import type { ChatMessage } from '@/lib/chat-types';
import { serializeChatHistory } from '@/lib/chat-types';

const AGENT_INSTRUCTIONS = `<mdxx-format>
An mdxx file has 3 sections separated by a line of 40+ dashes.

<section1 name="Content">
Standard CommonMark markdown with these extensions:

<styling>
All style IDs are auto-generated hashes (e.g. s-1lck6yy). Do not rename them.

Inline styles wrap text: [text]{~s-1lck6yy}
Block styles append to the end of a line: Paragraph text ~s-1lck6yy

  [important words]{~s-1lck6yy} in a sentence.
  A centered paragraph ~s-abc123

Style properties are defined in Section 2 under @id { ... }.
</styling>

<comments>
Wrap text with {{id}}...{{/id}} to attach a comment defined in Section 2.

  The {{c1}}enterprise segment{{/c1}} showed strong growth.
</comments>

<page-breaks>
Insert {{pagebreak}} on its own line to force a page break.
</page-breaks>

All standard CommonMark is supported: headings, bold, italic, strikethrough,
code, links, images, blockquotes, lists, task lists, tables, horizontal rules.
</section1>

<section2 name="Styles & Metadata">
All styling and metadata lives here. Blocks use the syntax: @id { key: value; }

<styles>
Auto-generated when the user formats text (font, size, color, alignment).
Same properties always produce the same hash ID. Used for both inline
spans and block-level styling.

  @s-1lck6yy {
    font-family: "Times New Roman";
    font-size: 10pt;
  }
  @s-abc123 {
    font-size: 24pt;
    text-align: center;
  }
</styles>

<comment-definitions>
  @comment:c1 {
    author: "Igor";
    date: "2026-03-29";
    text: "Can we break this down by sub-segment?";
  }
</comment-definitions>

<inheritance>
Define reusable bases with @.name, then inherit.

  @.heading-base { font-family: "Inter"; font-weight: 700; }
  @title { inherit: .heading-base; font-size: 32pt; }
</inheritance>

<page-layout>
  @page { size: letter; margin: 1in; columns: 2; column-gap: 24pt; }

Properties: size (letter/a4/a5), orientation (portrait/landscape),
margin, columns, column-gap.
</page-layout>

<header-footer>
  @header { content: "Report"; font-size: 8pt; align: right; }
  @footer { content: "Page {{page}} of {{pages}}"; font-size: 8pt; align: center; }
</header-footer>

<defaults>
Base styles for the whole document.

  @defaults {
    font-family: "Inter";
    font-size: 11pt;
    color: #1a1a1a;
    line-height: 1.6;
  }
</defaults>

<properties>
Typography: font-family, font-size, font-weight, font-style, color, background,
  text-align, text-transform, text-decoration, letter-spacing, line-height.
Spacing: margin(-top/bottom/left/right), padding(-top/bottom/left/right),
  border(-top/bottom/left/right), border-radius, shadow, width, max-width.
Images: width, height, align, object-fit, caption, border, border-radius, shadow.
Tables: border-style, header-bg, cell-padding, stripe, column-widths.
Lists: list-style, indent, item-spacing.
Code: line-numbers, highlight-lines, theme.
</properties>
</section2>

<section3 name="Agent Instructions">
This section (the one you're reading) is for AI/agent context. Never rendered.
</section3>

<rules>
- Content goes in Section 1 only. Styles go in Section 2 only. Never mix them.
- Section separators are 40+ dashes on their own line.
- All style IDs are auto-generated hashes (e.g. s-1lck6yy). Do not rename or merge them.
- Inline text styling: [text]{~id} in Section 1, @id { props } in Section 2.
- Block-level styling (alignment etc.): ~id at end of line in Section 1, @id { props } in Section 2.
- Comments: {{id}}...{{/id}} in Section 1, @comment:id { ... } in Section 2.
</rules>
</mdxx-format>`;

interface EditorProps {
  initialContent: string;
  initialComments?: CommentData[];
  initialElementStyles?: Record<string, Record<string, string>>;
  agentInstructions?: string | null;
  chatHistory?: ChatMessage[];
  onChange: (html: string) => void;
  onCommentsChange?: (comments: CommentData[]) => void;
  onChatHistoryChange?: (messages: ChatMessage[]) => void;
  onTitleChange?: (title: string) => void;
  onSave?: () => void;
  onBuildMdxx?: (fn: () => string) => void;
}

export function Editor({ initialContent, initialComments, initialElementStyles, agentInstructions, chatHistory, onChange, onCommentsChange, onChatHistoryChange, onTitleChange, onSave, onBuildMdxx }: EditorProps) {
  const [comments, setComments] = useState<CommentData[]>(initialComments ?? []);
  const elementStylesRef = useRef<Record<string, Record<string, string>>>(initialElementStyles ?? {});
  const agentInstructionsRef = useRef<string>(agentInstructions ?? AGENT_INSTRUCTIONS);
  const chatHistoryRef = useRef<ChatMessage[]>(chatHistory ?? []);
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

  const [rightPanel, setRightPanel] = useState<'claude' | 'comments' | null>(null);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [claudeConfig, setClaudeConfig] = useState<ClaudeConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Load Claude settings on mount
  useEffect(() => {
    loadClaudeSettings().then(config => {
      if (config) setClaudeConfig(config);
    });
  }, []);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [markdownSource, setMarkdownSource] = useState('');
  const [showCommentDialog, setShowCommentDialog] = useState(false);
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
          setRightPanel('comments');
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
      styleLines.push(`  author: "${c.author}";`);
      styleLines.push(`  date: "${c.date}";`);
      if (c.resolved) styleLines.push(`  resolved: true;`);
      if (c.editedAt) styleLines.push(`  edited-at: "${c.editedAt}";`);
      styleLines.push(`  text: "${c.text}";`);
      if (c.replies) {
        for (const r of c.replies) {
          styleLines.push(`  reply:${r.id}.author: "${r.author}";`);
          styleLines.push(`  reply:${r.id}.date: "${r.date}";`);
          styleLines.push(`  reply:${r.id}.text: "${r.text}";`);
        }
      }
      styleLines.push(`}`);
      styleLines.push('');
    }

    // Generate style blocks for inline styles (font/size/color)
    for (const entry of inlineStyles) {
      styleLines.push(`@${entry.id} {`);
      for (const [key, value] of Object.entries(entry.properties)) {
        styleLines.push(`  ${key}: ${value};`);
      }
      styleLines.push(`}`);
      styleLines.push('');
    }

    const separator = '----------------------------------------';
    const section2 = styleLines.length > 0 ? styleLines.join('\n') : '';
    const section3 = agentInstructionsRef.current;
    const chatMessages = chatHistoryRef.current;
    const section4 = chatMessages.length > 0 ? serializeChatHistory(chatMessages) : '';

    let result = `${content.trimEnd()}\n\n${separator}\n\n${section2}${separator}\n\n${section3}`;
    if (section4) {
      result += `\n\n${separator}\n\n${section4}`;
    }
    return result;
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
    setRightPanel('comments');
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
    setRightPanel('comments');
  }, []);




  const handleSendClaudeMessage = useCallback(async (message: string) => {
    if (!claudeConfig?.apiKey || !editor) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const currentChat = chatHistoryRef.current;
    const updatedChat = [...currentChat, userMessage];
    chatHistoryRef.current = updatedChat;
    onChatHistoryChange?.(updatedChat);

    setClaudeLoading(true);
    try {
      const mdxxSource = buildFullMdxx(editor.getHTML());
      const response = await sendMessage({
        config: claudeConfig,
        messages: updatedChat.map(m => ({ role: m.role, content: m.content })),
        mdxxSource,
        agentInstructions: agentInstructionsRef.current,
      });

      const parsed = parseStructuredResponse(response);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: parsed.explanation,
        timestamp: new Date().toISOString(),
        edits: parsed.edits.length > 0 ? parsed.edits : undefined,
      };

      const withResponse = [...updatedChat, assistantMessage];
      chatHistoryRef.current = withResponse;
      onChatHistoryChange?.(withResponse);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`,
        timestamp: new Date().toISOString(),
      };
      const withError = [...updatedChat, errorMessage];
      chatHistoryRef.current = withError;
      onChatHistoryChange?.(withError);
    } finally {
      setClaudeLoading(false);
    }
  }, [claudeConfig, editor, buildFullMdxx, onChatHistoryChange]);

  const handleApplyEdits = useCallback(async (messageIndex: number) => {
    const msg = chatHistoryRef.current[messageIndex];
    if (!msg?.edits || msg.editsApplied || !editor) return;

    const mdxxSource = buildFullMdxx(editor.getHTML());
    const { applyEdits } = await import('@/lib/apply-edits');
    const { newMdxx, applied, failed } = applyEdits(mdxxSource, msg.edits);

    if (applied > 0) {
      const { mdxxToTiptap } = await import('@/lib/mdxx-to-tiptap');
      const { html, comments: newComments, elementStyles, agentInstructions: newAgent } = await mdxxToTiptap(newMdxx);
      if (newAgent) agentInstructionsRef.current = newAgent;
      elementStylesRef.current = { ...elementStylesRef.current, ...elementStyles };
      editor.commands.setContent(html);
      setComments(newComments);
    }

    // Mark edits as applied
    const updated = [...chatHistoryRef.current];
    updated[messageIndex] = { ...msg, editsApplied: true };
    chatHistoryRef.current = updated;
    onChatHistoryChange?.(updated);

    if (failed.length > 0) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `Could not apply ${failed.length} of ${msg.edits.length} edit${msg.edits.length > 1 ? 's' : ''} (text not found in document).`,
        timestamp: new Date().toISOString(),
      };
      chatHistoryRef.current = [...chatHistoryRef.current, errorMsg];
      onChatHistoryChange?.(chatHistoryRef.current);
    }
  }, [editor, buildFullMdxx, onChatHistoryChange]);

  const handleDismissEdits = useCallback((messageIndex: number) => {
    const msg = chatHistoryRef.current[messageIndex];
    if (!msg?.edits) return;

    const updated = [...chatHistoryRef.current];
    updated[messageIndex] = { ...msg, edits: undefined };
    chatHistoryRef.current = updated;
    onChatHistoryChange?.(updated);
  }, [onChatHistoryChange]);

  const handleSaveSettings = useCallback(async (config: ClaudeConfig) => {
    await saveClaudeSettings(config);
    setClaudeConfig(config);
    setShowSettings(false);
  }, []);

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
          onToggleComments={() => setRightPanel(prev => prev === 'comments' ? null : 'comments')}
          onToggleMarkdown={() => setShowMarkdown(v => !v)}
          onToggleClaude={() => setRightPanel(prev => prev === 'claude' ? null : 'claude')}
          showMarkdown={showMarkdown}
          showClaude={rightPanel === 'claude'}
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

      {rightPanel && (
        <div className="flex flex-col h-full border-l">
          {/* Tab bar */}
          <div className="flex border-b bg-white">
            <button
              onClick={() => setRightPanel('claude')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                rightPanel === 'claude'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Claude
            </button>
            <button
              onClick={() => setRightPanel('comments')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                rightPanel === 'comments'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Comments{activeCommentCount > 0 ? ` (${activeCommentCount})` : ''}
            </button>
          </div>

          {rightPanel === 'claude' && (
            <ClaudeSidebar
              messages={chatHistoryRef.current}
              onSendMessage={handleSendClaudeMessage}
              onApplyEdits={handleApplyEdits}
              onDismissEdits={handleDismissEdits}
              isLoading={claudeLoading}
              hasApiKey={!!claudeConfig?.apiKey}
              onOpenSettings={() => setShowSettings(true)}
            />
          )}

          {rightPanel === 'comments' && (
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
              onClose={() => setRightPanel(null)}
            />
          )}
        </div>
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


      {showSettings && (
        <SettingsDialog
          initialConfig={claudeConfig}
          onSave={handleSaveSettings}
          onCancel={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

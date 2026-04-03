'use client';
import { type Editor } from '@tiptap/react';
import { useCallback } from 'react';

interface ToolbarProps {
  editor: Editor | null;
  onAddComment: () => void;
  onAddStyle: () => void;
  onTagBlock: () => void;
  onToggleComments: () => void;
  onToggleMarkdown: () => void;
  showMarkdown: boolean;
  commentCount: number;
}

function Btn({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
  variant = 'default',
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'accent';
}) {
  const base = 'px-2 py-1.5 rounded text-sm font-medium transition-colors border';
  const variants = {
    default: active
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'text-gray-600 hover:bg-gray-100 border-transparent hover:border-gray-200',
    accent: active
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700 border-transparent hover:border-amber-200',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />;
}

function HeadingDropdown({ editor }: { editor: Editor }) {
  const currentLevel = [1, 2, 3, 4].find(level =>
    editor.isActive('heading', { level })
  );

  return (
    <select
      value={currentLevel ?? 0}
      onChange={(e) => {
        const level = parseInt(e.target.value);
        if (level === 0) {
          editor.chain().focus().setParagraph().run();
        } else {
          editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run();
        }
      }}
      className="px-2 py-1.5 rounded text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer outline-none min-w-[110px]"
      title="Text style"
    >
      <option value={0}>Normal text</option>
      <option value={1}>Heading 1</option>
      <option value={2}>Heading 2</option>
      <option value={3}>Heading 3</option>
      <option value={4}>Heading 4</option>
    </select>
  );
}

export function Toolbar({ editor, onAddComment, onAddStyle, onTagBlock, onToggleComments, onToggleMarkdown, showMarkdown, commentCount }: ToolbarProps) {
  if (!editor) return null;

  const hasSelection = !editor.state.selection.empty;

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b bg-white flex-wrap">
      {/* Undo/Redo */}
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M4 7l3-3v2h4a3 3 0 010 6H7v-1.5h4a1.5 1.5 0 000-3H7v2z"/></svg>
      </Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Shift+Z)">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M12 7l-3-3v2H5a3 3 0 000 6h4v-1.5H5a1.5 1.5 0 010-3h4v2z"/></svg>
      </Btn>

      <Divider />

      {/* Text Style */}
      <HeadingDropdown editor={editor} />

      <Divider />

      {/* Formatting */}
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
        <strong className="text-[13px]">B</strong>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
        <em className="text-[13px]">I</em>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
        <span className="underline text-[13px]">U</span>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
        <span className="line-through text-[13px]">S</span>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
        <span className="bg-yellow-200 px-0.5 text-[13px] rounded-sm">H</span>
      </Btn>

      <Divider />

      {/* Alignment */}
      <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h14v1.5H1zm0 3.5h10v1.5H1zm0 3.5h14v1.5H1zm0 3.5h10v1.5H1z"/></svg>
      </Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h14v1.5H1zm2 3.5h10v1.5H3zM1 9h14v1.5H1zm2 3.5h10v1.5H3z"/></svg>
      </Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h14v1.5H1zm4 3.5h10v1.5H5zM1 9h14v1.5H1zm4 3.5h10v1.5H5z"/></svg>
      </Btn>

      <Divider />

      {/* Lists */}
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="2.5" cy="3.5" r="1.5"/><rect x="6" y="2.5" width="9" height="2" rx="0.5"/><circle cx="2.5" cy="8" r="1.5"/><rect x="6" y="7" width="9" height="2" rx="0.5"/><circle cx="2.5" cy="12.5" r="1.5"/><rect x="6" y="11.5" width="9" height="2" rx="0.5"/></svg>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><text x="0.5" y="5" fontSize="5" fontWeight="bold">1.</text><rect x="6" y="2.5" width="9" height="2" rx="0.5"/><text x="0.5" y="9.5" fontSize="5" fontWeight="bold">2.</text><rect x="6" y="7" width="9" height="2" rx="0.5"/><text x="0.5" y="14" fontSize="5" fontWeight="bold">3.</text><rect x="6" y="11.5" width="9" height="2" rx="0.5"/></svg>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 3.5l1.2 1.2 2.3-2.3" fill="none" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="2.5" width="7" height="1.5" rx="0.5"/><rect x="1" y="9" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="8" y="10.5" width="7" height="1.5" rx="0.5"/></svg>
      </Btn>

      <Divider />

      {/* Blocks */}
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h4v4H5l-2 3V7H3V3zm6 0h4v4h-2l-2 3V7H9V3z"/></svg>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 4L2 8l3.5 4 1-1L3.5 8l3-3zm5 0l3.5 4-3.5 4-1-1L12.5 8l-3-3z"/></svg>
      </Btn>
      <Btn onClick={addImage} title="Insert image">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="5" cy="6" r="1.5"/><path d="M1 12l4-4 3 3 2-2 5 5H2z" opacity="0.5"/></svg>
      </Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="7" width="14" height="2" rx="1"/></svg>
      </Btn>

      <Divider />

      {/* mdxx Features */}
      <Btn
        onClick={() => editor.commands.setPageBreak()}
        title="Page break"
        variant="accent"
      >
        <span className="flex items-center gap-1 text-xs">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 1h12v5h-1.5V2.5h-9V6H2V1zm0 10h1.5v3.5h9V11H14v5H2v-5zm0-3.5h3v1.5H2zm4.5 0h3v1.5h-3zm4.5 0h3v1.5h-3z"/>
          </svg>
          Page break
        </span>
      </Btn>

      <Btn
        onClick={onAddComment}
        disabled={!hasSelection}
        title={hasSelection ? 'Add comment to selection' : 'Select text first to add a comment'}
        variant="accent"
      >
        <span className="flex items-center gap-1 text-xs">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h12a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1zm1 2v6.5l1.5-1.5H13V4H3z"/>
          </svg>
          Comment
        </span>
      </Btn>

      <Btn
        onClick={onAddStyle}
        disabled={!hasSelection}
        title={hasSelection ? 'Apply named style to selection' : 'Select text first to apply a style'}
        variant="accent"
      >
        <span className="flex items-center gap-1 text-xs">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2l5 12h1.5L4.5 4.5 8 2h-.5L2 2zm6 0l5 12h1.5L10 4l-1.5-2H8z"/>
          </svg>
          Style
        </span>
      </Btn>

      <Btn
        onClick={onTagBlock}
        title="Tag current block with an ID for styling"
        variant="accent"
      >
        <span className="flex items-center gap-1 text-xs">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 3a1 1 0 011-1h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 010 1.414l-4.586 4.586a1 1 0 01-1.414 0L2.293 8.293A1 1 0 012 7.586V3zm2.5 1.5a1 1 0 100 2 1 1 0 000-2z"/>
          </svg>
          Tag
        </span>
      </Btn>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Markdown toggle */}
      <Btn
        onClick={onToggleMarkdown}
        active={showMarkdown}
        title="Toggle markdown source"
      >
        <span className="flex items-center gap-1 text-xs">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H2zm1.5 2h1.5l1.5 2 1.5-2H9.5v6H8V7.5L6.5 9.5h-.01L5 7.5V11H3.5V5zm7 0h2L11 8l-1.5-3z"/>
          </svg>
          MD
        </span>
      </Btn>

      {/* Comments toggle */}
      <Btn
        onClick={onToggleComments}
        active={false}
        title="Toggle comments panel"
      >
        <span className="flex items-center gap-1.5 text-xs">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h12a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1zm1 2v6.5l1.5-1.5H13V4H3z"/>
          </svg>
          {commentCount > 0 && (
            <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {commentCount}
            </span>
          )}
        </span>
      </Btn>
    </div>
  );
}

'use client';
import { type Editor } from '@tiptap/react';
import { type CommentData } from '@/extensions/comment-mark';

interface CommentSidebarProps {
  editor: Editor | null;
  comments: CommentData[];
  commentTexts: Record<string, string>;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function CommentSidebar({ editor, comments, commentTexts, onResolve, onDelete, onClose }: CommentSidebarProps) {
  const activeComments = comments.filter(c => !c.resolved);
  const resolvedComments = comments.filter(c => c.resolved);

  const scrollToComment = (commentId: string) => {
    if (!editor) return;
    const { doc } = editor.state;
    let found = false;
    doc.descendants((node, pos) => {
      if (found) return false;
      node.marks.forEach(mark => {
        if (mark.type.name === 'comment' && mark.attrs.commentId === commentId) {
          editor.chain().focus().setTextSelection(pos).run();
          found = true;
        }
      });
    });
  };

  return (
    <div className="w-80 border-l bg-gray-50 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <h2 className="text-sm font-semibold text-gray-800">Comments</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Close comments"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto px-3 py-2">
        {comments.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            <p className="mb-2">No comments yet</p>
            <p className="text-xs">Select text and click the comment button to add one</p>
          </div>
        )}

        {activeComments.length > 0 && (
          <div className="mb-4">
            {activeComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                quotedText={commentTexts[comment.id]}
                onResolve={onResolve}
                onDelete={onDelete}
                onClick={() => scrollToComment(comment.id)}
              />
            ))}
          </div>
        )}

        {resolvedComments.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">
              Resolved ({resolvedComments.length})
            </p>
            {resolvedComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                quotedText={commentTexts[comment.id]}
                onResolve={onResolve}
                onDelete={onDelete}
                onClick={() => scrollToComment(comment.id)}
                resolved
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  quotedText,
  onResolve,
  onDelete,
  onClick,
  resolved = false,
}: {
  comment: CommentData;
  quotedText?: string;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
  resolved?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg border p-3 mb-2 cursor-pointer transition-all
        ${resolved
          ? 'bg-gray-100 border-gray-200 opacity-60 hover:opacity-80'
          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white ${resolved ? 'bg-gray-400' : 'bg-blue-500'}`}>
            {comment.author.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-gray-700">{comment.author}</span>
        </div>
        <span className="text-[10px] text-gray-400">{comment.date}</span>
      </div>
      {quotedText && (
        <div className="mb-2 px-2 py-1.5 bg-amber-50 border-l-2 border-amber-300 rounded-r text-xs text-gray-500 italic leading-relaxed truncate">
          &ldquo;{quotedText}&rdquo;
        </div>
      )}
      <p className="text-sm text-gray-600 leading-relaxed mb-2">{comment.text}</p>
      <div className="flex gap-2">
        {!resolved && (
          <button
            onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }}
            className="text-xs text-green-600 hover:text-green-700 font-medium"
          >
            Resolve
          </button>
        )}
        {resolved && (
          <button
            onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Reopen
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
          className="text-xs text-red-500 hover:text-red-600 font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

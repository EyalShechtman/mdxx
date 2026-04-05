'use client';
import { useEffect, useRef, useState } from 'react';
import { type Editor } from '@tiptap/react';
import { type CommentData, type CommentReply } from '@/extensions/comment-mark';

interface CommentSidebarProps {
  editor: Editor | null;
  comments: CommentData[];
  commentTexts: Record<string, string>;
  activeCommentId: string | null;
  onSetActiveComment: (id: string | null) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, newText: string) => void;
  onReply?: (commentId: string, author: string, text: string) => void;
  onClose: () => void;
}

export function CommentSidebar({
  editor,
  comments,
  commentTexts,
  activeCommentId,
  onSetActiveComment,
  onResolve,
  onDelete,
  onEdit,
  onReply,
  onClose,
}: CommentSidebarProps) {
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
    onSetActiveComment(commentId);
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
                isActive={activeCommentId === comment.id}
                onResolve={onResolve}
                onDelete={onDelete}
                onEdit={onEdit}
                onReply={onReply}
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
              <ResolvedCommentCard
                key={comment.id}
                comment={comment}
                quotedText={commentTexts[comment.id]}
                isActive={activeCommentId === comment.id}
                onResolve={onResolve}
                onDelete={onDelete}
                onEdit={onEdit}
                onReply={onReply}
                onClick={() => scrollToComment(comment.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Active comment card ----------

function CommentCard({
  comment,
  quotedText,
  isActive,
  onResolve,
  onDelete,
  onEdit,
  onReply,
  onClick,
}: {
  comment: CommentData;
  quotedText?: string;
  isActive: boolean;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, newText: string) => void;
  onReply?: (commentId: string, author: string, text: string) => void;
  onClick: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyText, setReplyText] = useState('');
  const prevIsActive = useRef(isActive);

  // Scroll card into view when it becomes active
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  // Trigger pulse animation when transitioning from inactive to active
  useEffect(() => {
    if (!prevIsActive.current && isActive && cardRef.current) {
      cardRef.current.classList.remove('animate-pulse-ring');
      // Force reflow so the class can be re-added
      void cardRef.current.offsetWidth;
      cardRef.current.classList.add('animate-pulse-ring');
    }
    prevIsActive.current = isActive;
  }, [isActive]);

  const handleSaveEdit = () => {
    if (onEdit && editText.trim()) {
      onEdit(comment.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(comment.text);
    setIsEditing(false);
  };

  const handleSubmitReply = () => {
    if (onReply && replyAuthor.trim() && replyText.trim()) {
      onReply(comment.id, replyAuthor.trim(), replyText.trim());
      setReplyAuthor('');
      setReplyText('');
      setShowReplyForm(false);
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={[
        'rounded-lg border p-3 mb-2 cursor-pointer transition-all',
        isActive
          ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-200'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-blue-500">
            {comment.author.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-gray-700">{comment.author}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400">{comment.date}</span>
          {comment.editedAt && (
            <span className="text-[10px] text-gray-400">(edited)</span>
          )}
        </div>
      </div>

      {/* Quoted text */}
      {quotedText && (
        <div className="mb-2 px-2 py-1.5 bg-amber-50 border-l-2 border-amber-300 rounded-r text-xs text-gray-500 italic leading-relaxed truncate">
          &ldquo;{quotedText}&rdquo;
        </div>
      )}

      {/* Comment body — normal or edit mode */}
      {isEditing ? (
        <div onClick={e => e.stopPropagation()}>
          <textarea
            className="w-full text-sm text-gray-700 border border-blue-300 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            rows={3}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSaveEdit}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-xs text-gray-500 hover:text-gray-600 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 leading-relaxed mb-2">{comment.text}</p>
      )}

      {/* Action buttons */}
      {!isEditing && (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }}
            className="text-xs text-green-600 hover:text-green-700 font-medium"
          >
            Resolve
          </button>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Edit
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
            className="text-xs text-red-500 hover:text-red-600 font-medium"
          >
            Delete
          </button>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 pl-3 border-l-2 border-gray-100 space-y-2">
          {comment.replies.map(reply => (
            <ReplyRow key={reply.id} reply={reply} />
          ))}
        </div>
      )}

      {/* Reply form */}
      {showReplyForm ? (
        <div className="mt-3 pl-3 border-l-2 border-blue-100" onClick={e => e.stopPropagation()}>
          <input
            type="text"
            placeholder="Your name"
            value={replyAuthor}
            onChange={e => setReplyAuthor(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <textarea
            placeholder="Write a reply..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={2}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSubmitReply}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Submit
            </button>
            <button
              onClick={() => { setReplyAuthor(''); setReplyText(''); setShowReplyForm(false); }}
              className="text-xs text-gray-500 hover:text-gray-600 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        onReply && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowReplyForm(true); }}
            className="mt-2 text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors"
          >
            Reply
          </button>
        )
      )}
    </div>
  );
}

// ---------- Resolved comment card (collapsed by default) ----------

function ResolvedCommentCard({
  comment,
  quotedText,
  isActive,
  onResolve,
  onDelete,
  onEdit,
  onReply,
  onClick,
}: {
  comment: CommentData;
  quotedText?: string;
  isActive: boolean;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, newText: string) => void;
  onReply?: (commentId: string, author: string, text: string) => void;
  onClick: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  const handleSaveEdit = () => {
    if (onEdit && editText.trim()) {
      onEdit(comment.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(comment.text);
    setIsEditing(false);
  };

  const handleSubmitReply = () => {
    if (onReply && replyAuthor.trim() && replyText.trim()) {
      onReply(comment.id, replyAuthor.trim(), replyText.trim());
      setReplyAuthor('');
      setReplyText('');
      setShowReplyForm(false);
    }
  };

  if (!expanded) {
    return (
      <div
        ref={cardRef}
        onClick={(e) => { e.stopPropagation(); onClick(); setExpanded(true); }}
        className={[
          'rounded-lg border px-3 py-2 mb-2 cursor-pointer flex items-center gap-2 transition-all',
          isActive
            ? 'bg-white border-blue-400 opacity-80 shadow-sm'
            : 'bg-gray-100 border-gray-200 opacity-60 hover:opacity-80',
        ].join(' ')}
      >
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white bg-gray-400 shrink-0">
          {comment.author.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs text-gray-500 flex-1 truncate">Resolved comment</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="text-gray-400 shrink-0"
        >
          <path d="M1.646 4.646a.5.5 0 01.708 0L8 10.293l5.646-5.647a.5.5 0 01.708.708l-6 6a.5.5 0 01-.708 0l-6-6a.5.5 0 010-.708z"/>
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={[
        'rounded-lg border p-3 mb-2 cursor-pointer transition-all',
        isActive
          ? 'bg-white border-blue-400 opacity-80 shadow-sm'
          : 'bg-gray-100 border-gray-200 opacity-70 hover:opacity-90',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-gray-400">
            {comment.author.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-gray-700">{comment.author}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400">{comment.date}</span>
          {comment.editedAt && (
            <span className="text-[10px] text-gray-400">(edited)</span>
          )}
          {/* Collapse chevron */}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            className="text-gray-400 hover:text-gray-600 ml-1"
            title="Collapse"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14.354 11.354a.5.5 0 01-.708 0L8 5.707l-5.646 5.647a.5.5 0 01-.708-.708l6-6a.5.5 0 01.708 0l6 6a.5.5 0 010 .708z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Quoted text */}
      {quotedText && (
        <div className="mb-2 px-2 py-1.5 bg-amber-50 border-l-2 border-amber-300 rounded-r text-xs text-gray-500 italic leading-relaxed truncate">
          &ldquo;{quotedText}&rdquo;
        </div>
      )}

      {/* Comment body */}
      {isEditing ? (
        <div onClick={e => e.stopPropagation()}>
          <textarea
            className="w-full text-sm text-gray-700 border border-blue-300 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            rows={3}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 mt-1">
            <button onClick={handleSaveEdit} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Save
            </button>
            <button onClick={handleCancelEdit} className="text-xs text-gray-500 hover:text-gray-600 font-medium">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 leading-relaxed mb-2">{comment.text}</p>
      )}

      {/* Action buttons */}
      {!isEditing && (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Reopen
          </button>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Edit
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
            className="text-xs text-red-500 hover:text-red-600 font-medium"
          >
            Delete
          </button>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 pl-3 border-l-2 border-gray-100 space-y-2">
          {comment.replies.map(reply => (
            <ReplyRow key={reply.id} reply={reply} />
          ))}
        </div>
      )}

      {/* Reply form */}
      {showReplyForm ? (
        <div className="mt-3 pl-3 border-l-2 border-blue-100" onClick={e => e.stopPropagation()}>
          <input
            type="text"
            placeholder="Your name"
            value={replyAuthor}
            onChange={e => setReplyAuthor(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <textarea
            placeholder="Write a reply..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={2}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <div className="flex gap-2 mt-1">
            <button onClick={handleSubmitReply} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Submit
            </button>
            <button
              onClick={() => { setReplyAuthor(''); setReplyText(''); setShowReplyForm(false); }}
              className="text-xs text-gray-500 hover:text-gray-600 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        onReply && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowReplyForm(true); }}
            className="mt-2 text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors"
          >
            Reply
          </button>
        )
      )}
    </div>
  );
}

// ---------- Single reply row ----------

function ReplyRow({ reply }: { reply: CommentReply }) {
  return (
    <div className="flex gap-2">
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white bg-gray-400 shrink-0 mt-0.5">
        {reply.author.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-medium text-gray-700">{reply.author}</span>
          <span className="text-[10px] text-gray-400">{reply.date}</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{reply.text}</p>
      </div>
    </div>
  );
}

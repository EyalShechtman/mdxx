'use client';
import { type CommentData } from '@/extensions/comment-mark';

interface CommentPopoverProps {
  comment: CommentData | null;
  position: { top: number; left: number } | null;
  onResolve: (id: string) => void;
  onReply: (id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function CommentPopover({ comment, position, onResolve, onReply, onMouseEnter, onMouseLeave }: CommentPopoverProps) {
  if (!comment || !position) return null;

  return (
    <div
      className="fixed z-50"
      style={{ top: position.top, left: position.left, transform: 'translateY(-100%)' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-[280px]">
        {/* Header: avatar + author + date */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-semibold text-white">
            {comment.author.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-gray-700">{comment.author}</span>
          <span className="text-[10px] text-gray-400 ml-auto">{comment.date}</span>
        </div>

        {/* Comment text */}
        <p className="text-sm text-gray-600 leading-relaxed mb-2">{comment.text}</p>

        {/* Reply count if any */}
        {comment.replies.length > 0 && (
          <p className="text-xs text-gray-400 mb-2">
            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 border-t border-gray-100 pt-1.5">
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Reply
          </button>
          <button
            onClick={() => onResolve(comment.id)}
            className="text-xs text-green-600 hover:text-green-700 font-medium"
          >
            {comment.resolved ? 'Reopen' : 'Resolve'}
          </button>
        </div>

        {/* Caret pointing down */}
        <div
          className="absolute left-3 bottom-0 translate-y-full w-0 h-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid white',
            filter: 'drop-shadow(0 1px 0 rgb(229 231 235))',
          }}
        />
      </div>
      {/* Invisible bridge zone so mouse can travel from text to popover */}
      <div className="w-full h-3" />
    </div>
  );
}

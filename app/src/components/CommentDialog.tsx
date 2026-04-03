'use client';
import { useState, useRef, useEffect } from 'react';

interface CommentDialogProps {
  onSubmit: (author: string, text: string) => void;
  onCancel: () => void;
}

export function CommentDialog({ onSubmit, onCancel }: CommentDialogProps) {
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(author.trim() || 'Anonymous', text.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-xl border w-96 p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Comment</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg mb-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
          <textarea
            ref={textRef}
            placeholder="Write your comment..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border rounded-lg mb-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Comment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

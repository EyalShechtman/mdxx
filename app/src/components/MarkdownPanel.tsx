'use client';
import { useState, useCallback } from 'react';

interface MarkdownPanelProps {
  markdown: string;
  onClose: () => void;
}

export function MarkdownPanel({ markdown, onClose }: MarkdownPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [markdown]);

  return (
    <div className="border-t bg-gray-900 flex flex-col" style={{ height: '280px' }}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-medium text-gray-300 tracking-wide uppercase">mdxx Source</span>
        <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="text-gray-400 hover:text-gray-200 p-1 text-xs"
          title="Copy to clipboard"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 p-1"
          title="Close markdown panel"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
          </svg>
        </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
          {markdown || '(empty document)'}
        </pre>
      </div>
    </div>
  );
}

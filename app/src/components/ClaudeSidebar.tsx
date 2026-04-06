'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '@/lib/chat-types';


interface ClaudeSidebarProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onApplyEdits: (messageIndex: number) => void;
  onDismissEdits: (messageIndex: number) => void;
  isLoading: boolean;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

export function ClaudeSidebar({ messages, onSendMessage, onApplyEdits, onDismissEdits, isLoading, hasApiKey, onOpenSettings }: ClaudeSidebarProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-grow textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const lineHeight = 20;
    const maxHeight = lineHeight * 4 + 16; // 4 lines + padding
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [input]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput('');
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-80 bg-gray-50 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <h2 className="text-sm font-semibold text-gray-800">Claude</h2>
        <button
          onClick={onOpenSettings}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Claude settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 5a3 3 0 100 6A3 3 0 008 5zm0 1.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
            <path d="M8 1a.75.75 0 01.75.75v.966a5.52 5.52 0 011.863.775l.683-.683a.75.75 0 011.06 1.06l-.683.683A5.52 5.52 0 0113.284 6.25h.966a.75.75 0 010 1.5h-.966a5.52 5.52 0 01-.775 1.863l.683.683a.75.75 0 11-1.06 1.06l-.683-.683A5.52 5.52 0 018.75 13.284v.966a.75.75 0 01-1.5 0v-.966a5.52 5.52 0 01-1.863-.775l-.683.683a.75.75 0 01-1.06-1.06l.683-.683A5.52 5.52 0 012.716 9.75H1.75a.75.75 0 010-1.5h.966a5.52 5.52 0 01.775-1.863l-.683-.683a.75.75 0 011.06-1.06l.683.683A5.52 5.52 0 017.25 2.716V1.75A.75.75 0 018 1z"/>
          </svg>
        </button>
      </div>

      {!hasApiKey ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-500">Configure your Anthropic API key to start chatting</p>
            <button
              onClick={onOpenSettings}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Configure API Key
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto px-3 py-2">
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-12 text-gray-400 text-sm">
                <p>Ask Claude to help edit your document</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col mb-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-lg px-3 py-2 text-sm max-w-[85%]'
                      : 'bg-white border rounded-lg px-3 py-2 text-sm max-w-[85%]'
                  }
                  style={{ wordBreak: 'break-word' }}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  )}
                </div>

                {msg.role === 'assistant' && msg.edits && msg.edits.length > 0 && (
                  <div className="flex gap-2 mt-1.5 px-1">
                    {msg.editsApplied ? (
                      <span className="text-[11px] text-green-600 font-medium">Edits applied</span>
                    ) : (
                      <>
                        <button
                          onClick={() => onApplyEdits(i)}
                          className="text-[11px] font-medium text-white bg-green-500 rounded px-2 py-0.5 hover:bg-green-600 transition-colors"
                        >
                          Apply {msg.edits.length} edit{msg.edits.length > 1 ? 's' : ''}
                        </button>
                        <button
                          onClick={() => onDismissEdits(i)}
                          className="text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                )}

                <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start mb-3">
                <div className="bg-white border rounded-lg px-3 py-2 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t bg-white p-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Claude to edit your document..."
              rows={1}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-gray-50 mb-2"
              style={{ overflow: 'hidden' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

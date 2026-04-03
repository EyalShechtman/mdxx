'use client';
import { useState, useRef, useEffect } from 'react';

interface BlockIdDialogProps {
  currentId: string | null;
  blockType: string;
  onSubmit: (blockId: string | null) => void;
  onCancel: () => void;
}

export function BlockIdDialog({ currentId, blockType, onSubmit, onCancel }: BlockIdDialogProps) {
  const [blockId, setBlockId] = useState(currentId ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = blockId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    onSubmit(id || null);
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-xl border w-80 p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Tag Block</h3>
        <p className="text-xs text-gray-500 mb-3">
          Assign an ID to this {blockType} so you can style it in the style section.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-1 mb-3">
            <span className="text-sm text-gray-400 font-mono">~</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. title, summary, chart1"
              value={blockId}
              onChange={e => setBlockId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 font-mono"
            />
          </div>
          <div className="flex justify-between">
            <div>
              {currentId && (
                <button
                  type="button"
                  onClick={() => onSubmit(null)}
                  className="px-3 py-1.5 text-sm text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                >
                  Remove ID
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600"
              >
                {currentId ? 'Update' : 'Apply'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

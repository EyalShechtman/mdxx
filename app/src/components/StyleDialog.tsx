'use client';
import { useState, useRef, useEffect } from 'react';

interface StyleDialogProps {
  onSubmit: (styleId: string) => void;
  onCancel: () => void;
  existingIds: string[];
}

export function StyleDialog({ onSubmit, onCancel, existingIds }: StyleDialogProps) {
  const [styleId, setStyleId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = styleId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!id) return;
    onSubmit(id);
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-xl border w-80 p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Apply Style</h3>
        <p className="text-xs text-gray-500 mb-3">
          Give this text a style name. You can define its appearance in the style section.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. highlight, emphasis, brand-name"
            value={styleId}
            onChange={e => setStyleId(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg mb-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 font-mono"
          />
          {existingIds.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Existing styles</p>
              <div className="flex flex-wrap gap-1">
                {existingIds.map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setStyleId(id); }}
                    className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 font-mono"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}
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
              disabled={!styleId.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { AVAILABLE_MODELS, DEFAULT_MODEL, type ClaudeConfig } from '@/lib/claude-api';

interface SettingsDialogProps {
  initialConfig: ClaudeConfig | null;
  onSave: (config: ClaudeConfig) => void;
  onCancel: () => void;
}

export function SettingsDialog({ initialConfig, onSave, onCancel }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey ?? '');
  const [model, setModel] = useState(initialConfig?.model ?? DEFAULT_MODEL);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ apiKey: apiKey.trim(), model });
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-xl border w-96 p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Claude Settings</h3>
        <p className="text-xs text-gray-500 mb-3">
          Configure your Anthropic API key and preferred model.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="block text-xs text-gray-500 mb-1">API Key</label>
          <div className="relative mb-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg pr-16 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 font-mono"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(prev => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 px-1"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mb-3">
            Get an API key at console.anthropic.com
          </p>

          <label className="block text-xs text-gray-500 mb-1">Model</label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg mb-4 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
          >
            {AVAILABLE_MODELS.map(m => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

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
              disabled={!apiKey.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

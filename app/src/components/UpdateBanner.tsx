'use client';

import { useState, useEffect } from 'react';

interface UpdateInfo {
  version: string;
  downloadAndInstall: (onProgress?: (event: { event: string; data: { chunkLength?: number; contentLength?: number } }) => void) => Promise<void>;
}

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'error'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;

    import('@tauri-apps/plugin-updater').then(({ check }) => {
      check().then((u) => {
        if (u) setUpdate(u as unknown as UpdateInfo);
      }).catch(console.error);
    });
  }, []);

  if (!update) return null;

  const handleUpdate = async () => {
    setStatus('downloading');
    try {
      await update.downloadAndInstall();
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (e) {
      console.error('Update failed:', e);
      setStatus('error');
    }
  };

  return (
    <div className="bg-blue-600 text-white text-sm px-4 py-2 flex items-center justify-between shrink-0">
      <span>
        {status === 'error'
          ? 'Update failed. Please try again later.'
          : `mdxx v${update.version} is available`}
      </span>
      <button
        onClick={handleUpdate}
        disabled={status === 'downloading'}
        className="underline hover:no-underline disabled:opacity-50 disabled:cursor-wait"
      >
        {status === 'downloading' ? 'Downloading...' : 'Update & Restart'}
      </button>
    </div>
  );
}

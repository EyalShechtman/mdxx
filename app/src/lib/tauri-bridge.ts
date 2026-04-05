import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';

// ---------------------------------------------------------------------------
// File system
// ---------------------------------------------------------------------------

export async function readFile(path: string): Promise<string> {
  return invoke<string>('read_file', { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke<void>('write_file', { path, content });
}

// ---------------------------------------------------------------------------
// File dialogs
// ---------------------------------------------------------------------------

export async function openFileDialog(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{ name: 'mdxx files', extensions: ['mdxx'] }],
  });
  if (Array.isArray(result)) {
    return result[0] ?? null;
  }
  return result;
}

export async function openMdFileDialog(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{ name: 'Markdown files', extensions: ['md'] }],
  });
  if (Array.isArray(result)) {
    return result[0] ?? null;
  }
  return result;
}

export async function saveFileDialog(defaultName?: string): Promise<string | null> {
  const result = await save({
    defaultPath: defaultName,
    filters: [{ name: 'mdxx files', extensions: ['mdxx'] }],
  });
  return result;
}

// ---------------------------------------------------------------------------
// App data (key-value persistence via Tauri backend)
// ---------------------------------------------------------------------------

export async function readAppData(key: string): Promise<string | null> {
  return invoke<string | null>('read_app_data', { key });
}

export async function writeAppData(key: string, value: string): Promise<void> {
  return invoke<void>('write_app_data', { key, value });
}

// ---------------------------------------------------------------------------
// Files opened via OS "Open With" / drag-and-drop
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __TAURI_OPENED_FILES__?: string[];
  }
}

export function getOpenedFiles(): string[] {
  return window.__TAURI_OPENED_FILES__ ?? [];
}

export async function getPendingFiles(): Promise<string[]> {
  return invoke<string[]>('get_pending_files');
}

export function onFileOpened(callback: (paths: string[]) => void): () => void {
  let unlisten: (() => void) | undefined;

  listen<string[]>('file-opened', (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });

  return () => {
    unlisten?.();
  };
}

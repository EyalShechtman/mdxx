'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { CommentData } from '@/extensions/comment-mark';
import type { ChatMessage } from '@/lib/chat-types';
import { parseChatHistory } from '@/lib/chat-types';
import {
  readFile,
  writeFile,
  saveFileDialog,
  getOpenedFiles,
  getPendingFiles,
  onFileOpened,
} from '@/lib/tauri-bridge';
import { mdxxToTiptap } from '@/lib/mdxx-to-tiptap';
import { mdToHtml } from '@/lib/md-to-html';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpenFile {
  path: string | null;
  title: string;
  content: string;
  comments: CommentData[];
  elementStyles?: Record<string, Record<string, string>>;
  isDirty: boolean;
  agentInstructions: string | null;
  chatHistory: ChatMessage[];
}

interface FileContextValue {
  openFiles: OpenFile[];
  activeIndex: number;
  activeFile: OpenFile | null;
  openFile: (path: string) => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: () => Promise<void>;
  closeFile: (index: number) => void;
  createNewFile: () => void;
  importMdFile: (path: string) => Promise<void>;
  updateContent: (html: string) => void;
  updateComments: (comments: CommentData[]) => void;
  updateChatHistory: (chatHistory: ChatMessage[]) => void;
  updateTitle: (title: string) => void;
  setActiveIndex: (index: number) => void;
  setBuildMdxx: (fn: () => string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONTENT = '<h1>Untitled Document</h1><p>Start writing here...</p>';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const FileContext = createContext<FileContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function titleFromPath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1] ?? 'Untitled';
  return filename.replace(/\.mdxx?$/i, '');
}

function titleFromHtml(html: string): string {
  if (typeof window === 'undefined') return 'Untitled Document';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const h1 = doc.querySelector('h1');
  return h1?.textContent?.trim() || 'Untitled Document';
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FileProvider({ children }: { children: ReactNode }) {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Ref to the function that builds mdxx text from the current editor state.
  const buildMdxxRef = useRef<(() => string) | null>(null);

  // Keep a ref to openFiles so async callbacks can read the latest value.
  const openFilesRef = useRef<OpenFile[]>(openFiles);
  openFilesRef.current = openFiles;

  const setBuildMdxx = useCallback((fn: () => string) => {
    buildMdxxRef.current = fn;
  }, []);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const activeFile = openFiles[activeIndex] ?? null;

  // ---------------------------------------------------------------------------
  // Open a .mdxx file
  // ---------------------------------------------------------------------------

  const openFile = useCallback(async (path: string) => {
    // If already open, just switch to it.
    const existingIndex = openFilesRef.current.findIndex((f) => f.path === path);
    if (existingIndex !== -1) {
      setActiveIndex(existingIndex);
      return;
    }

    const raw = await readFile(path);
    const { html, comments, elementStyles, agentInstructions, chatHistory } = await mdxxToTiptap(raw);
    const title = titleFromPath(path);

    setOpenFiles((prev) => {
      // Guard against the file being opened a second time while we were loading.
      const existingIdx = prev.findIndex((f) => f.path === path);
      if (existingIdx !== -1) {
        setActiveIndex(existingIdx);
        return prev;
      }
      const newFile: OpenFile = {
        path,
        title,
        content: html,
        comments,
        elementStyles,
        isDirty: false,
        agentInstructions: agentInstructions,
        chatHistory: chatHistory ? parseChatHistory(chatHistory) : [],
      };
      const next = [...prev, newFile];
      setActiveIndex(next.length - 1);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const saveFileAs = useCallback(async () => {
    const path = await saveFileDialog();
    if (!path) return;

    const mdxx = buildMdxxRef.current?.() ?? '';
    await writeFile(path, mdxx);

    setOpenFiles((prev) => {
      const next = prev.map((f, i) => {
        if (i !== activeIndex) return f;
        const title = titleFromPath(path);
        return { ...f, path, title, isDirty: false };
      });
      return next;
    });
  }, [activeIndex]);

  const saveFile = useCallback(async () => {
    const file = openFiles[activeIndex];
    if (!file) return;

    if (!file.path) {
      await saveFileAs();
      return;
    }

    const mdxx = buildMdxxRef.current?.() ?? '';
    await writeFile(file.path, mdxx);

    setOpenFiles((prev) =>
      prev.map((f, i) => (i === activeIndex ? { ...f, isDirty: false } : f)),
    );
  }, [openFiles, activeIndex, saveFileAs]);

  // ---------------------------------------------------------------------------
  // Create new file
  // ---------------------------------------------------------------------------

  const createNewFile = useCallback(() => {
    const newFile: OpenFile = {
      path: null,
      title: 'Untitled Document',
      content: DEFAULT_CONTENT,
      comments: [],
      isDirty: false,
      agentInstructions: null,
      chatHistory: [],
    };
    setOpenFiles((prev) => {
      const next = [...prev, newFile];
      setActiveIndex(next.length - 1);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Import a .md file
  // ---------------------------------------------------------------------------

  const importMdFile = useCallback(async (path: string) => {
    const raw = await readFile(path);
    const html = mdToHtml(raw);
    const title = titleFromPath(path);

    const newFile: OpenFile = {
      path: null,
      title,
      content: html,
      comments: [],
      isDirty: true,
      agentInstructions: null,
      chatHistory: [],
    };
    setOpenFiles((prev) => {
      const next = [...prev, newFile];
      setActiveIndex(next.length - 1);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Close a file
  // ---------------------------------------------------------------------------

  const closeFile = useCallback(
    (index: number) => {
      const file = openFiles[index];
      if (!file) return;

      if (
        file.isDirty &&
        !window.confirm(`"${file.title}" has unsaved changes. Close anyway?`)
      ) {
        return;
      }

      setOpenFiles((prev) => {
        const next = prev.filter((_, i) => i !== index);
        return next;
      });

      setActiveIndex((prev) => {
        if (prev > index) return prev - 1;
        if (prev === index) return Math.max(0, index - 1);
        return prev;
      });
    },
    [openFiles],
  );

  // ---------------------------------------------------------------------------
  // Update helpers (called by the editor on change)
  // ---------------------------------------------------------------------------

  const updateContent = useCallback((html: string) => {
    setOpenFiles((prev) =>
      prev.map((f, i) => {
        if (i !== activeIndex) return f;
        const title = titleFromHtml(html);
        return { ...f, content: html, title, isDirty: true };
      }),
    );
  }, [activeIndex]);

  const updateComments = useCallback(
    (comments: CommentData[]) => {
      setOpenFiles((prev) =>
        prev.map((f, i) => (i === activeIndex ? { ...f, comments, isDirty: true } : f)),
      );
    },
    [activeIndex],
  );

  const updateChatHistory = useCallback(
    (chatHistory: ChatMessage[]) => {
      setOpenFiles((prev) =>
        prev.map((f, i) => (i === activeIndex ? { ...f, chatHistory, isDirty: true } : f)),
      );
    },
    [activeIndex],
  );

  const updateTitle = useCallback(
    (title: string) => {
      setOpenFiles((prev) =>
        prev.map((f, i) => (i === activeIndex ? { ...f, title } : f)),
      );
    },
    [activeIndex],
  );

  // ---------------------------------------------------------------------------
  // Mount: open files passed by the OS (Finder / drag-drop)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Windows/Linux: files passed via global variable at startup.
    const files = getOpenedFiles();
    for (const path of files) {
      openFile(path);
    }

    // macOS: files may have arrived via RunEvent::Opened before this
    // listener was registered.  Retrieve them from the Rust-side queue.
    getPendingFiles().then((pending) => {
      for (const path of pending) {
        openFile(path);
      }
    });

    // macOS: listen for files opened while the app is already running.
    const unlisten = onFileOpened((paths) => {
      for (const path of paths) {
        openFile(path);
      }
    });

    return unlisten;
  }, [openFile]);

  // ---------------------------------------------------------------------------
  // Provide context
  // ---------------------------------------------------------------------------

  return (
    <FileContext.Provider
      value={{
        openFiles,
        activeIndex,
        activeFile,
        openFile,
        saveFile,
        saveFileAs,
        closeFile,
        createNewFile,
        importMdFile,
        updateContent,
        updateComments,
        updateChatHistory,
        updateTitle,
        setActiveIndex,
        setBuildMdxx,
      }}
    >
      {children}
    </FileContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFiles() {
  const ctx = useContext(FileContext);
  if (!ctx) throw new Error('useFiles must be used within a FileProvider');
  return ctx;
}

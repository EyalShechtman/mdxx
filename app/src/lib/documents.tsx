'use client';
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { CommentData } from '@/extensions/comment-mark';

export interface Document {
  slug: string;
  title: string;
  content: string;
  comments: CommentData[];
  folder: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentsContextValue {
  documents: Document[];
  folders: string[];
  activeSlug: string | null;
  createDocument: (title: string, content?: string, folder?: string | null) => Document;
  updateDocument: (slug: string, updates: Partial<Pick<Document, 'title' | 'content' | 'comments' | 'folder'>>) => void;
  deleteDocument: (slug: string) => void;
  getDocument: (slug: string) => Document | undefined;
  createFolder: (name: string) => void;
  renameFolder: (oldName: string, newName: string) => void;
  deleteFolder: (name: string) => void;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

const STORAGE_KEY = 'mdxx-documents';
const FOLDERS_KEY = 'mdxx-folders';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'untitled';
}

function makeUniqueSlug(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

const DEFAULT_CONTENT = `
<h1>Untitled Document</h1>
<p>Start writing here...</p>
`;

const SAMPLE_CONTENT = `
<h1 style="text-align: center">Q4 2025 Revenue Report</h1>
<h2>Executive Summary</h2>
<p>Revenue grew 23% year-over-year, driven primarily by enterprise expansion. Our <strong>cloud platform</strong> continues to be the primary growth driver.</p>
<figure><img src="/sample.png" alt="Revenue chart" /><figcaption>Fig 1. Revenue growth Q3-Q4 2025</figcaption></figure>
<h2>Key Metrics</h2>
<table>
  <thead><tr><th>Metric</th><th>Q3 2025</th><th>Q4 2025</th><th>Change</th></tr></thead>
  <tbody>
    <tr><td>ARR</td><td>$42M</td><td>$51M</td><td>+21%</td></tr>
    <tr><td>Net Revenue</td><td>$12.5M</td><td>$15.4M</td><td>+23%</td></tr>
    <tr><td>Customers</td><td>340</td><td>412</td><td>+21%</td></tr>
    <tr><td>NRR</td><td>118%</td><td>122%</td><td>+4pp</td></tr>
  </tbody>
</table>
<p>The <mark>enterprise segment</mark> showed the strongest growth, contributing 67% of new ARR.</p>
<p>Mid-market expansion was <strong>ahead of plan</strong> by 12%, driven by the new self-serve onboarding flow.</p>
<blockquote><p>We're seeing unprecedented demand in the mid-market segment. The pipeline for Q1 is already 40% larger than this time last year.<br/>— Sarah Chen, VP Sales</p></blockquote>
<h2>Regional Breakdown</h2>
<ul>
  <li>North America: +28% YoY</li>
  <li>EMEA: +19% YoY</li>
  <li>APAC: +31% YoY (fastest growing)</li>
</ul>
<hr />
<h2>Outlook</h2>
<p>We expect continued growth through H1 2026, with particular strength in healthcare and financial services verticals.</p>
<p>Key risks include macro headwinds in European markets and potential currency effects on APAC revenue.</p>
<h2>Appendix</h2>
<p>Detailed breakdown by vertical available in the supplementary data.</p>
`;

function loadDocuments(): Document[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const docs: Document[] = JSON.parse(raw);
      // Migrate: add folder field if missing
      return docs.map(d => ({ ...d, folder: d.folder ?? null }));
    }
  } catch {}
  // Seed with sample document
  const now = new Date().toISOString();
  const sample: Document = {
    slug: 'q4-2025-revenue-report',
    title: 'Q4 2025 Revenue Report',
    content: SAMPLE_CONTENT,
    comments: [
      {
        id: 'c1',
        author: 'Igor',
        text: 'Can we break this down by sub-segment? Mid-market vs large enterprise.',
        date: '2026-03-29',
        resolved: false,
      },
    ],
    folder: null,
    createdAt: now,
    updatedAt: now,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([sample]));
  return [sample];
}

function loadFolders(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFoldersRaw] = useState<string[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    setDocuments(loadDocuments());
    setFoldersRaw(loadFolders());
  }, []);

  const persist = useCallback((docs: Document[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }, []);

  const persistFolders = useCallback((f: string[]) => {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(f));
  }, []);

  const createDocument = useCallback((title: string, content?: string, folder?: string | null): Document => {
    const now = new Date().toISOString();
    const doc: Document = {
      slug: '',
      title,
      content: content ?? DEFAULT_CONTENT.replace('Untitled Document', title),
      comments: [],
      folder: folder ?? null,
      createdAt: now,
      updatedAt: now,
    };
    setDocuments(prev => {
      doc.slug = makeUniqueSlug(slugify(title), prev.map(d => d.slug));
      const next = [...prev, doc];
      persist(next);
      return next;
    });
    return doc;
  }, [persist]);

  const updateDocument = useCallback((slug: string, updates: Partial<Pick<Document, 'title' | 'content' | 'comments' | 'folder'>>) => {
    setDocuments(prev => {
      const next = prev.map(d => {
        if (d.slug !== slug) return d;
        return { ...d, ...updates, updatedAt: new Date().toISOString() };
      });
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteDocument = useCallback((slug: string) => {
    setDocuments(prev => {
      const next = prev.filter(d => d.slug !== slug);
      persist(next);
      return next;
    });
  }, [persist]);

  const getDocument = useCallback((slug: string) => {
    return documents.find(d => d.slug === slug);
  }, [documents]);

  const createFolder = useCallback((name: string) => {
    setFoldersRaw(prev => {
      if (prev.includes(name)) return prev;
      const next = [...prev, name];
      persistFolders(next);
      return next;
    });
  }, [persistFolders]);

  const renameFolder = useCallback((oldName: string, newName: string) => {
    setFoldersRaw(prev => {
      const next = prev.map(f => f === oldName ? newName : f);
      persistFolders(next);
      return next;
    });
    // Update all documents in this folder
    setDocuments(prev => {
      const next = prev.map(d => d.folder === oldName ? { ...d, folder: newName } : d);
      persist(next);
      return next;
    });
  }, [persist, persistFolders]);

  const deleteFolder = useCallback((name: string) => {
    setFoldersRaw(prev => {
      const next = prev.filter(f => f !== name);
      persistFolders(next);
      return next;
    });
    // Move documents to root
    setDocuments(prev => {
      const next = prev.map(d => d.folder === name ? { ...d, folder: null } : d);
      persist(next);
      return next;
    });
  }, [persist, persistFolders]);

  return (
    <DocumentsContext.Provider value={{
      documents, folders, activeSlug,
      createDocument, updateDocument, deleteDocument, getDocument,
      createFolder, renameFolder, deleteFolder,
    }}>
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used within DocumentsProvider');
  return ctx;
}

'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDocuments } from '@/lib/documents';
import { mdToHtml } from '@/lib/md-to-html';

export function Sidebar() {
  const {
    documents, folders,
    createDocument, deleteDocument, updateDocument,
    createFolder, renameFolder, deleteFolder,
  } = useDocuments();
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSlug = pathname?.startsWith('/doc/')
    ? pathname.replace('/doc/', '')
    : null;

  const filtered = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFolder = (name: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleNewDocument = (folder?: string | null) => {
    const title = 'Untitled Document';
    const doc = createDocument(title, undefined, folder);
    if (doc.slug) {
      window.location.href = `/doc/${doc.slug}`;
    }
  };

  const handleNewFolder = () => {
    const name = prompt('Folder name:');
    if (name?.trim()) {
      createFolder(name.trim());
    }
  };

  const handleStartRenameFolder = (name: string) => {
    setEditingFolder(name);
    setEditingFolderName(name);
  };

  const handleFinishRenameFolder = () => {
    if (editingFolder && editingFolderName.trim() && editingFolderName !== editingFolder) {
      renameFolder(editingFolder, editingFolderName.trim());
    }
    setEditingFolder(null);
    setEditingFolderName('');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const text = await file.text();
      const name = file.name.replace(/\.(md|mdx|mdxx|txt)$/i, '');
      const title = name || 'Imported Document';
      const html = mdToHtml(text);
      const doc = createDocument(title, html);
      // Navigate to the last imported document
      if (doc.slug) {
        window.location.href = `/doc/${doc.slug}`;
      }
    }

    // Reset input so the same file can be imported again
    e.target.value = '';
  };

  const handleDragStart = (e: React.DragEvent, slug: string) => {
    e.dataTransfer.setData('text/plain', slug);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, folder: string | null) => {
    e.preventDefault();
    const slug = e.dataTransfer.getData('text/plain');
    if (slug) {
      updateDocument(slug, { folder });
    }
    setDragOverFolder(null);
  };

  const handleDragOver = (e: React.DragEvent, folder: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folder ?? '__root__');
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  // Group documents by folder
  const rootDocs = filtered.filter(d => !d.folder);
  const folderDocs = (name: string) => filtered.filter(d => d.folder === name);

  // Folders that have documents (even if not in the explicit folders list)
  const allFolderNames = [...new Set([
    ...folders,
    ...documents.map(d => d.folder).filter((f): f is string => f !== null),
  ])].sort();

  return (
    <nav className="w-72 h-full border-r bg-white flex flex-col shrink-0">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b gap-1">
        <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-6 h-6 text-indigo-600 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <span className="font-semibold text-gray-800 text-sm truncate">mdxx</span>
        </Link>
        {/* Import button */}
        <button
          onClick={handleImport}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="Import .md file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
        </button>
        {/* New folder button */}
        <button
          onClick={handleNewFolder}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="New folder"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
          </svg>
        </button>
        {/* New document button */}
        <button
          onClick={() => handleNewDocument()}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="New document"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.mdx,.mdxx,.txt,.markdown"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-gray-400 absolute left-2.5 inset-y-0 my-auto"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 text-sm text-gray-700 outline-none border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          />
        </div>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-auto px-2">
        {/* Folders */}
        {allFolderNames.map(folderName => {
          const docs = folderDocs(folderName);
          const isCollapsed = collapsedFolders.has(folderName);
          const isEditing = editingFolder === folderName;
          const isDragOver = dragOverFolder === folderName;

          // When searching, skip empty folders
          if (search && docs.length === 0) return null;

          return (
            <div
              key={folderName}
              className="mb-1"
              onDragOver={(e) => handleDragOver(e, folderName)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folderName)}
            >
              <div
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md group cursor-pointer transition-colors ${
                  isDragOver ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-gray-50'
                }`}
                onClick={() => !isEditing && toggleFolder(folderName)}
              >
                {/* Chevron */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                >
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
                {/* Folder icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 shrink-0">
                  <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
                </svg>
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onBlur={handleFinishRenameFolder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRenameFolder();
                      if (e.key === 'Escape') { setEditingFolder(null); setEditingFolderName(''); }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 text-xs font-medium text-gray-700 bg-white border border-indigo-300 rounded px-1 py-0.5 outline-none"
                  />
                ) : (
                  <span className="flex-1 min-w-0 text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                    {folderName}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 mr-1">{docs.length}</span>
                {/* Folder actions */}
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNewDocument(folderName); }}
                    className="p-0.5 rounded text-gray-400 hover:text-indigo-600"
                    title="New document in folder"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                      <path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartRenameFolder(folderName); }}
                    className="p-0.5 rounded text-gray-400 hover:text-gray-600"
                    title="Rename folder"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                      <path d="M13.488 2.513a1.75 1.75 0 00-2.475 0L3.763 9.762a2.5 2.5 0 00-.596 1.018l-.875 2.917a.75.75 0 00.933.933l2.917-.875a2.5 2.5 0 001.018-.596l7.25-7.25a1.75 1.75 0 000-2.475l-.922-.921z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete folder "${folderName}"? Documents will be moved to root.`)) {
                        deleteFolder(folderName);
                      }
                    }}
                    className="p-0.5 rounded text-gray-400 hover:text-red-500"
                    title="Delete folder"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                      <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Folder contents */}
              {!isCollapsed && (
                <ul className="ml-3 pl-2 border-l border-gray-100 space-y-0.5 mt-0.5">
                  {docs.length === 0 && (
                    <li className="px-2 py-2 text-xs text-gray-400 italic">Empty folder</li>
                  )}
                  {docs.map(doc => (
                    <DocumentItem
                      key={doc.slug}
                      doc={doc}
                      isActive={doc.slug === activeSlug}
                      onDelete={deleteDocument}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/* Root documents (no folder) */}
        {rootDocs.length > 0 && (
          <div
            className={`mt-1 ${dragOverFolder === '__root__' ? 'bg-gray-50 rounded-md ring-1 ring-gray-200' : ''}`}
            onDragOver={(e) => handleDragOver(e, null)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          >
            {allFolderNames.length > 0 && (
              <div className="px-2 pb-1 pt-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Documents</span>
              </div>
            )}
            <ul className="space-y-0.5">
              {rootDocs.map(doc => (
                <DocumentItem
                  key={doc.slug}
                  doc={doc}
                  isActive={doc.slug === activeSlug}
                  onDelete={deleteDocument}
                  onDragStart={handleDragStart}
                />
              ))}
            </ul>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="px-2 py-4 text-sm text-gray-400 text-center">
            {search ? 'No matches' : 'No documents yet'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-3 flex gap-2">
        <button
          onClick={() => handleNewDocument()}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 active:bg-indigo-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          New Document
        </button>
        <button
          onClick={handleImport}
          className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 active:bg-gray-300 transition-colors"
          title="Import .md file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Import
        </button>
      </div>
    </nav>
  );
}

function DocumentItem({
  doc,
  isActive,
  onDelete,
  onDragStart,
}: {
  doc: { slug: string; title: string };
  isActive: boolean;
  onDelete: (slug: string) => void;
  onDragStart: (e: React.DragEvent, slug: string) => void;
}) {
  return (
    <li
      className="group relative"
      draggable
      onDragStart={(e) => onDragStart(e, doc.slug)}
    >
      <Link
        href={`/doc/${doc.slug}`}
        className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-indigo-50 text-indigo-700 font-medium'
            : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}
        >
          <path
            fillRule="evenodd"
            d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
            clipRule="evenodd"
          />
        </svg>
        <span className="truncate">{doc.title}</span>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (confirm(`Delete "${doc.title}"?`)) {
            onDelete(doc.slug);
            if (isActive) {
              window.location.href = '/';
            }
          }
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete document"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
        </svg>
      </button>
    </li>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDocuments } from '@/lib/documents';

export function Sidebar() {
  const { documents, createDocument, deleteDocument } = useDocuments();
  const pathname = usePathname();
  const [search, setSearch] = useState('');

  const activeSlug = pathname?.startsWith('/doc/')
    ? pathname.replace('/doc/', '')
    : null;

  const filtered = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewDocument = () => {
    const title = 'Untitled Document';
    const doc = createDocument(title);
    // Navigate after creation — slug is set synchronously in createDocument
    if (doc.slug) {
      window.location.href = `/doc/${doc.slug}`;
    }
  };

  return (
    <nav className="w-72 h-full border-r bg-white flex flex-col shrink-0">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b gap-2">
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
        <button
          onClick={handleNewDocument}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="New document"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </button>
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
        <div className="px-2 pb-1">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Documents</span>
        </div>
        <ul className="space-y-0.5">
          {filtered.length === 0 && (
            <li className="px-2 py-4 text-sm text-gray-400 text-center">
              {search ? 'No matches' : 'No documents yet'}
            </li>
          )}
          {filtered.map((doc) => {
            const isActive = doc.slug === activeSlug;
            return (
              <li key={doc.slug} className="group relative">
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
                {/* Delete button on hover */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Delete "${doc.title}"?`)) {
                      deleteDocument(doc.slug);
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
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-3">
        <button
          onClick={handleNewDocument}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 active:bg-indigo-200 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          New Document
        </button>
      </div>
    </nav>
  );
}

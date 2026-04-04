'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Editor } from '@/components/Editor';
import { useDocuments } from '@/lib/documents';

export default function DocPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { documents, getDocument, updateDocument } = useDocuments();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const slug = params.slug;
  const doc = getDocument(slug);

  if (!mounted || documents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4">
        <p className="text-lg text-gray-500">Document not found</p>
        <button
          onClick={() => router.push('/')}
          className="text-indigo-600 hover:underline text-sm"
        >
          Go back home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Editor
        key={slug}
        initialContent={doc.content}
        initialComments={doc.comments}
        onChange={(html) => {
          updateDocument(slug, { content: html });
        }}
        onCommentsChange={(comments) => {
          updateDocument(slug, { comments });
        }}
        onTitleChange={(title) => {
          updateDocument(slug, { title });
        }}
      />
    </div>
  );
}

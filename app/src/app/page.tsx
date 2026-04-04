'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDocuments } from '@/lib/documents';

export default function Home() {
  const { documents, createDocument } = useDocuments();
  const router = useRouter();

  useEffect(() => {
    if (documents.length === 0) return; // Still loading
    router.replace(`/doc/${documents[0].slug}`);
  }, [documents, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-lg text-gray-400">Loading...</p>
    </div>
  );
}

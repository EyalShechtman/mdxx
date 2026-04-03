'use client';

interface PreviewProps {
  html: string;
}

export function Preview({ html }: PreviewProps) {
  return (
    <div className="h-full overflow-auto p-8 bg-white">
      <div
        className="mdxx-preview prose max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

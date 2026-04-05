'use client';

import { useFiles } from '@/lib/file-context';
import { openFileDialog, openMdFileDialog } from '@/lib/tauri-bridge';

export function Sidebar() {
  const {
    openFiles,
    activeIndex,
    createNewFile,
    openFile,
    importMdFile,
    closeFile,
    setActiveIndex,
  } = useFiles();

  const handleOpen = async () => {
    const path = await openFileDialog();
    if (path) await openFile(path);
  };

  const handleImport = async () => {
    const path = await openMdFileDialog();
    if (path) await importMdFile(path);
  };

  return (
    <nav className="w-64 h-full border-r bg-white flex flex-col shrink-0">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-5 h-5 text-indigo-600 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <span className="font-semibold text-gray-800 text-sm">mdxx</span>
        </div>

        {/* New button */}
        <button
          onClick={createNewFile}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="New document"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </button>

        {/* Import button */}
        <button
          onClick={handleImport}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="Import .md file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
        </button>

        {/* Open button */}
        <button
          onClick={handleOpen}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="Open .mdxx file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
          </svg>
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto py-2 px-2">
        {openFiles.length === 0 && (
          <p className="px-2 py-4 text-sm text-gray-400 text-center">No open files</p>
        )}
        <ul className="space-y-0.5">
          {openFiles.map((file, index) => {
            const isActive = index === activeIndex;
            const filename = file.path
              ? file.path.replace(/\\/g, '/').split('/').pop() ?? file.path
              : 'Unsaved';

            return (
              <li key={index} className="group relative">
                <button
                  onClick={() => setActiveIndex(index)}
                  className={`w-full flex items-start gap-2 px-2 py-2 rounded-md text-left transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  {/* File icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
                      clipRule="evenodd"
                    />
                  </svg>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate">{file.title}</span>
                      {file.isDirty && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-indigo-400' : 'bg-gray-400'}`}
                          title="Unsaved changes"
                        />
                      )}
                    </div>
                    <span
                      className={`text-xs truncate block ${isActive ? 'text-indigo-400' : 'text-gray-400'}`}
                    >
                      {filename}
                    </span>
                  </div>
                </button>

                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(index);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Close file"
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
    </nav>
  );
}

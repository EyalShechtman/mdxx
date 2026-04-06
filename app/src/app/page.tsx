'use client';

import { useFiles } from '@/lib/file-context';
import { Editor } from '@/components/Editor';
import { openFileDialog } from '@/lib/tauri-bridge';

export default function Home() {
  const {
    activeFile,
    activeIndex,
    saveFile,
    saveFileAs,
    createNewFile,
    openFile,
    updateContent,
    updateComments,
    updateChatHistory,
    updateTitle,
    setBuildMdxx,
  } = useFiles();

  const handleSave = () => {
    if (activeFile?.path) {
      saveFile();
    } else {
      saveFileAs();
    }
  };

  const handleOpenFile = async () => {
    const path = await openFileDialog();
    if (path) await openFile(path);
  };

  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="w-16 h-16 text-indigo-300"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <h1 className="text-2xl font-semibold text-gray-700">mdxx Editor</h1>
            <p className="text-sm text-gray-400">Create or open a document to get started.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={createNewFile}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              New Document
            </button>
            <button
              onClick={handleOpenFile}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
              </svg>
              Open File
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Editor
      key={activeIndex}
      initialContent={activeFile.content}
      initialComments={activeFile.comments}
      initialElementStyles={activeFile.elementStyles}
      agentInstructions={activeFile.agentInstructions}
      chatHistory={activeFile.chatHistory}
      onChange={updateContent}
      onCommentsChange={updateComments}
      onChatHistoryChange={updateChatHistory}
      onTitleChange={updateTitle}
      onSave={handleSave}
      onBuildMdxx={setBuildMdxx}
    />
  );
}

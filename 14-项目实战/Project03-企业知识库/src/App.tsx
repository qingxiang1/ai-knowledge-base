/**
 * 创建时间: 2026-06-03
 * 文件名: App.tsx
 * 文件描述: Project03 企业知识库应用根组件
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

import React, { useState } from "react";
import { ChatInterface } from "./components/ChatInterface";
import { DocumentList } from "./components/DocumentList";
import { UploadModal } from "./components/UploadModal";
import { useKnowledgeBase } from "./hooks/useKnowledgeBase";

/**
 * 应用根组件
 */
const App: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);
  const {
    documents,
    loading,
    selectedDocIds,
    loadDocuments,
    toggleSelect,
    clearSelection,
    removeDocument,
  } = useKnowledgeBase();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">企业知识库</h1>
            <p className="mt-1 text-sm text-gray-500">
              基于检索增强（RAG）的文档问答 · 答案附带真实来源引用
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            上传文档
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex h-[calc(100vh-160px)] gap-6">
          <div className="min-w-0 flex-1">
            <ChatInterface
              selectedDocIds={selectedDocIds}
              selectedCount={selectedDocIds.length}
              totalDocuments={documents.length}
            />
          </div>
          <div className="w-80 shrink-0 overflow-y-auto">
            <DocumentList
              documents={documents}
              loading={loading}
              selectedDocIds={selectedDocIds}
              onToggleSelect={toggleSelect}
              onClearSelection={clearSelection}
              onDelete={removeDocument}
            />
          </div>
        </div>
      </main>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={loadDocuments}
        />
      )}
    </div>
  );
};

export default App;

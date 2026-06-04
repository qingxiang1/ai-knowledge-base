import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { DocumentList } from './components/DocumentList';
import { UploadModal } from './components/UploadModal';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [refreshDocs, setRefreshDocs] = useState(0);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">企业知识库</h1>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            上传文档
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 h-[calc(100vh-140px)]">
          <div className="flex-1">
            <ChatInterface />
          </div>
          <div className="w-80">
            <DocumentList key={refreshDocs} />
          </div>
        </div>
      </main>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => setRefreshDocs((prev) => prev + 1)}
        />
      )}
    </div>
  );
};

export default App;

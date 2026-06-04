import React, { useState } from 'react';
import { Editor } from './components/Editor';
import { HistoryPanel } from './components/HistoryPanel';
import { useWriting } from './hooks/useWriting';
import { WritingStyle } from './types';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  const {
    content,
    result,
    loading,
    error,
    style,
    setStyle,
    setContent,
    handleAction,
    clearResult,
  } = useWriting();

  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">AI 写作助手</h1>
          <div className="flex items-center gap-4">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as WritingStyle)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={WritingStyle.FORMAL}>正式风格</option>
              <option value={WritingStyle.CASUAL}>轻松风格</option>
              <option value={WritingStyle.ACADEMIC}>学术风格</option>
              <option value={WritingStyle.CREATIVE}>创意风格</option>
              <option value={WritingStyle.BUSINESS}>商务风格</option>
            </select>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              历史记录
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
            <Editor
              content={content}
              result={result}
              loading={loading}
              error={error}
              onContentChange={setContent}
              onAction={handleAction}
              onClear={clearResult}
            />
          </div>
          {showHistory && (
            <div className="w-80">
              <HistoryPanel />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

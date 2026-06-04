import React from 'react';
import { WritingAction } from '../types';

interface EditorProps {
  content: string;
  result: string;
  loading: boolean;
  error: string | null;
  onContentChange: (value: string) => void;
  onAction: (action: WritingAction) => void;
  onClear: () => void;
}

/**
 * 编辑器组件
 * 提供文本输入和结果显示功能
 */
export const Editor: React.FC<EditorProps> = ({
  content,
  result,
  loading,
  error,
  onContentChange,
  onAction,
  onClear,
}) => {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">输入内容</label>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="输入主题、关键词或段落..."
          className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onAction(WritingAction.GENERATE)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '生成中...' : '生成文章'}
        </button>
        <button
          onClick={() => onAction(WritingAction.CONTINUE)}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          续写
        </button>
        <button
          onClick={() => onAction(WritingAction.POLISH)}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          润色
        </button>
        <button
          onClick={() => onAction(WritingAction.SHORTEN)}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          精简
        </button>
        <button
          onClick={() => onAction(WritingAction.EXPAND)}
          disabled={loading}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          扩展
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          清空
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
      )}

      {result && (
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">生成结果</label>
          <div className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-auto whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
};

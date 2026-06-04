import React, { useEffect, useState } from 'react';
import { HistoryItem } from '../types';
import { getHistory, deleteHistoryItem } from '../services/api';

/**
 * 历史记录面板组件
 */
export const HistoryPanel: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteHistoryItem(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) return <div className="p-4 text-gray-500">加载中...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-bold text-gray-800 mb-3">历史记录</h3>
      {history.length === 0 ? (
        <p className="text-sm text-gray-400">暂无记录</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-auto">
          {history.map((item) => (
            <div key={item.id} className="p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex justify-between items-start">
                <span className="font-medium text-blue-600">{item.request.action}</span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  删除
                </button>
              </div>
              <p className="text-gray-600 mt-1 line-clamp-2">{item.request.content}</p>
              <p className="text-gray-400 text-xs mt-1">
                {new Date(item.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

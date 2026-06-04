import React, { useEffect, useState } from 'react';
import { DocumentResponse, DocumentStatus } from '../types';
import { listDocuments, deleteDocument } from '../services/api';

/**
 * 文档列表组件
 */
export const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await listDocuments();
      setDocuments(res.items);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const statusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.COMPLETED:
        return 'text-green-600';
      case DocumentStatus.PROCESSING:
        return 'text-yellow-600';
      case DocumentStatus.FAILED:
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (loading) return <div className="p-4 text-gray-500">加载中...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold text-gray-800 mb-3">文档列表</h3>
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400">暂无文档</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium text-sm">{doc.title}</p>
                <p className={`text-xs ${statusColor(doc.status)}`}>{doc.status}</p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

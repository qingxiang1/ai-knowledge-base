/**
 * 创建时间: 2026-06-03
 * 文件名: DocumentList.tsx
 * 文件描述: Project03 企业知识库文档列表，展示元信息并支持勾选限定检索范围
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

import React from "react";
import { DocumentResponse } from "../types";

interface DocumentListProps {
  documents: DocumentResponse[];
  loading: boolean;
  selectedDocIds: string[];
  onToggleSelect: (docId: string) => void;
  onClearSelection: () => void;
  onDelete: (docId: string) => void;
}

/**
 * 将字节数格式化为可读大小
 * @param bytes 字节数
 * @returns 可读字符串
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 文档列表组件
 */
export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  loading,
  selectedDocIds,
  onToggleSelect,
  onClearSelection,
  onDelete,
}) => {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-gray-800">
          文档列表（{documents.length}）
        </h3>
        {selectedDocIds.length > 0 && (
          <button
            onClick={onClearSelection}
            className="text-xs text-blue-600 hover:underline"
          >
            清除选择
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-gray-400">
        {selectedDocIds.length > 0
          ? `已限定在 ${selectedDocIds.length} 个文档内检索`
          : "勾选文档可限定提问检索范围，默认检索全部"}
      </p>

      {loading ? (
        <p className="py-4 text-sm text-gray-500">加载中...</p>
      ) : documents.length === 0 ? (
        <p className="py-4 text-sm text-gray-400">
          暂无文档，点击右上角「上传文档」添加 txt / md 文件。
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const selected = selectedDocIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                className={`rounded-lg border p-3 transition ${
                  selected
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(doc.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {doc.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {doc.file_type.toUpperCase()} · {formatSize(doc.file_size)}{" "}
                      · {doc.chunk_count} 切片
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

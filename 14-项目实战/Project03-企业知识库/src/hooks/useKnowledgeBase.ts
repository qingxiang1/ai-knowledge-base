/**
 * 创建时间: 2026-06-14
 * 文件名: useKnowledgeBase.ts
 * 文件描述: Project03 企业知识库文档状态管理 Hook，负责加载、选择范围与删除
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import { useCallback, useEffect, useState } from "react";
import { DocumentResponse } from "../types";
import { deleteDocument, listDocuments } from "../services/api";

interface UseKnowledgeBaseReturn {
  documents: DocumentResponse[];
  loading: boolean;
  selectedDocIds: string[];
  loadDocuments: () => Promise<void>;
  toggleSelect: (docId: string) => void;
  clearSelection: () => void;
  removeDocument: (docId: string) => Promise<void>;
}

/**
 * 知识库文档管理 Hook
 */
export function useKnowledgeBase(): UseKnowledgeBaseReturn {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  /**
   * 加载文档列表
   */
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDocuments();
      setDocuments(res.items);
      // 清理已不存在的选中项
      setSelectedDocIds((prev) =>
        prev.filter((id) => res.items.some((doc) => doc.id === id)),
      );
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  /**
   * 切换文档选中状态（用于限定检索范围）
   * @param docId 文档 ID
   */
  const toggleSelect = useCallback((docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  }, []);

  /**
   * 清空选择
   */
  const clearSelection = useCallback(() => {
    setSelectedDocIds([]);
  }, []);

  /**
   * 删除文档
   * @param docId 文档 ID
   */
  const removeDocument = useCallback(async (docId: string) => {
    await deleteDocument(docId);
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
  }, []);

  return {
    documents,
    loading,
    selectedDocIds,
    loadDocuments,
    toggleSelect,
    clearSelection,
    removeDocument,
  };
}

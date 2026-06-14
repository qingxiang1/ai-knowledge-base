/**
 * 创建时间: 2026-06-14
 * 文件名: types.ts
 * 文件描述: Project03 企业知识库服务端共享类型定义
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

export type DocumentStatus = "completed" | "processing" | "failed";

/**
 * 文档记录
 */
export interface DocumentRecord {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 文档切片（检索的最小单位）
 */
export interface Chunk {
  id: string;
  doc_id: string;
  doc_title: string;
  index: number;
  text: string;
}

/**
 * 检索命中来源
 */
export interface RetrievedSource {
  doc_id: string;
  doc_title: string;
  text: string;
  relevance: number;
}

/**
 * 问答响应
 */
export interface ChatAnswer {
  id: string;
  question: string;
  answer: string;
  sources: RetrievedSource[];
  tokens_used: number;
  mode: "mock" | "api";
  created_at: string;
}

/**
 * 本地存储快照
 */
export interface KnowledgeStoreSnapshot {
  documents: DocumentRecord[];
  chunks: Chunk[];
  lastUpdatedAt: string | null;
}

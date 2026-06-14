/**
 * 创建时间: 2026-06-03
 * 文件名: index.ts
 * 文件描述: Project03 企业知识库前端类型定义
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

/**
 * 文档状态
 */
export type DocumentStatus = "completed" | "processing" | "failed";

/**
 * 文档响应
 */
export interface DocumentResponse {
  id: string;
  title: string;
  description?: string | null;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 文档列表响应
 */
export interface DocumentListResponse {
  total: number;
  items: DocumentResponse[];
}

/**
 * 检索来源
 */
export interface ChatSource {
  doc_id: string;
  doc_title: string;
  text: string;
  relevance: number;
}

/**
 * 问答响应
 */
export interface ChatResponse {
  id: string;
  question: string;
  answer: string;
  sources: ChatSource[];
  tokens_used: number;
  mode: "mock" | "api";
  created_at: string;
}

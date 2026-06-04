/**
 * 文档类型枚举
 */
export enum DocumentType {
  PDF = 'pdf',
  DOCX = 'docx',
  MD = 'md',
  TXT = 'txt',
}

/**
 * 文档状态枚举
 */
export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 文档响应
 */
export interface DocumentResponse {
  id: string;
  title: string;
  description?: string;
  file_type: DocumentType;
  file_size: number;
  status: DocumentStatus;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 聊天响应
 */
export interface ChatResponse {
  id: string;
  answer: string;
  sources: Array<{
    doc_id: string;
    text: string;
    relevance: number;
  }>;
  tokens_used: number;
  created_at: string;
}

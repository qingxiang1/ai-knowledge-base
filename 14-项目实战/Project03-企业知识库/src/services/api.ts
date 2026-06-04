import { ChatResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * 通用请求封装
 */
async function request(url: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${url}`, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '请求失败');
  }
  return response.json();
}

/**
 * 上传文档
 */
export async function uploadDocument(file: File, title: string, description?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  if (description) formData.append('description', description);

  return request('/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

/**
 * 获取文档列表
 */
export async function listDocuments(skip = 0, limit = 20) {
  return request(`/documents?skip=${skip}&limit=${limit}`);
}

/**
 * 删除文档
 */
export async function deleteDocument(docId: string) {
  return request(`/documents/${docId}`, {
    method: 'DELETE',
  });
}

/**
 * 提问
 */
export async function askQuestion(question: string, docIds?: string[], topK = 5): Promise<ChatResponse> {
  return request('/chat/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, doc_ids: docIds, top_k: topK }),
  });
}

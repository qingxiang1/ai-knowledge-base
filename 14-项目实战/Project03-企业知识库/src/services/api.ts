/**
 * 创建时间: 2026-06-03
 * 文件名: api.ts
 * 文件描述: Project03 企业知识库 API 服务层，封装文档与问答接口
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

import { ChatResponse, DocumentListResponse, DocumentResponse } from "../types";

const API_BASE = "/api/v1";

/**
 * 通用请求封装
 * @param url 相对路径
 * @param options fetch 选项
 * @returns 解析后的 JSON
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "请求失败");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

/**
 * 上传文档
 * @param file 文件
 * @param title 标题
 * @param description 描述
 * @returns 文档记录
 */
export async function uploadDocument(
  file: File,
  title: string,
  description?: string,
): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  if (description) formData.append("description", description);

  return request<DocumentResponse>("/documents/upload", {
    method: "POST",
    body: formData,
  });
}

/**
 * 获取文档列表
 * @param skip 跳过数量
 * @param limit 返回上限
 * @returns 文档列表
 */
export async function listDocuments(
  skip = 0,
  limit = 50,
): Promise<DocumentListResponse> {
  return request<DocumentListResponse>(`/documents?skip=${skip}&limit=${limit}`);
}

/**
 * 删除文档
 * @param docId 文档 ID
 */
export async function deleteDocument(docId: string): Promise<void> {
  await request<void>(`/documents/${docId}`, { method: "DELETE" });
}

/**
 * 提问
 * @param question 问题
 * @param docIds 限定检索的文档范围
 * @param topK 检索数量
 * @returns 问答响应
 */
export async function askQuestion(
  question: string,
  docIds?: string[],
  topK = 4,
): Promise<ChatResponse> {
  return request<ChatResponse>("/chat/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, doc_ids: docIds, top_k: topK }),
  });
}

/**
 * 获取持久化的问答历史
 * @param limit 返回上限
 * @returns 问答历史（按时间正序）
 */
export async function getChatHistory(limit = 50): Promise<ChatResponse[]> {
  return request<ChatResponse[]>(`/chat/history?limit=${limit}`);
}

/**
 * 清空问答历史
 */
export async function clearChatHistory(): Promise<void> {
  await request<void>("/chat/history", { method: "DELETE" });
}

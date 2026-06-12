/**
 * 创建时间: 2026-06-12
 * 文件名: api.ts
 * 文件描述: Project01 企业级写作工作流 API 服务封装
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-12
 */

import {
  EnterpriseDocument,
  GenerateDocumentRequest,
  ReviewDocumentRequest,
  WorkflowMutationRequest,
  WritingTemplate,
} from '../types';

const API_BASE = '/api/writing';

/**
 * 处理接口响应并统一抛错
 * @param response Fetch 响应对象
 * @returns 解析后的 JSON 数据
 */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || '请求失败');
  }

  return response.json() as Promise<T>;
}

/**
 * 获取模板列表
 * @returns 模板数据
 */
export async function getTemplates(): Promise<WritingTemplate[]> {
  const response = await fetch(`${API_BASE}/templates`);
  const data = await parseJsonResponse<{ templates: WritingTemplate[] }>(response);
  return data.templates;
}

/**
 * 获取企业写作单据列表
 * @returns 单据列表
 */
export async function getDocuments(): Promise<EnterpriseDocument[]> {
  const response = await fetch(`${API_BASE}/documents`);
  const data = await parseJsonResponse<{ documents: EnterpriseDocument[] }>(response);
  return data.documents;
}

/**
 * 创建或重新生成草稿
 * @param request 请求参数
 * @returns 最新单据
 */
export async function generateDocument(
  request: GenerateDocumentRequest,
): Promise<EnterpriseDocument> {
  const response = await fetch(`${API_BASE}/documents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<EnterpriseDocument>(response);
}

/**
 * 提交单据审核
 * @param documentId 单据 ID
 * @param request 操作参数
 * @returns 更新后的单据
 */
export async function submitDocumentForReview(
  documentId: string,
  request: WorkflowMutationRequest,
): Promise<EnterpriseDocument> {
  const response = await fetch(`${API_BASE}/documents/${documentId}/submit-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<EnterpriseDocument>(response);
}

/**
 * 执行审核操作
 * @param documentId 单据 ID
 * @param request 审核参数
 * @returns 更新后的单据
 */
export async function reviewDocument(
  documentId: string,
  request: ReviewDocumentRequest,
): Promise<EnterpriseDocument> {
  const response = await fetch(`${API_BASE}/documents/${documentId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<EnterpriseDocument>(response);
}

/**
 * 执行模拟发布
 * @param documentId 单据 ID
 * @param request 发布参数
 * @returns 更新后的单据
 */
export async function publishDocument(
  documentId: string,
  request: WorkflowMutationRequest,
): Promise<EnterpriseDocument> {
  const response = await fetch(`${API_BASE}/documents/${documentId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<EnterpriseDocument>(response);
}

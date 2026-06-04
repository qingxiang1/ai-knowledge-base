/**
 * 文件描述: API 服务层，封装与后端的通信
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { WritingRequest, WritingResponse, HistoryItem } from '../types';

const API_BASE = '/api/writing';

/**
 * 发送写作请求
 * @param request 写作请求参数
 * @returns 写作响应
 */
export async function generateWriting(request: WritingRequest): Promise<WritingResponse> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '请求失败');
  }

  return response.json();
}

/**
 * 获取历史记录
 * @returns 历史记录列表
 */
export async function getHistory(): Promise<HistoryItem[]> {
  const response = await fetch(`${API_BASE}/history`);
  return response.json();
}

/**
 * 删除历史记录
 * @param id 记录 ID
 */
export async function deleteHistoryItem(id: string): Promise<void> {
  await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE',
  });
}

import { WritingRequest, WritingResponse, HistoryItem } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * 发送写作请求
 * @param request 写作请求参数
 * @returns 写作响应
 */
export async function generateWriting(request: WritingRequest): Promise<WritingResponse> {
  const response = await fetch(`${API_BASE}/api/writing/generate`, {
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
  const response = await fetch(`${API_BASE}/api/writing/history`);
  return response.json();
}

/**
 * 删除历史记录
 * @param id 记录 ID
 */
export async function deleteHistoryItem(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/writing/history/${id}`, {
    method: 'DELETE',
  });
}

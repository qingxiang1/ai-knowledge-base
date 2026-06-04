/**
 * 文件描述: API 服务层，封装与后端客服系统的通信
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { ChatMessage } from '../types';

const API_BASE = '/api';

/**
 * 发送客服消息
 */
export async function sendMessage(content: string, sessionId: string): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, session_id: sessionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '请求失败');
  }

  return response.json();
}

/**
 * 获取会话历史
 */
export async function getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE}/chat/${sessionId}/history`);
  if (!response.ok) throw new Error('获取历史记录失败');
  return response.json();
}

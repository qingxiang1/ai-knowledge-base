import { ChatMessage } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

/**
 * 文件描述: API 服务层，封装与后端 Agent 系统的通信
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { AgentResponse } from '../types';

const API_BASE = '/api/v1';

/**
 * 发送聊天请求
 */
export async function chatWithAgent(query: string, sessionId: string): Promise<AgentResponse> {
  const response = await fetch(`${API_BASE}/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: sessionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '请求失败');
  }

  return response.json();
}

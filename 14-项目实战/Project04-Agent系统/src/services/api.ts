/**
 * 创建时间: 2026-06-03
 * 文件名: api.ts
 * 文件描述: API 服务层，封装与后端 Agent 系统的通信（对话 / 工具清单 / 清空会话）
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-23
 */

import { AgentResponse, ToolInfo } from '../types';

const API_BASE = '/api/v1';

/**
 * 发送对话请求，触发一次完整的 ReAct 循环
 * @param query 用户问题
 * @param sessionId 会话 ID
 * @returns Agent 完整响应（含推理轨迹与工具调用）
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

/**
 * 获取当前 Agent 可用的工具列表与运行模式
 * @returns 运行模式与工具清单
 */
export async function fetchTools(): Promise<{ mode: 'mock' | 'api'; tools: ToolInfo[] }> {
  const response = await fetch(`${API_BASE}/agent/tools`);
  if (!response.ok) throw new Error('获取工具列表失败');
  return response.json();
}

/**
 * 清空指定会话的记忆
 * @param sessionId 会话 ID
 */
export async function clearSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/agent/session/${sessionId}`, { method: 'DELETE' });
}

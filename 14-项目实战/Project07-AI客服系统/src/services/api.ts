/**
 * 创建时间: 2026-06-03
 * 文件名: api.ts
 * 文件描述: API 服务层，封装与后端客服系统的通信（发消息 / 元数据 / 历史）
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

import { ChatMessage, MetaInfo } from '../types';

const API_BASE = '/api';

/**
 * 发送客服消息
 * @param content 用户消息
 * @param sessionId 会话 ID
 * @returns 客服回复（含意图/来源/转人工/建议）
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
 * 获取演示元数据（模式、FAQ 列表、演示订单号）
 * @returns 元数据
 */
export async function fetchMeta(): Promise<MetaInfo> {
  const response = await fetch(`${API_BASE}/meta`);
  if (!response.ok) throw new Error('获取元数据失败');
  return response.json();
}

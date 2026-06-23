/**
 * 创建时间: 2026-06-23
 * 文件名: memory.ts
 * 文件描述: Project04 Agent 系统的轻量会话记忆。按 session_id 在内存中保存最近若干轮对话，
 *           为 API 模式提供多轮上下文。生产环境可替换为 Redis / 数据库实现。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-23
 */

import type { ChatMessage } from "../types";

/** 每个会话最多保留的消息条数（user/assistant 合计），超出按 FIFO 丢弃最早的 */
const MAX_MESSAGES_PER_SESSION = 12;

/** session_id -> 历史消息 */
const store = new Map<string, ChatMessage[]>();

/**
 * 读取某会话的历史消息
 * @param sessionId 会话 ID
 * @returns 历史消息数组（无则为空数组）
 */
export function getHistory(sessionId: string): ChatMessage[] {
  if (!sessionId) return [];
  return store.get(sessionId) ?? [];
}

/**
 * 向某会话追加一轮问答，并按上限裁剪
 * @param sessionId 会话 ID
 * @param userText 用户消息
 * @param assistantText 助手回答
 */
export function appendTurn(sessionId: string, userText: string, assistantText: string): void {
  if (!sessionId) return;
  const history = store.get(sessionId) ?? [];
  history.push({ role: "user", content: userText });
  history.push({ role: "assistant", content: assistantText });
  // 仅保留最近 MAX_MESSAGES_PER_SESSION 条
  const trimmed = history.slice(-MAX_MESSAGES_PER_SESSION);
  store.set(sessionId, trimmed);
}

/**
 * 清空某会话历史
 * @param sessionId 会话 ID
 */
export function clearHistory(sessionId: string): void {
  store.delete(sessionId);
}

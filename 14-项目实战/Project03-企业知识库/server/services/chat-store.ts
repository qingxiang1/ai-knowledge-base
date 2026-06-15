/**
 * 创建时间: 2026-06-14
 * 文件名: chat-store.ts
 * 文件描述: Project03 企业知识库对话历史本地持久化服务，问答记录重启后保留
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { ChatAnswer, ChatStoreSnapshot } from "../types";

const DEFAULT_RELATIVE_PATH = "./data/chat-history.json";
const HISTORY_LIMIT = 100;

let historyCache: ChatAnswer[] = [];
let storageFilePath = "";
let initialized = false;

/**
 * 解析实际存储文件路径
 * @returns 绝对路径
 */
function resolveStorageFilePath(): string {
  const configured =
    process.env.KB_CHAT_FILE_PATH?.trim() || DEFAULT_RELATIVE_PATH;
  return path.resolve(process.cwd(), configured);
}

/**
 * 将当前缓存写入磁盘
 */
async function flushToDisk(): Promise<void> {
  if (!storageFilePath) {
    storageFilePath = resolveStorageFilePath();
  }
  await mkdir(path.dirname(storageFilePath), { recursive: true });

  const snapshot: ChatStoreSnapshot = {
    history: historyCache,
    lastUpdatedAt: new Date().toISOString(),
  };
  await writeFile(storageFilePath, JSON.stringify(snapshot, null, 2), "utf-8");
}

/**
 * 初始化对话历史存储
 */
export async function initializeChatStore(): Promise<void> {
  if (initialized) {
    return;
  }
  storageFilePath = resolveStorageFilePath();

  try {
    const raw = await readFile(storageFilePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ChatStoreSnapshot>;
    historyCache = Array.isArray(parsed.history) ? parsed.history : [];
  } catch {
    historyCache = [];
  }

  initialized = true;
}

/**
 * 追加一条问答记录并持久化
 * @param answer 问答结果
 */
export async function appendChatAnswer(answer: ChatAnswer): Promise<void> {
  historyCache.push(answer);
  if (historyCache.length > HISTORY_LIMIT) {
    historyCache = historyCache.slice(-HISTORY_LIMIT);
  }
  await flushToDisk();
}

/**
 * 获取最近的问答历史
 * @param limit 返回上限
 * @returns 问答历史（按时间正序）
 */
export function listChatHistory(limit = 50): ChatAnswer[] {
  return historyCache.slice(-limit);
}

/**
 * 清空全部对话历史
 */
export async function clearChatHistory(): Promise<void> {
  historyCache = [];
  await flushToDisk();
}

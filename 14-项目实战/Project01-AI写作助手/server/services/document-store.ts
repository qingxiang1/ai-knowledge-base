/**
 * 创建时间: 2026-06-12
 * 文件名: document-store.ts
 * 文件描述: Project01 企业级写作工作流本地 JSON 存储服务
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-12
 */

import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { DocumentStoreSnapshot, EnterpriseDocument } from "../types";
import { createDefaultComplianceResult } from "./compliance";

const DEFAULT_RELATIVE_PATH = "./data/documents.json";

let documentsCache: EnterpriseDocument[] = [];
let storageFilePath = "";
let initialized = false;

/**
 * 获取实际存储文件路径
 * @returns 绝对路径
 */
function resolveStorageFilePath(): string {
  const configuredPath =
    process.env.WRITING_DATA_FILE_PATH?.trim() || DEFAULT_RELATIVE_PATH;
  return path.resolve(process.cwd(), configuredPath);
}

/**
 * 生成空快照
 * @returns 默认快照
 */
function createEmptySnapshot(): DocumentStoreSnapshot {
  return {
    documents: [],
    lastUpdatedAt: null,
  };
}

/**
 * 兼容旧版本单据结构，补齐新增字段
 * @param document 原始单据
 * @returns 标准化后的单据
 */
function normalizeDocument(document: EnterpriseDocument): EnterpriseDocument {
  return {
    ...document,
    compliance: document.compliance ?? createDefaultComplianceResult(),
  };
}

/**
 * 将当前缓存写入磁盘
 */
async function flushToDisk(): Promise<void> {
  if (!storageFilePath) {
    storageFilePath = resolveStorageFilePath();
  }

  await mkdir(path.dirname(storageFilePath), { recursive: true });

  const snapshot: DocumentStoreSnapshot = {
    documents: documentsCache,
    lastUpdatedAt: new Date().toISOString(),
  };

  await writeFile(storageFilePath, JSON.stringify(snapshot, null, 2), "utf-8");
}

/**
 * 初始化本地存储
 */
export async function initializeDocumentStore(): Promise<void> {
  if (initialized) {
    return;
  }

  storageFilePath = resolveStorageFilePath();

  try {
    const raw = await readFile(storageFilePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DocumentStoreSnapshot>;
    documentsCache = Array.isArray(parsed.documents)
      ? parsed.documents.map((item) =>
          normalizeDocument(item as EnterpriseDocument),
        )
      : [];
  } catch {
    documentsCache = [];
    await flushToDisk();
  }

  initialized = true;
}

/**
 * 获取存储文件路径
 * @returns 绝对路径
 */
export function getDocumentStoreFilePath(): string {
  return storageFilePath || resolveStorageFilePath();
}

/**
 * 获取单据列表副本
 * @returns 单据列表
 */
export function listDocuments(): EnterpriseDocument[] {
  return [...documentsCache];
}

/**
 * 根据 ID 查找单据
 * @param documentId 单据 ID
 * @returns 单据对象
 */
export function findDocumentById(
  documentId: string,
): EnterpriseDocument | undefined {
  return documentsCache.find((item) => item.id === documentId);
}

/**
 * 保存新单据
 * @param document 单据对象
 */
export async function addDocument(document: EnterpriseDocument): Promise<void> {
  documentsCache.unshift(document);
  await flushToDisk();
}

/**
 * 持久化已有单据变更
 * @param document 已修改的单据对象
 */
export async function persistDocument(
  document: EnterpriseDocument,
): Promise<void> {
  const index = documentsCache.findIndex((item) => item.id === document.id);

  if (index >= 0) {
    documentsCache[index] = document;
  } else {
    documentsCache.unshift(document);
  }

  await flushToDisk();
}

/**
 * 清空缓存并重建空文件
 */
export async function resetDocumentStore(): Promise<void> {
  documentsCache = [];
  await flushToDisk();
}

/**
 * 获取当前快照
 * @returns 当前存储快照
 */
export function getDocumentStoreSnapshot(): DocumentStoreSnapshot {
  return {
    documents: listDocuments(),
    lastUpdatedAt: initialized
      ? new Date().toISOString()
      : createEmptySnapshot().lastUpdatedAt,
  };
}

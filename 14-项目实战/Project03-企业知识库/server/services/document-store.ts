/**
 * 创建时间: 2026-06-14
 * 文件名: document-store.ts
 * 文件描述: Project03 企业知识库本地 JSON 存储服务，管理文档与切片并支持持久化与种子数据
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import type { Chunk, DocumentRecord, KnowledgeStoreSnapshot } from "../types";
import { chunkText } from "./chunker";
import { SEED_DOCUMENTS } from "./seed-data";

const DEFAULT_RELATIVE_PATH = "./data/knowledge-base.json";

let documentsCache: DocumentRecord[] = [];
let chunksCache: Chunk[] = [];
let storageFilePath = "";
let initialized = false;

/**
 * 解析实际存储文件路径
 * @returns 绝对路径
 */
function resolveStorageFilePath(): string {
  const configured =
    process.env.KB_DATA_FILE_PATH?.trim() || DEFAULT_RELATIVE_PATH;
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

  const snapshot: KnowledgeStoreSnapshot = {
    documents: documentsCache,
    chunks: chunksCache,
    lastUpdatedAt: new Date().toISOString(),
  };
  await writeFile(storageFilePath, JSON.stringify(snapshot, null, 2), "utf-8");
}

/**
 * 基于标题与正文构建文档记录及其切片
 * @param params 文档元数据与正文
 * @returns 文档记录与切片
 */
export function buildDocument(params: {
  title: string;
  description: string | null;
  file_type: string;
  file_size: number;
  content: string;
}): { record: DocumentRecord; chunks: Chunk[] } {
  const docId = uuidv4();
  const now = new Date().toISOString();
  const pieces = chunkText(params.content);

  const chunks: Chunk[] = pieces.map((text, index) => ({
    id: uuidv4(),
    doc_id: docId,
    doc_title: params.title,
    index,
    text,
  }));

  const record: DocumentRecord = {
    id: docId,
    title: params.title,
    description: params.description,
    file_type: params.file_type,
    file_size: params.file_size,
    status: chunks.length > 0 ? "completed" : "failed",
    chunk_count: chunks.length,
    created_at: now,
    updated_at: now,
  };

  return { record, chunks };
}

/**
 * 用种子文档初始化缓存
 */
function seedStore(): void {
  documentsCache = [];
  chunksCache = [];
  for (const seed of SEED_DOCUMENTS) {
    const { record, chunks } = buildDocument({
      title: seed.title,
      description: seed.description,
      file_type: "md",
      file_size: Buffer.byteLength(seed.content, "utf-8"),
      content: seed.content,
    });
    documentsCache.push(record);
    chunksCache.push(...chunks);
  }
}

/**
 * 初始化本地存储：读取已有数据，缺失时写入种子文档
 */
export async function initializeStore(): Promise<void> {
  if (initialized) {
    return;
  }
  storageFilePath = resolveStorageFilePath();

  try {
    const raw = await readFile(storageFilePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<KnowledgeStoreSnapshot>;
    documentsCache = Array.isArray(parsed.documents) ? parsed.documents : [];
    chunksCache = Array.isArray(parsed.chunks) ? parsed.chunks : [];
  } catch {
    seedStore();
    await flushToDisk();
  }

  initialized = true;
}

/**
 * 获取存储文件路径
 * @returns 绝对路径
 */
export function getStoreFilePath(): string {
  return storageFilePath || resolveStorageFilePath();
}

/**
 * 分页获取文档列表
 * @param skip 跳过数量
 * @param limit 返回上限
 * @returns 文档列表与总数
 */
export function listDocuments(
  skip = 0,
  limit = 20,
): { total: number; items: DocumentRecord[] } {
  const sorted = [...documentsCache].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return {
    total: sorted.length,
    items: sorted.slice(skip, skip + limit),
  };
}

/**
 * 获取用于检索的切片集合，可按文档范围过滤
 * @param docIds 文档范围（为空则检索全部）
 * @returns 切片数组
 */
export function getChunks(docIds?: string[]): Chunk[] {
  if (docIds && docIds.length > 0) {
    const idSet = new Set(docIds);
    return chunksCache.filter((chunk) => idSet.has(chunk.doc_id));
  }
  return chunksCache;
}

/**
 * 新增文档及其切片
 * @param record 文档记录
 * @param chunks 切片
 */
export async function addDocument(
  record: DocumentRecord,
  chunks: Chunk[],
): Promise<void> {
  documentsCache.push(record);
  chunksCache.push(...chunks);
  await flushToDisk();
}

/**
 * 删除文档及其切片
 * @param docId 文档 ID
 * @returns 是否删除成功
 */
export async function deleteDocument(docId: string): Promise<boolean> {
  const exists = documentsCache.some((doc) => doc.id === docId);
  if (!exists) {
    return false;
  }
  documentsCache = documentsCache.filter((doc) => doc.id !== docId);
  chunksCache = chunksCache.filter((chunk) => chunk.doc_id !== docId);
  await flushToDisk();
  return true;
}

/**
 * 统计当前文档数量
 * @returns 文档数
 */
export function countDocuments(): number {
  return documentsCache.length;
}

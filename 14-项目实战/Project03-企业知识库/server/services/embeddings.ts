/**
 * 创建时间: 2026-06-14
 * 文件名: embeddings.ts
 * 文件描述: Project03 企业知识库向量化服务。API 模式调用 OpenAI embeddings，
 *           离线 mock 模式使用本地特征哈希 embedding，二者都产出可做余弦相似度检索的稠密向量。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import OpenAI from "openai";
import { tokenize } from "./text-utils";

const OPENAI_MODEL = "text-embedding-3-small";
const LOCAL_DIM = 2048;

/**
 * 当前 embedding 模型标识，用于缓存失效（切换 mock/API 时自动重算）
 * @returns 模型标识
 */
export function getEmbeddingModelId(): string {
  return process.env.OPENAI_API_KEY ? `openai:${OPENAI_MODEL}` : "local-hash-v1";
}

/**
 * 是否为本地 mock 向量化
 * @returns 是否离线
 */
export function isLocalEmbedding(): boolean {
  return !process.env.OPENAI_API_KEY;
}

/**
 * FNV-1a 哈希，将词元映射到 [0, LOCAL_DIM) 的维度下标
 * @param token 词元
 * @returns 维度下标
 */
function hashToDimension(token: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % LOCAL_DIM;
}

/**
 * 对向量做 L2 归一化（便于直接用点积计算余弦相似度）
 * @param vector 原始向量
 * @returns 归一化后的向量
 */
function l2normalize(vector: number[]): number[] {
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm);
  if (norm === 0) return vector;
  return vector.map((value) => value / norm);
}

/**
 * 本地特征哈希 embedding：将分词后的词元哈希进固定维度向量并归一化
 * @param text 输入文本
 * @returns 稠密向量
 */
function localEmbed(text: string): number[] {
  const vector = new Array<number>(LOCAL_DIM).fill(0);
  for (const token of tokenize(text)) {
    vector[hashToDimension(token)] += 1;
  }
  return l2normalize(vector);
}

/**
 * 批量向量化文本
 * @param texts 文本数组
 * @returns 向量数组（与输入顺序一致）
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }
  if (isLocalEmbedding()) {
    return texts.map(localEmbed);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.embeddings.create({
    model: OPENAI_MODEL,
    input: texts,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding as number[]);
}

/**
 * 向量化单条文本
 * @param text 文本
 * @returns 向量
 */
export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}

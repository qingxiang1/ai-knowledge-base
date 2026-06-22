/**
 * 创建时间: 2026-06-14
 * 文件名: retriever.ts
 * 文件描述: Project03 企业知识库混合检索服务。向量检索（余弦相似度）负责语义召回，
 *           词法覆盖率负责精确匹配，二者融合排序；命中词用于来源高亮。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v3.0.0
 * 最后更新时间: 2026-06-14
 */

import type { Chunk, RetrievedSource } from "../types";
import { tokenize } from "./text-utils";
import { embedOne, embedTexts, getEmbeddingModelId } from "./embeddings";

// 向量相似度召回阈值：OpenAI 语义向量整体偏高，本地哈希向量偏稀疏
const MIN_SIMILARITY_API = 0.3;
const MIN_SIMILARITY_LOCAL = 0.12;
// 词法召回阈值：命中过半查询词即视为强精确匹配，可独立进入候选
const MIN_LEXICAL_COVERAGE = 0.5;
// 融合权重：语义为主、词法为辅
const VECTOR_WEIGHT = 0.65;
const LEXICAL_WEIGHT = 0.35;

/**
 * 切片向量的内存缓存：key=切片 id，value=向量及其所用模型标识
 * 切换 mock/API 模式（模型标识变化）时自动重算，避免向量空间不一致
 */
const embeddingCache = new Map<string, { model: string; vector: number[] }>();

/**
 * 计算两个等长向量的余弦相似度
 * @param a 向量 A
 * @param b 向量 B
 * @returns 余弦相似度
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 确保候选切片在当前模型下都有缓存向量，缺失的批量补算
 * @param chunks 候选切片
 * @param model 当前模型标识
 */
async function ensureChunkEmbeddings(
  chunks: Chunk[],
  model: string,
): Promise<void> {
  const missing = chunks.filter(
    (chunk) => embeddingCache.get(chunk.id)?.model !== model,
  );
  if (missing.length === 0) {
    return;
  }
  const vectors = await embedTexts(missing.map((chunk) => chunk.text));
  missing.forEach((chunk, index) => {
    embeddingCache.set(chunk.id, { model, vector: vectors[index] });
  });
}

/**
 * 计算查询与切片的词法命中（覆盖率 + 命中词）
 * @param queryTerms 去重后的查询词元
 * @param chunkText 切片文本
 * @returns 覆盖率与命中词元
 */
function lexicalMatch(
  queryTerms: string[],
  chunkText: string,
): { coverage: number; matched: string[] } {
  if (queryTerms.length === 0) {
    return { coverage: 0, matched: [] };
  }
  const chunkTerms = new Set(tokenize(chunkText));
  const matched = queryTerms.filter((term) => chunkTerms.has(term));
  return { coverage: matched.length / queryTerms.length, matched };
}

/**
 * 混合检索：向量语义召回 + 词法精确召回，融合分排序取 top-k
 * @param question 用户问题
 * @param chunks 候选切片
 * @param topK 返回数量
 * @returns 命中来源（按融合分降序）
 */
export async function retrieve(
  question: string,
  chunks: Chunk[],
  topK = 4,
): Promise<RetrievedSource[]> {
  if (!question.trim() || chunks.length === 0) {
    return [];
  }

  const model = getEmbeddingModelId();
  await ensureChunkEmbeddings(chunks, model);
  const queryVector = await embedOne(question);

  const vectorFloor = model.startsWith("openai")
    ? MIN_SIMILARITY_API
    : MIN_SIMILARITY_LOCAL;
  const queryTerms = Array.from(new Set(tokenize(question)));

  return chunks
    .map((chunk) => {
      const cached = embeddingCache.get(chunk.id);
      const vector = cached
        ? Math.max(0, cosineSimilarity(queryVector, cached.vector))
        : 0;
      const { coverage, matched } = lexicalMatch(queryTerms, chunk.text);
      const fused = VECTOR_WEIGHT * vector + LEXICAL_WEIGHT * coverage;
      return { chunk, vector, coverage, matched, fused };
    })
    // 候选门槛：语义召回达标，或词法精确匹配过半（任一即可，兼顾召回）
    .filter(
      (item) =>
        item.vector >= vectorFloor || item.coverage >= MIN_LEXICAL_COVERAGE,
    )
    .sort((a, b) => b.fused - a.fused)
    .slice(0, topK)
    .map((item) => ({
      doc_id: item.chunk.doc_id,
      doc_title: item.chunk.doc_title,
      text: item.chunk.text,
      relevance: Number(Math.min(1, item.fused).toFixed(2)),
      vector_score: Number(Math.min(1, item.vector).toFixed(2)),
      lexical_score: Number(Math.min(1, item.coverage).toFixed(2)),
      matched_terms: item.matched,
    }));
}

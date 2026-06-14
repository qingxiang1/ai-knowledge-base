/**
 * 创建时间: 2026-06-14
 * 文件名: retriever.ts
 * 文件描述: Project03 企业知识库轻量词法检索服务（CJK 二元组 + 拉丁词），无需向量库即可演示 RAG 检索
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import type { Chunk, RetrievedSource } from "../types";

/**
 * 将文本切成检索词元：拉丁词整体保留，CJK 文本拆为二元组以兼顾中文匹配精度
 * @param text 输入文本
 * @returns 词元数组（可能重复，用于词频统计）
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];

  // 拉丁字母与数字按单词切分
  const latin = text.toLowerCase().match(/[a-z0-9]+/g);
  if (latin) {
    tokens.push(...latin);
  }

  // CJK 连续片段拆成二元组（长度为 1 时保留单字）
  const cjkRuns = text.match(/[一-鿿]+/g);
  if (cjkRuns) {
    for (const run of cjkRuns) {
      if (run.length === 1) {
        tokens.push(run);
        continue;
      }
      for (let i = 0; i < run.length - 1; i += 1) {
        tokens.push(run.slice(i, i + 2));
      }
    }
  }

  return tokens;
}

/**
 * 统计词频
 * @param tokens 词元数组
 * @returns 词元到出现次数的映射
 */
function toFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return freq;
}

/**
 * 计算查询与单个切片的相关度（0~1）
 * 覆盖率为主、词频为辅，结果可解释
 * @param queryTokens 去重后的查询词元
 * @param chunkText 切片文本
 * @returns 相关度分值与命中词频
 */
function scoreChunk(
  queryTokens: string[],
  chunkText: string,
): { relevance: number; termFreq: number } {
  if (queryTokens.length === 0) {
    return { relevance: 0, termFreq: 0 };
  }

  const chunkFreq = toFrequency(tokenize(chunkText));
  let matched = 0;
  let termFreq = 0;

  for (const token of queryTokens) {
    const count = chunkFreq.get(token) || 0;
    if (count > 0) {
      matched += 1;
      termFreq += count;
    }
  }

  if (matched === 0) {
    return { relevance: 0, termFreq: 0 };
  }

  const coverage = matched / queryTokens.length;
  // 词频密度提供轻微加权，避免命中一次和命中多次完全等价
  const density = Math.min(1, termFreq / (matched * 3));
  const relevance = Number((coverage * 0.8 + density * 0.2).toFixed(2));

  return { relevance, termFreq };
}

/**
 * 在给定切片集合中检索与问题最相关的若干切片
 * @param question 用户问题
 * @param chunks 候选切片
 * @param topK 返回数量
 * @returns 命中来源（按相关度降序）
 */
export function retrieve(
  question: string,
  chunks: Chunk[],
  topK = 4,
): RetrievedSource[] {
  const queryTokens = Array.from(new Set(tokenize(question)));
  if (queryTokens.length === 0 || chunks.length === 0) {
    return [];
  }

  return chunks
    .map((chunk) => {
      const { relevance, termFreq } = scoreChunk(queryTokens, chunk.text);
      return { chunk, relevance, termFreq };
    })
    .filter((item) => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || b.termFreq - a.termFreq)
    .slice(0, topK)
    .map((item) => ({
      doc_id: item.chunk.doc_id,
      doc_title: item.chunk.doc_title,
      text: item.chunk.text,
      relevance: item.relevance,
    }));
}

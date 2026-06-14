/**
 * 创建时间: 2026-06-14
 * 文件名: rag.ts
 * 文件描述: Project03 企业知识库 RAG 问答服务，检索切片后生成答案（mock 合成 / API 接地）
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import type { ChatAnswer, RetrievedSource } from "../types";
import { getChunks } from "./document-store";
import { retrieve } from "./retriever";

/**
 * 是否运行在 mock 模式
 * @returns 是否未配置 API Key
 */
export function isMockMode(): boolean {
  return !process.env.OPENAI_API_KEY;
}

/**
 * 获取 OpenAI 客户端实例（延迟初始化）
 * @returns OpenAI 客户端
 */
function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * 根据检索到的切片合成 mock 答案
 * @param question 用户问题
 * @param sources 命中来源
 * @returns 合成答案
 */
function buildMockAnswer(question: string, sources: RetrievedSource[]): string {
  if (sources.length === 0) {
    return `未在知识库中检索到与「${question}」相关的内容。\n\n建议：确认是否已上传相关文档，或换一种更贴近文档用语的问法。\n\n> 当前为 Mock 模式，答案直接由检索到的文档切片合成；配置 OPENAI_API_KEY 后将由大模型基于这些切片生成更自然的回答。`;
  }

  const cited = sources
    .map(
      (source, index) =>
        `${index + 1}. 〔${source.doc_title}〕${source.text}`,
    )
    .join("\n");

  return `根据知识库检索，与「${question}」最相关的内容如下：\n\n${cited}\n\n> 当前为 Mock 模式，以上答案由检索到的文档切片直接合成。配置 OPENAI_API_KEY 后，大模型会基于这些切片生成更连贯的自然语言回答，并保留来源引用。`;
}

/**
 * 基于检索上下文调用模型生成接地答案
 * @param question 用户问题
 * @param sources 命中来源
 * @returns 答案与消耗 token
 */
async function buildApiAnswer(
  question: string,
  sources: RetrievedSource[],
): Promise<{ answer: string; tokensUsed: number }> {
  const context = sources
    .map(
      (source, index) =>
        `[片段${index + 1} | 来源：${source.doc_title}]\n${source.text}`,
    )
    .join("\n\n");

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          "你是企业知识库助手。请仅依据下方提供的知识库片段回答用户问题，使用中文，并在结尾标注引用了哪些来源。如果片段中没有相关信息，请明确说明知识库中暂无相关内容，不要编造。",
      },
      {
        role: "user",
        content: `知识库片段：\n${context || "（无相关片段）"}\n\n用户问题：${question}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 1200,
  });

  return {
    answer: completion.choices[0]?.message?.content || "",
    tokensUsed: completion.usage?.total_tokens || 0,
  };
}

/**
 * 估算 mock 模式的 token 消耗（仅用于演示展示）
 * @param question 问题
 * @param sources 命中来源
 * @returns 估算 token 数
 */
function estimateTokens(question: string, sources: RetrievedSource[]): number {
  const contentLength =
    question.length + sources.reduce((sum, s) => sum + s.text.length, 0);
  return Math.max(80, Math.round(contentLength * 1.6));
}

/**
 * 执行一次 RAG 问答
 * @param question 用户问题
 * @param docIds 限定检索的文档范围（可选）
 * @param topK 检索返回数量
 * @returns 问答结果
 */
export async function answerQuestion(
  question: string,
  docIds?: string[],
  topK = 4,
): Promise<ChatAnswer> {
  const chunks = getChunks(docIds);
  const sources = retrieve(question, chunks, topK);

  let answer: string;
  let tokensUsed: number;

  if (isMockMode()) {
    await new Promise((resolve) =>
      setTimeout(resolve, 600 + Math.random() * 600),
    );
    answer = buildMockAnswer(question, sources);
    tokensUsed = estimateTokens(question, sources);
  } else {
    const result = await buildApiAnswer(question, sources);
    answer = result.answer;
    tokensUsed = result.tokensUsed;
  }

  return {
    id: uuidv4(),
    question,
    answer,
    sources,
    tokens_used: tokensUsed,
    mode: isMockMode() ? "mock" : "api",
    created_at: new Date().toISOString(),
  };
}

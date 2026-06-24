/**
 * 创建时间: 2026-06-03
 * 文件名: chat.ts
 * 文件描述: 客服聊天路由。串联意图识别、订单查询、FAQ 检索与转人工判定：
 *           mock 模式直接返回确定性真实回复；API 模式把检索到的事实喂给大模型生成更自然的
 *           回复（RAG 式，失败降级）。另提供会话历史、FAQ 与演示元数据接口。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { buildReply, replyFacts } from "../services/reply";
import { FAQS } from "../services/knowledge";
import { demoOrderNumbers } from "../services/orders";
import type { SessionMessage } from "../types";

const router = Router();

/** 会话记忆（演示用内存版） */
const sessions: Record<string, SessionMessage[]> = {};

/**
 * 演示元数据：模式、FAQ 列表、可用意图、演示订单号
 * GET /api/meta
 */
router.get("/meta", (_req, res) => {
  res.json({
    mode: process.env.OPENAI_API_KEY ? "api" : "mock",
    faqs: FAQS.map((f) => ({ question: f.question, category: f.category })),
    demoOrders: demoOrderNumbers(),
  });
});

/**
 * 发送消息
 * POST /api/chat  body: { content, session_id }
 */
router.post("/chat", async (req, res) => {
  try {
    const { content, session_id } = req.body as { content?: string; session_id?: string };

    if (!content?.trim()) {
      return res.status(400).json({ message: "内容不能为空" });
    }

    const sessionId = session_id || uuidv4();
    if (!sessions[sessionId]) sessions[sessionId] = [];
    sessions[sessionId].push({ role: "user", content: content.trim() });

    // 本地确定性真实回复（始终先算，作为 mock 结果或 API 事实依据）
    const reply = buildReply(content.trim());

    let answer = reply.answer;
    let mode: "mock" | "api" = "mock";

    if (process.env.OPENAI_API_KEY) {
      try {
        answer = await narrate(content.trim(), reply, sessions[sessionId]);
        mode = "api";
      } catch (error) {
        answer = `（模型调用失败，返回标准答复：${error instanceof Error ? error.message : "未知错误"}）\n\n${reply.answer}`;
      }
    }

    sessions[sessionId].push({ role: "assistant", content: answer });

    res.json({
      id: uuidv4(),
      role: "assistant",
      content: answer,
      timestamp: new Date().toISOString(),
      intent: reply.intent,
      confidence: reply.confidence,
      matched: reply.matched,
      source: reply.source,
      faq: reply.faq,
      order: reply.order,
      escalate: reply.escalate,
      escalateReason: reply.escalateReason,
      suggestions: reply.suggestions,
      mode,
      session_id: sessionId,
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "请求失败" });
  }
});

/**
 * 用大模型基于检索到的事实生成自然回复（RAG 式）
 * @param content 用户消息
 * @param reply 本地真实回复（提供事实）
 * @param history 会话历史
 * @returns 模型回复文本
 */
async function narrate(
  content: string,
  reply: ReturnType<typeof buildReply>,
  history: SessionMessage[],
): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "你是专业、友好、耐心的在线客服。请严格依据下方提供的【知识库事实】回答用户，不要编造价格、政策或订单信息。" +
          "若事实中标注建议转人工，请在结尾礼貌引导用户转人工。回复简洁，用中文。",
      },
      ...history.slice(-6).map((m) => ({ role: m.role, content: m.content }) as const),
      { role: "user", content: `【知识库事实】\n${replyFacts(reply)}\n\n【用户问题】\n${content}` },
    ],
    temperature: 0.4,
    max_tokens: 800,
  });
  return completion.choices[0]?.message?.content || reply.answer;
}

/**
 * 获取会话历史
 * GET /api/chat/:sessionId/history
 */
router.get("/chat/:sessionId/history", (req, res) => {
  res.json(sessions[req.params.sessionId] || []);
});

export default router;

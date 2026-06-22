/**
 * 创建时间: 2026-06-03
 * 文件名: chat.ts
 * 文件描述: Project03 企业知识库问答路由，基于检索结果生成答案并持久化历史
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.1.0
 * 最后更新时间: 2026-06-14
 */

import { Router } from "express";
import { answerQuestion } from "../services/rag";
import {
  appendChatAnswer,
  clearChatHistory,
  listChatHistory,
} from "../services/chat-store";

const router = Router();

/**
 * 提交问题
 */
router.post("/ask", async (req, res) => {
  try {
    const { question, doc_ids, top_k } = req.body as {
      question?: string;
      doc_ids?: string[];
      top_k?: number;
    };

    if (!question?.trim()) {
      return res.status(400).json({ message: "问题不能为空" });
    }

    const topK =
      typeof top_k === "number" && top_k > 0 && top_k <= 10 ? top_k : 4;
    const result = await answerQuestion(question.trim(), doc_ids, topK);

    await appendChatAnswer(result);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "请求失败",
    });
  }
});

/**
 * 获取历史记录
 */
router.get("/history", (req, res) => {
  const limit = parseInt((req.query.limit as string) || "50", 10);
  res.json(listChatHistory(limit));
});

/**
 * 清空历史记录
 */
router.delete("/history", async (_req, res) => {
  await clearChatHistory();
  res.status(204).send();
});

export default router;

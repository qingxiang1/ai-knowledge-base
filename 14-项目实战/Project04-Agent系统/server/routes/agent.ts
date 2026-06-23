/**
 * 创建时间: 2026-06-03
 * 文件名: agent.ts
 * 文件描述: Agent 路由。串联 ReAct 引擎（agent.ts）、工具注册中心（tools.ts）与会话记忆
 *           （memory.ts），对外提供「真正会调用工具」的 Agent 对话接口及工具清单接口。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-23
 */

import { Router } from "express";
import { runAgent } from "../services/agent";
import { TOOLS } from "../services/tools";
import { getHistory, appendTurn, clearHistory } from "../services/memory";

const router = Router();

/**
 * 列出可用工具（供前端展示「Agent 能力面板」）
 * GET /api/v1/agent/tools
 */
router.get("/tools", (_req, res) => {
  res.json({
    mode: process.env.OPENAI_API_KEY ? "api" : "mock",
    tools: TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  });
});

/**
 * Agent 对话：执行一次完整的 ReAct 循环并返回推理轨迹
 * POST /api/v1/agent/chat  body: { query, session_id }
 */
router.post("/chat", async (req, res) => {
  try {
    const { query, session_id } = req.body as { query?: string; session_id?: string };

    if (!query?.trim()) {
      return res.status(400).json({ message: "查询不能为空" });
    }

    const sessionId = session_id || "";
    const history = getHistory(sessionId);
    const result = await runAgent(query.trim(), history);

    // 写入会话记忆，供下一轮使用
    appendTurn(sessionId, query.trim(), result.answer);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "请求失败" });
  }
});

/**
 * 清空某会话的记忆
 * DELETE /api/v1/agent/session/:sessionId
 */
router.delete("/session/:sessionId", (req, res) => {
  clearHistory(req.params.sessionId);
  res.json({ message: "会话已清空" });
});

export default router;

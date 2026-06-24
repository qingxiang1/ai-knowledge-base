/**
 * 创建时间: 2026-06-03
 * 文件名: index.ts
 * 文件描述: AI 客服系统服务端入口（REST）。注册客服路由与健康检查，按是否配置 OPENAI_API_KEY
 *           自动切换 mock / api 模式。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./routes/chat";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", chatRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mode: process.env.OPENAI_API_KEY ? "api" : "mock",
  });
});

app.listen(PORT, () => {
  const mode = process.env.OPENAI_API_KEY ? "API" : "Mock";
  console.log(`Customer-service server running on http://localhost:${PORT} (${mode} mode)`);
  if (mode === "Mock") {
    console.log("提示：未配置 OPENAI_API_KEY，已启用本地客服引擎（意图识别 / FAQ 检索 / 订单查询 / 转人工，均真实可用）。");
  }
});

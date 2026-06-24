/**
 * 创建时间: 2026-06-03
 * 文件名: index.ts
 * 文件描述: Agent 系统服务端入口。注册 Agent 路由与健康检查，按是否配置 OPENAI_API_KEY
 *           自动切换 mock / api 运行模式。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-23
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import agentRoutes from "./routes/agent";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.use("/api/v1/agent", agentRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mode: process.env.OPENAI_API_KEY ? "api" : "mock",
  });
});

app.listen(PORT, () => {
  const mode = process.env.OPENAI_API_KEY ? "API" : "Mock";
  console.log(`Agent server running on http://localhost:${PORT} (${mode} mode)`);
  if (mode === "Mock") {
    console.log("提示：未配置 OPENAI_API_KEY，已启用本地规则 Agent（仍会真实执行工具）。");
  }
});

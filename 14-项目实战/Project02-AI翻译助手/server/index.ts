/**
 * 创建时间: 2026-06-03
 * 文件名: index.ts
 * 文件描述: Project02 AI 翻译助手服务端入口
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import translateRoutes from "./routes/translate";
import { isMockMode, langMap } from "./services/translator";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", translateRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mode: isMockMode() ? "mock" : "api",
    supportedLanguages: Object.keys(langMap),
  });
});

app.listen(PORT, () => {
  const mode = isMockMode() ? "Mock" : "API";
  console.log(`Server running on http://localhost:${PORT} (${mode} mode)`);
});

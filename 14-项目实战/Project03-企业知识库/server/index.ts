/**
 * 创建时间: 2026-06-03
 * 文件名: index.ts
 * 文件描述: Project03 企业知识库服务端入口，初始化本地存储并启动服务
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import documentRoutes from "./routes/documents";
import chatRoutes from "./routes/chat";
import {
  countDocuments,
  getStoreFilePath,
  initializeStore,
} from "./services/document-store";
import { initializeChatStore } from "./services/chat-store";
import { isMockMode } from "./services/rag";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/chat", chatRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mode: isMockMode() ? "mock" : "api",
    documents: countDocuments(),
    storage_file: getStoreFilePath(),
  });
});

/**
 * 启动服务端应用
 */
async function bootstrap(): Promise<void> {
  await initializeStore();
  await initializeChatStore();
  app.listen(PORT, () => {
    const mode = isMockMode() ? "Mock" : "API";
    console.log(`Server running on http://localhost:${PORT} (${mode} mode)`);
    console.log(`Knowledge store ready: ${getStoreFilePath()}`);
  });
}

void bootstrap().catch((error) => {
  console.error("Server bootstrap failed:", error);
  process.exit(1);
});

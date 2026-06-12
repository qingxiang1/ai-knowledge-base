/**
 * 创建时间: 2026-06-12
 * 文件名: index.ts
 * 文件描述: Project01 企业级写作工作流服务端入口，负责初始化本地存储并启动服务
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.1.0
 * 最后更新时间: 2026-06-12
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import writingRoutes from './routes/writing';
import { getDocumentStoreFilePath, initializeDocumentStore, listDocuments } from './services/document-store';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/writing', writingRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: process.env.OPENAI_API_KEY ? 'api' : 'mock',
    persisted_documents: listDocuments().length,
    storage_file: getDocumentStoreFilePath(),
  });
});

/**
 * 启动服务端应用
 */
async function bootstrap(): Promise<void> {
  await initializeDocumentStore();

  app.listen(PORT, () => {
    const mode = process.env.OPENAI_API_KEY ? 'API' : 'Mock';
    console.log(`Server running on http://localhost:${PORT} (${mode} mode)`);
    console.log(`Document store ready: ${getDocumentStoreFilePath()}`);
  });
}

void bootstrap().catch((error) => {
  console.error('Server bootstrap failed:', error);
  process.exit(1);
});

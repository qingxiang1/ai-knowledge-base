/**
 * 文件描述: 企业知识库服务端入口
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentRoutes from './routes/documents';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/chat', chatRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: process.env.OPENAI_API_KEY ? 'api' : 'mock',
  });
});

app.listen(PORT, () => {
  const mode = process.env.OPENAI_API_KEY ? 'API' : 'Mock';
  console.log(`Server running on http://localhost:${PORT} (${mode} mode)`);
});

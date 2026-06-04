/**
 * 文件描述: AI 写作助手服务端入口
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import writingRoutes from './routes/writing';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/writing', writingRoutes);

app.get('/health', (req, res) => {
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

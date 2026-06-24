/**
 * 文件描述: AI 代码助手服务端入口
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import codeRoutes from './routes/code';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', codeRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: process.env.OPENAI_API_KEY ? 'api' : 'mock',
  });
});

app.listen(PORT, () => {
  const mode = process.env.OPENAI_API_KEY ? 'API' : 'Mock';
  console.log(`Code-assistant server running on http://localhost:${PORT} (${mode} mode)`);
  if (mode === 'Mock') {
    console.log('提示：未配置 OPENAI_API_KEY，已启用本地引擎（静态分析 / 规则检查 / 自动修复 / 片段库，均真实可用）。');
  }
});

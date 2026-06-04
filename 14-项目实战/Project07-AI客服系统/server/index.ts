/**
 * 文件描述: AI 客服系统服务端入口（支持 Socket.IO 实时通信）
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;
const isMockMode = !process.env.OPENAI_API_KEY;

app.use(cors());
app.use(express.json());

app.use('/api', chatRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('message', async (data) => {
    if (isMockMode) {
      // Mock 模式：模拟实时客服回复
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 800));
      socket.emit('message', {
        id: Date.now().toString(),
        role: 'assistant',
        content: `感谢您的咨询！关于"${data.content}"，我们的客服团队会尽快为您解答。\n\n> 注：当前为 Mock 模式。配置 OPENAI_API_KEY 后将获得 AI 实时客服回复。`,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 真实模式下，通过 REST API 处理
      socket.emit('message', {
        id: Date.now().toString(),
        role: 'assistant',
        content: '请通过 API 接口获取回复。',
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: process.env.OPENAI_API_KEY ? 'api' : 'mock',
  });
});

server.listen(PORT, () => {
  const mode = process.env.OPENAI_API_KEY ? 'API' : 'Mock';
  console.log(`Server running on http://localhost:${PORT} (${mode} mode)`);
});

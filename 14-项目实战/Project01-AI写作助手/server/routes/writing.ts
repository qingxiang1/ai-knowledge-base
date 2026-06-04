/**
 * 文件描述: 写作路由，处理写作请求和历史记录
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { Router } from 'express';
import { generateText } from '../services/openai';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface WritingRequest {
  content: string;
  style: string;
  action: string;
  temperature?: number;
}

interface WritingResponse {
  result: string;
  tokens_used: number;
  model: string;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  request: WritingRequest;
  response: WritingResponse;
}

const history: HistoryItem[] = [];

/**
 * 生成写作内容
 */
router.post('/generate', async (req, res) => {
  try {
    const request: WritingRequest = req.body;
    if (!request.content?.trim()) {
      return res.status(400).json({ message: '内容不能为空' });
    }

    const response = await generateText(request);

    const historyItem: HistoryItem = {
      id: uuidv4(),
      timestamp: Date.now(),
      request,
      response,
    };
    history.unshift(historyItem);
    if (history.length > 100) history.pop();

    res.json(response);
  } catch (error) {
    console.error('生成失败:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : '生成失败',
    });
  }
});

/**
 * 获取历史记录
 */
router.get('/history', (_req, res) => {
  res.json(history);
});

/**
 * 删除历史记录
 */
router.delete('/history/:id', (req, res) => {
  const index = history.findIndex((item) => item.id === req.params.id);
  if (index > -1) history.splice(index, 1);
  res.status(204).send();
});

export default router;

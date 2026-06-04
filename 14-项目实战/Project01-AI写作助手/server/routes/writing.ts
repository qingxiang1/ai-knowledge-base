import { Router } from 'express';
import { generateText } from '../services/openai';
import { WritingRequest, HistoryItem } from '../../src/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const history: HistoryItem[] = [];

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

router.get('/history', (req, res) => {
  res.json(history);
});

router.delete('/history/:id', (req, res) => {
  const index = history.findIndex((item) => item.id === req.params.id);
  if (index > -1) history.splice(index, 1);
  res.status(204).send();
});

export default router;

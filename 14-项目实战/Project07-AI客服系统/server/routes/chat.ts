import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const sessions: Record<string, any[]> = {};

/**
 * 发送消息
 */
router.post('/chat', async (req: any, res: any) => {
  try {
    const { content, session_id } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ message: '内容不能为空' });
    }

    const sessionId = session_id || uuidv4();
    if (!sessions[sessionId]) {
      sessions[sessionId] = [];
    }

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    sessions[sessionId].push(userMessage);

    // 模拟 AI 回复
    const assistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: `感谢您的咨询！关于 "${content}"，我们的客服团队会尽快为您解答。\n\n在实际项目中，这里会调用 OpenAI API 进行智能客服回复。`,
      timestamp: new Date().toISOString(),
      intent: 'general_inquiry',
      confidence: 0.92,
    };

    sessions[sessionId].push(assistantMessage);

    res.json(assistantMessage);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '请求失败' });
  }
});

/**
 * 获取会话历史
 */
router.get('/chat/:sessionId/history', (req: any, res: any) => {
  const { sessionId } = req.params;
  res.json(sessions[sessionId] || []);
});

export default router;

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const chatHistory: any[] = [];

/**
 * 提交问题
 */
router.post('/ask', async (req: any, res: any) => {
  try {
    const { question, doc_ids, top_k } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ message: '问题不能为空' });
    }

    // 模拟 RAG 响应
    const response = {
      id: uuidv4(),
      answer: `这是关于 "${question}" 的回答。\n\n在实际项目中，这里会调用 LangChain + OpenAI 进行 RAG 检索和生成。`,
      sources: [
        {
          doc_id: doc_ids?.[0] || 'doc_1',
          text: '相关文档片段...',
          relevance: 0.95,
        },
      ],
      tokens_used: 150,
      created_at: new Date().toISOString(),
    };

    chatHistory.push({
      id: response.id,
      question,
      ...response,
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '请求失败' });
  }
});

/**
 * 获取历史记录
 */
router.get('/history', (req: any, res: any) => {
  const limit = parseInt(req.query.limit || '50');
  res.json(chatHistory.slice(-limit));
});

export default router;

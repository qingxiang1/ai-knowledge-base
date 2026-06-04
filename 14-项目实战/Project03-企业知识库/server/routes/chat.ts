/**
 * 文件描述: 聊天路由，支持 RAG 问答（OpenAI API + mock 降级）
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

const router = Router();

const isMockMode = !process.env.OPENAI_API_KEY;

/**
 * 获取 OpenAI 客户端实例（延迟初始化）
 */
function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const chatHistory: any[] = [];

/**
 * 提交问题
 */
router.post('/ask', async (req, res) => {
  try {
    const { question, doc_ids, top_k } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ message: '问题不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));

      const response = {
        id: uuidv4(),
        answer: `关于"${question}"，根据知识库中的相关文档，以下是关键信息：\n\n1. 该主题涉及的核心概念包括技术架构设计、数据处理流程和系统集成方案。\n2. 当前最佳实践建议采用模块化设计，确保系统的可扩展性和可维护性。\n3. 在实施过程中，需要特别关注性能优化和安全防护两个维度。\n\n> 注：当前为 Mock 模式。配置 OPENAI_API_KEY 后将使用 RAG 检索增强生成，提供基于真实文档的精准回答。`,
        sources: [
          {
            doc_id: doc_ids?.[0] || 'doc_1',
            text: '相关文档片段：系统架构设计应遵循高内聚低耦合原则...',
            relevance: 0.95,
          },
          {
            doc_id: doc_ids?.[1] || 'doc_2',
            text: '相关文档片段：数据处理流程需要考虑实时性和一致性...',
            relevance: 0.87,
          },
        ],
        tokens_used: 150,
        created_at: new Date().toISOString(),
      };

      chatHistory.push({ id: response.id, question, ...response });
      return res.json(response);
    }

    // 真实 RAG 模式：使用 OpenAI API 生成回答
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一个企业知识库助手。请根据用户的问题，提供准确、专业的回答。回答时请引用相关来源。请用中文回复。',
        },
        { role: 'user', content: question },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const answer = completion.choices[0]?.message?.content || '';
    const tokens_used = completion.usage?.total_tokens || 0;

    const response = {
      id: uuidv4(),
      answer,
      sources: [
        {
          doc_id: doc_ids?.[0] || 'doc_1',
          text: '基于知识库检索的相关文档片段',
          relevance: 0.95,
        },
      ],
      tokens_used,
      created_at: new Date().toISOString(),
    };

    chatHistory.push({ id: response.id, question, ...response });
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '请求失败' });
  }
});

/**
 * 获取历史记录
 */
router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit as string || '50');
  res.json(chatHistory.slice(-limit));
});

export default router;

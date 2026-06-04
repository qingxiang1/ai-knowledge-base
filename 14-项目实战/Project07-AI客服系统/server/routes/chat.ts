/**
 * 文件描述: 客服聊天路由，支持 OpenAI API 和 mock 降级
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

const sessions: Record<string, any[]> = {};

/** 意图识别映射 */
const intentMap: Record<string, string[]> = {
  product_inquiry: ['产品', '功能', '价格', '多少钱', '费用', '套餐'],
  technical_support: ['故障', '报错', '无法', '不能', '崩溃', 'bug'],
  order_query: ['订单', '物流', '发货', '配送', '快递'],
  refund: ['退款', '退货', '退钱', '取消订单'],
  complaint: ['投诉', '不满', '差评', '态度差'],
};

/**
 * 识别用户意图
 * @param content 用户消息内容
 * @returns 意图和置信度
 */
function detectIntent(content: string): { intent: string; confidence: number } {
  for (const [intent, keywords] of Object.entries(intentMap)) {
    if (keywords.some((kw) => content.includes(kw))) {
      return { intent, confidence: 0.85 + Math.random() * 0.1 };
    }
  }
  return { intent: 'general_inquiry', confidence: 0.7 + Math.random() * 0.15 };
}

/**
 * 发送消息
 */
router.post('/chat', async (req, res) => {
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

    const { intent, confidence } = detectIntent(content);

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800));

      const mockResponses: Record<string, string> = {
        product_inquiry: `感谢您对我们产品的关注！\n\n我们提供多种套餐选择：\n- 基础版：¥99/月，适合个人用户\n- 专业版：¥299/月，适合团队使用\n- 企业版：定制方案，请联系销售\n\n请问您对哪个套餐感兴趣？`,
        technical_support: `很抱歉您遇到了技术问题。请您提供以下信息以便我们更快定位问题：\n1. 使用的浏览器和版本\n2. 具体的错误提示\n3. 问题出现的频率\n\n我们的技术团队会尽快为您解决。`,
        order_query: `我来帮您查询订单信息。请提供您的订单号，我将为您查询最新的物流状态。`,
        refund: `关于退款事宜，请您放心。请提供订单号，我将为您核实退款条件并协助处理。一般退款会在 3-5 个工作日内到账。`,
        complaint: `非常抱歉给您带来了不好的体验。我们非常重视您的反馈，会立即安排专人跟进处理。请问您方便留下联系方式吗？`,
        general_inquiry: `感谢您的咨询！关于"${content}"，我们的客服团队会尽快为您解答。\n\n您也可以通过以下方式获取帮助：\n- 查看帮助中心\n- 发送邮件至 support@example.com\n- 工作时间拨打客服热线`,
      };

      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: mockResponses[intent] || mockResponses.general_inquiry,
        timestamp: new Date().toISOString(),
        intent,
        confidence,
      };

      sessions[sessionId].push(assistantMessage);
      return res.json(assistantMessage);
    }

    // 真实 AI 模式
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的客服代表，友好、耐心地回答用户的问题。请用中文回复。如果无法解决，建议用户联系人工客服。',
        },
        ...sessions[sessionId].slice(-10).map((msg) => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        })),
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    const assistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: completion.choices[0]?.message?.content || '',
      timestamp: new Date().toISOString(),
      intent,
      confidence,
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
router.get('/chat/:sessionId/history', (req, res) => {
  const { sessionId } = req.params;
  res.json(sessions[sessionId] || []);
});

export default router;

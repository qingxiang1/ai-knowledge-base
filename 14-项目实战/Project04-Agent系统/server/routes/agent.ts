/**
 * 文件描述: Agent 路由，支持 ReAct Agent 对话（OpenAI API + mock 降级）
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

/**
 * Agent 聊天
 */
router.post('/chat', async (req, res) => {
  try {
    const { query, session_id } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ message: '查询不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1500));

      const response = {
        answer: `根据您的问题"${query}"，我进行了以下分析和处理：\n\n**分析过程**：\n1. 首先识别了问题的核心需求\n2. 通过搜索工具获取了相关信息\n3. 综合分析后得出结论\n\n**结论**：\n该问题涉及技术架构和最佳实践两个维度。建议采用渐进式方案，先解决核心问题，再逐步优化。\n\n> 注：当前为 Mock 模式。配置 OPENAI_API_KEY 后将使用真实的 ReAct Agent 进行推理。`,
        thought_process: [
          { role: 'HumanMessage', content: query },
          { role: 'AIMessage', content: `分析用户需求：用户询问"${query}"，需要调用搜索工具获取最新信息。` },
          { role: 'ToolMessage', content: '调用 search_web 工具，获取相关搜索结果...' },
          { role: 'AIMessage', content: '基于搜索结果，综合分析并生成最终回答。' },
        ],
        tool_calls: [
          { tool: 'search_web', result: `搜索"${query}"的结果：找到 5 条相关信息` },
        ],
      };

      return res.json(response);
    }

    // 真实 Agent 模式
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一个智能 Agent 助手，能够通过思考和工具调用来解决用户的问题。请用中文回复，并展示你的思考过程。',
        },
        { role: 'user', content: query },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const answer = completion.choices[0]?.message?.content || '';

    res.json({
      answer,
      thought_process: [
        { role: 'HumanMessage', content: query },
        { role: 'AIMessage', content: '分析用户需求并制定执行计划...' },
        { role: 'AIMessage', content: answer },
      ],
      tool_calls: [],
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '请求失败' });
  }
});

export default router;

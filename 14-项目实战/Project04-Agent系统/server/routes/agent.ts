import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Agent 聊天
 */
router.post('/chat', async (req: any, res: any) => {
  try {
    const { query, session_id } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ message: '查询不能为空' });
    }

    // 模拟 Agent 响应
    const response = {
      answer: `Agent 回答: "${query}"\n\n在实际项目中，这里会调用 LangChain + LangGraph 实现 ReAct Agent。`,
      thought_process: [
        { role: 'HumanMessage', content: query },
        { role: 'AIMessage', content: '分析用户需求...' },
        { role: 'ToolMessage', content: '调用工具获取信息...' },
        { role: 'AIMessage', content: '生成最终回答' },
      ],
      tool_calls: [
        { tool: 'search_web', result: '搜索结果...' },
      ],
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '请求失败' });
  }
});

export default router;

/**
 * 文件描述: 产品经理 Copilot 路由，支持 OpenAI API 和 mock 降级
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { Router } from 'express';
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
 * 生成 PRD
 */
router.post('/prd', async (req, res) => {
  try {
    const { projectName, description, features, targetUsers } = req.body;

    if (!projectName?.trim()) {
      return res.status(400).json({ message: '项目名称不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 1500));

      return res.json({
        prd: `# ${projectName} 产品需求文档 (PRD)\n\n## 1. 产品概述\n\n${description || '待补充产品描述'}\n\n## 2. 目标用户\n\n${targetUsers || '待补充目标用户'}\n\n## 3. 核心功能\n\n${(features || ['核心功能模块']).map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}\n\n## 4. 功能详细说明\n\n### 4.1 用户管理\n- 用户注册与登录\n- 角色权限管理\n- 个人信息维护\n\n### 4.2 核心业务\n- 数据录入与管理\n- 业务流程处理\n- 审批与流转\n\n### 4.3 数据分析\n- 数据看板\n- 报表导出\n- 趋势分析\n\n## 5. 非功能需求\n\n| 指标 | 要求 |\n|------|------|\n| 响应时间 | < 2s |\n| 并发量 | 1000 QPS |\n| 可用性 | 99.9% |\n| 数据安全 | AES-256 加密 |\n\n## 6. 里程碑规划\n\n- M1（第4周）：完成用户管理与核心框架\n- M2（第8周）：完成核心业务功能\n- M3（第12周）：完成数据分析与优化\n\n> 注：当前为 Mock 模式。配置 OPENAI_API_KEY 后将生成更详尽的 PRD。`,
      });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一位资深产品经理。请根据用户提供的信息生成一份详细的 PRD（产品需求文档），包含产品概述、目标用户、核心功能、功能详细说明、非功能需求和里程碑规划。请用中文回复。',
        },
        {
          role: 'user',
          content: `项目名称：${projectName}\n描述：${description}\n功能：${features?.join('、')}\n目标用户：${targetUsers}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 3000,
    });

    res.json({
      prd: completion.choices[0]?.message?.content || '',
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '生成失败' });
  }
});

/**
 * 生成用户故事
 */
router.post('/user-stories', async (req, res) => {
  try {
    const { feature, context } = req.body;

    if (!feature?.trim()) {
      return res.status(400).json({ message: '功能描述不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1000));

      return res.json({
        stories: [
          { id: 'US-001', story: `作为一个${context || '用户'}，我希望能够${feature}，以便提升工作效率`, priority: 'P0', points: 5 },
          { id: 'US-002', story: `作为一个${context || '管理员'}，我希望能够管理${feature}的配置，以便灵活调整业务规则`, priority: 'P1', points: 3 },
          { id: 'US-003', story: `作为一个${context || '用户'}，我希望能够查看${feature}的历史记录，以便追溯操作`, priority: 'P1', points: 2 },
          { id: 'US-004', story: `作为一个${context || '用户'}，我希望能够批量操作${feature}，以便提高处理效率`, priority: 'P2', points: 5 },
        ],
      });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一位资深产品经理。请根据功能描述生成用户故事列表，每个故事包含 id、story、priority 和 points。请用中文回复，使用 JSON 格式。',
        },
        { role: 'user', content: `功能：${feature}\n上下文：${context || ''}` },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    });

    res.json({
      stories: completion.choices[0]?.message?.content || '',
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '生成失败' });
  }
});

export default router;

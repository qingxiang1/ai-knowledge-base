/**
 * 文件描述: 招聘助手路由，支持 OpenAI API 和 mock 降级
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
 * 生成岗位描述
 */
router.post('/job-description', async (req, res) => {
  try {
    const { title, department, requirements, responsibilities } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: '岗位名称不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1000));

      return res.json({
        description: `# ${title}\n\n**部门**：${department || '技术部'}\n**工作地点**：北京/上海/远程\n**工作类型**：全职\n\n## 岗位职责\n\n${(responsibilities || ['负责核心业务系统开发与维护']).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}\n\n## 任职要求\n\n### 必备条件\n${(requirements || ['3年以上相关工作经验']).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}\n\n### 加分项\n1. 有大厂或知名开源项目经验\n2. 具备技术方案设计能力\n3. 良好的技术文档撰写能力\n\n## 福利待遇\n- 具有竞争力的薪资（20K-40K）\n- 六险一金、年度体检\n- 弹性工作制、远程办公\n- 技术分享、培训成长机会\n\n> 注：当前为 Mock 模式。配置 OPENAI_API_KEY 后将生成更精准的 JD。`,
      });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一位资深的 HR 专家。请根据岗位信息生成专业的岗位描述（JD），包括岗位职责、任职要求和福利待遇。请用中文回复。',
        },
        {
          role: 'user',
          content: `岗位：${title}\n部门：${department}\n要求：${requirements?.join('、')}\n职责：${responsibilities?.join('、')}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    });

    res.json({
      description: completion.choices[0]?.message?.content || '',
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '生成失败' });
  }
});

/**
 * 简历筛选
 */
router.post('/screen-resume', async (req, res) => {
  try {
    const { resume, jobTitle, criteria } = req.body;

    if (!resume?.trim()) {
      return res.status(400).json({ message: '简历内容不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1000));

      return res.json({
        score: 78,
        matchLevel: '良好匹配',
        highlights: [
          '5年以上相关工作经验，符合岗位核心要求',
          '具备团队管理经验，可胜任技术负责人角色',
          '有大型项目落地经验，执行力强',
        ],
        concerns: [
          '最近一份工作间隔较长，需了解原因',
          '技术栈与岗位要求有部分差异，需评估学习适应能力',
        ],
        recommendation: '建议进入面试环节，重点关注技术深度和团队协作能力。',
      });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一位资深的 HR 专家。请根据岗位要求对简历进行筛选评估，给出匹配度评分、亮点、关注点和建议。请用中文回复。',
        },
        {
          role: 'user',
          content: `岗位：${jobTitle}\n筛选标准：${criteria}\n\n简历内容：\n${resume}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    res.json({
      score: 0,
      matchLevel: '',
      highlights: [],
      concerns: [],
      recommendation: completion.choices[0]?.message?.content || '',
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '筛选失败' });
  }
});

/**
 * 生成面试问题
 */
router.post('/interview-questions', async (req, res) => {
  try {
    const { jobTitle, category, difficulty } = req.body;

    if (!jobTitle?.trim()) {
      return res.status(400).json({ message: '岗位名称不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 800));

      return res.json({
        questions: [
          { id: 1, category: category || '技术', question: `请介绍一下您在${jobTitle}领域最满意的项目经历，以及您在其中扮演的角色和贡献。`, difficulty: difficulty || 'medium' },
          { id: 2, category: category || '技术', question: '面对技术方案选型时，您通常如何权衡和决策？请举例说明。', difficulty: difficulty || 'hard' },
          { id: 3, category: category || '技术', question: '请描述一次您解决复杂技术问题的过程，包括问题定位和方案实施。', difficulty: difficulty || 'hard' },
          { id: 4, category: '协作', question: '当与团队成员在技术方案上产生分歧时，您通常如何处理？', difficulty: difficulty || 'medium' },
          { id: 5, category: '成长', question: '您如何保持技术能力的持续提升？最近在学习什么新技术？', difficulty: difficulty || 'easy' },
        ],
      });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `你是一位资深的面试官。请根据岗位和类别生成面试问题列表，每个问题包含 id、category、question 和 difficulty。请用中文回复。`,
        },
        {
          role: 'user',
          content: `岗位：${jobTitle}\n类别：${category}\n难度：${difficulty}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    res.json({
      questions: completion.choices[0]?.message?.content || '',
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '生成失败' });
  }
});

export default router;

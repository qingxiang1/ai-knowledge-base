/**
 * 文件描述: 会议纪要路由，支持 OpenAI API 和 mock 降级
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
 * 生成会议纪要
 */
router.post('/minutes', async (req, res) => {
  try {
    const { transcript, meetingTitle, participants } = req.body;

    if (!transcript?.trim()) {
      return res.status(400).json({ message: '会议转录文本不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1500));

      return res.json({
        summary: `会议"${meetingTitle || '未命名会议'}"摘要：\n\n本次会议主要讨论了项目进展和下一步计划。团队回顾了当前阶段的工作成果，确认了关键里程碑的达成情况，并就后续工作安排达成了共识。会议整体氛围积极，各参会人员均表达了对项目前景的信心。`,
        keyPoints: [
          '项目当前进度符合预期，核心功能已完成 80%',
          '技术架构升级方案已通过评审，下周开始实施',
          '用户反馈收集完成，需要优先处理体验优化问题',
          'Q4 预算需要重新评估，建议增加 15% 的资源投入',
        ],
        actionItems: [
          { task: '完成技术方案文档并提交评审', assignee: participants?.[0] || '张三', deadline: '2026-06-15' },
          { task: '协调设计资源完成 UI 优化', assignee: participants?.[1] || '李四', deadline: '2026-06-10' },
          { task: '准备下周项目汇报材料', assignee: participants?.[2] || '王五' },
          { task: '整理用户反馈并排定优先级', assignee: participants?.[0] || '张三', deadline: '2026-06-08' },
        ],
        decisions: [
          '采用微服务架构进行系统重构，分三期实施',
          'Q4 优先开发核心功能模块，延后非关键需求',
          '引入自动化测试，目标覆盖率达到 80%',
          '每周一召开项目进度同步会',
        ],
      });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `你是一位专业的会议纪要助手。请根据会议转录文本生成结构化的会议纪要，包括：摘要、关键要点、行动项（含负责人和截止日期）、决议事项。请用中文回复，使用 JSON 格式输出。`,
        },
        {
          role: 'user',
          content: `会议标题：${meetingTitle || '未命名会议'}\n参会人员：${participants?.join('、') || '未指定'}\n\n转录文本：\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const result = completion.choices[0]?.message?.content || '';

    res.json({
      summary: result,
      keyPoints: [],
      actionItems: [],
      decisions: [],
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '生成失败' });
  }
});

export default router;

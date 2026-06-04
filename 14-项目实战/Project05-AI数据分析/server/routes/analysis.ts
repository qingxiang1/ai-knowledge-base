/**
 * 文件描述: 数据分析路由，支持 OpenAI API 和 mock 降级
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
 * 分析数据
 */
router.post('/analyze', async (req, res) => {
  try {
    const { data, type } = req.body;

    if (!data?.trim()) {
      return res.status(400).json({ message: '数据不能为空' });
    }

    const typeMap: Record<string, string> = {
      summary: '数据摘要',
      trend: '趋势分析',
      anomaly: '异常检测',
      correlation: '相关性分析',
    };

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));

      const mockInsights: Record<string, string[]> = {
        summary: [
          '数据集包含 ' + data.split('\n').length + ' 行记录',
          '主要数值指标呈现稳定增长趋势',
          '数据质量良好，缺失值比例低于 2%',
        ],
        trend: [
          '整体呈现上升趋势，月均增长率约 8.5%',
          'Q3 数据异常偏高，建议重点关注',
          '预计下季度将继续保持增长态势',
        ],
        anomaly: [
          '发现 3 个异常数据点，集中在 7-9 月',
          '异常值偏离均值超过 2 个标准差',
          '可能原因：季节性因素或数据采集误差',
        ],
        correlation: [
          '收入与用户量呈强正相关（r=0.92）',
          '成本与产量呈中等正相关（r=0.67）',
          '客户满意度与复购率呈显著正相关（r=0.85）',
        ],
      };

      return res.json({
        result: `${typeMap[type] || '分析'} 结果:\n\n基于提供的数据，分析如下：\n\n${data.slice(0, 200)}${data.length > 200 ? '...' : ''}\n\n> 注：当前为 Mock 模式。配置 OPENAI_API_KEY 后将获得深度 AI 数据分析。`,
        insights: mockInsights[type] || ['暂无分析结果'],
        charts: [
          {
            type: 'bar',
            title: '数据分布',
            data: { A: 30, B: 45, C: 25, D: 38, E: 52 },
          },
        ],
      });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `你是一位专业的数据分析师。请对用户提供的数据进行${typeMap[type] || '综合分析'}，给出深入的分析结果和关键洞察。请用中文回复。`,
        },
        { role: 'user', content: data },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const result = completion.choices[0]?.message?.content || '';

    res.json({
      result,
      insights: [],
      charts: [],
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '分析失败' });
  }
});

export default router;

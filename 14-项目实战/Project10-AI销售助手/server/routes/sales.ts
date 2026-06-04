/**
 * 文件描述: 销售助手路由，支持 OpenAI API 和 mock 降级
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
 * 生成销售话术
 */
router.post('/script', async (req, res) => {
  try {
    const { product, customerType, scenario } = req.body;

    if (!product?.trim()) {
      return res.status(400).json({ message: '产品名称不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1000));

      const scenarioMap: Record<string, string> = {
        cold_call: '电话拜访',
        meeting: '面谈',
        follow_up: '跟进',
        negotiation: '谈判',
      };

      return res.json({
        script: `## ${scenarioMap[scenario] || '销售'}话术 - ${product}\n\n### 开场白\n您好！我是${product}的专属顾问。了解到贵公司在${customerType || '行业'}领域的发展，想和您分享一下我们最新的解决方案。\n\n### 需求挖掘\n- 请问目前贵公司在${customerType || '业务'}方面遇到的最大挑战是什么？\n- 现有的解决方案是否满足您的需求？\n- 团队规模和预算情况如何？\n\n### 产品介绍\n${product}的核心优势：\n1. **效率提升**：平均提升 40% 的工作效率\n2. **成本节约**：可降低 30% 的运营成本\n3. **安全可靠**：99.9% 的服务可用性保障\n4. **灵活扩展**：按需付费，弹性扩容\n\n### 异议处理\n- **价格问题**：我们提供灵活的付费方案，ROI 通常在 3 个月内实现\n- **技术顾虑**：我们提供 7×24 小时技术支持和免费培训\n- **迁移风险**：专业的实施团队确保平滑过渡\n\n### 促单话术\n现在签约可享受首月 8 折优惠，并赠送价值 ¥5,000 的增值服务包。\n\n> 注：当前为 Mock 模式。配置 OPENAI_API_KEY 后将生成个性化销售话术。`,
      });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `你是一位资深的销售顾问。请根据产品信息和客户类型生成专业的销售话术，包括开场白、需求挖掘、产品介绍、异议处理和促单话术。请用中文回复。`,
        },
        {
          role: 'user',
          content: `产品：${product}\n客户类型：${customerType}\n场景：${scenario}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    res.json({
      script: completion.choices[0]?.message?.content || '',
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '生成失败' });
  }
});

/**
 * 客户分析
 */
router.post('/analyze', async (req, res) => {
  try {
    const { customerInfo, analysisType } = req.body;

    if (!customerInfo?.trim()) {
      return res.status(400).json({ message: '客户信息不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1000));

      return res.json({
        analysis: `## 客户分析报告\n\n### 基本信息\n${customerInfo.slice(0, 200)}\n\n### 需求分析\n- 核心需求：提升业务效率和数据管理能力\n- 预算范围：中等偏上\n- 决策周期：预计 2-4 周\n\n### 购买意向评分\n**75/100** - 中高意向\n\n### 建议策略\n1. 重点展示 ROI 和效率提升数据\n2. 提供行业标杆案例\n3. 安排产品演示，突出差异化优势\n4. 适时提供试用方案降低决策门槛`,
      });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一位资深的销售分析师。请根据客户信息进行深入分析，包括需求分析、购买意向评估和建议策略。请用中文回复。',
        },
        { role: 'user', content: customerInfo },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    });

    res.json({
      analysis: completion.choices[0]?.message?.content || '',
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '分析失败' });
  }
});

export default router;

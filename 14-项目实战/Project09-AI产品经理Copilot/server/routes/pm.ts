import { Router } from 'express';

const router = Router();

/**
 * 生成 PRD
 */
router.post('/prd', async (req: any, res: any) => {
  try {
    const { productName, productDescription, targetUsers, coreFeatures, techStack } = req.body;

    if (!productName?.trim() || !productDescription?.trim()) {
      return res.status(400).json({ message: '产品名称和描述不能为空' });
    }

    const response = {
      title: `${productName} 产品需求文档`,
      sections: [
        {
          heading: '1. 产品概述',
          content: `产品名称: ${productName}\n产品描述: ${productDescription}\n\n在实际项目中，这里会调用 OpenAI API 生成完整的产品概述。`,
        },
        {
          heading: '2. 目标用户',
          content: targetUsers || '待补充',
        },
        {
          heading: '3. 核心功能',
          content: coreFeatures || '待补充',
        },
        {
          heading: '4. 技术方案',
          content: techStack || '待补充',
        },
        {
          heading: '5. 里程碑规划',
          content: '- MVP 阶段: 核心功能开发\n- 迭代阶段: 用户反馈优化\n- 扩展阶段: 功能完善',
        },
      ],
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '生成失败' });
  }
});

/**
 * 竞品分析
 */
router.post('/competitor', async (req: any, res: any) => {
  try {
    const { productName, competitors, dimensions } = req.body;

    if (!productName?.trim() || !competitors?.length) {
      return res.status(400).json({ message: '产品名称和竞品不能为空' });
    }

    const response = {
      summary: `${productName} 与主要竞品的对比分析。在实际项目中，这里会调用 OpenAI API 生成深度竞品分析报告。`,
      comparison: dimensions.map((dim: string) => ({
        dimension: dim,
        results: competitors.reduce((acc: Record<string, string>, comp: string) => {
          acc[comp] = '中等水平';
          return acc;
        }, { [productName]: '领先水平' }),
      })),
      suggestions: [
        '强化差异化功能，突出核心优势',
        '优化用户体验，提升产品易用性',
        '加强市场推广，扩大用户覆盖',
      ],
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '分析失败' });
  }
});

export default router;

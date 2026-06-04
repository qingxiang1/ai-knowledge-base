/**
 * 文件描述: 代码助手路由，支持 OpenAI API 和 mock 降级
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

const actionMap: Record<string, string> = {
  generate: '生成',
  explain: '解释',
  optimize: '优化',
  fix: '修复',
};

/**
 * 代码处理
 */
router.post('/code', async (req, res) => {
  try {
    const { prompt, language, action } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ message: '需求描述不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));

      const mockCodeMap: Record<string, string> = {
        generate: `// ${language} 代码示例\n// 需求: ${prompt}\n\n/**\n * 根据需求生成的 ${language} 函数\n * @param input 输入参数\n * @returns 处理结果\n */\nfunction process${prompt.slice(0, 1).toUpperCase()}${prompt.slice(1, 10).replace(/\s/g, '')}(input: string): string {\n  // 实现核心逻辑\n  const result = input.trim().toLowerCase();\n  console.log(\`Processing: \${result}\`);\n  return result;\n}\n\nexport default process${prompt.slice(0, 1).toUpperCase()}${prompt.slice(1, 10).replace(/\s/g, '')};`,
        explain: `// 原始代码解释\n// ${prompt.slice(0, 80)}\n\n/*\n * 代码功能说明：\n * 1. 该代码实现了核心数据处理逻辑\n * 2. 主要流程包括：输入验证 → 数据转换 → 结果输出\n * 3. 采用了 ${language} 的标准设计模式\n *\n * 配置 OPENAI_API_KEY 后可获得更详细的代码解释。\n */`,
        optimize: `// 优化后的 ${language} 代码\n// 原始需求: ${prompt.slice(0, 80)}\n\n// 优化点：\n// 1. 使用缓存减少重复计算\n// 2. 采用异步处理提升性能\n// 3. 添加错误处理增强健壮性\n\nconst cache = new Map<string, any>();\n\nasync function optimizedProcess(input: string): Promise<string> {\n  if (cache.has(input)) return cache.get(input);\n  \n  try {\n    const result = await transformAsync(input);\n    cache.set(input, result);\n    return result;\n  } catch (error) {\n    console.error('处理失败:', error);\n    throw error;\n  }\n}`,
        fix: `// 修复后的 ${language} 代码\n// 原始需求: ${prompt.slice(0, 80)}\n\n// 修复内容：\n// 1. 修复了空值引用错误\n// 2. 添加了边界条件检查\n// 3. 修正了异步处理逻辑\n\nfunction fixedProcess(input: string | null): string {\n  if (!input) {\n    throw new Error('输入不能为空');\n  }\n  \n  const trimmed = input.trim();\n  if (trimmed.length === 0) {\n    return '';\n  }\n  \n  return trimmed.toUpperCase();\n}`,
      };

      return res.json({
        code: mockCodeMap[action] || mockCodeMap.generate,
        explanation: `这是根据您的需求${actionMap[action] || '生成'}的 ${language} 代码。\n\n> 注：当前为 Mock 模式。配置 OPENAI_API_KEY 后将获得高质量的 AI 代码生成。`,
        language,
      });
    }

    const systemPrompts: Record<string, string> = {
      generate: `你是一位专业的 ${language} 开发者。请根据用户需求生成高质量的 ${language} 代码。代码应包含注释，遵循最佳实践。`,
      explain: `你是一位代码分析专家。请详细解释用户提供的 ${language} 代码的功能、逻辑和设计思路。`,
      optimize: `你是一位代码优化专家。请优化用户提供的 ${language} 代码，提升性能和可读性，并说明优化点。`,
      fix: `你是一位代码调试专家。请修复用户提供的 ${language} 代码中的 bug，并说明修复内容。`,
    };

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompts[action] || systemPrompts.generate },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const code = completion.choices[0]?.message?.content || '';

    res.json({
      code,
      explanation: '',
      language,
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '生成失败' });
  }
});

export default router;

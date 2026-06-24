/**
 * 创建时间: 2026-06-03
 * 文件名: code.ts
 * 文件描述: 代码助手路由。串联静态分析(analyzer)、规则检查与自动修复(linter)、片段库(snippets)：
 *           - explain：真实静态分析
 *           - optimize：静态分析 + 规则问题清单
 *           - fix：规则检查 + 语言安全的自动修复
 *           - generate：片段库匹配
 *           mock 模式直接返回真实结果；API 模式把真实分析作为事实喂给模型，生成更自然的结果。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

import { Router } from "express";
import OpenAI from "openai";
import { analyzeCode, describeMetrics } from "../services/analyzer";
import { lintCode, autoFix } from "../services/linter";
import { findSnippet, snippetNames } from "../services/snippets";
import type { CodeAction, CodeResult } from "../types";

const router = Router();

const ACTION_LABEL: Record<CodeAction, string> = {
  generate: "生成",
  explain: "解释",
  optimize: "优化",
  fix: "修复",
};

/**
 * 用大模型基于「真实静态分析」做润色叙述（失败由调用方降级）
 * @param action 动作
 * @param prompt 用户输入（代码或需求）
 * @param language 语言
 * @param facts 本地真实分析事实
 * @returns 模型文本
 */
async function narrate(action: CodeAction, prompt: string, language: string, facts: string): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const systemByAction: Record<CodeAction, string> = {
    generate: `你是资深 ${language} 工程师。根据需求生成高质量、可运行、含注释的代码，并简述用法。`,
    explain: `你是代码分析专家。结合给出的真实静态分析事实，用中文清晰解释这段 ${language} 代码的功能、结构与可改进点。不要编造事实中没有的数字。`,
    optimize: `你是代码优化专家。结合真实静态分析与问题清单，给出 ${language} 代码的优化建议与优化后示例，并说明每条优化的收益。`,
    fix: `你是代码调试专家。结合问题清单，指出 ${language} 代码的缺陷并给出修复后的完整代码与说明。`,
  };

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemByAction[action] },
      { role: "user", content: `语言：${language}\n\n${facts ? `真实静态分析：\n${facts}\n\n` : ""}内容：\n${prompt}` },
    ],
    temperature: 0.3,
    max_tokens: 1800,
  });
  return completion.choices[0]?.message?.content || "";
}

/**
 * 代码处理
 * POST /api/code  body: { prompt, language, action }
 */
router.post("/code", async (req, res) => {
  try {
    const { prompt, language = "TypeScript", action = "generate" } = req.body as {
      prompt?: string;
      language?: string;
      action?: CodeAction;
    };

    if (!prompt?.trim()) {
      return res.status(400).json({ message: "需求描述 / 代码不能为空" });
    }

    const hasKey = !!process.env.OPENAI_API_KEY;
    const result = buildLocalResult(action, prompt, language);

    // mock 模式：直接返回本地真实结果
    if (!hasKey) {
      return res.json(result);
    }

    // API 模式：用模型基于真实分析事实润色（失败降级为本地结果）
    try {
      const facts =
        action === "explain" || action === "optimize"
          ? describeMetrics(analyzeCode(prompt, language)) +
            (result.issues && result.issues.length
              ? `\n问题清单：\n${result.issues.map((i) => `第${i.line}行 [${i.severity}] ${i.message}`).join("\n")}`
              : "")
          : result.issues && result.issues.length
            ? result.issues.map((i) => `第${i.line}行 [${i.severity}] ${i.message}`).join("\n")
            : "";
      const text = await narrate(action, prompt, language, facts);
      return res.json({ ...result, explanation: text || result.explanation, mode: "api" });
    } catch (error) {
      return res.json({
        ...result,
        explanation: `（模型调用失败，已返回本地真实分析结果：${error instanceof Error ? error.message : "未知错误"}）\n\n${result.explanation}`,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "处理失败" });
  }
});

/**
 * 本地真实处理（不依赖任何外部服务）
 * @param action 动作
 * @param prompt 输入
 * @param language 语言
 * @returns 统一结果（mode=mock）
 */
function buildLocalResult(action: CodeAction, prompt: string, language: string): CodeResult {
  if (action === "generate") {
    const snippet = findSnippet(prompt);
    if (snippet) {
      return {
        action,
        language: snippet.language,
        code: snippet.code,
        explanation: `已匹配到「${snippet.name}」的真实可用实现（来自内置片段库）。`,
        snippet: snippet.name,
        mode: "mock",
      };
    }
    return {
      action,
      language,
      code: "",
      explanation:
        `未在内置片段库中匹配到「${prompt}」。\n` +
        `可尝试这些关键词：${snippetNames().join("、")}。\n\n` +
        `> 配置 OPENAI_API_KEY 后可由大模型按任意需求生成代码。`,
      mode: "mock",
    };
  }

  if (action === "explain") {
    const metrics = analyzeCode(prompt, language);
    return {
      action,
      language,
      code: prompt,
      explanation: `代码静态分析：\n${describeMetrics(metrics)}`,
      metrics,
      mode: "mock",
    };
  }

  if (action === "optimize") {
    const metrics = analyzeCode(prompt, language);
    const issues = lintCode(prompt, language);
    const suggestions: string[] = [];
    if (metrics.maxDepth >= 4) suggestions.push(`最大嵌套深度 ${metrics.maxDepth}，建议提前 return 或拆分函数以降低嵌套。`);
    if (metrics.complexity >= 10) suggestions.push(`圈复杂度约 ${metrics.complexity}，分支较多，建议拆分小函数或使用查表/策略模式。`);
    if (metrics.commentRatio < 0.05 && metrics.totalLines > 15) suggestions.push("注释率偏低，关键逻辑建议补充注释。");
    if (metrics.longestLine.length > 120) suggestions.push(`第 ${metrics.longestLine.line} 行过长（${metrics.longestLine.length} 字符），建议换行。`);
    if (suggestions.length === 0) suggestions.push("结构指标良好，未发现明显的结构性优化点。");

    return {
      action,
      language,
      code: prompt,
      explanation: `优化分析（基于真实静态指标）：\n- ${suggestions.join("\n- ")}`,
      metrics,
      issues,
      mode: "mock",
    };
  }

  // fix
  const issues = lintCode(prompt, language);
  const { fixed, applied } = autoFix(prompt, language);
  return {
    action: "fix",
    language,
    code: fixed,
    explanation:
      issues.length > 0
        ? `共检出 ${issues.length} 个问题，已自动修复：${applied.join("、")}。其余需结合上下文人工处理。`
        : `未检出常见规则问题。已应用：${applied.join("、")}。`,
    issues,
    appliedFixes: applied,
    mode: "mock",
  };
}

export default router;

/**
 * 创建时间: 2026-06-03
 * 文件名: analysis.ts
 * 文件描述: 数据分析路由。先用本地统计引擎对数据做真实计算（摘要/趋势/异常/相关性），
 *           mock 模式直接返回真实计算结果；API 模式则把真实统计喂给大模型生成「基于真实数字」
 *           的专业叙述（避免编造），并提供示例数据接口。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

import { Router } from "express";
import OpenAI from "openai";
import { parseDataset } from "../services/parser";
import { analyze } from "../services/stats";
import { SAMPLES, getSample } from "../services/samples";
import type { AnalysisResult } from "../types";

const router = Router();

const TYPE_LABEL: Record<string, string> = {
  summary: "数据摘要",
  trend: "趋势分析",
  anomaly: "异常检测",
  correlation: "相关性分析",
};

/**
 * 列出内置示例数据集
 * GET /api/samples
 */
router.get("/samples", (_req, res) => {
  res.json({
    mode: process.env.OPENAI_API_KEY ? "api" : "mock",
    samples: SAMPLES.map((s) => ({
      key: s.key,
      name: s.name,
      description: s.description,
      recommend: s.recommend,
      csv: s.csv,
    })),
  });
});

/**
 * 取单个示例数据
 * GET /api/samples/:key
 */
router.get("/samples/:key", (req, res) => {
  const sample = getSample(req.params.key);
  if (!sample) return res.status(404).json({ message: "示例不存在" });
  res.json(sample);
});

/**
 * 用大模型把真实统计结果改写成专业叙述（严格基于给定数字，不得编造）
 * @param analysisType 分析类型
 * @param computed 本地真实计算结果
 * @returns { result, insights }
 */
async function narrateWithLLM(
  analysisType: string,
  computed: AnalysisResult,
): Promise<{ result: string; insights: string[] }> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const factSheet = JSON.stringify(
    {
      type: analysisType,
      meta: computed.meta,
      result: computed.result,
      insights: computed.insights,
      columns: computed.columns,
      correlations: computed.correlations,
      outliers: computed.outliers,
    },
    null,
    2,
  );

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "你是一位严谨的数据分析师。下面给出的是对数据集已经计算好的真实统计结果。" +
          "请仅基于这些真实数字，用中文撰写一段专业、简洁的分析结论与业务建议。" +
          "严禁编造未给出的数字或指标。最后用 3-5 条要点总结关键洞察，每条以「- 」开头。",
      },
      { role: "user", content: `分析类型：${TYPE_LABEL[analysisType] || analysisType}\n\n真实统计结果（JSON）：\n${factSheet}` },
    ],
    temperature: 0.3,
    max_tokens: 1200,
  });

  const text = completion.choices[0]?.message?.content || "";
  // 从模型输出中抽取「- 」开头的要点作为 insights，正文作为 result
  const insightLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- ") || l.startsWith("· "))
    .map((l) => l.replace(/^[-·]\s*/, ""));

  return {
    result: text || computed.result,
    insights: insightLines.length > 0 ? insightLines : computed.insights,
  };
}

/**
 * 分析数据
 * POST /api/analyze  body: { data, type }
 */
router.post("/analyze", async (req, res) => {
  try {
    const { data, type } = req.body as { data?: string; type?: string };

    if (!data?.trim()) {
      return res.status(400).json({ message: "数据不能为空" });
    }

    const dataset = parseDataset(data);
    if (dataset.headers.length === 0 || dataset.rows.length === 0) {
      return res.status(400).json({ message: "未能解析出有效数据，请提供 CSV（首行为表头）" });
    }

    const analysisType = type || "summary";
    const computed = analyze(dataset, analysisType);

    // mock 模式：直接返回真实计算结果
    if (!process.env.OPENAI_API_KEY) {
      return res.json({ ...computed, mode: "mock" });
    }

    // API 模式：用模型对真实统计结果做专业叙述（失败则降级为本地结果）
    try {
      const narrated = await narrateWithLLM(analysisType, computed);
      return res.json({ ...computed, result: narrated.result, insights: narrated.insights, mode: "api" });
    } catch (error) {
      return res.json({
        ...computed,
        mode: "mock",
        insights: [
          `（模型叙述失败，已返回本地真实计算结果：${error instanceof Error ? error.message : "未知错误"}）`,
          ...computed.insights,
        ],
      });
    }
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "分析失败" });
  }
});

export default router;

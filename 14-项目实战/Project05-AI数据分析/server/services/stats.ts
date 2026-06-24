/**
 * 创建时间: 2026-06-24
 * 文件名: stats.ts
 * 文件描述: Project05 真实统计引擎。对解析后的数据集计算四类分析：
 *           数据摘要 / 趋势（线性回归）/ 异常检测（Z-score）/ 相关性（Pearson）。
 *           全部为真实计算，零依赖、可离线运行，并派生用于前端渲染的图表数据。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

import type {
  AnalysisResult,
  Chart,
  ColumnSummary,
  CorrelationPair,
  Dataset,
  Outlier,
} from "../types";
import { numericColumn, splitColumns } from "./parser";

/** 保留指定小数位（四舍五入），避免浮点噪声 */
function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** 算术平均 */
function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** 总体标准差 */
function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** 中位数 */
function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Pearson 相关系数 */
function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

/** 一元线性回归：返回斜率、截距、R² */
function linearRegression(ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const xs = ys.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  // R²
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i += 1) {
    const pred = slope * xs[i] + intercept;
    ssRes += (ys[i] - pred) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

/** 相关性强度描述 */
function strengthOf(r: number): string {
  const a = Math.abs(r);
  const dir = r >= 0 ? "正" : "负";
  if (a >= 0.8) return `强${dir}相关`;
  if (a >= 0.5) return `中等${dir}相关`;
  if (a >= 0.3) return `弱${dir}相关`;
  return "几乎不相关";
}

/* ------------------------------------------------------------------ */
/* 一、数据摘要                                                         */
/* ------------------------------------------------------------------ */

/**
 * 计算每列摘要 + 派生分布图
 */
function analyzeSummary(dataset: Dataset): AnalysisResult {
  const { numeric, categorical } = splitColumns(dataset);
  const columns: ColumnSummary[] = dataset.headers.map((name) => {
    const colIdx = dataset.headers.indexOf(name);
    const raw = dataset.rows.map((r) => r[colIdx] ?? "");
    const missing = raw.filter((v) => v === "").length;
    if (dataset.columnTypes[name] === "numeric") {
      const { values } = numericColumn(dataset, name);
      return {
        name,
        type: "numeric",
        count: values.length,
        missing,
        min: values.length ? round(Math.min(...values)) : undefined,
        max: values.length ? round(Math.max(...values)) : undefined,
        mean: values.length ? round(mean(values)) : undefined,
        median: values.length ? round(median(values)) : undefined,
        std: values.length ? round(std(values)) : undefined,
      };
    }
    const counts = new Map<string, number>();
    for (const v of raw) if (v !== "") counts.set(v, (counts.get(v) ?? 0) + 1);
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([value, count]) => ({ value, count }));
    return {
      name,
      type: "categorical",
      count: raw.length - missing,
      missing,
      unique: counts.size,
      top,
    };
  });

  // 派生图表：优先首个数值列直方图，否则首个类别列计数
  let chart: Chart;
  if (numeric.length > 0) {
    const { values } = numericColumn(dataset, numeric[0]);
    chart = histogram(values, numeric[0]);
  } else if (categorical.length > 0) {
    const summary = columns.find((c) => c.name === categorical[0]);
    chart = {
      type: "bar",
      title: `${categorical[0]} 类别分布（Top）`,
      labels: summary?.top?.map((t) => t.value) ?? [],
      values: summary?.top?.map((t) => t.count) ?? [],
    };
  } else {
    chart = { type: "bar", title: "数据分布", labels: [], values: [] };
  }

  const insights: string[] = [];
  insights.push(`共 ${dataset.rows.length} 行、${dataset.headers.length} 列，其中数值列 ${numeric.length} 个、类别列 ${categorical.length} 个。`);
  const missingCols = columns.filter((c) => c.missing > 0);
  if (missingCols.length) {
    insights.push(`存在缺失值的列：${missingCols.map((c) => `${c.name}(${c.missing})`).join("、")}。`);
  } else {
    insights.push("各列均无缺失值，数据完整。");
  }
  const firstNum = columns.find((c) => c.type === "numeric");
  if (firstNum) {
    insights.push(`「${firstNum.name}」均值 ${firstNum.mean}，中位数 ${firstNum.median}，范围 ${firstNum.min} ~ ${firstNum.max}。`);
  }

  const result = `数据摘要：共 ${dataset.rows.length} 行 ${dataset.headers.length} 列。\n` +
    columns
      .map((c) =>
        c.type === "numeric"
          ? `· ${c.name}（数值）：均值 ${c.mean}，中位数 ${c.median}，标准差 ${c.std}，范围 ${c.min}~${c.max}，缺失 ${c.missing}`
          : `· ${c.name}（类别）：${c.unique} 个不同取值，最常见「${c.top?.[0]?.value ?? "-"}」，缺失 ${c.missing}`,
      )
      .join("\n");

  return {
    result,
    insights,
    columns,
    charts: [chart],
    meta: { rows: dataset.rows.length, columns: dataset.headers.length },
    mode: "mock",
  };
}

/** 把数值数组分箱为直方图 */
function histogram(values: number[], name: string, bins = 6): Chart {
  if (values.length === 0) return { type: "bar", title: `${name} 分布`, labels: [], values: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { type: "bar", title: `${name} 分布`, labels: [String(round(min))], values: [values.length] };
  }
  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    counts[idx] += 1;
  }
  const labels = counts.map((_, i) => `${round(min + i * width)}~${round(min + (i + 1) * width)}`);
  return { type: "bar", title: `${name} 分布直方图`, labels, values: counts };
}

/* ------------------------------------------------------------------ */
/* 二、趋势分析                                                         */
/* ------------------------------------------------------------------ */

function analyzeTrend(dataset: Dataset): AnalysisResult {
  const { numeric } = splitColumns(dataset);
  if (numeric.length === 0) {
    return emptyNumericResult(dataset, "趋势分析");
  }

  const insights: string[] = [];
  const charts: Chart[] = [];
  const lines: string[] = [];

  for (const col of numeric) {
    const { values } = numericColumn(dataset, col);
    if (values.length < 2) continue;
    const { slope, r2 } = linearRegression(values);
    const first = values[0];
    const last = values[values.length - 1];
    const changePct = first !== 0 ? round(((last - first) / Math.abs(first)) * 100) : 0;
    const dir = slope > 0 ? "上升" : slope < 0 ? "下降" : "平稳";
    lines.push(`· ${col}：整体${dir}，斜率 ${round(slope, 3)}/期，期间变化 ${changePct}%，拟合优度 R²=${round(r2, 3)}`);
    insights.push(`「${col}」整体呈${dir}趋势，首末变化 ${changePct}%（R²=${round(r2, 3)}，越接近 1 越线性）。`);
    charts.push({ type: "line", title: `${col} 趋势`, labels: values.map((_, i) => `${i + 1}`), values: values.map((v) => round(v)) });
  }

  if (lines.length === 0) return emptyNumericResult(dataset, "趋势分析");

  // 只保留前 3 张图，避免过多
  return {
    result: `趋势分析（基于行序的一元线性回归）：\n${lines.join("\n")}`,
    insights,
    charts: charts.slice(0, 3),
    meta: { rows: dataset.rows.length, columns: dataset.headers.length },
    mode: "mock",
  };
}

/* ------------------------------------------------------------------ */
/* 三、异常检测                                                         */
/* ------------------------------------------------------------------ */

function analyzeAnomaly(dataset: Dataset): AnalysisResult {
  const { numeric } = splitColumns(dataset);
  if (numeric.length === 0) return emptyNumericResult(dataset, "异常检测");

  const Z_THRESHOLD = 2;
  const outliers: Outlier[] = [];
  const charts: Chart[] = [];

  for (const col of numeric) {
    const { values, rowIndexes } = numericColumn(dataset, col);
    if (values.length < 3) continue;
    const m = mean(values);
    const sd = std(values);
    const highlights: number[] = [];
    values.forEach((v, i) => {
      const z = sd === 0 ? 0 : (v - m) / sd;
      if (Math.abs(z) >= Z_THRESHOLD) {
        outliers.push({ column: col, rowIndex: rowIndexes[i], value: round(v), z: round(z) });
        highlights.push(i);
      }
    });
    charts.push({
      type: "bar",
      title: `${col}（红色为异常）`,
      labels: values.map((_, i) => `${i + 1}`),
      values: values.map((v) => round(v)),
      highlights,
    });
  }

  const insights: string[] = [];
  if (outliers.length === 0) {
    insights.push("在 |Z| ≥ 2 的判定下未发现明显异常点，数据较为平稳。");
  } else {
    insights.push(`共发现 ${outliers.length} 个异常点（|Z| ≥ 2）。`);
    for (const o of outliers.slice(0, 5)) {
      insights.push(`第 ${o.rowIndex + 1} 行「${o.column}」= ${o.value}，偏离均值 ${o.z} 个标准差。`);
    }
  }

  const result = outliers.length
    ? `异常检测（Z-score，阈值 |Z| ≥ 2）：发现 ${outliers.length} 个异常点。\n` +
      outliers.map((o) => `· 第 ${o.rowIndex + 1} 行 ${o.column}=${o.value}（Z=${o.z}）`).join("\n")
    : "异常检测（Z-score，阈值 |Z| ≥ 2）：未发现明显异常点。";

  return {
    result,
    insights,
    outliers,
    charts: charts.slice(0, 3),
    meta: { rows: dataset.rows.length, columns: dataset.headers.length },
    mode: "mock",
  };
}

/* ------------------------------------------------------------------ */
/* 四、相关性分析                                                       */
/* ------------------------------------------------------------------ */

function analyzeCorrelation(dataset: Dataset): AnalysisResult {
  const { numeric } = splitColumns(dataset);
  if (numeric.length < 2) {
    return {
      result: "相关性分析至少需要 2 个数值列，当前数值列不足。",
      insights: ["请提供包含至少两个数值列的数据。"],
      correlations: [],
      charts: [],
      meta: { rows: dataset.rows.length, columns: dataset.headers.length },
      mode: "mock",
    };
  }

  const pairs: CorrelationPair[] = [];
  for (let i = 0; i < numeric.length; i += 1) {
    for (let j = i + 1; j < numeric.length; j += 1) {
      const a = numericColumn(dataset, numeric[i]).values;
      const b = numericColumn(dataset, numeric[j]).values;
      const r = round(pearson(a, b), 3);
      pairs.push({ a: numeric[i], b: numeric[j], r, strength: strengthOf(r) });
    }
  }
  pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));

  const insights = pairs
    .slice(0, 5)
    .map((p) => `「${p.a}」与「${p.b}」：r=${p.r}（${p.strength}）。`);

  const chart: Chart = {
    type: "bar",
    title: "相关性 |r| 排名",
    labels: pairs.slice(0, 6).map((p) => `${p.a}~${p.b}`),
    values: pairs.slice(0, 6).map((p) => round(Math.abs(p.r))),
  };

  const result = `相关性分析（Pearson 相关系数）：\n` +
    pairs.map((p) => `· ${p.a} ~ ${p.b}：r=${p.r}（${p.strength}）`).join("\n");

  return {
    result,
    insights,
    correlations: pairs,
    charts: [chart],
    meta: { rows: dataset.rows.length, columns: dataset.headers.length },
    mode: "mock",
  };
}

/** 数值列不足时的兜底结果 */
function emptyNumericResult(dataset: Dataset, label: string): AnalysisResult {
  return {
    result: `${label}需要数值列，但当前数据未识别到数值列。请检查数据格式（建议 CSV，首行为表头）。`,
    insights: ["未识别到可用于数值分析的列。"],
    charts: [],
    meta: { rows: dataset.rows.length, columns: dataset.headers.length },
    mode: "mock",
  };
}

/* ------------------------------------------------------------------ */
/* 统一入口                                                            */
/* ------------------------------------------------------------------ */

/**
 * 对数据集执行指定类型的真实统计分析
 * @param dataset 解析后的数据集
 * @param type 分析类型
 * @returns 分析结果（mode 默认 mock，调用方可覆盖）
 */
export function analyze(dataset: Dataset, type: string): AnalysisResult {
  switch (type) {
    case "trend":
      return analyzeTrend(dataset);
    case "anomaly":
      return analyzeAnomaly(dataset);
    case "correlation":
      return analyzeCorrelation(dataset);
    case "summary":
    default:
      return analyzeSummary(dataset);
  }
}

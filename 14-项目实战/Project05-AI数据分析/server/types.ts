/**
 * 创建时间: 2026-06-24
 * 文件名: types.ts
 * 文件描述: Project05 AI 数据分析服务端共享类型。定义解析后的数据集结构、四类分析结果、
 *           图表数据结构与统一响应体。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

/** 分析类型 */
export type AnalysisType = "summary" | "trend" | "anomaly" | "correlation";

/** 列的数据类型 */
export type ColumnType = "numeric" | "categorical";

/** 解析后的数据集 */
export interface Dataset {
  headers: string[];
  /** 每行是一个字符串数组（与 headers 对齐） */
  rows: string[][];
  /** 列名 -> 列类型 */
  columnTypes: Record<string, ColumnType>;
}

/** 单列的统计摘要 */
export interface ColumnSummary {
  name: string;
  type: ColumnType;
  /** 非缺失值数量 */
  count: number;
  /** 缺失值数量 */
  missing: number;
  // 数值列
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  // 类别列
  unique?: number;
  top?: { value: string; count: number }[];
}

/** 图表数据（前端用纯 DOM/SVG 渲染，无需图表库） */
export interface Chart {
  type: "bar" | "line";
  title: string;
  labels: string[];
  values: number[];
  /** 需要高亮的下标（如异常点） */
  highlights?: number[];
}

/** 一条相关性结果 */
export interface CorrelationPair {
  a: string;
  b: string;
  r: number;
  strength: string;
}

/** 一个异常点 */
export interface Outlier {
  column: string;
  rowIndex: number;
  value: number;
  z: number;
}

/** 统一分析结果 */
export interface AnalysisResult {
  /** 文字结论（mock 为本地合成，api 为模型基于真实统计的叙述） */
  result: string;
  /** 关键洞察要点 */
  insights: string[];
  /** 列统计（summary 类型时填充） */
  columns?: ColumnSummary[];
  /** 相关性结果（correlation 类型时填充） */
  correlations?: CorrelationPair[];
  /** 异常点（anomaly 类型时填充） */
  outliers?: Outlier[];
  /** 图表 */
  charts: Chart[];
  /** 数据规模 */
  meta: { rows: number; columns: number };
  /** 运行模式 */
  mode: "mock" | "api";
}

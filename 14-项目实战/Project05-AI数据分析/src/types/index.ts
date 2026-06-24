/**
 * 创建时间: 2026-06-03
 * 文件名: index.ts
 * 文件描述: 前端共享类型，与服务端 AnalysisResult 对齐，用于渲染真实统计结果与图表
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

export type AnalysisType = 'summary' | 'trend' | 'anomaly' | 'correlation';

/** 数据分析请求 */
export interface AnalysisRequest {
  data: string;
  type: AnalysisType;
}

/** 单列统计摘要 */
export interface ColumnSummary {
  name: string;
  type: 'numeric' | 'categorical';
  count: number;
  missing: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  unique?: number;
  top?: { value: string; count: number }[];
}

/** 图表数据 */
export interface Chart {
  type: 'bar' | 'line';
  title: string;
  labels: string[];
  values: number[];
  highlights?: number[];
}

/** 相关性结果 */
export interface CorrelationPair {
  a: string;
  b: string;
  r: number;
  strength: string;
}

/** 异常点 */
export interface Outlier {
  column: string;
  rowIndex: number;
  value: number;
  z: number;
}

/** 数据分析响应 */
export interface AnalysisResponse {
  result: string;
  insights: string[];
  columns?: ColumnSummary[];
  correlations?: CorrelationPair[];
  outliers?: Outlier[];
  charts: Chart[];
  meta: { rows: number; columns: number };
  mode: 'mock' | 'api';
}

/** 示例数据集元信息 */
export interface SampleInfo {
  key: string;
  name: string;
  description: string;
  recommend: AnalysisType;
  csv: string;
}

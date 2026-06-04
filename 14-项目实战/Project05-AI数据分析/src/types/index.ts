/**
 * 数据分析请求
 */
export interface AnalysisRequest {
  data: string;
  type: 'summary' | 'trend' | 'anomaly' | 'correlation';
}

/**
 * 数据分析响应
 */
export interface AnalysisResponse {
  result: string;
  insights: string[];
  charts?: Array<{
    type: string;
    title: string;
    data: Record<string, number>;
  }>;
}

/**
 * PRD 生成请求
 */
export interface PRDRequest {
  productName: string;
  productDescription: string;
  targetUsers: string;
  coreFeatures: string;
  techStack?: string;
}

/**
 * PRD 生成响应
 */
export interface PRDResponse {
  title: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
}

/**
 * 竞品分析请求
 */
export interface CompetitorRequest {
  productName: string;
  competitors: string[];
  dimensions: string[];
}

/**
 * 竞品分析响应
 */
export interface CompetitorResponse {
  summary: string;
  comparison: Array<{
    dimension: string;
    results: Record<string, string>;
  }>;
  suggestions: string[];
}

/**
 * 销售话术生成请求
 */
export interface SalesScriptRequest {
  productName: string;
  productFeatures: string;
  targetCustomer: string;
  scenario: 'cold_call' | 'demo' | 'follow_up' | 'objection';
}

/**
 * 销售话术响应
 */
export interface SalesScriptResponse {
  script: string;
  keyPoints: string[];
  objections: Array<{
    objection: string;
    response: string;
  }>;
}

/**
 * 客户画像分析请求
 */
export interface CustomerProfileRequest {
  customerInfo: string;
  industry?: string;
  companySize?: string;
}

/**
 * 客户画像响应
 */
export interface CustomerProfileResponse {
  profile: string;
  painPoints: string[];
  needs: string[];
  approach: string;
}

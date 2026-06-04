/**
 * 代码生成请求
 */
export interface CodeRequest {
  prompt: string;
  language: string;
  action: 'generate' | 'explain' | 'optimize' | 'fix';
}

/**
 * 代码生成响应
 */
export interface CodeResponse {
  code: string;
  explanation?: string;
  language: string;
}

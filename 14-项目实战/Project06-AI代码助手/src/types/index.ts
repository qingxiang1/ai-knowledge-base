/**
 * 创建时间: 2026-06-03
 * 文件名: index.ts
 * 文件描述: 前端共享类型，与服务端 CodeResult 对齐，用于渲染真实分析/检查/修复结果
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

export type CodeAction = 'generate' | 'explain' | 'optimize' | 'fix';

/** 代码生成请求 */
export interface CodeRequest {
  prompt: string;
  language: string;
  action: CodeAction;
}

/** 代码静态度量 */
export interface CodeMetrics {
  detectedLanguage: string;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  commentRatio: number;
  functions: number;
  maxDepth: number;
  complexity: number;
  longestLine: { length: number; line: number };
}

export type Severity = 'error' | 'warning' | 'info';

/** 一条问题 */
export interface Issue {
  line: number;
  severity: Severity;
  rule: string;
  message: string;
}

/** 代码处理响应 */
export interface CodeResponse {
  action: CodeAction;
  language: string;
  code: string;
  explanation: string;
  metrics?: CodeMetrics;
  issues?: Issue[];
  appliedFixes?: string[];
  snippet?: string;
  mode: 'mock' | 'api';
}

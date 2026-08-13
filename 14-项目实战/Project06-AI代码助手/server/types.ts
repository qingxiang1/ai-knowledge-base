/**
 * 创建时间: 2026-06-24
 * 文件名: types.ts
 * 文件描述: Project06 AI 代码助手服务端共享类型。定义请求、代码度量、Lint 问题与统一响应。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

/** 操作类型：生成 / 解释 / 优化 / 修复 */
export type CodeAction = "generate" | "explain" | "optimize" | "fix";

/** 请求体 */
export interface CodeRequest {
  prompt: string;
  language: string;
  action: CodeAction;
}

/** 代码静态度量（真实计算） */
export interface CodeMetrics {
  /** 探测到的语言 */
  detectedLanguage: string;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  /** 注释率（0-1，两位小数） */
  commentRatio: number;
  /** 函数/方法数量（近似） */
  functions: number;
  /** 最大嵌套深度 */
  maxDepth: number;
  /** 圈复杂度近似（分支关键字计数 + 1） */
  complexity: number;
  /** 最长行长度与行号 */
  longestLine: { length: number; line: number };
}

/** 问题严重级别 */
export type Severity = "error" | "warning" | "info";

/** 一条 Lint / 优化问题 */
export interface Issue {
  line: number;
  severity: Severity;
  rule: string;
  message: string;
}

/** 统一响应 */
export interface CodeResult {
  action: CodeAction;
  language: string;
  /** 生成 / 修复后的代码；解释/优化时回显输入 */
  code: string;
  /** 文字说明 */
  explanation: string;
  /** 代码度量（explain / optimize 填充） */
  metrics?: CodeMetrics;
  /** 问题列表（optimize / fix 填充） */
  issues?: Issue[];
  /** 已应用的自动修复（fix 填充） */
  appliedFixes?: string[];
  /** 命中的代码片段名（generate 填充） */
  snippet?: string;
  mode: "mock" | "api";
}

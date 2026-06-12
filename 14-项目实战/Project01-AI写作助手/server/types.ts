/**
 * 创建时间: 2026-06-12
 * 文件名: types.ts
 * 文件描述: Project01 企业级写作工作流服务端共享类型定义
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-12
 */

import type { WritingAction, WritingStyle } from "./services/openai";

export const workflowStatuses = [
  "draft",
  "in_review",
  "approved",
  "rejected",
  "published",
] as const;
export const userRoles = ["author", "reviewer", "publisher"] as const;

export type WorkflowStatus = (typeof workflowStatuses)[number];
export type UserRole = (typeof userRoles)[number];
export type ComplianceStatus = "passed" | "warning" | "blocked";
export type BrandRuleSeverity = "warning" | "blocker";
export type BrandRuleCategory = "claim" | "privacy" | "brand" | "handoff";

/**
 * 模板定义
 */
export interface WritingTemplate {
  id: string;
  name: string;
  description: string;
  channel: string;
  promptHint: string;
}

/**
 * 审计日志定义
 */
export interface WorkflowAuditLog {
  id: string;
  action: string;
  fromStatus: WorkflowStatus | null;
  toStatus: WorkflowStatus;
  operatorRole: UserRole;
  operatorName: string;
  comment?: string;
  createdAt: string;
}

/**
 * 品牌规则命中项定义
 */
export interface ComplianceIssue {
  id: string;
  ruleName: string;
  severity: BrandRuleSeverity;
  category: BrandRuleCategory;
  message: string;
  suggestion: string;
  hitText?: string;
}

/**
 * 合规检查结果定义
 */
export interface ComplianceCheckResult {
  status: ComplianceStatus;
  summary: string;
  checkedAt: string;
  issues: ComplianceIssue[];
}

/**
 * 企业写作单据定义
 */
export interface EnterpriseDocument {
  id: string;
  title: string;
  brief: string;
  templateId: string;
  templateName: string;
  channel: string;
  style: WritingStyle;
  action: WritingAction;
  status: WorkflowStatus;
  authorName: string;
  generatedContent: string;
  reviewerComment?: string;
  publishNote?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  wordCount: number;
  tokensUsed: number;
  model: string;
  compliance: ComplianceCheckResult;
  auditLogs: WorkflowAuditLog[];
}

/**
 * 草稿生成请求定义
 */
export interface GenerateDocumentRequest {
  documentId?: string;
  title: string;
  brief: string;
  templateId: string;
  style: WritingStyle;
  action: WritingAction;
  operatorName: string;
  operatorRole: UserRole;
}

/**
 * 工作流操作请求定义
 */
export interface WorkflowMutationRequest {
  operatorName: string;
  operatorRole: UserRole;
  comment?: string;
}

/**
 * 审核请求定义
 */
export interface ReviewDocumentRequest extends WorkflowMutationRequest {
  decision: "approve" | "reject";
}

/**
 * 文件存储结构定义
 */
export interface DocumentStoreSnapshot {
  documents: EnterpriseDocument[];
  lastUpdatedAt: string | null;
}

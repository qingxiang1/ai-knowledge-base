/**
 * 创建时间: 2026-06-12
 * 文件名: index.ts
 * 文件描述: Project01 企业级写作工作流前端类型定义
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-12
 */

/**
 * 写作风格枚举
 */
export enum WritingStyle {
  FORMAL = "formal",
  CASUAL = "casual",
  ACADEMIC = "academic",
  CREATIVE = "creative",
  BUSINESS = "business",
}

/**
 * 写作动作枚举
 */
export enum WritingAction {
  GENERATE = "generate",
  CONTINUE = "continue",
  POLISH = "polish",
  SHORTEN = "shorten",
  EXPAND = "expand",
}

/**
 * 企业工作流状态枚举
 */
export enum WorkflowStatus {
  DRAFT = "draft",
  IN_REVIEW = "in_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  PUBLISHED = "published",
}

/**
 * 当前操作者角色枚举
 */
export enum UserRole {
  AUTHOR = "author",
  REVIEWER = "reviewer",
  PUBLISHER = "publisher",
}

/**
 * 合规状态枚举
 */
export enum ComplianceStatus {
  PASSED = "passed",
  WARNING = "warning",
  BLOCKED = "blocked",
}

/**
 * 规则严重级别枚举
 */
export enum BrandRuleSeverity {
  WARNING = "warning",
  BLOCKER = "blocker",
}

/**
 * 规则分类枚举
 */
export enum BrandRuleCategory {
  CLAIM = "claim",
  PRIVACY = "privacy",
  BRAND = "brand",
  HANDOFF = "handoff",
}

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
 * 合规命中问题定义
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
 * 轻量表单状态定义
 */
export interface WritingFormState {
  title: string;
  brief: string;
  templateId: string;
  style: WritingStyle;
  action: WritingAction;
}

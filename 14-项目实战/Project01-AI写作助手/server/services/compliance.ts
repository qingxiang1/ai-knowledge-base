/**
 * 创建时间: 2026-06-12
 * 文件名: compliance.ts
 * 文件描述: Project01 企业级写作工作流品牌规则与合规扫描服务
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-12
 */

import { randomUUID } from "node:crypto";
import type {
  BrandRuleCategory,
  BrandRuleSeverity,
  ComplianceCheckResult,
  ComplianceIssue,
  ComplianceStatus,
} from "../types";

interface ComplianceScanInput {
  title: string;
  brief: string;
  content: string;
}

interface BrandRuleDefinition {
  name: string;
  severity: BrandRuleSeverity;
  category: BrandRuleCategory;
  pattern: RegExp;
  message: string;
  suggestion: string;
}

const BRAND_RULES: BrandRuleDefinition[] = [
  {
    name: "绝对化营销表述",
    severity: "blocker",
    category: "claim",
    pattern: /100%|绝对|永久|零风险|无风险|第一|唯一|最佳/g,
    message: "检测到未经证实的绝对化或排他性表述，存在品牌与法务风险。",
    suggestion: "请改为可验证的事实描述，例如“显著提升协作效率”或补充数据来源。",
  },
  {
    name: "隐私与授权违规承诺",
    severity: "blocker",
    category: "privacy",
    pattern: /无需授权|不用同意|自动抓取用户聊天记录|直接读取客户隐私|绕过审批/g,
    message: "检测到可能违反隐私授权或审批流程的敏感描述。",
    suggestion: "请明确数据使用前提、授权方式与审批边界，避免越权承诺。",
  },
  {
    name: "内部占位信息未清理",
    severity: "warning",
    category: "handoff",
    pattern: /TODO|TBD|待补充|待确认|占位|xxx/gi,
    message: "内容中仍包含待补充或占位信息，可能影响审核与交付质量。",
    suggestion: "提交审核前请补齐关键信息，避免将占位内容流入后续流程。",
  },
  {
    name: "内部口径外露",
    severity: "warning",
    category: "brand",
    pattern: /仅供内部|内部讨论|未经确认|暂不对外/g,
    message: "检测到内部口径或未确认信息，可能不适合进入对外内容流程。",
    suggestion: "请替换为正式对外表述，或在内部模板中明确内容用途。",
  },
];

/**
 * 创建默认合规结果
 * @returns 默认合规结果
 */
export function createDefaultComplianceResult(): ComplianceCheckResult {
  return {
    status: "passed",
    summary: "暂未执行品牌规则扫描",
    checkedAt: new Date().toISOString(),
    issues: [],
  };
}

/**
 * 根据命中项推导合规状态
 * @param issues 命中问题列表
 * @returns 合规状态
 */
function resolveComplianceStatus(issues: ComplianceIssue[]): ComplianceStatus {
  if (issues.some((issue) => issue.severity === "blocker")) {
    return "blocked";
  }

  if (issues.length > 0) {
    return "warning";
  }

  return "passed";
}

/**
 * 生成扫描摘要
 * @param status 合规状态
 * @param issues 命中问题列表
 * @returns 扫描摘要
 */
function buildComplianceSummary(
  status: ComplianceStatus,
  issues: ComplianceIssue[],
): string {
  if (status === "passed") {
    return "品牌规则校验通过，可继续进入审核流程。";
  }

  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  if (status === "blocked") {
    return `检测到 ${blockerCount} 条阻断项，${warningCount} 条提示项，请先修正文案后再提交审核。`;
  }

  return `检测到 ${warningCount} 条提示项，建议修正后再提交审核。`;
}

/**
 * 从命中文本构建问题对象
 * @param rule 规则定义
 * @param match 命中内容
 * @returns 合规问题
 */
function createIssue(
  rule: BrandRuleDefinition,
  match: string | undefined,
): ComplianceIssue {
  return {
    id: randomUUID(),
    ruleName: rule.name,
    severity: rule.severity,
    category: rule.category,
    message: rule.message,
    suggestion: rule.suggestion,
    hitText: match,
  };
}

/**
 * 对企业文案执行品牌规则扫描
 * @param input 标题、摘要和正文
 * @returns 合规扫描结果
 */
export function runComplianceCheck(
  input: ComplianceScanInput,
): ComplianceCheckResult {
  const source = [input.title, input.brief, input.content].filter(Boolean).join("\n");
  const issues: ComplianceIssue[] = [];

  BRAND_RULES.forEach((rule) => {
    const matches = source.match(rule.pattern);
    const uniqueMatches = Array.from(new Set(matches ?? []));

    uniqueMatches.forEach((match) => {
      issues.push(createIssue(rule, match));
    });
  });

  const status = resolveComplianceStatus(issues);

  return {
    status,
    summary: buildComplianceSummary(status, issues),
    checkedAt: new Date().toISOString(),
    issues,
  };
}

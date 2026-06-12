/**
 * 创建时间: 2026-06-12
 * 文件名: Editor.tsx
 * 文件描述: Project01 企业级写作工作流主编辑区组件
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-12
 */

import React from "react";
import {
  BrandRuleCategory,
  BrandRuleSeverity,
  ComplianceStatus,
  EnterpriseDocument,
  UserRole,
  WorkflowStatus,
  WritingAction,
  WritingFormState,
  WritingStyle,
  WritingTemplate,
} from "../types";

interface EditorProps {
  form: WritingFormState;
  templates: WritingTemplate[];
  currentDocument: EnterpriseDocument | null;
  currentRole: UserRole;
  operatorName: string;
  comment: string;
  loading: boolean;
  error: string | null;
  onOperatorNameChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onFieldChange: <K extends keyof WritingFormState>(
    field: K,
    value: WritingFormState[K],
  ) => void;
  onCreateNewDraft: () => void;
  onGenerateDraft: () => Promise<void>;
  onSubmitReview: () => Promise<void>;
  onReview: (decision: "approve" | "reject") => Promise<void>;
  onPublish: () => Promise<void>;
}

const statusLabelMap: Record<WorkflowStatus, string> = {
  [WorkflowStatus.DRAFT]: "草稿中",
  [WorkflowStatus.IN_REVIEW]: "待审核",
  [WorkflowStatus.APPROVED]: "已通过",
  [WorkflowStatus.REJECTED]: "已驳回",
  [WorkflowStatus.PUBLISHED]: "已发布",
};

const statusColorMap: Record<WorkflowStatus, string> = {
  [WorkflowStatus.DRAFT]: "bg-slate-100 text-slate-700",
  [WorkflowStatus.IN_REVIEW]: "bg-amber-100 text-amber-700",
  [WorkflowStatus.APPROVED]: "bg-emerald-100 text-emerald-700",
  [WorkflowStatus.REJECTED]: "bg-rose-100 text-rose-700",
  [WorkflowStatus.PUBLISHED]: "bg-blue-100 text-blue-700",
};

const roleLabelMap: Record<UserRole, string> = {
  [UserRole.AUTHOR]: "作者",
  [UserRole.REVIEWER]: "审核人",
  [UserRole.PUBLISHER]: "发布人",
};

const actionLabelMap: Record<WritingAction, string> = {
  [WritingAction.GENERATE]: "生成文章",
  [WritingAction.CONTINUE]: "续写现有内容",
  [WritingAction.POLISH]: "润色优化",
  [WritingAction.SHORTEN]: "精简压缩",
  [WritingAction.EXPAND]: "扩展增强",
};

const styleLabelMap: Record<WritingStyle, string> = {
  [WritingStyle.FORMAL]: "正式风格",
  [WritingStyle.CASUAL]: "轻松风格",
  [WritingStyle.ACADEMIC]: "学术风格",
  [WritingStyle.CREATIVE]: "创意风格",
  [WritingStyle.BUSINESS]: "商务风格",
};

const complianceLabelMap: Record<ComplianceStatus, string> = {
  [ComplianceStatus.PASSED]: "已通过",
  [ComplianceStatus.WARNING]: "有提醒",
  [ComplianceStatus.BLOCKED]: "已阻断",
};

const complianceColorMap: Record<ComplianceStatus, string> = {
  [ComplianceStatus.PASSED]: "bg-emerald-100 text-emerald-700",
  [ComplianceStatus.WARNING]: "bg-amber-100 text-amber-700",
  [ComplianceStatus.BLOCKED]: "bg-rose-100 text-rose-700",
};

const severityLabelMap: Record<BrandRuleSeverity, string> = {
  [BrandRuleSeverity.WARNING]: "提示",
  [BrandRuleSeverity.BLOCKER]: "阻断",
};

const categoryLabelMap: Record<BrandRuleCategory, string> = {
  [BrandRuleCategory.CLAIM]: "宣传表述",
  [BrandRuleCategory.PRIVACY]: "隐私授权",
  [BrandRuleCategory.BRAND]: "品牌口径",
  [BrandRuleCategory.HANDOFF]: "交接质量",
};

/**
 * 渲染状态标签样式
 * @param status 当前状态
 * @returns 状态标签样式
 */
function getStatusBadgeClass(status: WorkflowStatus): string {
  return `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColorMap[status]}`;
}

/**
 * 渲染合规标签样式
 * @param status 当前合规状态
 * @returns 合规标签样式
 */
function getComplianceBadgeClass(status: ComplianceStatus): string {
  return `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${complianceColorMap[status]}`;
}

/**
 * 编辑器组件
 * 展示企业写作表单、流程状态和工作流动作
 */
export const Editor: React.FC<EditorProps> = ({
  form,
  templates,
  currentDocument,
  currentRole,
  operatorName,
  comment,
  loading,
  error,
  onOperatorNameChange,
  onCommentChange,
  onFieldChange,
  onCreateNewDraft,
  onGenerateDraft,
  onSubmitReview,
  onReview,
  onPublish,
}) => {
  const canEdit =
    !currentDocument ||
    [WorkflowStatus.DRAFT, WorkflowStatus.REJECTED].includes(
      currentDocument.status,
    );
  const canSubmitReview =
    currentRole === UserRole.AUTHOR &&
    !!currentDocument &&
    currentDocument.compliance.status !== ComplianceStatus.BLOCKED &&
    [WorkflowStatus.DRAFT, WorkflowStatus.REJECTED].includes(
      currentDocument.status,
    );
  const canApprove =
    currentRole === UserRole.REVIEWER &&
    currentDocument?.status === WorkflowStatus.IN_REVIEW;
  const canPublish =
    currentRole === UserRole.PUBLISHER &&
    currentDocument?.status === WorkflowStatus.APPROVED;
  const hasCompliance = !!currentDocument?.compliance;

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">当前流程角色</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {roleLabelMap[currentRole]}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">当前单据状态</p>
          <div className="mt-2">
            {currentDocument ? (
              <span className={getStatusBadgeClass(currentDocument.status)}>
                {statusLabelMap[currentDocument.status]}
              </span>
            ) : (
              <span className="text-lg font-semibold text-slate-900">
                未创建
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">模板渠道</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {currentDocument?.channel ||
              templates.find((item) => item.id === form.templateId)?.channel ||
              "--"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">当前版本</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            V{currentDocument?.version ?? 0}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              企业写作工作台
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              通过模板、角色和状态流转，验证作者到发布人的完整流程。
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateNewDraft}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            新建草稿
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              操作者姓名
            </label>
            <input
              value={operatorName}
              onChange={(event) => onOperatorNameChange(event.target.value)}
              placeholder="例如：Felix"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              标题
            </label>
            <input
              value={form.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              disabled={!canEdit || loading}
              placeholder="例如：Q3 产品发布邮件"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              企业模板
            </label>
            <select
              value={form.templateId}
              onChange={(event) =>
                onFieldChange("templateId", event.target.value)
              }
              disabled={!canEdit || loading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
            >
              <option value="">请选择模板</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.channel}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              写作动作
            </label>
            <select
              value={form.action}
              onChange={(event) =>
                onFieldChange("action", event.target.value as WritingAction)
              }
              disabled={!canEdit || loading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
            >
              {Object.entries(actionLabelMap).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              风格
            </label>
            <select
              value={form.style}
              onChange={(event) =>
                onFieldChange("style", event.target.value as WritingStyle)
              }
              disabled={!canEdit || loading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
            >
              {Object.entries(styleLabelMap).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">模板说明</p>
            <p className="mt-2">
              {templates.find((item) => item.id === form.templateId)
                ?.description || "请选择模板后查看说明"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {templates.find((item) => item.id === form.templateId)
                ?.promptHint || "模板会影响生成结构和发布渠道。"}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            业务需求摘要
          </label>
          <textarea
            value={form.brief}
            onChange={(event) => onFieldChange("brief", event.target.value)}
            disabled={!canEdit || loading}
            placeholder="输入本次写作目标、受众、要点和品牌限制，例如：面向存量企业客户发布 AI 写作工作台升级邮件，强调审核流和可追溯性。"
            className="h-40 w-full rounded-lg border border-slate-300 px-3 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void onGenerateDraft()}
            disabled={loading || !canEdit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {currentDocument ? "重新生成草稿" : "生成企业草稿"}
          </button>
          <button
            type="button"
            onClick={() => void onSubmitReview()}
            disabled={loading || !canSubmitReview}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            提交审核
          </button>
          <button
            type="button"
            onClick={() => void onReview("approve")}
            disabled={loading || !canApprove}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            审核通过
          </button>
          <button
            type="button"
            onClick={() => void onReview("reject")}
            disabled={loading || !canApprove}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            驳回修改
          </button>
          <button
            type="button"
            onClick={() => void onPublish()}
            disabled={loading || !canPublish}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            内部模拟发布
          </button>
        </div>
      </section>

      {hasCompliance && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                品牌规则校验
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                生成后自动执行企业品牌规则扫描，阻断项会禁止提交审核。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={getComplianceBadgeClass(
                  currentDocument.compliance.status,
                )}
              >
                {complianceLabelMap[currentDocument.compliance.status]}
              </span>
              <span className="text-xs text-slate-500">
                最近检查：
                {new Date(currentDocument.compliance.checkedAt).toLocaleString(
                  "zh-CN",
                )}
              </span>
            </div>
          </div>

          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              currentDocument.compliance.status === ComplianceStatus.BLOCKED
                ? "bg-rose-50 text-rose-700"
                : currentDocument.compliance.status === ComplianceStatus.WARNING
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {currentDocument.compliance.summary}
          </div>

          {currentDocument.compliance.issues.length > 0 ? (
            <div className="mt-4 space-y-3">
              {currentDocument.compliance.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        issue.severity === BrandRuleSeverity.BLOCKER
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {severityLabelMap[issue.severity]}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {categoryLabelMap[issue.category]}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {issue.ruleName}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{issue.message}</p>
                  {issue.hitText && (
                    <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                      命中文本：{issue.hitText}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-600">
                    建议：{issue.suggestion}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              当前草稿未命中任何品牌规则，可继续推进流程。
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">
          流程备注与审核意见
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          作者可补充提交说明，审核人可填写驳回原因，发布人可记录发布备注。
        </p>
        <textarea
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          placeholder="例如：请重点检查品牌用语一致性；驳回原因：缺少客户收益表达；发布备注：先灰度到内部通讯。"
          className="mt-3 h-28 w-full rounded-lg border border-slate-300 px-3 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">生成结果</h3>
            <p className="mt-1 text-sm text-slate-500">
              当前输出会被当作企业内容单据，后续进入审核和发布流程。
            </p>
          </div>
          {currentDocument && (
            <div className="text-right text-xs text-slate-500">
              <p>字数：{currentDocument.wordCount}</p>
              <p>模型：{currentDocument.model}</p>
            </div>
          )}
        </div>
        <div className="min-h-[280px] rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
          {currentDocument?.generatedContent ||
            "生成后将在这里展示企业级草稿内容。"}
        </div>
      </section>
    </div>
  );
};

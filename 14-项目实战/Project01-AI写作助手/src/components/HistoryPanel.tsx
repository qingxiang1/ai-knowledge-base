/**
 * 创建时间: 2026-06-12
 * 文件名: HistoryPanel.tsx
 * 文件描述: Project01 企业级写作工作流侧边栏，展示单据列表与审计轨迹
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-12
 */

import React from 'react';
import { EnterpriseDocument, WorkflowAuditLog, WorkflowStatus } from '../types';

interface HistoryPanelProps {
  documents: EnterpriseDocument[];
  currentDocumentId: string | null;
  loading: boolean;
  onSelectDocument: (documentId: string) => void;
  onCreateNewDraft: () => void;
}

const statusLabelMap: Record<WorkflowStatus, string> = {
  [WorkflowStatus.DRAFT]: '草稿中',
  [WorkflowStatus.IN_REVIEW]: '待审核',
  [WorkflowStatus.APPROVED]: '已通过',
  [WorkflowStatus.REJECTED]: '已驳回',
  [WorkflowStatus.PUBLISHED]: '已发布',
};

const statusColorMap: Record<WorkflowStatus, string> = {
  [WorkflowStatus.DRAFT]: 'bg-slate-100 text-slate-700',
  [WorkflowStatus.IN_REVIEW]: 'bg-amber-100 text-amber-700',
  [WorkflowStatus.APPROVED]: 'bg-emerald-100 text-emerald-700',
  [WorkflowStatus.REJECTED]: 'bg-rose-100 text-rose-700',
  [WorkflowStatus.PUBLISHED]: 'bg-blue-100 text-blue-700',
};

/**
 * 返回状态标签样式
 * @param status 当前状态
 * @returns 标签样式
 */
function getStatusBadgeClass(status: WorkflowStatus): string {
  return `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusColorMap[status]}`;
}

/**
 * 格式化审计动作描述
 * @param log 审计日志
 * @returns 展示文本
 */
function formatAuditAction(log: WorkflowAuditLog): string {
  if (!log.fromStatus) {
    return `${log.operatorName} 创建了单据`;
  }

  return `${log.operatorName} 执行了 ${log.action}`;
}

/**
 * 工作流侧边栏组件
 */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  documents,
  currentDocumentId,
  loading,
  onSelectDocument,
  onCreateNewDraft,
}) => {
  const currentDocument = documents.find((item) => item.id === currentDocumentId) ?? null;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">企业内容工单</h3>
            <p className="mt-1 text-sm text-slate-500">查看所有写作单据和当前流程位置。</p>
          </div>
          <button
            type="button"
            onClick={onCreateNewDraft}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            新建
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">加载中...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-400">暂无单据，先生成一份企业草稿。</p>
        ) : (
          <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
            {documents.map((document) => {
              const isActive = document.id === currentDocumentId;
              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => onSelectDocument(document.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{document.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{document.templateName}</p>
                    </div>
                    <span className={getStatusBadgeClass(document.status)}>
                      {statusLabelMap[document.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{document.channel}</span>
                    <span>V{document.version}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    更新于 {new Date(document.updatedAt).toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">审计轨迹</h3>
        <p className="mt-1 text-sm text-slate-500">记录角色流转、审核意见和发布时间。</p>

        {!currentDocument ? (
          <p className="mt-4 text-sm text-slate-400">选择单据后查看完整审计记录。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {currentDocument.auditLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatAuditAction(log)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      状态流转：{log.fromStatus ? statusLabelMap[log.fromStatus] : '初始化'} → {statusLabelMap[log.toStatus]}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                {log.comment && (
                  <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs leading-6 text-slate-600">
                    {log.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

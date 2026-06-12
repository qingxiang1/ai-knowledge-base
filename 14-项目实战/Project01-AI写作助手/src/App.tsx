/**
 * 创建时间: 2026-06-12
 * 文件名: App.tsx
 * 文件描述: Project01 企业级写作工作流应用入口
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-12
 */

import React, { useState } from 'react';
import { Editor } from './components/Editor';
import { HistoryPanel } from './components/HistoryPanel';
import { useWriting } from './hooks/useWriting';
import { UserRole } from './types';

const roleLabelMap: Record<UserRole, string> = {
  [UserRole.AUTHOR]: '作者',
  [UserRole.REVIEWER]: '审核人',
  [UserRole.PUBLISHER]: '发布人',
};

/**
 * 企业级写作工作流应用根组件
 */
const App: React.FC = () => {
  const {
    templates,
    documents,
    currentDocument,
    currentRole,
    operatorName,
    form,
    comment,
    loading,
    error,
    setCurrentRole,
    setOperatorName,
    setComment,
    updateForm,
    selectDocument,
    createNewDraft,
    handleGenerateDraft,
    handleSubmitReview,
    handleReview,
    handlePublish,
  } = useWriting();

  const [showPanel, setShowPanel] = useState(true);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI 写作助手企业工作流版</h1>
            <p className="mt-1 text-sm text-slate-500">
              最小可扩展闭环：作者生成草稿，审核人审批，发布人执行内部模拟发布。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={currentRole}
              onChange={(event) => setCurrentRole(event.target.value as UserRole)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {Object.entries(roleLabelMap).map(([value, label]) => (
                <option key={value} value={value}>
                  当前角色：{label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowPanel((prev) => !prev)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {showPanel ? '收起流程面板' : '展开流程面板'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="min-w-0 flex-1">
            <Editor
              form={form}
              templates={templates}
              currentDocument={currentDocument}
              currentRole={currentRole}
              operatorName={operatorName}
              comment={comment}
              loading={loading}
              error={error}
              onOperatorNameChange={setOperatorName}
              onCommentChange={setComment}
              onFieldChange={updateForm}
              onCreateNewDraft={createNewDraft}
              onGenerateDraft={handleGenerateDraft}
              onSubmitReview={handleSubmitReview}
              onReview={handleReview}
              onPublish={handlePublish}
            />
          </div>
          {showPanel && (
            <aside className="w-full shrink-0 xl:w-[360px]">
              <HistoryPanel
                documents={documents}
                currentDocumentId={currentDocument?.id ?? null}
                loading={loading}
                onSelectDocument={selectDocument}
                onCreateNewDraft={createNewDraft}
              />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

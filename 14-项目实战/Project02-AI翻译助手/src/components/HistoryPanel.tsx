/**
 * 创建时间: 2026-06-14
 * 文件名: HistoryPanel.tsx
 * 文件描述: Project02 AI 翻译助手历史记录侧栏，支持恢复、删除与清空
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import React from "react";
import { TranslationHistoryItem } from "../types";
import { getLanguageName } from "../constants";

interface HistoryPanelProps {
  history: TranslationHistoryItem[];
  onRestore: (item: TranslationHistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

/**
 * 翻译历史侧栏组件
 */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onRestore,
  onRemove,
  onClear,
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">翻译历史</h2>
          <p className="mt-1 text-xs text-gray-500">
            最近 {history.length} 条，保存在本地浏览器
          </p>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            清空
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          暂无历史，翻译后会自动记录在这里。
        </p>
      ) : (
        <div className="max-h-[440px] space-y-2 overflow-auto pr-1">
          {history.map((item) => (
            <div
              key={item.id}
              className="group rounded-lg border border-gray-200 bg-gray-50 p-3 transition hover:border-blue-300"
            >
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {getLanguageName(item.sourceLang)} →{" "}
                  {getLanguageName(item.targetLang)}
                </span>
                <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-gray-800">
                {item.sourceText}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-blue-700">
                {item.translatedText}
              </p>
              <div className="mt-2 flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => onRestore(item)}
                  className="font-medium text-blue-600 hover:underline"
                >
                  恢复
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="font-medium text-gray-400 hover:text-rose-500"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

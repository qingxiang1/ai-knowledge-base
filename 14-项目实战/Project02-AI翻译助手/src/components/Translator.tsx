/**
 * 创建时间: 2026-06-03
 * 文件名: Translator.tsx
 * 文件描述: Project02 AI 翻译助手主翻译组件
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

import React, { useState } from "react";
import { useTranslator } from "../hooks/useTranslator";
import { HistoryPanel } from "./HistoryPanel";
import { LANGUAGES, STYLE_OPTIONS, getLanguageName } from "../constants";
import { TranslationStyle } from "../types";

const MAX_LENGTH = 5000;

/**
 * AI 翻译助手组件
 */
export const Translator: React.FC = () => {
  const {
    sourceText,
    targetText,
    sourceLang,
    targetLang,
    style,
    alternatives,
    detectedLang,
    model,
    loading,
    error,
    history,
    setSourceText,
    setSourceLang,
    setTargetLang,
    setStyle,
    translate,
    swap,
    clearError,
    applyAlternative,
    restoreHistory,
    removeHistory,
    clearHistory,
  } = useTranslator();

  const [copied, setCopied] = useState(false);

  /**
   * 复制译文到剪贴板
   */
  const handleCopy = async () => {
    if (!targetText) return;
    try {
      await navigator.clipboard.writeText(targetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 某些浏览器无剪贴板权限时静默失败
    }
  };

  const overLimit = sourceText.length > MAX_LENGTH;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI 翻译助手</h1>
          <p className="mt-1 text-sm text-gray-500">
            多语言互译 · 自动识别源语言 · 风格切换 · 备选译文 · 本地历史
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              {/* 语言与风格控制区 */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="auto">自动检测</option>
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={swap}
                  title="交换源语言和目标语言"
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm transition hover:bg-gray-200"
                >
                  ⇄
                </button>

                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>

                <span className="mx-1 h-5 w-px bg-gray-200" />

                <select
                  value={style}
                  onChange={(e) =>
                    setStyle(e.target.value as TranslationStyle)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}风格
                    </option>
                  ))}
                </select>

                {sourceLang === "auto" && detectedLang && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-600">
                    识别为：{getLanguageName(detectedLang)}
                  </span>
                )}
              </div>

              {/* 输入 / 输出区 */}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="flex flex-col">
                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="输入要翻译的文本..."
                    className="h-64 w-full resize-none rounded-lg border border-gray-300 p-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <div className="mt-1 flex justify-end text-xs">
                    <span className={overLimit ? "text-rose-500" : "text-gray-400"}>
                      {sourceText.length} / {MAX_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="relative h-64">
                    <textarea
                      value={targetText}
                      readOnly
                      placeholder="翻译结果..."
                      className="h-64 w-full resize-none rounded-lg border border-gray-300 bg-gray-50 p-4"
                    />
                    {targetText && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="absolute right-3 top-3 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 shadow-sm transition hover:bg-gray-50"
                      >
                        {copied ? "已复制" : "复制"}
                      </button>
                    )}
                  </div>
                  <div className="mt-1 flex justify-end text-xs text-gray-400">
                    {model && <span>模型：{model}</span>}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={clearError}
                    className="text-rose-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => void translate()}
                disabled={loading || !sourceText.trim() || overLimit}
                className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "翻译中..." : "翻译"}
              </button>
            </div>

            {/* 备选译文 */}
            {alternatives.length > 0 && (
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">
                  备选译文
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  点击「采用」可将备选结果替换到结果区。
                </p>
                <div className="mt-3 space-y-2">
                  {alternatives.map((alt, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <p className="text-sm text-gray-700">{alt}</p>
                      <button
                        type="button"
                        onClick={() => applyAlternative(alt)}
                        className="shrink-0 rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-100"
                      >
                        采用
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 历史侧栏 */}
          <aside className="w-full shrink-0 lg:w-[320px]">
            <HistoryPanel
              history={history}
              onRestore={restoreHistory}
              onRemove={removeHistory}
              onClear={clearHistory}
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

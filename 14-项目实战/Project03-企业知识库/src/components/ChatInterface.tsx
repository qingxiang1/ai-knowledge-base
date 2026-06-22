/**
 * 创建时间: 2026-06-03
 * 文件名: ChatInterface.tsx
 * 文件描述: Project03 企业知识库问答界面，展示答案、来源切片（命中词高亮）、检索摘要与历史
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.1.0
 * 最后更新时间: 2026-06-14
 */

import React, { useEffect, useRef, useState } from "react";
import {
  askQuestion,
  clearChatHistory,
  getChatHistory,
} from "../services/api";
import { ChatSource } from "../types";

interface ChatInterfaceProps {
  selectedDocIds: string[];
  selectedCount: number;
  totalDocuments: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  tokensUsed?: number;
  mode?: "mock" | "api";
}

const EXAMPLE_QUESTIONS = [
  "住宿费报销上限是多少？",
  "报销要在多少天内提交？",
  "密码长度有什么要求？",
  "发现数据泄露应该怎么办？",
];

/**
 * 转义正则特殊字符
 * @param text 输入
 * @returns 转义后的字符串
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 将切片文本中命中的检索词高亮渲染
 * @param text 切片文本
 * @param terms 命中词元
 * @returns React 节点数组
 */
function highlightMatches(text: string, terms: string[]): React.ReactNode[] {
  const valid = terms.filter(Boolean);
  if (valid.length === 0) {
    return [text];
  }

  // 长词优先，避免短二元组抢占
  const pattern = valid
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const matchSet = new Set(valid.map((t) => t.toLowerCase()));

  return text.split(regex).map((part, index) => {
    if (part && matchSet.has(part.toLowerCase())) {
      return (
        <mark key={index} className="rounded bg-yellow-200 px-0.5">
          {part}
        </mark>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * 聊天界面组件
 */
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedDocIds,
  selectedCount,
  totalDocuments,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 挂载时恢复持久化的问答历史
  useEffect(() => {
    getChatHistory()
      .then((history) => {
        const restored: Message[] = [];
        history.forEach((item) => {
          restored.push({
            id: `${item.id}-q`,
            role: "user",
            content: item.question,
          });
          restored.push({
            id: item.id,
            role: "assistant",
            content: item.answer,
            sources: item.sources,
            tokensUsed: item.tokens_used,
            mode: item.mode,
          });
        });
        setMessages(restored);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * 提交一个问题
   * @param question 问题文本
   */
  const submitQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: trimmed },
    ]);
    setInput("");
    setLoading(true);

    try {
      const response = await askQuestion(
        trimmed,
        selectedDocIds.length > 0 ? selectedDocIds : undefined,
      );
      setMessages((prev) => [
        ...prev,
        {
          id: response.id,
          role: "assistant",
          content: response.answer,
          sources: response.sources,
          tokensUsed: response.tokens_used,
          mode: response.mode,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `错误: ${error instanceof Error ? error.message : "请求失败"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitQuestion(input);
  };

  /**
   * 清空对话（同时清除服务端持久化历史）
   */
  const handleClear = async () => {
    try {
      await clearChatHistory();
    } catch {
      // 忽略清空失败
    }
    setMessages([]);
  };

  return (
    <div className="flex h-full flex-col rounded-lg bg-white shadow">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">知识库问答</h2>
          <p className="text-xs text-gray-400">检索增强 · 答案附来源引用</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            清空对话
          </button>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="mt-10 text-center text-sm text-gray-400">
            <p>向知识库提问，答案将基于检索到的文档片段生成。</p>
            <p className="mt-3 text-xs">点击下面的示例问题快速体验：</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void submitQuestion(q)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-600 transition hover:bg-blue-100"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "border bg-gray-50"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    参考来源（{msg.sources.length}）· 最高相关度{" "}
                    {Math.round(
                      Math.max(...msg.sources.map((s) => s.relevance)) * 100,
                    )}
                    %
                  </p>
                  <div className="space-y-2">
                    {msg.sources.map((source, idx) => (
                      <div
                        key={idx}
                        className="rounded border bg-white p-2 text-xs"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-700">
                            {source.doc_title}
                          </span>
                          <span className="shrink-0 text-gray-400">
                            相关度 {Math.round(source.relevance * 100)}%
                          </span>
                        </div>
                        <div className="mb-1 flex gap-2 text-[11px] text-gray-400">
                          <span
                            className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-500"
                            title="向量语义相似度"
                          >
                            语义 {Math.round(source.vector_score * 100)}%
                          </span>
                          <span
                            className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-600"
                            title="词法命中覆盖率"
                          >
                            词法 {Math.round(source.lexical_score * 100)}%
                          </span>
                        </div>
                        <p className="leading-5 text-gray-600">
                          {highlightMatches(
                            source.text,
                            source.matched_terms || [],
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.role === "assistant" && msg.tokensUsed !== undefined && (
                <div className="mt-2 text-right text-xs text-gray-400">
                  {msg.mode === "mock" ? "Mock" : "API"} · 约 {msg.tokensUsed}{" "}
                  tokens
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 delay-100" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t">
        <div className="px-4 pt-2 text-xs text-gray-400">
          {selectedCount > 0
            ? `检索范围：已选 ${selectedCount} / ${totalDocuments} 个文档`
            : `检索范围：全部 ${totalDocuments} 个文档`}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 p-4 pt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的问题..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
};

/**
 * 创建时间: 2026-06-03
 * 文件名: ChatInterface.tsx
 * 文件描述: Project03 企业知识库问答界面，展示答案、来源切片与检索范围
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

import React, { useEffect, useRef, useState } from "react";
import { askQuestion } from "../services/api";
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await askQuestion(
        userMessage.content,
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

  return (
    <div className="flex h-full flex-col rounded-lg bg-white shadow">
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="mt-10 text-center text-sm text-gray-400">
            <p>向知识库提问，答案将基于检索到的文档片段生成。</p>
            <p className="mt-2">
              示例：「住宿费报销上限是多少？」「密码长度有什么要求？」
            </p>
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
                    参考来源（{msg.sources.length}）:
                  </p>
                  <div className="space-y-2">
                    {msg.sources.map((source, idx) => (
                      <div
                        key={idx}
                        className="rounded border bg-white p-2 text-xs"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium text-gray-700">
                            {source.doc_title}
                          </span>
                          <span className="text-gray-400">
                            相关度 {Math.round(source.relevance * 100)}%
                          </span>
                        </div>
                        <p className="leading-5 text-gray-600">{source.text}</p>
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

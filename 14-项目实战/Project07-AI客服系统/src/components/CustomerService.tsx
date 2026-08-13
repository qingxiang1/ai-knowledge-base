/**
 * 创建时间: 2026-06-03
 * 文件名: CustomerService.tsx
 * 文件描述: AI 客服聊天界面。展示真实意图与置信度、答案来源（FAQ/订单/话术/模型）、转人工提示、
 *           快捷回复建议、订单卡片，并提供 FAQ 与演示订单号侧边栏。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, fetchMeta } from '../services/api';
import { ChatMessage, Intent, MetaInfo, ReplySource } from '../types';

/** 意图中文标签 */
const INTENT_LABEL: Record<Intent, string> = {
  product_inquiry: '产品咨询',
  technical_support: '技术支持',
  order_query: '订单查询',
  refund: '退款退货',
  complaint: '投诉',
  general_inquiry: '一般咨询',
};

/** 来源标签与样式 */
const SOURCE_TAG: Record<ReplySource, { label: string; cls: string }> = {
  faq: { label: 'FAQ 命中', cls: 'bg-emerald-100 text-emerald-700' },
  order: { label: '订单查询', cls: 'bg-blue-100 text-blue-700' },
  template: { label: '标准话术', cls: 'bg-gray-100 text-gray-600' },
  model: { label: '模型生成', cls: 'bg-purple-100 text-purple-700' },
};

/**
 * AI 客服聊天组件
 */
export const CustomerService: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是 AI 客服助手。我可以帮您解答产品、订单、退款、技术等问题，也可以转接人工。试试点击右侧常见问题，或问我「订单 DD20260601 到哪了」。',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`cs_${Date.now()}`);

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => undefined);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-u`, role: 'user', content: text, timestamp: new Date().toISOString() },
    ]);
    setInput('');
    setLoading(true);
    try {
      const response = await sendMessage(text, sessionId.current);
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          role: 'assistant',
          content: `抱歉，服务暂时不可用: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧对话区 */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">智能客服</h1>
              <p className="text-xs text-gray-500">意图识别 · FAQ 检索 · 订单查询 · 转人工</p>
            </div>
          </div>
          {meta && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                meta.mode === 'api' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {meta.mode === 'api' ? 'API 模式（模型 + 知识库）' : 'Mock 模式（本地真实引擎）'}
            </span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl rounded-lg p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border shadow-sm'}`}>
                {/* 元信息标签 */}
                {msg.role === 'assistant' && msg.intent && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                      {INTENT_LABEL[msg.intent]} {Math.round((msg.confidence || 0) * 100)}%
                    </span>
                    {msg.source && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${SOURCE_TAG[msg.source].cls}`}>
                        {SOURCE_TAG[msg.source].label}
                        {msg.faq ? `·${Math.round(msg.faq.score * 100)}%` : ''}
                      </span>
                    )}
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* 订单卡片 */}
                {msg.order && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 text-sm text-blue-800 border border-blue-100">
                    <div className="font-mono font-medium">{msg.order.orderNo}</div>
                    <div className="text-blue-600 mt-1">{msg.order.product} · ¥{msg.order.amount}</div>
                    <div className="mt-1">状态：{msg.order.status}</div>
                  </div>
                )}

                {/* 转人工提示 */}
                {msg.escalate && (
                  <div className="mt-3 p-2 rounded bg-orange-50 text-orange-700 text-xs border border-orange-200">
                    ⚠ 建议转人工：{msg.escalateReason}
                  </div>
                )}

                {/* 快捷回复建议 */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        disabled={loading}
                        className="text-xs px-2.5 py-1 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t p-4 flex gap-2 bg-white">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的问题，例如：退款多久到账？订单 DD20260612 发货了吗？"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            发送
          </button>
        </form>
      </div>

      {/* 右侧侧边栏：常见问题 + 演示订单号 */}
      <aside className="hidden lg:flex w-80 flex-col border-l bg-white">
        <div className="px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">常见问题（点击直接问）</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1.5">
            {meta?.faqs.map((f) => (
              <button
                key={f.question}
                onClick={() => send(f.question)}
                disabled={loading}
                className="w-full text-left text-xs px-3 py-2 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600 disabled:opacity-50"
              >
                {f.question}
              </button>
            ))}
          </div>

          {meta && meta.demoOrders.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-500 mt-5 mb-2">演示订单号（点击查询）</p>
              <div className="flex flex-wrap gap-1.5">
                {meta.demoOrders.map((o) => (
                  <button
                    key={o}
                    onClick={() => send(`帮我查询订单 ${o}`)}
                    disabled={loading}
                    className="text-xs px-2.5 py-1 rounded font-mono border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600 disabled:opacity-50"
                  >
                    {o}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};

/**
 * 创建时间: 2026-06-03
 * 文件名: AgentChat.tsx
 * 文件描述: Agent 聊天界面。展示真实的 ReAct 推理轨迹（思考 / 行动 / 观察 / 回答）、
 *           真实工具调用结果、可用工具面板、示例问题与会话清空。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-23
 */

import React, { useState, useRef, useEffect } from 'react';
import { chatWithAgent, fetchTools, clearSession } from '../services/api';
import { AgentMessage, AgentStep, ToolInfo } from '../types';

/** 示例问题：覆盖计算 / 时间 / 知识检索 / 多工具组合，方便一键演示 */
const EXAMPLES = [
  '(12 + 8) * 3 等于多少？',
  '现在几点了？',
  '什么是 RAG？',
  '什么是 Agent，和普通聊天机器人有什么区别？',
  '先告诉我现在时间，再帮我算 99 * 99',
];

/** 不同 ReAct 步骤的展示样式 */
const STEP_STYLE: Record<AgentStep['type'], { label: string; icon: string; cls: string }> = {
  thought: { label: '思考', icon: '🤔', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  action: { label: '行动', icon: '🔧', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  observation: { label: '观察', icon: '👁', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  final: { label: '回答', icon: '✅', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
};

/**
 * 渲染单条 ReAct 步骤
 */
const StepItem: React.FC<{ step: AgentStep }> = ({ step }) => {
  const style = STEP_STYLE[step.type];
  return (
    <div className={`text-xs p-2 rounded border ${style.cls}`}>
      <div className="flex items-center gap-1 font-medium">
        <span>{style.icon}</span>
        <span>{style.label}</span>
        {step.tool && <span className="ml-1 px-1.5 py-0.5 rounded bg-white/70 font-mono">{step.tool}</span>}
      </div>
      {step.args && Object.keys(step.args).length > 0 && (
        <pre className="mt-1 text-[11px] text-gray-500 whitespace-pre-wrap break-all">
          {JSON.stringify(step.args)}
        </pre>
      )}
      <p className="mt-1 text-gray-600 whitespace-pre-wrap">{step.content}</p>
    </div>
  );
};

/**
 * Agent 聊天界面组件
 */
export const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'mock' | 'api'>('mock');
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`session_${Date.now()}`);

  useEffect(() => {
    fetchTools()
      .then((data) => {
        setMode(data.mode);
        setTools(data.tools);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: AgentMessage = { id: `${Date.now()}-u`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatWithAgent(text, sessionId.current);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          content: res.answer,
          steps: res.thought_process,
          tools: res.tool_calls,
          iterations: res.iterations,
          mode: res.mode,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          role: 'assistant',
          content: `错误: ${error instanceof Error ? error.message : '请求失败'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleClear = async () => {
    await clearSession(sessionId.current).catch(() => undefined);
    sessionId.current = `session_${Date.now()}`;
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧：能力面板 */}
      <aside className="hidden md:flex w-72 flex-col border-r bg-white">
        <div className="px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">Agent 能力面板</h2>
          <p className="text-xs text-gray-400 mt-1">基于 ReAct（思考→行动→观察）真实执行</p>
        </div>
        <div className="p-4 overflow-y-auto">
          <p className="text-xs font-medium text-gray-500 mb-2">可用工具（{tools.length}）</p>
          <div className="space-y-2">
            {tools.map((tool) => (
              <div key={tool.name} className="p-2 rounded border bg-gray-50">
                <p className="text-sm font-mono text-blue-600">{tool.name}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tool.description}</p>
              </div>
            ))}
            {tools.length === 0 && <p className="text-xs text-gray-400">未连接到服务端</p>}
          </div>

          <p className="text-xs font-medium text-gray-500 mt-5 mb-2">示例问题</p>
          <div className="space-y-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => send(ex)}
                disabled={loading}
                className="w-full text-left text-xs px-3 py-2 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600 disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 右侧：对话区 */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">AI Agent 系统</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                mode === 'api' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {mode === 'api' ? 'API 模式（真实大模型）' : 'Mock 模式（本地规则）'}
            </span>
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-red-500 border border-gray-200 rounded px-3 py-1"
          >
            清空会话
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-lg">👋 试着问我一个问题</p>
              <p className="text-sm mt-2">我会展示真实的「思考 → 调用工具 → 观察 → 回答」全过程</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.steps && msg.steps.length > 0 && (
                  <details className="mt-3 pt-3 border-t border-gray-200" open>
                    <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none">
                      推理轨迹（{msg.steps.length} 步
                      {typeof msg.iterations === 'number' ? ` · ${msg.iterations} 轮迭代` : ''}）
                    </summary>
                    <div className="mt-2 space-y-2">
                      {msg.steps.map((step, idx) => (
                        <StepItem key={idx} step={step} />
                      ))}
                    </div>
                  </details>
                )}

                {msg.tools && msg.tools.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-2">工具调用结果</p>
                    <div className="space-y-1">
                      {msg.tools.map((tool, idx) => (
                        <div
                          key={idx}
                          className={`text-xs p-2 rounded ${
                            tool.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          }`}
                        >
                          <span className="font-mono font-medium">{tool.tool}</span>
                          <span className="ml-2">{tool.success ? '✓' : '✗'}</span>
                          <p className="mt-1 text-gray-500 whitespace-pre-wrap">{tool.result}</p>
                        </div>
                      ))}
                    </div>
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

        <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2 bg-white">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入任务或问题，例如：现在几点？(12+8)*3 等于多少？什么是 RAG？"
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
    </div>
  );
};

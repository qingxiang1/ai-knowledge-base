/**
 * 创建时间: 2026-06-03
 * 文件名: CodeAssistant.tsx
 * 文件描述: AI 代码助手界面。支持生成/解释/优化/修复四种动作，展示真实静态度量、
 *           带行号与级别的问题清单、自动修复结果与片段库输出。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

import React, { useState } from 'react';
import { generateCode } from '../services/api';
import { CodeAction, CodeMetrics, CodeResponse, Issue } from '../types';

const languages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'SQL'];

const actions: { value: CodeAction; label: string; hint: string }[] = [
  { value: 'generate', label: '生成代码', hint: '描述需求，从片段库匹配真实实现（如：防抖、深拷贝、快排）' },
  { value: 'explain', label: '解释代码', hint: '粘贴代码，做真实静态分析（行数/函数/复杂度/嵌套）' },
  { value: 'optimize', label: '优化代码', hint: '粘贴代码，给出基于真实指标的优化建议与问题清单' },
  { value: 'fix', label: '修复代码', hint: '粘贴代码，规则检查并应用语言安全的自动修复' },
];

const BUGGY_SAMPLE = `var x = 1
function foo(a){
  if(a == null) {
    console.log("debug")
  }
  try { risky() } catch(e) {}
  return a != 0 ? a : x
}`;

const GENERATE_EXAMPLES = ['防抖函数', '节流 throttle', '深拷贝 deepClone', '快速排序', '邮箱校验', '数组去重'];

/** 严重级别样式 */
const SEV: Record<Issue['severity'], string> = {
  error: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-sky-100 text-sky-700',
};

/** 指标卡片 */
const MetricCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-gray-50 rounded-lg p-3 text-center">
    <div className="text-lg font-bold text-gray-800">{value}</div>
    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
  </div>
);

/** 指标面板 */
const MetricsPanel: React.FC<{ m: CodeMetrics }> = ({ m }) => (
  <div className="p-4 bg-white rounded-lg border">
    <h3 className="font-bold mb-3">静态分析（真实计算）</h3>
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      <MetricCard label="探测语言" value={m.detectedLanguage} />
      <MetricCard label="总行数" value={m.totalLines} />
      <MetricCard label="代码/注释/空" value={`${m.codeLines}/${m.commentLines}/${m.blankLines}`} />
      <MetricCard label="注释率" value={`${(m.commentRatio * 100).toFixed(0)}%`} />
      <MetricCard label="函数(约)" value={m.functions} />
      <MetricCard label="最大嵌套" value={m.maxDepth} />
      <MetricCard label="圈复杂度" value={m.complexity} />
      <MetricCard label="最长行" value={`L${m.longestLine.line}·${m.longestLine.length}`} />
    </div>
  </div>
);

/**
 * AI 代码助手组件
 */
export const CodeAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('TypeScript');
  const [action, setAction] = useState<CodeAction>('generate');
  const [result, setResult] = useState<CodeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const currentAction = actions.find((a) => a.value === action)!;

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const response = await generateCode({ prompt, language, action });
      setResult(response);
    } catch (error) {
      setResult({
        action,
        language,
        code: '',
        explanation: `处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
        mode: 'mock',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI 代码助手</h1>
          {result && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                result.mode === 'api' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {result.mode === 'api' ? 'API 模式（模型 + 真实分析）' : 'Mock 模式（本地真实引擎）'}
            </span>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {/* 动作切换 */}
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.value}
                onClick={() => { setAction(a.value); setResult(null); }}
                className={`px-4 py-2 rounded-lg text-sm ${
                  action === a.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">{currentAction.hint}</p>

          {/* 语言 + 快捷填充 */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>

            {action === 'generate'
              ? GENERATE_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600"
                  >
                    {ex}
                  </button>
                ))
              : (
                <button
                  onClick={() => { setPrompt(BUGGY_SAMPLE); setLanguage('JavaScript'); }}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600"
                >
                  填充含问题的示例代码
                </button>
              )}
          </div>

          {/* 输入 */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={action === 'generate' ? '描述你的代码需求，例如：写一个防抖函数' : '粘贴要分析/优化/修复的代码...'}
            className="w-full h-40 p-4 border rounded-lg resize-none font-mono text-sm focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleRun}
            disabled={loading || !prompt.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '处理中...' : currentAction.label}
          </button>

          {/* 结果 */}
          {result && (
            <div className="mt-6 space-y-4">
              {result.metrics && <MetricsPanel m={result.metrics} />}

              {result.explanation && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold text-blue-800 mb-2">
                    {result.snippet ? `片段：${result.snippet}` : '说明'}
                  </h3>
                  <pre className="text-sm text-blue-700 whitespace-pre-wrap font-sans">{result.explanation}</pre>
                </div>
              )}

              {result.issues && result.issues.length > 0 && (
                <div className="p-4 bg-white rounded-lg border">
                  <h3 className="font-bold mb-3">问题清单（{result.issues.length}）</h3>
                  <div className="space-y-1.5">
                    {result.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-gray-400 w-12 shrink-0">L{issue.line}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${SEV[issue.severity]}`}>{issue.severity}</span>
                        <span className="text-gray-700">{issue.message}</span>
                        <span className="text-xs text-gray-300 font-mono ml-auto shrink-0">{issue.rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.appliedFixes && result.appliedFixes.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  <span className="font-medium">已自动修复：</span>{result.appliedFixes.join('、')}
                </div>
              )}

              {result.code && (
                <div className="p-4 bg-gray-900 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-white font-bold text-sm">
                      {result.action === 'fix' ? '修复后代码' : result.action === 'generate' ? '代码' : '原始代码'}
                    </h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.code)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      复制
                    </button>
                  </div>
                  <pre className="text-green-400 overflow-x-auto text-sm leading-relaxed">
                    <code>{result.code}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { generateCode } from '../services/api';
import { CodeRequest } from '../types';

const languages = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'Go',
  'Rust',
  'C++',
  'SQL',
];

const actions = [
  { value: 'generate', label: '生成代码' },
  { value: 'explain', label: '解释代码' },
  { value: 'optimize', label: '优化代码' },
  { value: 'fix', label: '修复代码' },
];

/**
 * AI 代码助手组件
 */
export const CodeAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('TypeScript');
  const [action, setAction] = useState<CodeRequest['action']>('generate');
  const [result, setResult] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const response = await generateCode({ prompt, language, action });
      setResult(response.code);
      setExplanation(response.explanation || '');
    } catch (error) {
      setResult(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setExplanation('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">AI 代码助手</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex gap-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>

            <select
              value={action}
              onChange={(e) => setAction(e.target.value as CodeRequest['action'])}
              className="px-3 py-2 border rounded-lg"
            >
              {actions.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你的代码需求..."
            className="w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '生成中...' : actions.find((a) => a.value === action)?.label}
          </button>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white font-bold">代码</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(result)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    复制
                  </button>
                </div>
                <pre className="text-green-400 overflow-x-auto">
                  <code>{result}</code>
                </pre>
              </div>

              {explanation && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold text-blue-800 mb-2">说明</h3>
                  <p className="text-blue-700">{explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

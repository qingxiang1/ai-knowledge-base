import React, { useState } from 'react';
import { analyzeData } from '../services/api';
import { AnalysisRequest, AnalysisResponse } from '../types';

const analysisTypes = [
  { value: 'summary', label: '数据摘要' },
  { value: 'trend', label: '趋势分析' },
  { value: 'anomaly', label: '异常检测' },
  { value: 'correlation', label: '相关性分析' },
];

/**
 * AI 数据分析组件
 */
export const DataAnalyzer: React.FC = () => {
  const [data, setData] = useState('');
  const [type, setType] = useState<AnalysisRequest['type']>('summary');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!data.trim()) return;

    setLoading(true);
    try {
      const response = await analyzeData({ data, type });
      setResult(response);
    } catch (error) {
      setResult({
        result: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        insights: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">AI 数据分析</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">分析类型</label>
            <div className="flex gap-2">
              {analysisTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value as AnalysisRequest['type'])}
                  className={`px-4 py-2 rounded-lg ${
                    type === t.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">数据输入</label>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="粘贴 CSV 数据或文本数据..."
              className="w-full h-48 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !data.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '分析中...' : '开始分析'}
          </button>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold mb-2">分析结果</h3>
                <div className="whitespace-pre-wrap">{result.result}</div>
              </div>

              {result.insights.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold mb-2 text-blue-800">关键洞察</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {result.insights.map((insight, idx) => (
                      <li key={idx} className="text-blue-700">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

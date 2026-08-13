/**
 * 创建时间: 2026-06-03
 * 文件名: DataAnalyzer.tsx
 * 文件描述: AI 数据分析界面。支持示例一键填充、CSV 上传/粘贴，展示真实统计结果：
 *           列统计表、关键洞察、相关性、异常点，以及零依赖渲染的柱状/折线图。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

import React, { useEffect, useRef, useState } from 'react';
import { analyzeData, fetchSamples } from '../services/api';
import { AnalysisRequest, AnalysisResponse, Chart, SampleInfo } from '../types';

const analysisTypes: { value: AnalysisRequest['type']; label: string }[] = [
  { value: 'summary', label: '数据摘要' },
  { value: 'trend', label: '趋势分析' },
  { value: 'anomaly', label: '异常检测' },
  { value: 'correlation', label: '相关性分析' },
];

/** 零依赖的柱状 / 折线图：用 SVG 折线、用 div 柱状，highlights 标红 */
const SimpleChart: React.FC<{ chart: Chart }> = ({ chart }) => {
  if (!chart.values.length) return null;
  const max = Math.max(...chart.values, 0);
  const min = Math.min(...chart.values, 0);
  const range = max - min || 1;
  const highlights = new Set(chart.highlights ?? []);

  return (
    <div className="p-4 bg-white rounded-lg border">
      <h4 className="text-sm font-medium text-gray-700 mb-3">{chart.title}</h4>
      {chart.type === 'line' ? (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-32">
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="0.6"
            points={chart.values
              .map((v, i) => {
                const x = (i / Math.max(chart.values.length - 1, 1)) * 100;
                const y = 38 - ((v - min) / range) * 36;
                return `${x},${y}`;
              })
              .join(' ')}
          />
        </svg>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {chart.values.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${chart.labels[i] ?? i}: ${v}`}>
              <div
                className={`w-full rounded-t ${highlights.has(i) ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ height: `${Math.max(((v - min) / range) * 100, 2)}%` }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{chart.labels[0]}</span>
        <span>{chart.labels[chart.labels.length - 1]}</span>
      </div>
    </div>
  );
};

/** 列统计表 */
const ColumnTable: React.FC<{ columns: NonNullable<AnalysisResponse['columns']> }> = ({ columns }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-100 text-gray-600 text-left">
          <th className="p-2">列</th>
          <th className="p-2">类型</th>
          <th className="p-2">非空/缺失</th>
          <th className="p-2">均值/中位</th>
          <th className="p-2">范围 / Top</th>
        </tr>
      </thead>
      <tbody>
        {columns.map((c) => (
          <tr key={c.name} className="border-b">
            <td className="p-2 font-medium">{c.name}</td>
            <td className="p-2">
              <span className={`px-1.5 py-0.5 rounded text-xs ${c.type === 'numeric' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                {c.type === 'numeric' ? '数值' : '类别'}
              </span>
            </td>
            <td className="p-2 text-gray-600">{c.count} / {c.missing}</td>
            <td className="p-2 text-gray-600">{c.type === 'numeric' ? `${c.mean} / ${c.median}` : '-'}</td>
            <td className="p-2 text-gray-600">
              {c.type === 'numeric'
                ? `${c.min} ~ ${c.max}（σ=${c.std}）`
                : c.top?.map((t) => `${t.value}(${t.count})`).join('、')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * AI 数据分析组件
 */
export const DataAnalyzer: React.FC = () => {
  const [data, setData] = useState('');
  const [type, setType] = useState<AnalysisRequest['type']>('summary');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'mock' | 'api'>('mock');
  const [samples, setSamples] = useState<SampleInfo[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSamples()
      .then((d) => {
        setMode(d.mode);
        setSamples(d.samples);
      })
      .catch(() => undefined);
  }, []);

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
        charts: [],
        meta: { rows: 0, columns: 0 },
        mode,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (s: SampleInfo) => {
    setData(s.csv);
    setType(s.recommend);
    setResult(null);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setData(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI 数据分析</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              mode === 'api' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {mode === 'api' ? 'API 模式（模型叙述 + 真实统计）' : 'Mock 模式（本地真实统计）'}
          </span>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {/* 示例数据 */}
          <div>
            <label className="block text-sm font-medium mb-2">示例数据（一键填充）</label>
            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <button
                  key={s.key}
                  onClick={() => loadSample(s)}
                  title={s.description}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700"
                >
                  {s.name}
                </button>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 text-sm rounded-lg border border-dashed border-gray-300 hover:border-blue-400 text-gray-500"
              >
                ⬆ 上传 CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleUpload} />
            </div>
          </div>

          {/* 分析类型 */}
          <div>
            <label className="block text-sm font-medium mb-2">分析类型</label>
            <div className="flex flex-wrap gap-2">
              {analysisTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`px-4 py-2 rounded-lg ${
                    type === t.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 数据输入 */}
          <div>
            <label className="block text-sm font-medium mb-2">数据输入（CSV，首行为表头）</label>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder={'粘贴 CSV 数据，例如：\n月份,收入,用户数\n1月,120,1500\n2月,135,1680'}
              className="w-full h-48 p-4 border rounded-lg resize-none font-mono text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !data.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '分析中...' : '开始分析'}
          </button>

          {/* 结果 */}
          {result && (
            <div className="mt-6 space-y-4">
              {result.meta.rows > 0 && (
                <p className="text-xs text-gray-400">
                  数据规模：{result.meta.rows} 行 × {result.meta.columns} 列 · 模式：{result.mode}
                </p>
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold mb-2">分析结论</h3>
                <div className="whitespace-pre-wrap text-sm text-gray-700">{result.result}</div>
              </div>

              {result.insights.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold mb-2 text-blue-800">关键洞察</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {result.insights.map((insight, idx) => (
                      <li key={idx} className="text-sm text-blue-700">{insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.charts.map((chart, idx) => (
                <SimpleChart key={idx} chart={chart} />
              ))}

              {result.columns && result.columns.length > 0 && (
                <div className="p-4 bg-white rounded-lg border">
                  <h3 className="font-bold mb-3">列统计</h3>
                  <ColumnTable columns={result.columns} />
                </div>
              )}

              {result.correlations && result.correlations.length > 0 && (
                <div className="p-4 bg-white rounded-lg border">
                  <h3 className="font-bold mb-3">相关性（Pearson r）</h3>
                  <div className="space-y-1">
                    {result.correlations.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{c.a} ~ {c.b}</span>
                        <span className={`font-mono ${Math.abs(c.r) >= 0.5 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                          r={c.r}（{c.strength}）
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.outliers && result.outliers.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <h3 className="font-bold mb-2 text-red-700">异常点（|Z| ≥ 2）</h3>
                  <div className="space-y-1">
                    {result.outliers.map((o, idx) => (
                      <div key={idx} className="text-sm text-red-600">
                        第 {o.rowIndex + 1} 行 · {o.column} = {o.value}（偏离均值 {o.z} 个标准差）
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

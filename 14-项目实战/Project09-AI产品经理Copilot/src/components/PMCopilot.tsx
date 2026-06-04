import React, { useState } from 'react';
import { generatePRD, analyzeCompetitors } from '../services/api';
import { PRDRequest, PRDResponse, CompetitorRequest, CompetitorResponse } from '../types';

type Tab = 'prd' | 'competitor';

/**
 * AI 产品经理 Copilot 组件
 */
export const PMCopilot: React.FC = () => {
  const [tab, setTab] = useState<Tab>('prd');

  // PRD 状态
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [coreFeatures, setCoreFeatures] = useState('');
  const [techStack, setTechStack] = useState('');
  const [prdResult, setPrdResult] = useState<PRDResponse | null>(null);

  // 竞品分析状态
  const [compProductName, setCompProductName] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [dimensions, setDimensions] = useState('功能,价格,用户体验');
  const [compResult, setCompResult] = useState<CompetitorResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const handleGeneratePRD = async () => {
    if (!productName.trim() || !productDescription.trim()) return;

    setLoading(true);
    try {
      const response = await generatePRD({
        productName,
        productDescription,
        targetUsers,
        coreFeatures,
        techStack,
      });
      setPrdResult(response);
    } catch (error) {
      setPrdResult({
        title: '生成失败',
        sections: [{ heading: '错误', content: error instanceof Error ? error.message : '未知错误' }],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCompetitors = async () => {
    if (!compProductName.trim() || !competitors.trim()) return;

    setLoading(true);
    try {
      const response = await analyzeCompetitors({
        productName: compProductName,
        competitors: competitors.split(',').map((c) => c.trim()),
        dimensions: dimensions.split(',').map((d) => d.trim()),
      });
      setCompResult(response);
    } catch (error) {
      setCompResult({
        summary: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        comparison: [],
        suggestions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">AI 产品经理 Copilot</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('prd')}
            className={`px-4 py-2 rounded-lg ${
              tab === 'prd' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            PRD 生成
          </button>
          <button
            onClick={() => setTab('competitor')}
            className={`px-4 py-2 rounded-lg ${
              tab === 'competitor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            竞品分析
          </button>
        </div>

        {tab === 'prd' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="产品名称"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="产品描述"
              className="w-full h-24 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={targetUsers}
              onChange={(e) => setTargetUsers(e.target.value)}
              placeholder="目标用户"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={coreFeatures}
              onChange={(e) => setCoreFeatures(e.target.value)}
              placeholder="核心功能"
              className="w-full h-24 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="技术栈（可选）"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleGeneratePRD}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '生成中...' : '生成 PRD'}
            </button>

            {prdResult && (
              <div className="mt-6 space-y-4">
                <h2 className="text-xl font-bold">{prdResult.title}</h2>
                {prdResult.sections.map((section, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-bold mb-2">{section.heading}</h3>
                    <div className="whitespace-pre-wrap text-gray-700">{section.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'competitor' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <input
              value={compProductName}
              onChange={(e) => setCompProductName(e.target.value)}
              placeholder="你的产品名称"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="竞品名称，用逗号分隔"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder="分析维度，用逗号分隔"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAnalyzeCompetitors}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '分析中...' : '开始竞品分析'}
            </button>

            {compResult && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold mb-2">分析摘要</h3>
                  <p className="text-gray-700">{compResult.summary}</p>
                </div>

                {compResult.comparison.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-bold mb-2 text-blue-800">对比分析</h3>
                    {compResult.comparison.map((item, idx) => (
                      <div key={idx} className="mb-2">
                        <h4 className="font-semibold text-blue-700">{item.dimension}</h4>
                        <ul className="list-disc list-inside text-blue-600">
                          {Object.entries(item.results).map(([name, value]) => (
                            <li key={name}>
                              {name}: {value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {compResult.suggestions.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-bold mb-2 text-green-800">优化建议</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {compResult.suggestions.map((s, idx) => (
                        <li key={idx} className="text-green-700">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

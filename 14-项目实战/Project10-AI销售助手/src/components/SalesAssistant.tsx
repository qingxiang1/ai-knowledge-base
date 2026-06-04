import React, { useState } from 'react';
import { generateSalesScript, analyzeCustomerProfile } from '../services/api';
import { SalesScriptRequest, SalesScriptResponse, CustomerProfileRequest, CustomerProfileResponse } from '../types';

type Tab = 'script' | 'profile';

const scenarios = [
  { value: 'cold_call', label: ' cold call' },
  { value: 'demo', label: '产品演示' },
  { value: 'follow_up', label: '跟进' },
  { value: 'objection', label: '异议处理' },
];

/**
 * AI 销售助手组件
 */
export const SalesAssistant: React.FC = () => {
  const [tab, setTab] = useState<Tab>('script');

  // 话术生成状态
  const [productName, setProductName] = useState('');
  const [productFeatures, setProductFeatures] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [scenario, setScenario] = useState<SalesScriptRequest['scenario']>('cold_call');
  const [scriptResult, setScriptResult] = useState<SalesScriptResponse | null>(null);

  // 客户画像状态
  const [customerInfo, setCustomerInfo] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [profileResult, setProfileResult] = useState<CustomerProfileResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const handleGenerateScript = async () => {
    if (!productName.trim() || !productFeatures.trim()) return;

    setLoading(true);
    try {
      const response = await generateSalesScript({
        productName,
        productFeatures,
        targetCustomer,
        scenario,
      });
      setScriptResult(response);
    } catch (error) {
      setScriptResult({
        script: `生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        keyPoints: [],
        objections: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeProfile = async () => {
    if (!customerInfo.trim()) return;

    setLoading(true);
    try {
      const response = await analyzeCustomerProfile({
        customerInfo,
        industry,
        companySize,
      });
      setProfileResult(response);
    } catch (error) {
      setProfileResult({
        profile: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        painPoints: [],
        needs: [],
        approach: '',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">AI 销售助手</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('script')}
            className={`px-4 py-2 rounded-lg ${
              tab === 'script' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            销售话术
          </button>
          <button
            onClick={() => setTab('profile')}
            className={`px-4 py-2 rounded-lg ${
              tab === 'profile' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            客户画像
          </button>
        </div>

        {tab === 'script' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="产品名称"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={productFeatures}
              onChange={(e) => setProductFeatures(e.target.value)}
              placeholder="产品特点"
              className="w-full h-24 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={targetCustomer}
              onChange={(e) => setTargetCustomer(e.target.value)}
              placeholder="目标客户"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as SalesScriptRequest['scenario'])}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {scenarios.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerateScript}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '生成中...' : '生成话术'}
            </button>

            {scriptResult && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold mb-2">销售话术</h3>
                  <div className="whitespace-pre-wrap">{scriptResult.script}</div>
                </div>

                {scriptResult.keyPoints.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-bold mb-2 text-blue-800">关键要点</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {scriptResult.keyPoints.map((point, idx) => (
                        <li key={idx} className="text-blue-700">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {scriptResult.objections.length > 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-bold mb-2 text-yellow-800">异议处理</h3>
                    <ul className="space-y-2">
                      {scriptResult.objections.map((item, idx) => (
                        <li key={idx} className="text-yellow-700">
                          <div className="font-semibold">客户: {item.objection}</div>
                          <div className="ml-4">销售: {item.response}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <textarea
              value={customerInfo}
              onChange={(e) => setCustomerInfo(e.target.value)}
              placeholder="客户信息描述..."
              className="w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="行业（可选）"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              placeholder="公司规模（可选）"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAnalyzeProfile}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '分析中...' : '分析客户画像'}
            </button>

            {profileResult && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold mb-2">客户画像</h3>
                  <p className="text-gray-700">{profileResult.profile}</p>
                </div>

                {profileResult.painPoints.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h3 className="font-bold mb-2 text-red-800">痛点</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {profileResult.painPoints.map((point, idx) => (
                        <li key={idx} className="text-red-700">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {profileResult.needs.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-bold mb-2 text-blue-800">需求</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {profileResult.needs.map((need, idx) => (
                        <li key={idx} className="text-blue-700">
                          {need}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {profileResult.approach && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-bold mb-2 text-green-800">销售策略</h3>
                    <p className="text-green-700">{profileResult.approach}</p>
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

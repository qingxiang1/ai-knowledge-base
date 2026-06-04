import React, { useState } from 'react';
import { evaluateResume, generateInterviewQuestions } from '../services/api';
import { ResumeEvaluateRequest, ResumeEvaluateResponse, InterviewQuestionsRequest, InterviewQuestionsResponse } from '../types';

type Tab = 'resume' | 'interview';

const questionTypes = [
  { value: 'technical', label: '技术问题' },
  { value: 'behavioral', label: '行为问题' },
  { value: 'situational', label: '情境问题' },
  { value: 'culture', label: '文化匹配' },
];

/**
 * AI 招聘助手组件
 */
export const RecruitmentAssistant: React.FC = () => {
  const [tab, setTab] = useState<Tab>('resume');

  // 简历评估状态
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [evaluateResult, setEvaluateResult] = useState<ResumeEvaluateResponse | null>(null);

  // 面试问题状态
  const [jobTitle, setJobTitle] = useState('');
  const [interviewJobDesc, setInterviewJobDesc] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['technical', 'behavioral']);
  const [questionCount, setQuestionCount] = useState(5);
  const [questionsResult, setQuestionsResult] = useState<InterviewQuestionsResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const handleEvaluate = async () => {
    if (!resume.trim() || !jobDescription.trim()) return;

    setLoading(true);
    try {
      const response = await evaluateResume({ resume, jobDescription });
      setEvaluateResult(response);
    } catch (error) {
      setEvaluateResult({
        score: 0,
        summary: `评估失败: ${error instanceof Error ? error.message : '未知错误'}`,
        strengths: [],
        weaknesses: [],
        matchDetails: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!jobTitle.trim() || !interviewJobDesc.trim()) return;

    setLoading(true);
    try {
      const response = await generateInterviewQuestions({
        jobTitle,
        jobDescription: interviewJobDesc,
        questionTypes: selectedTypes,
        count: questionCount,
      });
      setQuestionsResult(response);
    } catch (error) {
      setQuestionsResult({
        questions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">AI 招聘助手</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('resume')}
            className={`px-4 py-2 rounded-lg ${
              tab === 'resume' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            简历评估
          </button>
          <button
            onClick={() => setTab('interview')}
            className={`px-4 py-2 rounded-lg ${
              tab === 'interview' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            面试问题
          </button>
        </div>

        {tab === 'resume' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">简历内容</label>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="粘贴简历内容..."
                className="w-full h-48 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">职位描述</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="粘贴职位描述..."
                className="w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleEvaluate}
              disabled={loading || !resume.trim() || !jobDescription.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '评估中...' : '评估简历'}
            </button>

            {evaluateResult && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-blue-600">{evaluateResult.score}分</div>
                  <div className="text-gray-600">匹配度评分</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold mb-2">评估摘要</h3>
                  <p className="text-gray-700">{evaluateResult.summary}</p>
                </div>

                {evaluateResult.strengths.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-bold mb-2 text-green-800">优势</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {evaluateResult.strengths.map((s, idx) => (
                        <li key={idx} className="text-green-700">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluateResult.weaknesses.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h3 className="font-bold mb-2 text-red-800">不足</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {evaluateResult.weaknesses.map((w, idx) => (
                        <li key={idx} className="text-red-700">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluateResult.matchDetails.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-bold mb-2 text-blue-800">技能匹配</h3>
                    <div className="space-y-2">
                      {evaluateResult.matchDetails.map((detail, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-blue-700">{detail.skill}</span>
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              detail.matched
                                ? 'bg-green-200 text-green-800'
                                : 'bg-red-200 text-red-800'
                            }`}
                          >
                            {detail.matched ? '匹配' : '不匹配'}
                            {detail.level && ` (${detail.level})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'interview' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="职位名称"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={interviewJobDesc}
              onChange={(e) => setInterviewJobDesc(e.target.value)}
              placeholder="职位描述"
              className="w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <label className="block text-sm font-medium mb-2">问题类型</label>
              <div className="flex flex-wrap gap-2">
                {questionTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => toggleQuestionType(type.value)}
                    className={`px-3 py-2 rounded-lg ${
                      selectedTypes.includes(type.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">问题数量: {questionCount}</label>
              <input
                type="range"
                min={3}
                max={15}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <button
              onClick={handleGenerateQuestions}
              disabled={loading || !jobTitle.trim() || !interviewJobDesc.trim() || selectedTypes.length === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '生成中...' : '生成面试问题'}
            </button>

            {questionsResult && (
              <div className="mt-6 space-y-4">
                {questionsResult.questions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                        {q.type}
                      </span>
                      <span className="text-gray-500 text-sm">问题 {idx + 1}</span>
                    </div>
                    <p className="font-medium mb-2">{q.question}</p>
                    <p className="text-sm text-gray-600">目的: {q.purpose}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

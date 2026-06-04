import React, { useState } from 'react';
import { generateMinutes } from '../services/api';
import { MinutesRequest, MinutesResponse } from '../types';

/**
 * AI 会议纪要组件
 */
export const MeetingMinutes: React.FC = () => {
  const [transcript, setTranscript] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [result, setResult] = useState<MinutesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!transcript.trim()) return;

    setLoading(true);
    try {
      const request: MinutesRequest = {
        transcript,
        meetingTitle: meetingTitle || undefined,
        participants: participants ? participants.split(',').map((p) => p.trim()) : undefined,
      };
      const response = await generateMinutes(request);
      setResult(response);
    } catch (error) {
      setResult({
        summary: `生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        keyPoints: [],
        actionItems: [],
        decisions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">AI 会议纪要</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="会议标题（可选）"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="参会人员，用逗号分隔（可选）"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="粘贴会议录音转录文本..."
            className="w-full h-48 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !transcript.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '生成中...' : '生成会议纪要'}
          </button>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold mb-2">会议摘要</h3>
                <p className="text-gray-700">{result.summary}</p>
              </div>

              {result.keyPoints.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold mb-2 text-blue-800">关键要点</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {result.keyPoints.map((point, idx) => (
                      <li key={idx} className="text-blue-700">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.actionItems.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-bold mb-2 text-yellow-800">行动项</h3>
                  <ul className="space-y-2">
                    {result.actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-yellow-700">
                        <input type="checkbox" className="rounded" />
                        <span>{item.task}</span>
                        {item.assignee && (
                          <span className="text-sm bg-yellow-200 px-2 py-0.5 rounded">
                            {item.assignee}
                          </span>
                        )}
                        {item.deadline && (
                          <span className="text-sm text-yellow-600">
                            截止: {item.deadline}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.decisions.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-bold mb-2 text-green-800">决议事项</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {result.decisions.map((decision, idx) => (
                      <li key={idx} className="text-green-700">
                        {decision}
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

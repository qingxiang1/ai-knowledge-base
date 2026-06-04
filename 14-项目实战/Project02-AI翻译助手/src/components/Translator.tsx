import React, { useState } from 'react';
import { translateText } from '../services/api';
import { TranslateRequest, LanguageOption } from '../types';

const languages: LanguageOption[] = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'ru', name: '俄语' },
];

/**
 * AI 翻译助手组件
 */
export const Translator: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [sourceLang, setSourceLang] = useState('zh');
  const [targetLang, setTargetLang] = useState('en');
  const [style, setStyle] = useState<TranslateRequest['style']>('formal');
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setLoading(true);
    try {
      const response = await translateText({
        text: sourceText,
        sourceLang,
        targetLang,
        style,
      });
      setTargetText(response.translatedText);
    } catch (error) {
      setTargetText(`翻译失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(targetText);
    setTargetText(sourceText);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">AI 翻译助手</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center gap-4">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleSwap}
              className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              ⇄
            </button>

            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>

            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as TranslateRequest['style'])}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="formal">正式</option>
              <option value="casual">口语</option>
              <option value="technical">技术</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="输入要翻译的文本..."
              className="w-full h-64 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={targetText}
              readOnly
              placeholder="翻译结果..."
              className="w-full h-64 p-4 border rounded-lg resize-none bg-gray-50"
            />
          </div>

          <button
            onClick={handleTranslate}
            disabled={loading || !sourceText.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '翻译中...' : '翻译'}
          </button>
        </div>
      </div>
    </div>
  );
};

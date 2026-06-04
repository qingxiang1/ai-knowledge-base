/**
 * 文件描述: 翻译路由，支持 OpenAI API 和 mock 降级
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

const isMockMode = !process.env.OPENAI_API_KEY;

/**
 * 获取 OpenAI 客户端实例（延迟初始化）
 */
function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const langMap: Record<string, string> = {
  zh: '中文',
  en: '英语',
  ja: '日语',
  ko: '韩语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
  ru: '俄语',
};

/**
 * 翻译文本
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang, style } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: '文本不能为空' });
    }

    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800));

      const styleLabel = style === 'technical' ? '技术' : style === 'casual' ? '口语' : '正式';
      const mockTranslations: Record<string, Record<string, string>> = {
        zh: {
          en: `This is a ${styleLabel} translation of the provided Chinese text. In production mode with an API key configured, this would use OpenAI to provide high-quality translations.`,
          ja: `これは提供された中国語テキストの${styleLabel}翻訳です。APIキーが設定されている本番モードでは、OpenAIを使用して高品質な翻訳を提供します。`,
          ko: `이것은 제공된 중국어 텍스트의 ${styleLabel} 번역입니다. API 키가 구성된 프로덕션 모드에서는 OpenAI를 사용하여 고품질 번역을 제공합니다.`,
          fr: `Ceci est une traduction ${styleLabel} du texte chinois fourni. En mode production avec une clé API configurée, OpenAI serait utilisé pour fournir des traductions de haute qualité.`,
          de: `Dies ist eine ${styleLabel} Übersetzung des bereitgestellten chinesischen Textes. Im Produktionsmodus mit konfiguriertem API-Schlüssel würde OpenAI für hochwertige Übersetzungen verwendet werden.`,
        },
        en: {
          zh: `这是所提供英文文本的${styleLabel}翻译。在配置了 API Key 的生产模式下，将使用 OpenAI 提供高质量翻译。`,
          ja: `これは提供された英語テキストの${styleLabel}翻訳です。APIキーが設定されている本番モードでは、OpenAIを使用して高品質な翻訳を提供します。`,
        },
      };

      const translatedText = mockTranslations[sourceLang]?.[targetLang]
        || `[${styleLabel}] ${langMap[targetLang] || targetLang} 翻译: "${text}"\n\n配置 OPENAI_API_KEY 后可获得高质量 AI 翻译。`;

      return res.json({
        translatedText,
        sourceLang,
        targetLang,
        alternatives: [
          `[${styleLabel}] 备选翻译 1`,
          `[${styleLabel}] 备选翻译 2`,
        ],
      });
    }

    const styleInstruction = style === 'technical'
      ? '请使用专业技术术语进行翻译，确保术语准确。'
      : style === 'casual'
        ? '请使用口语化、自然的表达方式进行翻译。'
        : '请使用正式、规范的表达方式进行翻译。';

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `你是一位专业的翻译专家，擅长在多种语言之间进行高质量翻译。${styleInstruction}请将用户提供的文本从${langMap[sourceLang] || sourceLang}翻译为${langMap[targetLang] || targetLang}。只返回翻译结果，不要添加解释。`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    });

    const translatedText = completion.choices[0]?.message?.content || '';

    res.json({
      translatedText,
      sourceLang,
      targetLang,
      alternatives: [],
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '翻译失败' });
  }
});

export default router;

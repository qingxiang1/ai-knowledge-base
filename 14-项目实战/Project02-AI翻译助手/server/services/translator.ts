/**
 * 创建时间: 2026-06-14
 * 文件名: translator.ts
 * 文件描述: Project02 AI 翻译助手核心服务，封装语言识别、翻译以及 mock/API 双模式逻辑
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import OpenAI from "openai";
import type {
  DetectResponse,
  TranslateRequest,
  TranslateResponse,
  TranslationStyle,
} from "../types";

/**
 * 是否运行在 mock 模式（未配置 OPENAI_API_KEY 时自动降级）
 */
export const isMockMode = (): boolean => !process.env.OPENAI_API_KEY;

/**
 * 语言代码到中文名称的映射
 */
export const langMap: Record<string, string> = {
  zh: "中文",
  en: "英语",
  ja: "日语",
  ko: "韩语",
  fr: "法语",
  de: "德语",
  es: "西班牙语",
  ru: "俄语",
};

const styleLabelMap: Record<TranslationStyle, string> = {
  formal: "正式",
  casual: "口语",
  technical: "技术",
};

const styleInstructionMap: Record<TranslationStyle, string> = {
  formal: "请使用正式、规范的表达方式进行翻译。",
  casual: "请使用口语化、自然的表达方式进行翻译。",
  technical: "请使用专业技术术语进行翻译，确保术语准确。",
};

/**
 * 获取 OpenAI 客户端实例（延迟初始化）
 * @returns OpenAI 客户端
 */
function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * 基于 Unicode 区间的轻量启发式语言识别，用于 mock 模式与快速兜底
 * @param text 待识别文本
 * @returns 识别结果与置信度
 */
export function detectLanguageHeuristic(text: string): DetectResponse {
  const trimmed = text.trim();
  if (!trimmed) {
    return { detectedLang: "en", confidence: 0 };
  }

  const counters: Record<string, number> = {
    ja: (trimmed.match(/[぀-ヿ]/g) || []).length, // 平假名 / 片假名
    ko: (trimmed.match(/[가-힯]/g) || []).length, // 韩文音节
    zh: (trimmed.match(/[一-鿿]/g) || []).length, // CJK 汉字
    ru: (trimmed.match(/[Ѐ-ӿ]/g) || []).length, // 西里尔字母
    en: (trimmed.match(/[A-Za-z]/g) || []).length, // 拉丁字母
  };

  // 含有假名优先判定为日语，避免与中文汉字混淆
  if (counters.ja > 0) {
    return { detectedLang: "ja", confidence: 0.9 };
  }

  let detectedLang = "en";
  let max = 0;
  for (const [lang, count] of Object.entries(counters)) {
    if (count > max) {
      max = count;
      detectedLang = lang;
    }
  }

  const totalSignal = Object.values(counters).reduce((sum, n) => sum + n, 0);
  const confidence = totalSignal > 0 ? Math.min(1, max / totalSignal) : 0;
  return { detectedLang, confidence: Number(confidence.toFixed(2)) };
}

/**
 * 识别文本语言：mock 模式使用启发式，API 模式优先用模型并以启发式兜底
 * @param text 待识别文本
 * @returns 识别结果
 */
export async function detectLanguage(text: string): Promise<DetectResponse> {
  if (isMockMode()) {
    return detectLanguageHeuristic(text);
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "你是语言识别器。请仅返回输入文本的语言代码，可选值：zh, en, ja, ko, fr, de, es, ru。只返回代码本身，不要任何解释。",
        },
        { role: "user", content: text.slice(0, 500) },
      ],
      temperature: 0,
    });

    const raw = completion.choices[0]?.message?.content?.trim().toLowerCase() || "";
    const detectedLang = Object.keys(langMap).includes(raw)
      ? raw
      : detectLanguageHeuristic(text).detectedLang;
    return { detectedLang, confidence: 0.95 };
  } catch {
    return detectLanguageHeuristic(text);
  }
}

/**
 * 生成 mock 模式翻译结果
 * @param text 原文
 * @param sourceLang 源语言
 * @param targetLang 目标语言
 * @param style 翻译风格
 * @returns 译文与备选译文
 */
function buildMockTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  style: TranslationStyle,
): { translatedText: string; alternatives: string[] } {
  const styleLabel = styleLabelMap[style];
  const targetName = langMap[targetLang] || targetLang;

  const presets: Record<string, Record<string, string>> = {
    zh: {
      en: `This is a ${styleLabel} translation of the provided Chinese text. Configure OPENAI_API_KEY to get real AI translations.`,
      ja: `これは提供された中国語テキストの${styleLabel}翻訳です。OPENAI_API_KEY を設定すると、実際の AI 翻訳が利用できます。`,
      ko: `이것은 제공된 중국어 텍스트의 ${styleLabel} 번역입니다. OPENAI_API_KEY를 설정하면 실제 AI 번역을 사용할 수 있습니다.`,
      fr: `Ceci est une traduction ${styleLabel} du texte chinois fourni. Configurez OPENAI_API_KEY pour des traductions IA réelles.`,
      de: `Dies ist eine ${styleLabel} Übersetzung des chinesischen Textes. Setzen Sie OPENAI_API_KEY für echte KI-Übersetzungen.`,
    },
    en: {
      zh: `这是所提供英文文本的${styleLabel}翻译。配置 OPENAI_API_KEY 后可获得真实的 AI 翻译。`,
      ja: `これは提供された英語テキストの${styleLabel}翻訳です。OPENAI_API_KEY を設定すると、実際の AI 翻訳が利用できます。`,
      ko: `이것은 제공된 영어 텍스트의 ${styleLabel} 번역입니다. OPENAI_API_KEY를 설정하면 실제 AI 번역을 사용할 수 있습니다.`,
    },
  };

  const translatedText =
    presets[sourceLang]?.[targetLang] ||
    `[${styleLabel}] ${targetName}翻译："${text}"\n\n（mock 模式演示结果，配置 OPENAI_API_KEY 后将调用真实模型。）`;

  return {
    translatedText,
    alternatives: [
      `[${styleLabel}·更直译] ${targetName}：${text}`,
      `[${styleLabel}·更地道] ${targetName}：${text}`,
    ],
  };
}

/**
 * 执行翻译，自动处理源语言识别与 mock/API 模式切换
 * @param request 翻译请求
 * @returns 翻译响应
 */
export async function translate(
  request: TranslateRequest,
): Promise<TranslateResponse> {
  const text = request.text.trim();
  const style: TranslationStyle = request.style || "formal";
  const targetLang = request.targetLang;

  // 处理自动识别：sourceLang 为 auto 时先识别
  let sourceLang = request.sourceLang;
  let detectedLang = request.sourceLang;
  if (request.sourceLang === "auto") {
    detectedLang = (await detectLanguage(text)).detectedLang;
    sourceLang = detectedLang;
  } else {
    detectedLang = request.sourceLang;
  }

  if (isMockMode()) {
    await new Promise((resolve) =>
      setTimeout(resolve, 500 + Math.random() * 600),
    );
    const { translatedText, alternatives } = buildMockTranslation(
      text,
      sourceLang,
      targetLang,
      style,
    );
    return {
      translatedText,
      sourceLang,
      targetLang,
      detectedLang,
      alternatives,
      style,
      model: "mock-translator",
    };
  }

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `你是一位专业的翻译专家，擅长在多种语言之间进行高质量翻译。${styleInstructionMap[style]}请将用户提供的文本从${langMap[sourceLang] || sourceLang}翻译为${langMap[targetLang] || targetLang}。只返回翻译结果，不要添加解释。`,
      },
      { role: "user", content: text },
    ],
    temperature: 0.3,
  });

  return {
    translatedText: completion.choices[0]?.message?.content || "",
    sourceLang,
    targetLang,
    detectedLang,
    alternatives: [],
    style,
    model: "gpt-4",
  };
}

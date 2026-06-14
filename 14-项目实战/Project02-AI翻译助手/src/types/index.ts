/**
 * 创建时间: 2026-06-03
 * 文件名: index.ts
 * 文件描述: Project02 AI 翻译助手前端类型定义
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

export type TranslationStyle = "formal" | "casual" | "technical";

/**
 * 翻译请求
 * sourceLang 传 "auto" 时由服务端自动识别源语言
 */
export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  style?: TranslationStyle;
}

/**
 * 翻译响应
 */
export interface TranslateResponse {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  detectedLang: string;
  alternatives: string[];
  style: TranslationStyle;
  model: string;
}

/**
 * 语言识别响应
 */
export interface DetectResponse {
  detectedLang: string;
  confidence: number;
}

/**
 * 语言选项
 */
export interface LanguageOption {
  code: string;
  name: string;
}

/**
 * 翻译历史记录
 */
export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  detectedLang: string;
  style: TranslationStyle;
  createdAt: string;
}

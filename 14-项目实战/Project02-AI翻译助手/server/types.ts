/**
 * 创建时间: 2026-06-14
 * 文件名: types.ts
 * 文件描述: Project02 AI 翻译助手服务端共享类型定义
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

export const translationStyles = ["formal", "casual", "technical"] as const;
export type TranslationStyle = (typeof translationStyles)[number];

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
 * 语言识别请求
 */
export interface DetectRequest {
  text: string;
}

/**
 * 语言识别响应
 */
export interface DetectResponse {
  detectedLang: string;
  confidence: number;
}

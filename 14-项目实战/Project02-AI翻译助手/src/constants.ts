/**
 * 创建时间: 2026-06-14
 * 文件名: constants.ts
 * 文件描述: Project02 AI 翻译助手前端共享常量（语言、风格等）
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import { LanguageOption, TranslationStyle } from "./types";

/**
 * 支持的语言列表（与后端 langMap 对齐）
 */
export const LANGUAGES: LanguageOption[] = [
  { code: "zh", name: "中文" },
  { code: "en", name: "英语" },
  { code: "ja", name: "日语" },
  { code: "ko", name: "韩语" },
  { code: "fr", name: "法语" },
  { code: "de", name: "德语" },
  { code: "es", name: "西班牙语" },
  { code: "ru", name: "俄语" },
];

/**
 * 翻译风格选项
 */
export const STYLE_OPTIONS: { value: TranslationStyle; label: string }[] = [
  { value: "formal", label: "正式" },
  { value: "casual", label: "口语" },
  { value: "technical", label: "技术" },
];

/**
 * 根据语言代码获取中文名称
 * @param code 语言代码
 * @returns 语言名称
 */
export function getLanguageName(code: string): string {
  return LANGUAGES.find((lang) => lang.code === code)?.name || code;
}

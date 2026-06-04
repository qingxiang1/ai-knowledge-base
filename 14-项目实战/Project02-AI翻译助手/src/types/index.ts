/**
 * 翻译请求
 */
export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  style?: 'formal' | 'casual' | 'technical';
}

/**
 * 翻译响应
 */
export interface TranslateResponse {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  alternatives?: string[];
}

/**
 * 语言选项
 */
export interface LanguageOption {
  code: string;
  name: string;
}

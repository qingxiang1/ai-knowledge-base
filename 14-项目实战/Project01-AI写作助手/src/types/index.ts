/**
 * 写作风格枚举
 */
export enum WritingStyle {
  FORMAL = 'formal',
  CASUAL = 'casual',
  ACADEMIC = 'academic',
  CREATIVE = 'creative',
  BUSINESS = 'business',
}

/**
 * 写作操作类型
 */
export enum WritingAction {
  GENERATE = 'generate',
  CONTINUE = 'continue',
  POLISH = 'polish',
  SHORTEN = 'shorten',
  EXPAND = 'expand',
}

/**
 * 写作请求参数
 */
export interface WritingRequest {
  content: string;
  style: WritingStyle;
  action: WritingAction;
  temperature?: number;
}

/**
 * 写作响应
 */
export interface WritingResponse {
  result: string;
  tokens_used: number;
  model: string;
}

/**
 * 历史记录项
 */
export interface HistoryItem {
  id: string;
  timestamp: number;
  request: WritingRequest;
  response: WritingResponse;
}

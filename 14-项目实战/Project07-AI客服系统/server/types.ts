/**
 * 创建时间: 2026-06-24
 * 文件名: types.ts
 * 文件描述: Project07 AI 客服系统服务端共享类型。定义意图、FAQ 命中、订单信息与统一回复结构。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

/** 意图类型 */
export type Intent =
  | "product_inquiry"
  | "technical_support"
  | "order_query"
  | "refund"
  | "complaint"
  | "general_inquiry";

/** 意图识别结果（真实可解释，confidence 由关键词命中推导） */
export interface IntentResult {
  intent: Intent;
  confidence: number;
  matched: string[];
}

/** FAQ 检索命中 */
export interface FaqHit {
  question: string;
  answer: string;
  category: string;
  score: number;
}

/** 订单信息 */
export interface OrderInfo {
  orderNo: string;
  product: string;
  amount: number;
  status: string;
  logistics: string;
  eta: string;
}

/** 答案来源 */
export type ReplySource = "faq" | "order" | "template" | "model";

/** 统一客服回复 */
export interface CSReply {
  intent: Intent;
  confidence: number;
  matched: string[];
  answer: string;
  source: ReplySource;
  faq?: FaqHit;
  order?: OrderInfo;
  /** 是否建议转人工 */
  escalate: boolean;
  escalateReason?: string;
  /** 快捷回复建议 */
  suggestions: string[];
  mode: "mock" | "api";
}

/** 会话内一条消息 */
export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
}

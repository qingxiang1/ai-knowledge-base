/**
 * 创建时间: 2026-06-03
 * 文件名: index.ts
 * 文件描述: 前端共享类型，与服务端客服回复对齐，用于渲染意图、来源、转人工与快捷建议
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

export type Intent =
  | 'product_inquiry'
  | 'technical_support'
  | 'order_query'
  | 'refund'
  | 'complaint'
  | 'general_inquiry';

export type ReplySource = 'faq' | 'order' | 'template' | 'model';

/** 命中的 FAQ */
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

/** 客服消息 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: Intent;
  confidence?: number;
  matched?: string[];
  source?: ReplySource;
  faq?: FaqHit;
  order?: OrderInfo;
  escalate?: boolean;
  escalateReason?: string;
  suggestions?: string[];
  mode?: 'mock' | 'api';
}

/** 演示元数据 */
export interface MetaInfo {
  mode: 'mock' | 'api';
  faqs: { question: string; category: string }[];
  demoOrders: string[];
}

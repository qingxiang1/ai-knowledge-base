/**
 * 创建时间: 2026-06-24
 * 文件名: intent.ts
 * 文件描述: 真实可解释的意图分类。基于关键词命中计分选出最优意图，并由命中数推导出
 *           确定性的置信度（不使用随机数），同时返回命中的关键词便于前端展示。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

import type { Intent, IntentResult } from "../types";

/** 意图 -> 关键词表 */
const INTENT_KEYWORDS: Record<Exclude<Intent, "general_inquiry">, string[]> = {
  product_inquiry: ["产品", "功能", "价格", "多少钱", "费用", "套餐", "版本", "试用", "购买", "下单"],
  technical_support: ["故障", "报错", "无法", "不能", "崩溃", "bug", "打不开", "登录不了", "卡", "闪退", "错误"],
  order_query: ["订单", "物流", "发货", "配送", "快递", "到哪了", "签收", "运单"],
  refund: ["退款", "退货", "退钱", "取消订单", "退订"],
  complaint: ["投诉", "不满", "差评", "态度差", "垃圾", "骗", "举报"],
};

/** 转人工的显式触发词 */
export const HUMAN_KEYWORDS = ["人工", "转人工", "真人", "客服电话", "找个人"];

/**
 * 识别用户意图
 * @param content 用户消息
 * @returns 意图、置信度（0-1）与命中关键词
 */
export function classifyIntent(content: string): IntentResult {
  const text = content.toLowerCase();
  let best: { intent: Intent; matched: string[] } = { intent: "general_inquiry", matched: [] };
  let bestHits = 0;
  let secondHits = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const matched = keywords.filter((kw) => text.includes(kw.toLowerCase()));
    if (matched.length > bestHits) {
      secondHits = bestHits;
      bestHits = matched.length;
      best = { intent: intent as Intent, matched };
    } else if (matched.length > secondHits) {
      secondHits = matched.length;
    }
  }

  if (bestHits === 0) {
    return { intent: "general_inquiry", confidence: 0.45, matched: [] };
  }

  // 置信度：命中越多越高；与次优意图差距越大越高（确定性，可解释）
  const margin = bestHits - secondHits;
  const confidence = Math.min(0.97, 0.6 + 0.12 * bestHits + 0.08 * margin);
  return { intent: best.intent, confidence: Math.round(confidence * 100) / 100, matched: best.matched };
}

/**
 * 创建时间: 2026-06-24
 * 文件名: orders.ts
 * 文件描述: 模拟订单库与订单查询「工具」。从用户消息中识别订单号并真实查表返回订单状态、
 *           物流与预计送达，模拟客服系统中典型的工具调用能力。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

import type { OrderInfo } from "../types";

/** 模拟订单库（演示用） */
const ORDERS: Record<string, OrderInfo> = {
  DD20260601: {
    orderNo: "DD20260601",
    product: "专业版年度订阅",
    amount: 2999,
    status: "已发货",
    logistics: "顺丰速运 SF1234567890，当前在【杭州转运中心】",
    eta: "预计 2026-06-26 送达",
  },
  DD20260612: {
    orderNo: "DD20260612",
    product: "智能音箱 Pro",
    amount: 499,
    status: "待发货",
    logistics: "仓库正在拣货",
    eta: "预计 2026-06-25 发货",
  },
  DD20260618: {
    orderNo: "DD20260618",
    product: "基础版季度订阅",
    amount: 297,
    status: "已签收",
    logistics: "已由本人签收",
    eta: "已于 2026-06-20 完成",
  },
};

/**
 * 从文本中提取订单号（形如 DD + 数字，或「订单号 12345678」）
 * @param text 用户消息
 * @returns 订单号或 null
 */
export function extractOrderNo(text: string): string | null {
  const tagged = text.match(/[A-Za-z]{1,4}\d{6,}/);
  if (tagged) return tagged[0].toUpperCase();
  const afterKeyword = text.match(/(?:订单号?|单号)\s*[:：]?\s*([A-Za-z0-9]{6,})/);
  if (afterKeyword) return afterKeyword[1].toUpperCase();
  const pureDigits = text.match(/\b\d{8,}\b/);
  if (pureDigits) return pureDigits[0];
  return null;
}

/**
 * 查询订单
 * @param orderNo 订单号
 * @returns 订单信息或 null
 */
export function lookupOrder(orderNo: string): OrderInfo | null {
  return ORDERS[orderNo.toUpperCase()] ?? null;
}

/** 演示用订单号（供前端提示） */
export function demoOrderNumbers(): string[] {
  return Object.keys(ORDERS);
}

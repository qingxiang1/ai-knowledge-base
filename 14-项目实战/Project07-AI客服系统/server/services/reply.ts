/**
 * 创建时间: 2026-06-24
 * 文件名: reply.ts
 * 文件描述: 客服回复编排。串联意图识别、订单查询、FAQ 检索与转人工判定，产出确定性的真实回复。
 *           既用于 mock 模式直接回复，也作为 API 模式喂给大模型的事实依据（RAG 式）。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

import type { CSReply, Intent } from "../types";
import { classifyIntent, HUMAN_KEYWORDS } from "./intent";
import { searchFaq } from "./knowledge";
import { extractOrderNo, lookupOrder } from "./orders";

/** 各意图的快捷回复建议 */
const SUGGESTIONS: Record<Intent, string[]> = {
  product_inquiry: ["查看套餐价格", "申请免费试用", "预约演示"],
  technical_support: ["登录不了怎么办", "页面打不开", "转人工"],
  order_query: ["查询物流", "什么时候发货", "修改收货地址"],
  refund: ["退款政策", "如何申请退款", "退款多久到账"],
  complaint: ["转人工", "我要投诉", "留下联系方式"],
  general_inquiry: ["有哪些套餐", "怎么联系人工", "开发票"],
};

/** 各意图的兜底模板（FAQ 未命中时使用） */
const TEMPLATES: Record<Intent, string> = {
  product_inquiry: "感谢您对产品的关注！我们提供基础版/专业版/企业版三档套餐，并支持 14 天免费试用。您想了解价格、功能还是预约演示？",
  technical_support: "很抱歉给您带来不便。请简要描述具体现象（报错提示 / 操作步骤 / 浏览器版本），我会帮您定位；也可回复「转人工」由工程师协助。",
  order_query: "请提供您的订单号（如 DD20260601），我将为您查询订单状态与物流信息。",
  refund: "关于退款：购买 7 天内可申请全额退款，审核通过后 3-5 个工作日到账。请提供订单号以便核实。",
  complaint: "非常抱歉给您带来不好的体验，我们高度重视您的反馈。已为您标记并建议转接人工专员跟进，请问方便留下联系方式吗？",
  general_inquiry: "感谢您的咨询！我可以帮您解答产品、订单、退款、技术等问题。您也可以回复「转人工」联系在线客服（9:00-21:00）。",
};

/**
 * 编排生成客服回复（确定性、可解释）
 * @param content 用户消息
 * @returns 本地真实回复（mode=mock）
 */
export function buildReply(content: string): CSReply {
  const { intent, confidence, matched } = classifyIntent(content);
  const wantsHuman = HUMAN_KEYWORDS.some((kw) => content.includes(kw));

  // 0) 显式要求转人工 -> 直接给转接话术（投诉仍走模板以保留致歉语气）
  if (wantsHuman && intent !== "complaint") {
    return finalize({
      intent,
      confidence,
      matched,
      answer: "好的，正在为您转接在线人工客服（工作时间 9:00-21:00）。如非工作时间，可拨打热线 400-000-0000 或邮件 support@example.com，我们会尽快跟进。",
      source: "template",
      wantsHuman,
    });
  }

  // 1) 订单意图或消息中带订单号 -> 真实查表
  const orderNo = extractOrderNo(content);
  if (intent === "order_query" || orderNo) {
    if (orderNo) {
      const order = lookupOrder(orderNo);
      if (order) {
        return finalize({
          intent: "order_query",
          confidence: Math.max(confidence, 0.9),
          matched,
          answer:
            `已为您查询到订单 ${order.orderNo}：\n` +
            `· 商品：${order.product}（¥${order.amount}）\n` +
            `· 状态：${order.status}\n` +
            `· 物流：${order.logistics}\n` +
            `· ${order.eta}`,
          source: "order",
          order,
          wantsHuman,
        });
      }
      return finalize({
        intent: "order_query",
        confidence,
        matched,
        answer: `没有查询到订单号「${orderNo}」，请确认是否输入正确。演示可用订单号：DD20260601、DD20260612、DD20260618。`,
        source: "template",
        wantsHuman,
      });
    }
    // 订单意图但没给订单号
    return finalize({
      intent: "order_query",
      confidence,
      matched,
      answer: TEMPLATES.order_query,
      source: "template",
      wantsHuman,
    });
  }

  // 2) FAQ 检索（RAG 式核心）
  const faq = searchFaq(content);
  if (faq) {
    return finalize({
      intent,
      confidence,
      matched,
      answer: faq.answer,
      source: "faq",
      faq,
      wantsHuman,
    });
  }

  // 3) 意图模板兜底
  return finalize({
    intent,
    confidence,
    matched,
    answer: TEMPLATES[intent],
    source: "template",
    wantsHuman,
  });
}

/**
 * 统一收口：决定转人工与快捷建议
 */
function finalize(
  partial: Omit<CSReply, "escalate" | "escalateReason" | "suggestions" | "mode"> & { wantsHuman: boolean },
): CSReply {
  const { wantsHuman, ...rest } = partial;

  let escalate = false;
  let escalateReason: string | undefined;
  if (rest.intent === "complaint") {
    escalate = true;
    escalateReason = "用户表达投诉/不满，建议人工专员跟进";
  } else if (wantsHuman) {
    escalate = true;
    escalateReason = "用户明确要求转人工";
  } else if (rest.source === "template" && rest.confidence < 0.6) {
    escalate = true;
    escalateReason = "意图不明确且知识库未命中，建议人工介入";
  }

  const suggestions = escalate
    ? Array.from(new Set(["转人工", ...SUGGESTIONS[rest.intent]])).slice(0, 4)
    : SUGGESTIONS[rest.intent];

  return { ...rest, escalate, escalateReason, suggestions, mode: "mock" };
}

/**
 * 把回复的事实部分整理成给大模型的依据文本（API 模式 RAG 用）
 * @param reply 本地回复
 * @returns 事实文本
 */
export function replyFacts(reply: CSReply): string {
  const lines: string[] = [];
  lines.push(`识别意图：${reply.intent}（置信度 ${reply.confidence}）`);
  if (reply.faq) lines.push(`命中 FAQ：${reply.faq.question}\n标准答案：${reply.faq.answer}`);
  if (reply.order)
    lines.push(
      `订单信息：${reply.order.orderNo} / ${reply.order.product} / ¥${reply.order.amount} / ${reply.order.status} / ${reply.order.logistics} / ${reply.order.eta}`,
    );
  if (!reply.faq && !reply.order) lines.push(`参考话术：${reply.answer}`);
  if (reply.escalate) lines.push(`注意：建议转人工（${reply.escalateReason}）`);
  return lines.join("\n");
}

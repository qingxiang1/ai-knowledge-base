/**
 * 创建时间: 2026-06-24
 * 文件名: knowledge.ts
 * 文件描述: 客服 FAQ 知识库与真实检索。用中英文混合分词（CJK 二元组 + 拉丁词）对问题打分，
 *           返回最相关的 FAQ 条目及相似度分数。这是「答案从知识库来」的 RAG 式核心。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

import type { FaqHit } from "../types";

/** 一条 FAQ */
interface FaqEntry {
  question: string;
  answer: string;
  category: string;
}

/** 内置 FAQ 知识库 */
export const FAQS: FaqEntry[] = [
  {
    question: "你们的产品有哪些套餐和价格？",
    answer:
      "我们提供三档套餐：\n· 基础版 ¥99/月，含 1 个席位、基础功能；\n· 专业版 ¥299/月，含 5 个席位、数据分析与 API；\n· 企业版 定制报价，含 SSO、专属支持与私有部署。\n可登录官网「定价」页或回复「预约演示」了解详情。",
    category: "product_inquiry",
  },
  {
    question: "有没有免费试用？试用多久？",
    answer: "支持 14 天免费试用，专业版全部功能开放，无需绑定信用卡。试用到期前我们会提醒您，可随时升级或取消。",
    category: "product_inquiry",
  },
  {
    question: "退款政策是怎样的？多久到账？",
    answer:
      "购买后 7 天内且使用未超过额度可申请全额退款；超过 7 天按未使用周期折算。审核通过后退款将在 3-5 个工作日内原路退回。请提供订单号以便核实。",
    category: "refund",
  },
  {
    question: "如何申请退货退款？",
    answer: "在「我的订单」中选择对应订单点击「申请退款」，填写原因并提交即可；如为实物商品，请保持包装完好。提交后客服会在 1 个工作日内审核。",
    category: "refund",
  },
  {
    question: "发货和物流要多久？",
    answer: "现货商品在付款后 24 小时内发货，普通快递 2-4 天送达，偏远地区 4-7 天。下单后可在「我的订单」查看实时物流，或把订单号发给我帮您查询。",
    category: "order_query",
  },
  {
    question: "登录不了 / 提示密码错误怎么办？",
    answer:
      "请依次尝试：1）确认账号是否正确；2）点击登录页「忘记密码」重置；3）清除浏览器缓存或更换浏览器；4）确认未开启大写锁定。若仍无法登录，请提供账号与错误截图，我们会进一步排查。",
    category: "technical_support",
  },
  {
    question: "页面打不开 / 一直加载怎么办？",
    answer:
      "建议先刷新或更换网络；使用 Chrome/Edge 最新版；关闭广告拦截插件后重试。若特定功能报错，请提供报错提示与操作步骤，便于我们定位。",
    category: "technical_support",
  },
  {
    question: "可以开发票吗？怎么开？",
    answer: "支持电子普通发票与增值税专用发票。在「我的订单 - 申请开票」中填写抬头与税号提交，电子发票一般 1-3 个工作日内开具并发送至您预留邮箱。",
    category: "general_inquiry",
  },
  {
    question: "客服工作时间是什么时候？",
    answer: "在线客服工作时间为每天 9:00-21:00；非工作时间可留言，我们会在次日优先回复。紧急问题可回复「转人工」尝试接入值班客服。",
    category: "general_inquiry",
  },
  {
    question: "怎么联系人工客服？",
    answer: "您可以直接回复「转人工」，我会为您转接在线人工客服（工作时间 9:00-21:00）；也可拨打客服热线 400-000-0000 或发送邮件至 support@example.com。",
    category: "general_inquiry",
  },
  {
    question: "支持哪些支付方式？",
    answer: "支持微信支付、支付宝、银行卡以及对公转账（企业版）。支付遇到问题可提供订单号，我们帮您核实支付状态。",
    category: "product_inquiry",
  },
  {
    question: "怎么升级或更换套餐？",
    answer: "在「账户 - 订阅管理」中可随时升级，差价按剩余周期折算；降级将在当前周期结束后生效。企业版变更请联系专属客户经理。",
    category: "product_inquiry",
  },
];

/**
 * 中英文混合分词（CJK 二元组 + 拉丁词）
 * @param text 文本
 * @returns 词元数组
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const latin = text.toLowerCase().match(/[a-z0-9]+/g);
  if (latin) tokens.push(...latin);
  const cjk = text.match(/[一-鿿]+/g);
  if (cjk) {
    for (const run of cjk) {
      if (run.length === 1) tokens.push(run);
      else for (let i = 0; i < run.length - 1; i += 1) tokens.push(run.slice(i, i + 2));
    }
  }
  return tokens;
}

/**
 * 在 FAQ 知识库中检索最相关条目
 * @param query 用户问题
 * @returns 命中（含相似度分数）或 null
 */
export function searchFaq(query: string): FaqHit | null {
  const queryTerms = Array.from(new Set(tokenize(query)));
  if (queryTerms.length === 0) return null;

  let best: FaqEntry | null = null;
  let bestScore = 0;
  for (const entry of FAQS) {
    const entryTerms = new Set(tokenize(`${entry.question} ${entry.answer}`));
    let hit = 0;
    for (const term of queryTerms) if (entryTerms.has(term)) hit += 1;
    const score = hit / queryTerms.length;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore < 0.18) return null;
  return {
    question: best.question,
    answer: best.answer,
    category: best.category,
    score: Math.round(bestScore * 100) / 100,
  };
}

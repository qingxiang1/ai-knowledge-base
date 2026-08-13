/**
 * 创建时间: 2026-06-14
 * 文件名: tools.ts
 * 文件描述: Project04 Agent 系统工具注册中心。提供可真实执行、零外部依赖的工具：
 *           计算器、当前时间、本地知识检索。每个工具都有定义与 run 执行函数。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import type { ToolDefinition, ToolResult } from "../types";

/**
 * 中英文混合分词（CJK 二元组 + 拉丁词），用于本地知识检索打分
 * @param text 输入文本
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
 * 安全的四则运算求值（递归下降，不使用 eval）
 * 支持 + - * / % ^ 与括号、小数与一元正负号
 * @param raw 原始表达式
 * @returns 计算结果
 */
function evaluateArithmetic(raw: string): number {
  const s = raw
    .replace(/[×]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\s+/g, "");
  if (!s) throw new Error("表达式为空");

  let pos = 0;
  const parseNumber = (): number => {
    const start = pos;
    while (pos < s.length && /[0-9.]/.test(s[pos])) pos += 1;
    const num = parseFloat(s.slice(start, pos));
    if (Number.isNaN(num)) throw new Error("无效数字");
    return num;
  };
  const parseFactor = (): number => {
    if (s[pos] === "(") {
      pos += 1;
      const value = parseExpr();
      if (s[pos] !== ")") throw new Error("括号不匹配");
      pos += 1;
      return value;
    }
    if (s[pos] === "-") {
      pos += 1;
      return -parseFactor();
    }
    if (s[pos] === "+") {
      pos += 1;
      return parseFactor();
    }
    if (pos < s.length && /[0-9.]/.test(s[pos])) return parseNumber();
    throw new Error(`无法解析：${s.slice(pos) || "表达式末尾"}`);
  };
  const parsePower = (): number => {
    const base = parseFactor();
    if (s[pos] === "^") {
      pos += 1;
      return Math.pow(base, parsePower());
    }
    return base;
  };
  const parseTerm = (): number => {
    let value = parsePower();
    while (s[pos] === "*" || s[pos] === "/" || s[pos] === "%") {
      const op = s[pos];
      pos += 1;
      const right = parsePower();
      if (op === "*") value *= right;
      else if (op === "/") {
        if (right === 0) throw new Error("除数不能为 0");
        value /= right;
      } else value %= right;
    }
    return value;
  };
  function parseExpr(): number {
    let value = parseTerm();
    while (s[pos] === "+" || s[pos] === "-") {
      const op = s[pos];
      pos += 1;
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  const result = parseExpr();
  if (pos !== s.length) throw new Error(`表达式含多余字符：${s.slice(pos)}`);
  return result;
}

/**
 * 内置知识库（供 knowledge_search 工具检索）
 */
const KNOWLEDGE_BASE: { title: string; content: string }[] = [
  {
    title: "RAG",
    content:
      "RAG（检索增强生成）先从知识库检索与问题相关的片段，再让大模型基于这些片段作答，从而让回答可溯源、可控制范围，缓解模型幻觉。",
  },
  {
    title: "Agent",
    content:
      "Agent（智能体）在大模型之外引入「工具调用 + 循环推理」，通过思考→行动→观察的 ReAct 循环自主选择并执行工具来完成任务，而不只是一次性回答。",
  },
  {
    title: "Prompt 工程",
    content:
      "Prompt 工程是通过设计提示词（角色、示例、思维链、结构化输出等）来稳定地引导大模型产出期望结果的方法。",
  },
  {
    title: "MCP",
    content:
      "MCP（Model Context Protocol，模型上下文协议）是一种标准化协议，让大模型客户端以统一方式连接外部工具、数据源与服务。",
  },
  {
    title: "LoRA",
    content:
      "LoRA 是一种参数高效微调方法，冻结原模型权重、只训练低秩适配矩阵，从而以很小的显存和存储成本微调大模型。",
  },
  {
    title: "Embedding",
    content:
      "Embedding（向量嵌入）把文本映射为稠密向量，语义相近的文本向量距离更近，是向量检索与 RAG 的基础。",
  },
  {
    title: "Function Calling",
    content:
      "Function Calling（函数调用）让大模型按给定的工具 schema 输出结构化调用请求，由程序执行后把结果回传模型，是实现 Agent 工具调用的常用机制。",
  },
];

/**
 * 在内置知识库中检索最相关的条目
 * @param query 查询
 * @returns 检索结果文本
 */
function searchKnowledge(query: string): string {
  const queryTerms = Array.from(new Set(tokenize(query)));
  if (queryTerms.length === 0) return "未提供有效查询。";

  let best: { title: string; content: string } | null = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE_BASE) {
    const entryTerms = new Set(tokenize(`${entry.title} ${entry.content}`));
    let hit = 0;
    for (const term of queryTerms) if (entryTerms.has(term)) hit += 1;
    const score = hit / queryTerms.length;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore < 0.12) {
    return `知识库中未找到与「${query}」直接相关的条目。可用条目：${KNOWLEDGE_BASE.map((e) => e.title).join("、")}。`;
  }
  return `〔${best.title}〕${best.content}`;
}

/**
 * 工具注册表
 */
export const TOOLS: ToolDefinition[] = [
  {
    name: "calculator",
    description: "计算一个数学算式，支持 + - * / % ^ 与括号。当问题涉及数值计算时使用。",
    parameters: { expression: "要计算的数学算式，例如 (12 + 8) * 3" },
    run: (args): ToolResult => {
      const expression = String(args.expression ?? "").trim();
      try {
        const value = evaluateArithmetic(expression);
        return { result: `${expression} = ${value}`, success: true };
      } catch (error) {
        return {
          result: `计算失败：${error instanceof Error ? error.message : "无效表达式"}`,
          success: false,
        };
      }
    },
  },
  {
    name: "current_datetime",
    description: "获取当前的日期和时间。当问题涉及现在几点、今天日期、星期几时使用。",
    parameters: {},
    run: (): ToolResult => {
      const now = new Date();
      const text = now.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "long",
        hour12: false,
      });
      return { result: text, success: true };
    },
  },
  {
    name: "knowledge_search",
    description:
      "在内置 AI / 产品知识库中检索概念解释（如 RAG、Agent、Prompt、MCP、LoRA、Embedding 等）。当问题是概念性提问时使用。",
    parameters: { query: "要查询的关键词或问题" },
    run: (args): ToolResult => {
      const query = String(args.query ?? "").trim();
      if (!query) return { result: "查询不能为空。", success: false };
      return { result: searchKnowledge(query), success: true };
    },
  },
];

/**
 * 按名称获取工具
 * @param name 工具名
 * @returns 工具定义或 undefined
 */
export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

/**
 * 执行一个工具
 * @param name 工具名
 * @param args 入参
 * @returns 执行结果
 */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) {
    return { result: `未知工具：${name}`, success: false };
  }
  return tool.run(args);
}

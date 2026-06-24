/**
 * 创建时间: 2026-06-23
 * 文件名: agent.ts
 * 文件描述: Project04 Agent 系统核心引擎。实现真正会「思考 → 行动 → 观察 → 回答」的
 *           ReAct 循环，并真实执行 tools.ts 中注册的工具：
 *             - mock 模式：基于规则的确定性 Agent，离线即可真正调用工具（无需 API Key）
 *             - api  模式：OpenAI Function Calling 多轮循环，由模型自主选择并执行工具
 *           两种模式返回结构完全一致的 AgentResult，前端按统一格式渲染推理轨迹。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-23
 */

import OpenAI from "openai";
import type {
  AgentResult,
  AgentStep,
  ChatMessage,
  ToolCall,
} from "../types";
import { TOOLS, runTool, getTool } from "./tools";

/** ReAct 循环最大迭代轮数，防止模型陷入死循环 */
const MAX_ITERATIONS = 5;

/* ------------------------------------------------------------------ */
/* 一、Mock 模式：基于规则的真实 Agent（离线可用，真正执行工具）            */
/* ------------------------------------------------------------------ */

/**
 * 从用户问题中提取一个数学算式（含数字与至少一个运算符）
 * @param query 用户问题
 * @returns 提取到的算式，未找到返回 null
 */
function extractExpression(query: string): string | null {
  // 匹配由数字、运算符、括号、空白组成的连续片段（保留前导括号）
  const candidates = query.match(/[0-9.．()（）+\-*/%^×÷\s]{3,}/g);
  if (!candidates) return null;
  // 必须同时包含数字与运算符，取最长片段，并裁掉首尾空白与多余运算符
  const valid = candidates
    .map((c) => c.trim().replace(/^[+*/%^×÷\s]+/, "").replace(/[+\-*/%^×÷\s]+$/, ""))
    .filter((c) => /[0-9]/.test(c) && /[+\-*/%^×÷]/.test(c))
    .sort((a, b) => b.length - a.length);
  return valid[0] ?? null;
}

/** 时间 / 日期类问题的关键词 */
const DATETIME_KEYWORDS = ["现在", "几点", "今天", "日期", "星期", "时间", "date", "time", "now"];

/** 概念检索类问题的关键词（命中则触发 knowledge_search） */
const KNOWLEDGE_KEYWORDS = [
  "是什么",
  "什么是",
  "解释",
  "介绍",
  "概念",
  "区别",
  "rag",
  "agent",
  "智能体",
  "prompt",
  "提示词",
  "mcp",
  "lora",
  "微调",
  "embedding",
  "向量",
  "function calling",
  "函数调用",
];

/**
 * 规划：根据问题决定要调用哪些工具（可多个，构成多步 ReAct 轨迹）
 * @param query 用户问题
 * @returns 计划要执行的工具调用（含入参）
 */
function planTools(query: string): { tool: string; args: Record<string, unknown> }[] {
  const lower = query.toLowerCase();
  const plan: { tool: string; args: Record<string, unknown> }[] = [];

  const expression = extractExpression(query);
  if (expression) plan.push({ tool: "calculator", args: { expression } });

  if (DATETIME_KEYWORDS.some((k) => lower.includes(k))) {
    plan.push({ tool: "current_datetime", args: {} });
  }

  if (KNOWLEDGE_KEYWORDS.some((k) => lower.includes(k))) {
    plan.push({ tool: "knowledge_search", args: { query } });
  }

  return plan;
}

/**
 * Mock 模式 Agent：真正执行规划出的工具，并基于真实观察结果合成回答
 * @param query 用户问题
 * @returns 完整的 Agent 执行结果
 */
async function runMockAgent(query: string): Promise<AgentResult> {
  const steps: AgentStep[] = [];
  const toolCalls: ToolCall[] = [];
  const plan = planTools(query);

  if (plan.length === 0) {
    // 没有匹配到任何工具：直接给出说明性回答（仍是一次完整的 thought → final 轨迹）
    steps.push({
      type: "thought",
      content: `分析问题「${query}」：未匹配到可用工具（计算 / 时间 / 知识检索），将直接作答。`,
    });
    const available = TOOLS.map((t) => t.name).join("、");
    const answer =
      `我没有从你的问题中识别到需要调用的工具。\n\n` +
      `当前内置可真实执行的工具：${available}。\n` +
      `你可以试试：「(12+8)*3 等于多少」「现在几点」「什么是 RAG」。\n\n` +
      `> 提示：配置 OPENAI_API_KEY 后将启用真实大模型的 ReAct 推理，可处理更开放的问题。`;
    steps.push({ type: "final", content: answer });
    return { answer, thought_process: steps, tool_calls: toolCalls, iterations: 1, mode: "mock" };
  }

  // 规划步骤
  steps.push({
    type: "thought",
    content:
      `分析问题「${query}」，制定执行计划：依次调用 ` +
      `${plan.map((p) => p.tool).join(" → ")}，再综合观察结果作答。`,
  });

  // 逐个真实执行工具：action → observation
  const observations: string[] = [];
  for (const item of plan) {
    steps.push({
      type: "action",
      content: `调用工具 ${item.tool}`,
      tool: item.tool,
      args: item.args,
    });
    const result = await runTool(item.tool, item.args);
    steps.push({ type: "observation", content: result.result });
    toolCalls.push({ tool: item.tool, args: item.args, result: result.result, success: result.success });
    if (result.success) observations.push(result.result);
  }

  // 综合观察结果生成最终回答
  const answer = synthesizeMockAnswer(query, toolCalls);
  steps.push({ type: "final", content: answer });

  return { answer, thought_process: steps, tool_calls: toolCalls, iterations: 1, mode: "mock" };
}

/**
 * 把多个工具的真实观察结果合成为自然语言回答
 * @param query 原始问题
 * @param toolCalls 已执行的工具调用记录
 * @returns 合成后的回答
 */
function synthesizeMockAnswer(query: string, toolCalls: ToolCall[]): string {
  const parts: string[] = [];
  for (const call of toolCalls) {
    if (!call.success) {
      parts.push(`（工具 ${call.tool} 执行失败：${call.result}）`);
      continue;
    }
    if (call.tool === "calculator") parts.push(`计算结果：${call.result}`);
    else if (call.tool === "current_datetime") parts.push(`当前时间：${call.result}`);
    else if (call.tool === "knowledge_search") parts.push(call.result);
    else parts.push(call.result);
  }
  const body = parts.join("\n\n");
  return `${body}\n\n以上结论由 Agent 实际调用工具后得到，可在上方「推理轨迹」中查看每一步。`;
}

/* ------------------------------------------------------------------ */
/* 二、API 模式：OpenAI Function Calling 的多轮 ReAct 循环                */
/* ------------------------------------------------------------------ */

/**
 * 把内置工具定义转换为 OpenAI Function Calling 所需的 tools 描述
 * @returns OpenAI tools 数组
 */
function buildOpenAITools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return TOOLS.map((tool) => {
    const properties: Record<string, { type: string; description: string }> = {};
    for (const [name, desc] of Object.entries(tool.parameters)) {
      properties[name] = { type: "string", description: desc };
    }
    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties,
          required: Object.keys(tool.parameters),
        },
      },
    };
  });
}

const SYSTEM_PROMPT =
  "你是一个会使用工具的智能 Agent。请遵循 ReAct 方式：先思考、判断是否需要调用工具、" +
  "调用工具后再根据返回结果继续推理，直到能够回答用户问题。" +
  "涉及数值计算、当前时间、AI/产品概念检索时，必须调用对应工具而不要凭空回答。" +
  "最终请用简洁的中文给出结论。";

/**
 * API 模式 Agent：真实的 Function Calling 多轮循环，每轮可执行多个工具
 * @param query 用户问题
 * @param history 该会话的历史消息（用于多轮记忆）
 * @returns 完整的 Agent 执行结果
 */
async function runApiAgent(query: string, history: ChatMessage[]): Promise<AgentResult> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const tools = buildOpenAITools();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
    { role: "user", content: query },
  ];

  const steps: AgentStep[] = [];
  const toolCalls: ToolCall[] = [];
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations += 1;
    const completion = await client.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.3,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    // 模型本轮请求调用工具
    if (choice.tool_calls && choice.tool_calls.length > 0) {
      if (choice.content) steps.push({ type: "thought", content: choice.content });
      messages.push(choice);

      for (const call of choice.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }
        steps.push({
          type: "action",
          content: `调用工具 ${call.function.name}`,
          tool: call.function.name,
          args,
        });

        const result = getTool(call.function.name)
          ? await runTool(call.function.name, args)
          : { result: `未知工具：${call.function.name}`, success: false };

        steps.push({ type: "observation", content: result.result });
        toolCalls.push({ tool: call.function.name, args, result: result.result, success: result.success });
        messages.push({ role: "tool", tool_call_id: call.id, content: result.result });
      }
      continue;
    }

    // 模型给出最终回答
    const answer = choice.content || "";
    steps.push({ type: "final", content: answer });
    return { answer, thought_process: steps, tool_calls: toolCalls, iterations, mode: "api" };
  }

  // 达到最大迭代仍未收敛：用已有信息兜底
  const fallback =
    toolCalls.length > 0
      ? synthesizeMockAnswer(query, toolCalls)
      : "推理轮数已达上限，未能得出结论，请尝试简化问题。";
  steps.push({ type: "final", content: fallback });
  return { answer: fallback, thought_process: steps, tool_calls: toolCalls, iterations, mode: "api" };
}

/* ------------------------------------------------------------------ */
/* 三、统一入口                                                         */
/* ------------------------------------------------------------------ */

/**
 * 运行 Agent：根据是否配置 OPENAI_API_KEY 自动选择 api / mock 模式
 * @param query 用户问题
 * @param history 会话历史（仅 api 模式用于多轮记忆）
 * @returns 完整的 Agent 执行结果
 */
export async function runAgent(query: string, history: ChatMessage[] = []): Promise<AgentResult> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await runApiAgent(query, history);
    } catch (error) {
      // API 异常时优雅降级到 mock，保证 demo 始终可用
      const result = await runMockAgent(query);
      result.thought_process.unshift({
        type: "thought",
        content: `API 调用失败，已降级为本地工具执行：${error instanceof Error ? error.message : "未知错误"}`,
      });
      return result;
    }
  }
  return runMockAgent(query);
}

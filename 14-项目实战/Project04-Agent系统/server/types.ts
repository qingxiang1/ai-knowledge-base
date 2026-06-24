/**
 * 创建时间: 2026-06-14
 * 文件名: types.ts
 * 文件描述: Project04 Agent 系统服务端共享类型定义
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

/**
 * ReAct 步骤类型：思考 / 行动 / 观察 / 最终回答
 */
export type AgentStepType = "thought" | "action" | "observation" | "final";

/**
 * 一条 ReAct 执行步骤
 */
export interface AgentStep {
  type: AgentStepType;
  content: string;
  // action 步骤上附带工具名与入参，便于前端展示
  tool?: string;
  args?: Record<string, unknown>;
}

/**
 * 一次工具调用记录（真实执行结果）
 */
export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  success: boolean;
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  result: string;
  success: boolean;
}

/**
 * 工具定义
 */
export interface ToolDefinition {
  name: string;
  description: string;
  /** 入参说明：参数名 -> 说明 */
  parameters: Record<string, string>;
  /** 实际执行函数 */
  run: (args: Record<string, unknown>) => ToolResult | Promise<ToolResult>;
}

/**
 * 会话历史中的一条消息（用于多轮记忆）
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Agent 一次问答的完整结果
 * answer / thought_process / tool_calls 三字段与历史前端约定兼容
 */
export interface AgentResult {
  answer: string;
  thought_process: AgentStep[];
  tool_calls: ToolCall[];
  iterations: number;
  mode: "mock" | "api";
}

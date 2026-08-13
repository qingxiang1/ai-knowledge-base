/**
 * 创建时间: 2026-06-03
 * 文件名: index.ts
 * 文件描述: 前端共享类型，与服务端 AgentResult 保持一致，用于渲染真实的 ReAct 推理轨迹
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-23
 */

/** ReAct 步骤类型：思考 / 行动 / 观察 / 最终回答 */
export type AgentStepType = 'thought' | 'action' | 'observation' | 'final';

/** 一条 ReAct 执行步骤 */
export interface AgentStep {
  type: AgentStepType;
  content: string;
  tool?: string;
  args?: Record<string, unknown>;
}

/** 一次真实工具调用记录 */
export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  success: boolean;
}

/** Agent 一次问答的完整响应 */
export interface AgentResponse {
  answer: string;
  thought_process: AgentStep[];
  tool_calls: ToolCall[];
  iterations: number;
  mode: 'mock' | 'api';
}

/** 工具元信息（来自 GET /agent/tools） */
export interface ToolInfo {
  name: string;
  description: string;
  parameters: Record<string, string>;
}

/** 前端展示用的一条消息 */
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: AgentStep[];
  tools?: ToolCall[];
  iterations?: number;
  mode?: 'mock' | 'api';
}

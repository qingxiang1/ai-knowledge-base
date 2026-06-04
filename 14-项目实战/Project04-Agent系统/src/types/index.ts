/**
 * Agent 消息类型
 */
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  steps?: Array<{
    role: string;
    content: string;
  }>;
  tools?: Array<{
    tool: string;
    result: string;
  }>;
}

/**
 * Agent 响应
 */
export interface AgentResponse {
  answer: string;
  thought_process: Array<{
    role: string;
    content: string;
  }>;
  tool_calls: Array<{
    tool: string;
    result: string;
  }>;
}

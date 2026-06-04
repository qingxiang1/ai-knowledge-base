/**
 * 客服消息类型
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: string;
  confidence?: number;
}

/**
 * 客服会话
 */
export interface ChatSession {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  status: 'active' | 'closed';
  created_at: string;
  updated_at: string;
}

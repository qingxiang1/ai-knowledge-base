<!--
  文件描述: AI客服系统项目完整实战指南，包含需求分析、架构设计、代码实现与部署说明
  作者: AI-PM-Knowledge
  创建日期: 2026-06-04
  最后修改日期: 2026-06-04
-->

# Project07 - AI客服系统

> 一个基于 React + Node.js + OpenAI API 的全功能 AI 客服系统，支持智能问答、人工转接、工单管理和数据分析。

---

## 项目概述

### 功能特性

- **智能问答**：基于知识库和 LLM 的自动回复
- **多轮对话**：上下文感知的连续对话
- **意图识别**：自动识别用户意图（咨询、投诉、售后等）
- **人工转接**：AI 无法处理时自动转人工
- **工单系统**：问题追踪与处理流程
- **数据分析**：会话统计、满意度分析、热点问题
- **多渠道接入**：Web 聊天窗口、API 接口

### 技术栈

```
前端: React 18 + TypeScript + Ant Design
后端: Node.js + Express + TypeScript
数据库: PostgreSQL + Redis
AI: OpenAI GPT-4 + 向量检索
实时通信: Socket.IO
部署: Docker Compose
```

---

## 项目结构

```
Project07-AI客服系统/
├── README.md
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── index.ts              # 服务入口
│   │   ├── config/
│   │   │   └── database.ts       # 数据库配置
│   │   ├── models/
│   │   │   ├── Conversation.ts   # 会话模型
│   │   │   ├── Message.ts        # 消息模型
│   │   │   ├── Ticket.ts         # 工单模型
│   │   │   └── KnowledgeBase.ts  # 知识库模型
│   │   ├── services/
│   │   │   ├── aiService.ts      # AI 服务
│   │   │   ├── chatService.ts    # 聊天服务
│   │   │   ├── ticketService.ts  # 工单服务
│   │   │   └── analyticsService.ts # 分析服务
│   │   ├── routes/
│   │   │   ├── chat.ts           # 聊天路由
│   │   │   ├── tickets.ts        # 工单路由
│   │   │   ├── knowledge.ts      # 知识库路由
│   │   │   └── analytics.ts      # 分析路由
│   │   └── socket/
│   │       └── chatSocket.ts     # Socket.IO 处理
│   ├── package.json
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ChatWidget.tsx    # 聊天组件
    │   │   ├── AdminDashboard.tsx # 管理后台
    │   │   └── TicketPanel.tsx   # 工单面板
    │   └── services/
    │       └── api.ts
    └── package.json
```

---

## 快速开始

### 1. 环境准备

```bash
# 创建环境变量
cp .env.example .env
# 编辑 .env 填入配置
```

### 2. Docker 启动

```bash
docker-compose up -d
```

### 3. 访问系统

- 客服前台: http://localhost:5173
- 管理后台: http://localhost:5173/admin
- API 文档: http://localhost:3000/api/docs

---

## 核心代码实现

### 数据库模型 (backend/src/models/Conversation.ts)

```typescript
/**
 * 会话模型
 *
 * 定义客服会话的数据结构和操作方法。
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export enum ConversationStatus {
  ACTIVE = 'active',       // 进行中
  WAITING_HUMAN = 'waiting_human', // 等待人工
  CLOSED = 'closed',       // 已关闭
  ESCALATED = 'escalated', // 已升级
}

export enum MessageRole {
  USER = 'user',
  AI = 'ai',
  HUMAN = 'human',
  SYSTEM = 'system',
}

export interface Conversation {
  id: string;
  userId: string;
  status: ConversationStatus;
  intent: string | null;
  satisfaction: number | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * 创建会话表
 */
export async function createConversationTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      intent VARCHAR(100),
      satisfaction INTEGER CHECK (satisfaction >= 1 AND satisfaction <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
  `);
}

/**
 * 会话数据访问对象
 */
export class ConversationDAO {
  constructor(private pool: Pool) {}

  /**
   * 创建新会话
   */
  async create(userId: string): Promise<Conversation> {
    const result = await this.pool.query(
      `INSERT INTO conversations (user_id) VALUES ($1) RETURNING *`,
      [userId]
    );
    return this.mapRow(result.rows[0]);
  }

  /**
   * 获取会话详情
   */
  async getById(id: string): Promise<Conversation | null> {
    const result = await this.pool.query(
      `SELECT * FROM conversations WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * 获取会话消息列表
   */
  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    const result = await this.pool.query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC 
       LIMIT $2`,
      [conversationId, limit]
    );
    return result.rows.map(this.mapMessageRow);
  }

  /**
   * 添加消息
   */
  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, any>
  ): Promise<Message> {
    const result = await this.pool.query(
      `INSERT INTO messages (conversation_id, role, content, metadata) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [conversationId, role, content, JSON.stringify(metadata || {})]
    );
    return this.mapMessageRow(result.rows[0]);
  }

  /**
   * 更新会话状态
   */
  async updateStatus(
    id: string,
    status: ConversationStatus
  ): Promise<void> {
    await this.pool.query(
      `UPDATE conversations 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [status, id]
    );
  }

  /**
   * 关闭会话
   */
  async close(id: string, satisfaction?: number): Promise<void> {
    await this.pool.query(
      `UPDATE conversations 
       SET status = 'closed', 
           satisfaction = $1,
           closed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [satisfaction, id]
    );
  }

  /**
   * 获取待处理会话列表
   */
  async getPendingConversations(): Promise<Conversation[]> {
    const result = await this.pool.query(
      `SELECT * FROM conversations 
       WHERE status IN ('active', 'waiting_human') 
       ORDER BY updated_at DESC`
    );
    return result.rows.map(this.mapRow);
  }

  private mapRow(row: any): Conversation {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status as ConversationStatus,
      intent: row.intent,
      satisfaction: row.satisfaction,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
    };
  }

  private mapMessageRow(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role as MessageRole,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  }
}
```

### AI 服务 (backend/src/services/aiService.ts)

```typescript
/**
 * AI 服务模块
 *
 * 封装 OpenAI API 调用，实现意图识别、智能回复和情感分析。
 */

import OpenAI from 'openai';
import { Message, MessageRole } from '../models/Conversation';

interface AIResponse {
  content: string;
  intent: string;
  confidence: number;
  shouldEscalate: boolean;
}

interface IntentResult {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
}

export class AIService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });
    this.model = process.env.LLM_MODEL || 'gpt-4';
  }

  /**
   * 识别用户意图
   * @param message 用户消息
   * @returns 意图识别结果
   */
  async detectIntent(message: string): Promise<IntentResult> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `你是一个客服意图识别专家。分析用户消息，识别意图和提取实体。

可选意图：
- product_inquiry: 产品咨询
- price_inquiry: 价格咨询
- technical_issue: 技术问题
- complaint: 投诉
- refund_request: 退款申请
- general_chat: 闲聊

请以 JSON 格式返回：
{
  "intent": "意图名称",
  "confidence": 0.95,
  "entities": {"key": "value"}
}`,
        },
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      intent: result.intent || 'general_chat',
      confidence: result.confidence || 0.5,
      entities: result.entities || {},
    };
  }

  /**
   * 生成智能回复
   * @param messages 历史消息列表
   * @param knowledge 相关知识库内容
   * @returns AI 回复
   */
  async generateReply(
    messages: Message[],
    knowledge?: string[]
  ): Promise<AIResponse> {
    // 构建系统提示
    let systemPrompt = `你是某公司的智能客服助手。请根据以下原则回复：
1. 使用礼貌、专业的语气
2. 回答简洁明了，控制在200字以内
3. 不确定时坦诚说明，不要编造信息
4. 复杂问题建议转接人工客服
5. 涉及退款、投诉等敏感问题，必须转人工`;

    if (knowledge && knowledge.length > 0) {
      systemPrompt += `\n\n相关知识：\n${knowledge.join('\n')}`;
    }

    // 构建消息历史
    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10).map((m) => ({
        role: this.mapRole(m.role),
        content: m.content,
      })),
    ];

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content || '';

    // 判断是否需要升级（转人工）
    const shouldEscalate = this.checkShouldEscalate(content, messages);

    // 提取意图（从最后一条用户消息）
    const lastUserMessage = messages.filter((m) => m.role === MessageRole.USER).pop();
    const intent = lastUserMessage
      ? (await this.detectIntent(lastUserMessage.content)).intent
      : 'general_chat';

    return {
      content,
      intent,
      confidence: 0.9,
      shouldEscalate,
    };
  }

  /**
   * 情感分析
   * @param message 用户消息
   * @returns 情感分数 (-1 到 1)
   */
  async analyzeSentiment(message: string): Promise<number> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '分析用户消息的情感倾向，返回 -1（非常负面）到 1（非常正面）之间的分数。只返回数字。',
        },
        { role: 'user', content: message },
      ],
      temperature: 0.1,
      max_tokens: 10,
    });

    const score = parseFloat(response.choices[0].message.content || '0');
    return isNaN(score) ? 0 : Math.max(-1, Math.min(1, score));
  }

  /**
   * 判断是否需要转人工
   */
  private checkShouldEscalate(
    aiReply: string,
    history: Message[]
  ): boolean {
    // 敏感关键词
    const sensitiveKeywords = [
      '退款', '投诉', '举报', '律师', '法院', '媒体',
      'refund', 'complaint', 'lawsuit', 'lawyer',
    ];

    const lastUserMessage = history
      .filter((m) => m.role === MessageRole.USER)
      .pop()?.content
      .toLowerCase() || '';

    // 检查敏感词
    if (sensitiveKeywords.some((kw) => lastUserMessage.includes(kw))) {
      return true;
    }

    // 检查 AI 是否表示无法处理
    const uncertaintyPhrases = [
      '无法回答',
      '不清楚',
      '不知道',
      '建议联系人工',
      '转接客服',
      'cannot help',
      'unable to',
    ];

    if (uncertaintyPhrases.some((p) => aiReply.includes(p))) {
      return true;
    }

    // 检查连续失败次数
    const recentAIMessages = history
      .filter((m) => m.role === MessageRole.AI)
      .slice(-3);
    if (recentAIMessages.length >= 3) {
      const allSimilar = recentAIMessages.every(
        (m) => m.content.length < 50 || m.content.includes('抱歉')
      );
      if (allSimilar) return true;
    }

    return false;
  }

  private mapRole(role: MessageRole): 'user' | 'assistant' | 'system' {
    switch (role) {
      case MessageRole.USER:
        return 'user';
      case MessageRole.AI:
      case MessageRole.HUMAN:
        return 'assistant';
      default:
        return 'system';
    }
  }
}
```

### 聊天服务 (backend/src/services/chatService.ts)

```typescript
/**
 * 聊天服务模块
 *
 * 协调 AI 回复、人工转接和会话管理。
 */

import { Pool } from 'pg';
import { ConversationDAO, ConversationStatus, MessageRole } from '../models/Conversation';
import { AIService } from './aiService';
import { KnowledgeBaseService } from './knowledgeBaseService';

export class ChatService {
  private dao: ConversationDAO;
  private ai: AIService;
  private kb: KnowledgeBaseService;

  constructor(pool: Pool) {
    this.dao = new ConversationDAO(pool);
    this.ai = new AIService();
    this.kb = new KnowledgeBaseService(pool);
  }

  /**
   * 处理用户消息
   * @param conversationId 会话 ID
   * @param userId 用户 ID
   * @param content 消息内容
   * @returns 处理结果
   */
  async handleUserMessage(
    conversationId: string,
    userId: string,
    content: string
  ): Promise<{
    reply: string;
    intent: string;
    shouldEscalate: boolean;
    sources?: string[];
  }> {
    // 1. 保存用户消息
    await this.dao.addMessage(conversationId, MessageRole.USER, content);

    // 2. 获取会话历史
    const history = await this.dao.getMessages(conversationId, 20);

    // 3. 查询知识库
    const knowledge = await this.kb.search(content, 3);

    // 4. 生成 AI 回复
    const aiResponse = await this.ai.generateReply(
      history,
      knowledge.map((k) => k.content)
    );

    // 5. 保存 AI 回复
    await this.dao.addMessage(conversationId, MessageRole.AI, aiResponse.content, {
      intent: aiResponse.intent,
      confidence: aiResponse.confidence,
    });

    // 6. 更新会话意图
    await this.updateIntent(conversationId, aiResponse.intent);

    // 7. 如果需要转人工
    if (aiResponse.shouldEscalate) {
      await this.dao.updateStatus(conversationId, ConversationStatus.WAITING_HUMAN);
    }

    return {
      reply: aiResponse.content,
      intent: aiResponse.intent,
      shouldEscalate: aiResponse.shouldEscalate,
      sources: knowledge.map((k) => k.title),
    };
  }

  /**
   * 创建新会话
   */
  async createConversation(userId: string): Promise<string> {
    const conv = await this.dao.create(userId);
    return conv.id;
  }

  /**
   * 人工客服接管
   */
  async handoverToHuman(
    conversationId: string,
    humanAgentId: string
  ): Promise<void> {
    await this.dao.updateStatus(conversationId, ConversationStatus.ESCALATED);
    await this.dao.addMessage(
      conversationId,
      MessageRole.SYSTEM,
      `已转接人工客服 #${humanAgentId}`
    );
  }

  /**
   * 人工客服发送消息
   */
  async sendHumanReply(
    conversationId: string,
    humanAgentId: string,
    content: string
  ): Promise<void> {
    await this.dao.addMessage(conversationId, MessageRole.HUMAN, content, {
      agentId: humanAgentId,
    });
  }

  /**
   * 关闭会话
   */
  async closeConversation(
    conversationId: string,
    satisfaction?: number
  ): Promise<void> {
    await this.dao.close(conversationId, satisfaction);
  }

  /**
   * 获取会话详情
   */
  async getConversation(conversationId: string) {
    const conv = await this.dao.getById(conversationId);
    if (!conv) return null;

    const messages = await this.dao.getMessages(conversationId);
    return { ...conv, messages };
  }

  private async updateIntent(
    conversationId: string,
    intent: string
  ): Promise<void> {
    // 简化实现，实际应使用 DAO 方法
    // await this.dao.updateIntent(conversationId, intent);
  }
}
```

### Socket.IO 处理 (backend/src/socket/chatSocket.ts)

```typescript
/**
 * Socket.IO 聊天处理
 *
 * 实现实时双向通信的客服聊天。
 */

import { Server as SocketServer } from 'socket.io';
import { Pool } from 'pg';
import { ChatService } from '../services/chatService';
import { ConversationStatus } from '../models/Conversation';

interface ClientInfo {
  userId: string;
  conversationId: string | null;
  isHuman: boolean;
  agentId?: string;
}

export function setupChatSocket(io: SocketServer, pool: Pool): void {
  const chatService = new ChatService(pool);
  const clients = new Map<string, ClientInfo>();

  io.on('connection', (socket) => {
    console.log(`客户端连接: ${socket.id}`);

    // 用户加入
    socket.on('join', async (data: { userId: string; conversationId?: string }) => {
      const { userId } = data;
      let { conversationId } = data;

      // 创建或恢复会话
      if (!conversationId) {
        conversationId = await chatService.createConversation(userId);
      }

      clients.set(socket.id, {
        userId,
        conversationId,
        isHuman: false,
      });

      socket.join(conversationId);
      socket.emit('joined', { conversationId });

      // 发送欢迎消息
      socket.emit('message', {
        id: Date.now().toString(),
        role: 'ai',
        content: '您好！我是智能客服助手，请问有什么可以帮您？',
        timestamp: new Date().toISOString(),
      });
    });

    // 人工客服加入
    socket.on('agent_join', async (data: { agentId: string }) => {
      clients.set(socket.id, {
        userId: data.agentId,
        conversationId: null,
        isHuman: true,
        agentId: data.agentId,
      });

      socket.join('agents');
      socket.emit('agent_ready');

      // 发送待处理会话列表
      const pending = await chatService.getPendingConversations();
      socket.emit('pending_conversations', pending);
    });

    // 用户发送消息
    socket.on('send_message', async (data: { content: string }) => {
      const client = clients.get(socket.id);
      if (!client || !client.conversationId) return;

      const { conversationId } = client;

      // 广播用户消息到房间
      io.to(conversationId).emit('message', {
        id: Date.now().toString(),
        role: 'user',
        content: data.content,
        timestamp: new Date().toISOString(),
      });

      try {
        // 处理消息
        const result = await chatService.handleUserMessage(
          conversationId,
          client.userId,
          data.content
        );

        // 发送 AI 回复
        io.to(conversationId).emit('message', {
          id: Date.now().toString(),
          role: 'ai',
          content: result.reply,
          intent: result.intent,
          timestamp: new Date().toISOString(),
        });

        // 如果需要转人工
        if (result.shouldEscalate) {
          io.to(conversationId).emit('escalate', {
            reason: 'AI 无法处理，需要人工介入',
          });

          // 通知在线客服
          io.to('agents').emit('new_escalation', {
            conversationId,
            userId: client.userId,
            lastMessage: data.content,
          });
        }
      } catch (error) {
        socket.emit('error', {
          message: '消息处理失败，请重试',
        });
      }
    });

    // 人工客服接管
    socket.on('take_over', async (data: { conversationId: string }) => {
      const client = clients.get(socket.id);
      if (!client || !client.isHuman || !client.agentId) return;

      await chatService.handoverToHuman(data.conversationId, client.agentId);

      // 更新客户端信息
      client.conversationId = data.conversationId;
      socket.join(data.conversationId);

      // 通知用户
      io.to(data.conversationId).emit('message', {
        id: Date.now().toString(),
        role: 'system',
        content: `人工客服 #${client.agentId} 已接入`,
        timestamp: new Date().toISOString(),
      });

      // 通知其他客服
      io.to('agents').emit('conversation_taken', {
        conversationId: data.conversationId,
        agentId: client.agentId,
      });
    });

    // 人工客服发送消息
    socket.on('agent_message', async (data: { conversationId: string; content: string }) => {
      const client = clients.get(socket.id);
      if (!client || !client.isHuman || !client.agentId) return;

      await chatService.sendHumanReply(
        data.conversationId,
        client.agentId,
        data.content
      );

      io.to(data.conversationId).emit('message', {
        id: Date.now().toString(),
        role: 'human',
        content: data.content,
        agentId: client.agentId,
        timestamp: new Date().toISOString(),
      });
    });

    // 关闭会话
    socket.on('close_conversation', async (data: { satisfaction?: number }) => {
      const client = clients.get(socket.id);
      if (!client || !client.conversationId) return;

      await chatService.closeConversation(
        client.conversationId,
        data.satisfaction
      );

      io.to(client.conversationId).emit('conversation_closed', {
        satisfaction: data.satisfaction,
      });
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`客户端断开: ${socket.id}`);
      clients.delete(socket.id);
    });
  });
}
```

### 前端聊天组件 (frontend/src/components/ChatWidget.tsx)

```typescript
import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  role: "user" | "ai" | "human" | "system";
  content: string;
  agentId?: string;
  timestamp: string;
}

/**
 * 客服聊天组件
 *
 * 嵌入网页的浮动聊天窗口，支持 AI 和人工客服。
 */
export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [waitingHuman, setWaitingHuman] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 连接 Socket.IO
  useEffect(() => {
    if (!isOpen || socketRef.current) return;

    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      setConnected(true);
      // 加入会话
      const userId = `user_${Date.now()}`;
      socket.emit("join", { userId });
    });

    socket.on("joined", (data: { conversationId: string }) => {
      setConversationId(data.conversationId);
    });

    socket.on("message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("escalate", () => {
      setWaitingHuman(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isOpen]);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current || !connected) return;

    socketRef.current.emit("send_message", { content: input });
    setInput("");
  };

  const closeConversation = (satisfaction?: number) => {
    socketRef.current?.emit("close_conversation", { satisfaction });
    setMessages([]);
    setConversationId(null);
    setWaitingHuman(false);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 聊天窗口 */}
      {isOpen && (
        <div className="w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border">
          {/* 头部 */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <span className="font-medium">
                {waitingHuman ? "等待人工客服..." : "智能客服"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => closeConversation()}
                className="text-white hover:text-gray-200 text-sm"
              >
                结束
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : msg.role === "system"
                      ? "bg-gray-200 text-gray-600 text-center w-full"
                      : msg.role === "human"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.role === "human" && (
                    <div className="text-xs text-green-600 mb-1">
                      人工客服 #{msg.agentId}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 满意度评价 */}
          {messages.length > 0 && messages[messages.length - 1].role === "system" &&
            messages[messages.length - 1].content.includes("已关闭") && (
              <div className="px-4 py-2 bg-gray-50 border-t">
                <p className="text-xs text-gray-500 mb-2">请对本次服务评分：</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => closeConversation(star)}
                      className="text-2xl hover:scale-110 transition-transform"
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* 输入框 */}
          <div className="border-t p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="输入消息..."
              disabled={!connected || waitingHuman}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
            <button
              onClick={sendMessage}
              disabled={!connected || !input.trim() || waitingHuman}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      )}

      {/* 浮动按钮 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center text-2xl"
        >
          💬
        </button>
      )}
    </div>
  );
};
```

---

## 配置文件

### backend/package.json

```json
{
  "name": "ai-customer-service-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.4",
    "pg": "^8.11.3",
    "redis": "^4.6.12",
    "openai": "^4.24.1",
    "uuid": "^9.0.1",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/pg": "^8.10.9",
    "@types/uuid": "^9.0.7",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0"
  }
}
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/aics
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=aics
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 扩展建议

1. **多语言支持**：集成翻译 API，支持多语言客服
2. **语音客服**：添加语音识别和语音合成
3. **情感预警**：实时监测用户情绪，自动升级处理
4. **智能质检**：自动分析客服对话质量
5. **知识库自学习**：从对话中自动提取新知识

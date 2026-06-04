<!--
  文件描述: 智能Agent系统项目完整实战指南，包含需求分析、架构设计、代码实现与部署说明
  作者: AI-PM-Knowledge
  创建日期: 2026-06-04
  最后修改日期: 2026-06-04
-->

# Project04 - Agent系统

> 一个基于 Python + LangChain + React 的智能 Agent 应用，支持任务规划、工具调用、多轮对话和自主执行。

---

## 项目概述

### 功能特性

- **任务规划**：自动分解复杂任务为可执行步骤
- **工具调用**：支持搜索引擎、计算器、天气查询等工具
- **记忆管理**：短期对话记忆 + 长期知识存储
- **多轮对话**：上下文感知的连续交互
- **自主执行**：根据规划自动调用工具完成任务
- **可视化**：Agent 思考过程可视化展示

### 技术栈

```
Agent框架: LangChain + LangGraph
LLM: OpenAI GPT-4 / Claude
前端: React 18 + TypeScript + Monaco Editor
后端: Python 3.10 + FastAPI
记忆: Redis (短期) + PostgreSQL (长期)
部署: Docker Compose
```

---

## 项目结构

```
Project04-Agent系统/
├── README.md
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── agent/
│   │   │   ├── __init__.py
│   │   │   ├── core.py           # Agent 核心逻辑
│   │   │   ├── graph.py          # LangGraph 工作流
│   │   │   ├── tools.py          # 工具定义
│   │   │   └── memory.py         # 记忆管理
│   │   ├── models/
│   │   │   └── schemas.py        # 数据模型
│   │   └── api/
│   │       └── routes.py         # API 路由
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AgentChat.tsx     # Agent 聊天界面
    │   │   ├── ThoughtChain.tsx  # 思考链展示
    │   │   └── ToolPanel.tsx     # 工具面板
    │   └── services/
    │       └── agentApi.ts
    └── package.json
```

---

## 核心代码实现

### Agent 核心逻辑 (backend/app/agent/core.py)

```python
"""
Agent 核心模块

实现 ReAct (Reasoning + Acting) 范式的智能 Agent。
"""

from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from app.agent.tools import get_tools
from app.agent.memory import MemoryManager


class AgentState(TypedDict):
    """Agent 状态定义"""
    messages: Annotated[Sequence[BaseMessage], "对话消息列表"]
    next_step: Annotated[str, "下一步动作"]
    tool_calls: Annotated[list, "工具调用记录"]


class ReActAgent:
    """
    ReAct Agent 实现

    结合推理(Reasoning)和行动(Acting)，通过迭代思考-行动-观察循环解决问题。
    """

    def __init__(self, model_name: str = "gpt-4", temperature: float = 0.1):
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=temperature,
        )
        self.tools = get_tools()
        self.memory = MemoryManager()
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """构建 LangGraph 工作流"""
        workflow = StateGraph(AgentState)

        # 添加节点
        workflow.add_node("think", self._think)
        workflow.add_node("act", self._act)
        workflow.add_node("observe", self._observe)

        # 添加边
        workflow.set_entry_point("think")
        workflow.add_edge("think", "act")
        workflow.add_edge("act", "observe")
        workflow.add_conditional_edges(
            "observe",
            self._should_continue,
            {
                "continue": "think",
                "end": END,
            },
        )

        return workflow.compile()

    def _think(self, state: AgentState) -> AgentState:
        """
        思考节点：分析当前状态，决定下一步行动
        """
        messages = list(state["messages"])

        # 构建系统提示
        system_prompt = """你是一个智能助手，通过思考和使用工具来解决问题。

可用工具：
{tools}

请按以下格式思考：
1. 分析：当前情况分析
2. 计划：下一步行动计划
3. 行动：选择工具或直接回答

如果需要使用工具，请明确说明工具名称和参数。""".format(
            tools="\n".join([f"- {t.name}: {t.description}" for t in self.tools])
        )

        # 调用 LLM 思考
        response = self.llm.invoke(
            [("system", system_prompt)] + messages
        )

        messages.append(AIMessage(content=response.content))

        return {
            **state,
            "messages": messages,
            "next_step": "act",
        }

    def _act(self, state: AgentState) -> AgentState:
        """
        行动节点：执行工具调用
        """
        messages = list(state["messages"])
        last_message = messages[-1]

        tool_calls = list(state.get("tool_calls", []))

        # 解析工具调用意图（简化实现，实际应使用结构化输出）
        for tool in self.tools:
            if tool.name in last_message.content:
                try:
                    # 提取参数（简化处理）
                    result = tool.run(last_message.content)
                    tool_calls.append({
                        "tool": tool.name,
                        "result": result,
                    })
                    messages.append(ToolMessage(
                        content=str(result),
                        tool_call_id=tool.name,
                    ))
                except Exception as e:
                    messages.append(ToolMessage(
                        content=f"工具调用失败: {str(e)}",
                        tool_call_id=tool.name,
                    ))

        return {
            **state,
            "messages": messages,
            "tool_calls": tool_calls,
        }

    def _observe(self, state: AgentState) -> AgentState:
        """
        观察节点：处理工具执行结果
        """
        # 观察结果已在 act 节点添加到消息中
        return {
            **state,
            "next_step": "think",
        }

    def _should_continue(self, state: AgentState) -> str:
        """
        判断是否应该继续循环

        Returns:
            "continue" 继续迭代，"end" 结束
        """
        messages = state["messages"]
        last_message = messages[-1]

        # 如果最后一条是 AI 消息且没有工具调用意图，结束
        if isinstance(last_message, AIMessage):
            has_tool_intent = any(
                t.name in last_message.content for t in self.tools
            )
            if not has_tool_intent:
                return "end"

        # 限制最大迭代次数
        if len(state.get("tool_calls", [])) > 10:
            return "end"

        return "continue"

    async def run(self, query: str, session_id: str = "default") -> dict:
        """
        运行 Agent

        Args:
            query: 用户查询
            session_id: 会话 ID

        Returns:
            执行结果，包含回答和思考过程
        """
        # 加载历史记忆
        history = await self.memory.get_history(session_id)

        # 初始化状态
        initial_state: AgentState = {
            "messages": history + [HumanMessage(content=query)],
            "next_step": "think",
            "tool_calls": [],
        }

        # 执行工作流
        result = await self.graph.ainvoke(initial_state)

        # 提取最终回答
        final_answer = ""
        for msg in reversed(result["messages"]):
            if isinstance(msg, AIMessage) and not any(
                t.name in msg.content for t in self.tools
            ):
                final_answer = msg.content
                break

        # 保存记忆
        await self.memory.save(session_id, result["messages"])

        return {
            "answer": final_answer,
            "thought_process": [
                {"role": type(m).__name__, "content": m.content}
                for m in result["messages"]
            ],
            "tool_calls": result["tool_calls"],
        }
```

### 工具定义 (backend/app/agent/tools.py)

```python
"""
工具定义模块

定义 Agent 可调用的外部工具。
"""

import json
import math
from typing import Any
from langchain_core.tools import BaseTool, tool


@tool
def search_web(query: str) -> str:
    """
    网络搜索工具

    Args:
        query: 搜索关键词

    Returns:
        搜索结果摘要
    """
    # 实际实现应调用搜索引擎 API（如 SerpAPI、Bing API）
    # 这里使用模拟数据演示
    return f"[模拟搜索结果] 关于 '{query}' 的搜索结果：\n1. 相关网页1\n2. 相关网页2\n3. 相关网页3"


@tool
def calculator(expression: str) -> str:
    """
    计算器工具

    Args:
        expression: 数学表达式，如 "2 + 2 * 3"

    Returns:
        计算结果
    """
    try:
        # 安全计算：只允许基本数学运算
        allowed_names = {
            "sqrt": math.sqrt,
            "pow": math.pow,
            "abs": abs,
            "round": round,
            "max": max,
            "min": min,
        }
        result = eval(expression, {"__builtins__": {}}, allowed_names)
        return f"计算结果: {result}"
    except Exception as e:
        return f"计算错误: {str(e)}"


@tool
def get_weather(city: str) -> str:
    """
    天气查询工具

    Args:
        city: 城市名称

    Returns:
        天气信息
    """
    # 实际实现应调用天气 API
    return f"[模拟天气] {city} 今天天气晴朗，气温 25°C，适宜出行。"


@tool
def get_current_time() -> str:
    """
    获取当前时间

    Returns:
        当前时间字符串
    """
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


@tool
def code_interpreter(code: str, language: str = "python") -> str:
    """
    代码解释器

    Args:
        code: 代码内容
        language: 编程语言

    Returns:
        执行结果或错误信息
    """
    if language != "python":
        return f"暂不支持 {language} 语言"

    try:
        # 使用受限环境执行代码（生产环境应使用沙箱）
        import io
        import sys

        stdout = io.StringIO()
        sys.stdout = stdout

        exec(code, {"__builtins__": {}}, {})

        sys.stdout = sys.__stdout__
        output = stdout.getvalue()

        return output or "代码执行完成，无输出"
    except Exception as e:
        return f"执行错误: {str(e)}"


def get_tools() -> list[BaseTool]:
    """获取所有可用工具"""
    return [
        search_web,
        calculator,
        get_weather,
        get_current_time,
        code_interpreter,
    ]
```

### 记忆管理 (backend/app/agent/memory.py)

```python
"""
记忆管理模块

实现短期和长期记忆存储。
"""

import json
from typing import List
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
import redis.asyncio as redis


class MemoryManager:
    """
    记忆管理器

    使用 Redis 存储短期对话历史，支持会话隔离。
    """

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.max_history = 20  # 最大保留消息数

    def _serialize_message(self, msg: BaseMessage) -> dict:
        """序列化消息"""
        return {
            "type": type(msg).__name__,
            "content": msg.content,
            "additional_kwargs": msg.additional_kwargs,
        }

    def _deserialize_message(self, data: dict) -> BaseMessage:
        """反序列化消息"""
        msg_type = data["type"]
        content = data["content"]

        if msg_type == "HumanMessage":
            return HumanMessage(content=content)
        elif msg_type == "AIMessage":
            return AIMessage(content=content)
        elif msg_type == "ToolMessage":
            return ToolMessage(
                content=content,
                tool_call_id=data.get("additional_kwargs", {}).get("tool_call_id", ""),
            )
        else:
            return BaseMessage(content=content)

    async def save(self, session_id: str, messages: List[BaseMessage]) -> None:
        """
        保存对话历史

        Args:
            session_id: 会话 ID
            messages: 消息列表
        """
        key = f"agent:session:{session_id}"

        # 只保留最近的消息
        trimmed = messages[-self.max_history:]
        data = [self._serialize_message(m) for m in trimmed]

        await self.redis.setex(key, 86400, json.dumps(data))  # 24小时过期

    async def get_history(self, session_id: str) -> List[BaseMessage]:
        """
        获取对话历史

        Args:
            session_id: 会话 ID

        Returns:
            消息列表
        """
        key = f"agent:session:{session_id}"
        data = await self.redis.get(key)

        if not data:
            return []

        messages = json.loads(data)
        return [self._deserialize_message(m) for m in messages]

    async def clear(self, session_id: str) -> None:
        """清空会话历史"""
        key = f"agent:session:{session_id}"
        await self.redis.delete(key)
```

### API 路由 (backend/app/api/routes.py)

```python
"""
Agent API 路由

提供 Agent 交互的 RESTful API。
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from app.agent.core import ReActAgent

router = APIRouter(prefix="/agent", tags=["Agent"])

# 全局 Agent 实例
agent = ReActAgent()


class ChatRequest(BaseModel):
    """聊天请求"""
    query: str = Field(..., min_length=1, description="用户输入")
    session_id: str = Field("default", description="会话标识")


class ChatResponse(BaseModel):
    """聊天响应"""
    answer: str = Field(..., description="Agent 回答")
    thought_process: list[dict] = Field(..., description="思考过程")
    tool_calls: list[dict] = Field(..., description="工具调用记录")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    发送消息与 Agent 对话
    """
    result = await agent.run(
        query=request.query,
        session_id=request.session_id,
    )
    return ChatResponse(**result)


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket 实时对话

    提供流式的 Agent 响应。
    """
    await websocket.accept()

    try:
        while True:
            # 接收用户消息
            data = await websocket.receive_json()
            query = data.get("query", "")

            if not query:
                continue

            # 发送思考开始标记
            await websocket.send_json({
                "type": "thinking",
                "content": "开始思考...",
            })

            # 执行 Agent
            result = await agent.run(query, session_id)

            # 发送思考过程
            for step in result["thought_process"]:
                await websocket.send_json({
                    "type": "step",
                    "role": step["role"],
                    "content": step["content"][:500],  # 截断长内容
                })

            # 发送最终回答
            await websocket.send_json({
                "type": "answer",
                "content": result["answer"],
            })

            # 发送工具调用信息
            if result["tool_calls"]:
                await websocket.send_json({
                    "type": "tools",
                    "calls": result["tool_calls"],
                })

    except WebSocketDisconnect:
        print(f"WebSocket 断开: {session_id}")
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "content": str(e),
        })
        await websocket.close()
```

### 前端 Agent 聊天组件 (frontend/src/components/AgentChat.tsx)

```typescript
import React, { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
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
 * Agent 聊天界面组件
 *
 * 支持 WebSocket 实时通信，展示 Agent 思考过程。
 */
export const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`session_${Date.now()}`);

  // 连接 WebSocket
  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:8000/api/v1/agent/ws/${sessionId.current}`
    );

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    wsRef.current = ws;

    return () => ws.close();
  }, []);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleWebSocketMessage = (data: any) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];

      switch (data.type) {
        case "thinking":
          // 添加或更新思考中消息
          if (last?.role === "assistant" && last?.content === "思考中...") {
            return prev;
          }
          return [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: "思考中...",
              steps: [],
            },
          ];

        case "step":
          // 添加思考步骤
          if (last?.role === "assistant") {
            const updated = { ...last };
            updated.steps = [...(updated.steps || []), data];
            return [...prev.slice(0, -1), updated];
          }
          return prev;

        case "answer":
          // 更新最终回答
          if (last?.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              { ...last, content: data.content },
            ];
          }
          return prev;

        case "tools":
          // 添加工具调用记录
          if (last?.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              { ...last, tools: data.calls },
            ];
          }
          return prev;

        default:
          return prev;
      }
    });
  };

  const sendMessage = useCallback(() => {
    if (!input.trim() || !wsRef.current || !connected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    wsRef.current.send(JSON.stringify({ query: input }));
    setInput("");
  }, [input, connected]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">AI Agent</h1>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-500">
            {connected ? "已连接" : "未连接"}
          </span>
        </div>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border shadow-sm"
              }`}
            >
              {/* 消息内容 */}
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* 思考过程 */}
              {msg.steps && msg.steps.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    思考过程:
                  </p>
                  <div className="space-y-2">
                    {msg.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="text-xs p-2 bg-gray-50 rounded"
                      >
                        <span className="font-medium text-blue-600">
                          {step.role}
                        </span>
                        <p className="text-gray-600 mt-1 line-clamp-3">
                          {step.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 工具调用 */}
              {msg.tools && msg.tools.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    工具调用:
                  </p>
                  <div className="space-y-1">
                    {msg.tools.map((tool, idx) => (
                      <div
                        key={idx}
                        className="text-xs p-2 bg-green-50 text-green-700 rounded"
                      >
                        <span className="font-medium">{tool.tool}</span>
                        <span className="ml-2 text-green-600">✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="输入任务或问题..."
            disabled={!connected}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            onClick={sendMessage}
            disabled={!connected || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 配置文件

### backend/requirements.txt

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6
pydantic-settings==2.1.0
langchain==0.1.0
langchain-openai==0.0.5
langgraph==0.0.20
redis==5.0.1
websockets==12.0
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

---

## 扩展建议

1. **工具扩展**：添加数据库查询、API 调用、邮件发送等工具
2. **多 Agent 协作**：实现 Agent 之间的任务委派
3. **计划执行分离**：引入 Plan-and-Execute 模式
4. **人机协作**：关键步骤请求人工确认
5. **A2A 协议**：支持与其他 Agent 系统互操作

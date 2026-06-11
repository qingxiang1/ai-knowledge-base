<!--
  创建时间: 2026-06-03
  文件名: Streaming.md
  文件描述: 流式输出详解，补充企业级交互、性能治理与验收清单
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# 流式输出详解

> 流式输出（Streaming）让AI响应像打字一样逐字呈现，显著提升用户体验和感知速度，是现代AI应用的核心交互模式

---

## 零、前置知识

阅读本节前，建议先了解以下内容：

| 前置章节 | 关联点 |
|---------|-------|
| [LLM工作原理](../02-AI基础知识/LLM工作原理.md) | 理解流式输出的技术本质——模型逐 Token 生成 |
| [Token机制](../02-AI基础知识/Token机制.md) | 流式输出是逐 Token 推送，理解 Token 才能理解流式 |
| [OpenAI_API](./OpenAI_API.md) | OpenAI 的 stream=True 参数是流式输出的入口 |
| [Claude_API](./Claude_API.md) | Claude 的 messages.stream() 是另一种流式实现 |
| [FunctionCalling](./FunctionCalling.md) | 流式输出中处理 tool_calls 分片的技巧 |

---

## 本章学习目标

完成本节后，你应该能够：

- 解释流式输出的协议基础、用户价值和工程代价
- 设计前端渲染、服务端转发、断连恢复和中断机制
- 比较 OpenAI、Claude、Gemini、DeepSeek 的流式实现差异
- 定义流式交互的核心指标，如 TTFT、完成时长、中断率和失败率
- 输出一份适用于生产环境的 Streaming 设计方案

## 一、核心概念

### 1.1 为什么需要流式输出

```
流式输出 vs 非流式输出：

非流式输出（Blocking）
用户提问 → 等待5-10秒 → 一次性看到完整回答
├── 用户感知：漫长等待，不确定是否在工作
├── 体验问题：焦虑、容易中断、超时风险
└── 适用场景：短文本、对延迟不敏感

流式输出（Streaming）
用户提问 → 200ms看到第一个字 → 逐字呈现完整回答
├── 用户感知：即时反馈，像真人打字
├── 体验优势：
│   ├── 降低感知等待时间（首token延迟）
│   ├── 提供进度反馈（用户知道AI在工作）
│   ├── 支持早期中断（不需要可停止）
│   └── 增强交互感（更像对话）
└── 适用场景：长文本、对话应用、实时交互

技术本质：
├── 服务端：使用SSE（Server-Sent Events）推送数据
├── 客户端：逐块接收并渲染
└── 协议：HTTP长连接 + text/event-stream
```

### 1.2 SSE 协议基础

```
SSE (Server-Sent Events) 协议：

HTTP 请求头：
GET /v1/chat/completions HTTP/1.1
Accept: text/event-stream          ← 关键头
Cache-Control: no-cache
Connection: keep-alive

HTTP 响应头：
HTTP/1.1 200 OK
Content-Type: text/event-stream    ← 关键头
Cache-Control: no-cache
Connection: keep-alive

数据格式：
data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n
data: {"choices":[{"delta":{"content":" world"}}]}\n\n
data: [DONE]\n\n

关键特征：
├── 单向通信：服务端→客户端
├── 文本格式：每行以data:开头
├── 事件分隔：空行(\n\n)分隔不同事件
├── 自动重连：浏览器内置断线重连
└── 轻量级：比WebSocket更简单
```

---

## 二、多平台流式实现

### 2.1 OpenAI

```python
"""
OpenAI 流式输出实现
"""

from openai import OpenAI

client = OpenAI()

# 基础流式调用
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "请写一首关于春天的诗"}],
    stream=True  # 启用流式输出
)

# 处理流式响应
full_response = ""
for chunk in response:
    # chunk 结构：
    # ChatCompletionChunk(
    #   id='chatcmpl-xxx',
    #   choices=[Choice(delta=ChoiceDelta(content='春'), index=0)],
    #   created=1234567890,
    #   model='gpt-4o'
    # )
    
    if chunk.choices[0].delta.content:
        content = chunk.choices[0].delta.content
        full_response += content
        print(content, end="", flush=True)

print(f"\n\n完整响应：{full_response}")

# 流式 + 工具调用
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "北京天气"}],
    tools=tools,
    stream=True
)

tool_calls_buffer = {}
for chunk in response:
    delta = chunk.choices[0].delta
    
    # 处理文本
    if delta.content:
        print(delta.content, end="", flush=True)
    
    # 累积工具调用（流式中tool_calls也是分片的）
    if delta.tool_calls:
        for tc in delta.tool_calls:
            index = tc.index
            if index not in tool_calls_buffer:
                tool_calls_buffer[index] = {"id": "", "function": {"name": "", "arguments": ""}}
            
            if tc.id:
                tool_calls_buffer[index]["id"] += tc.id
            if tc.function.name:
                tool_calls_buffer[index]["function"]["name"] += tc.function.name
            if tc.function.arguments:
                tool_calls_buffer[index]["function"]["arguments"] += tc.function.arguments

# 检查是否有工具调用
if tool_calls_buffer:
    print("\n[检测到工具调用请求]")
```

### 2.2 Claude

```python
"""
Claude 流式输出实现
"""

from anthropic import Anthropic

client = Anthropic()

# 流式调用
with client.messages.stream(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "请写一首关于春天的诗"}]
) as stream:
    
    full_response = ""
    
    for text in stream.text_stream:
        # text 是增量文本
        full_response += text
        print(text, end="", flush=True)
    
    # 获取最终消息对象
    final_message = stream.get_final_message()
    print(f"\n\n总token消耗：{final_message.usage}")

# 流式事件处理（更细粒度）
with client.messages.stream(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "北京天气"}],
    tools=tools
) as stream:
    
    for event in stream:
        if event.type == "content_block_delta":
            if event.delta.type == "text_delta":
                print(event.delta.text, end="", flush=True)
            elif event.delta.type == "input_json_delta":
                # 工具调用的JSON参数片段
                print(f"[工具参数: {event.delta.partial_json}]", end="")
        
        elif event.type == "content_block_stop":
            print("\n[内容块结束]")
        
        elif event.type == "message_stop":
            print("\n[消息结束]")
```

### 2.3 Gemini

```python
"""
Gemini 流式输出实现
"""

import google.generativeai as genai

model = genai.GenerativeModel('gemini-1.5-pro')

# 流式生成
response = model.generate_content(
    "请写一首关于春天的诗",
    stream=True  # 启用流式
)

full_response = ""
for chunk in response:
    # chunk.text 包含增量文本
    if chunk.text:
        full_response += chunk.text
        print(chunk.text, end="", flush=True)

# 流式对话
chat = model.start_chat()
response = chat.send_message("请写一首关于春天的诗", stream=True)

for chunk in response:
    print(chunk.text, end="", flush=True)
```

### 2.4 DeepSeek

```python
"""
DeepSeek 流式输出实现（兼容OpenAI格式）
"""

from openai import OpenAI

client = OpenAI(
    api_key="sk-xxx",
    base_url="https://api.deepseek.com"
)

# 流式调用（与OpenAI完全一致）
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "请写一首关于春天的诗"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)

# R1推理模型的流式输出（包含reasoning_content）
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=[{"role": "user", "content": "解方程 2x+5=13"}],
    stream=True
)

reasoning_content = ""
content = ""

for chunk in response:
    delta = chunk.choices[0].delta
    
    # 推理过程（流式）
    if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
        reasoning_content += delta.reasoning_content
        print(f"[思考: {delta.reasoning_content}]", end="", flush=True)
    
    # 最终答案（流式）
    if delta.content:
        content += delta.content
        print(delta.content, end="", flush=True)
```

---

## 三、前端渲染实现

### 3.1 原生 JavaScript

```javascript
/**
 * 前端流式输出实现（原生JS）
 */

// 方式1：使用 EventSource（SSE原生支持）
function streamWithEventSource() {
    const eventSource = new EventSource('/api/chat?message=你好');
    const outputElement = document.getElementById('output');
    
    eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
            eventSource.close();
            return;
        }
        
        const data = JSON.parse(event.data);
        const content = data.choices[0].delta.content;
        
        if (content) {
            outputElement.textContent += content;
            // 或插入HTML（注意XSS防护）
            // outputElement.innerHTML += escapeHtml(content);
        }
    };
    
    eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
    };
}

// 方式2：使用 Fetch + ReadableStream（更灵活）
async function streamWithFetch() {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: '你好',
            stream: true
        })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const outputElement = document.getElementById('output');
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // 处理SSE格式数据
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                    console.log('Stream completed');
                    return;
                }
                
                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices[0].delta.content;
                    if (content) {
                        outputElement.textContent += content;
                        // 自动滚动到底部
                        outputElement.scrollTop = outputElement.scrollHeight;
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                }
            }
        }
    }
}

// 方式3：使用 AbortController 支持中断
async function streamWithAbort() {
    const controller = new AbortController();
    
    // 用户点击停止按钮时调用
    document.getElementById('stop-btn').onclick = () => {
        controller.abort();
    };
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '你好' }),
            signal: controller.signal
        });
        
        // ... 处理流式响应
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('用户中断了请求');
        } else {
            console.error('Error:', error);
        }
    }
}
```

### 3.2 React 实现

```tsx
/**
 * React 流式输出组件
 */

import React, { useState, useCallback, useRef } from 'react';

interface StreamMessageProps {
  apiEndpoint: string;
}

export const StreamMessage: React.FC<StreamMessageProps> = ({ apiEndpoint }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    
    setIsStreaming(true);
    setOutput('');
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, stream: true }),
        signal: controller.signal
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) return;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                setOutput(prev => prev + content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setOutput(prev => prev + '\n\n[已停止]');
      } else {
        setOutput(prev => prev + '\n\n[发生错误]');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [input, isStreaming, apiEndpoint]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return (
    <div className="stream-container">
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="输入消息..."
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button onClick={handleStop}>停止</button>
        ) : (
          <button onClick={handleSubmit}>发送</button>
        )}
      </div>
      
      <div className="output-area">
        <pre>{output}</pre>
        {isStreaming && <span className="cursor">▊</span>}
      </div>
    </div>
  );
};

// 自定义Hook封装
export function useStreamingChat(apiEndpoint: string) {
  const [messages, setMessages] = useState<Array<{role: string; content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    
    // 添加用户消息
    const userMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    
    // 添加空的助手消息（用于流式填充）
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
    const controller = new AbortController();
    abortRef.current = controller;
    
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage], stream: true }),
        signal: controller.signal
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) return;
      
      let assistantContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantContent
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // 忽略
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Streaming error:', error);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, apiEndpoint]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, sendMessage, stop, isLoading };
}
```

---

## 四、服务端实现

### 4.1 Python FastAPI

```python
"""
FastAPI 流式输出服务端实现
"""

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from openai import OpenAI
import json
import asyncio

app = FastAPI()
client = OpenAI()

@app.post("/api/chat")
async def chat_stream(request: dict):
    """流式聊天接口"""
    message = request.get("message", "")
    
    async def generate():
        """生成SSE流"""
        stream = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": message}],
            stream=True
        )
        
        for chunk in stream:
            data = {
                "id": chunk.id,
                "choices": [{
                    "delta": {
                        "content": chunk.choices[0].delta.content or ""
                    },
                    "index": 0
                }]
            }
            
            # SSE格式：data: {...}\n\n
            yield f"data: {json.dumps(data)}\n\n"
        
        # 结束标记
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

# 带鉴权和错误处理的完整版本
@app.post("/api/chat/v2")
async def chat_stream_v2(request: dict):
    """生产级流式聊天接口"""
    
    async def event_generator():
        try:
            stream = client.chat.completions.create(
                model="gpt-4o",
                messages=request.get("messages", []),
                stream=True,
                max_tokens=4096
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    data = {
                        "choices": [{
                            "delta": {"content": chunk.choices[0].delta.content},
                            "finish_reason": chunk.choices[0].finish_reason
                        }]
                    }
                    yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            error_data = {"error": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用Nginx缓冲
        }
    )
```

### 4.2 Node.js Express

```javascript
/**
 * Express 流式输出服务端实现
 */

const express = require('express');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());

const openai = new OpenAI();

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    
    // 设置SSE头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: message }],
            stream: true
        });
        
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            
            if (content) {
                const data = JSON.stringify({
                    choices: [{
                        delta: { content },
                        index: 0
                    }]
                });
                
                res.write(`data: ${data}\n\n`);
            }
        }
        
        res.write('data: [DONE]\n\n');
        res.end();
        
    } catch (error) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// 支持客户端中断
app.post('/api/chat-v2', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const abortController = new AbortController();
    
    // 客户端断开连接时中止
    req.on('close', () => {
        abortController.abort();
    });
    
    try {
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: req.body.messages,
            stream: true
        }, {
            signal: abortController.signal
        });
        
        for await (const chunk of stream) {
            if (abortController.signal.aborted) break;
            
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
            }
        }
        
        if (!abortController.signal.aborted) {
            res.write('data: [DONE]\n\n');
        }
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        }
    } finally {
        res.end();
    }
});
```

---

## 五、性能优化

```
流式输出性能优化策略：

服务端优化：
├── 连接保持
│   ├── HTTP/2 或 HTTP/1.1 keep-alive
│   ├── 禁用代理缓冲（X-Accel-Buffering: no）
│   └── 合理的超时设置
├── 缓冲策略
│   ├── 服务端不过度缓冲（立即发送）
│   ├── 但避免过小的chunk（合并小片段）
│   └── 平衡延迟和带宽
└── 并发控制
    ├── 限制单用户并发流数
    ├── 连接池管理
    └── 优雅降级（非流式兜底）

客户端优化：
├── 渲染优化
│   ├── 使用 requestAnimationFrame 批量更新DOM
│   ├── 虚拟滚动（长文本场景）
│   └── 避免频繁setState（React）
├── 网络优化
│   ├── 压缩传输（gzip/brotli）
│   ├── CDN加速（静态资源）
│   └── 预连接（dns-prefetch, preconnect）
└── 体验优化
    ├── 首字延迟优化（TTFB）
    ├── 打字机效果（光标动画）
    └── 平滑滚动

关键指标：
├── TTFB (Time To First Byte)：首字节时间 < 500ms
├── TTF Token：首token时间 < 1s
├── 流畅度：无卡顿、无跳字
└── 完整性：不丢字、不乱序
```

---

## 六、AI产品经理关注点

```
流式输出产品化要点：

用户体验设计：
├── 视觉反馈
│   ├── 打字机效果（逐字显示）
│   ├── 光标闪烁（表示正在输出）
│   ├── 代码块语法高亮（流式中实时渲染）
│   └── Markdown实时解析
├── 交互控制
│   ├── 停止按钮（随时中断）
│   ├── 重新生成（快速重试）
│   ├── 复制按钮（复制完整内容）
│   └── 点赞/点踩（反馈质量）
└── 异常处理
    ├── 网络中断提示
    ├── 自动重连机制
    ├── 部分结果保留
    └── 错误友好提示

产品设计决策：
├── 是否默认流式
│   ├── 对话场景：默认流式
│   ├── API调用：可选流式
│   └── 批量处理：非流式
├── 流式粒度
│   ├── 字级别（最流畅）
│   ├── 词级别（平衡）
   └── 句级别（减少更新频率）
└── 特殊内容处理
    ├── 代码块：整段显示 vs 逐行显示
    ├── 表格：完整渲染 vs 逐行渲染
    └── 图片：占位符 → 加载完成替换

技术选型：
├── 协议选择
│   ├── SSE：简单、单向、自动重连
│   ├── WebSocket：双向、复杂
│   └── 长轮询：兼容性好、效率低
└── 框架选择
    ├── 前端：原生EventSource / fetch
    ├── React：自定义Hook封装
    └── 服务端：FastAPI / Express / Go
```

---

## 七、企业级设计模板

### 7.1 Streaming 设计检查表

| 设计项 | 关键问题 | 输出物 |
| ------ | -------- | ------ |
| 协议选择 | 用 SSE、WebSocket 还是服务端代理流？ | 传输方案 |
| 前端体验 | 首字展示、打字效果、中断、重连如何设计？ | 交互流程 |
| 服务端治理 | 超时、断流、心跳、限流如何处理？ | 服务端策略 |
| 指标监控 | 监控 TTFT、完成时长、断流率、取消率吗？ | 指标清单 |
| 容错兜底 | 流式失败时如何切回非流式或短回复？ | 降级方案 |

### 7.2 流式链路字段建议

```json
{
  "transport": "sse",
  "ttft_target_ms": 800,
  "stream_timeout_ms": 30000,
  "allow_user_cancel": true,
  "fallback_mode": "non_streaming_summary",
  "metrics": ["ttft", "completion_time", "disconnect_rate", "cancel_rate"]
}
```

---

## 八、常见误区补充

| 误区 | 问题 | 正确做法 |
| ---- | ---- | -------- |
| 只实现后端流式，不做前端状态设计 | 用户体验依然差 | 联动设计首字反馈、取消和失败提示 |
| 流式一定更快 | 只改善感知速度，不一定降低总耗时 | 同时监控 TTFT 与完整响应时长 |
| 忽略断流场景 | 网络波动下体验断裂 | 增加重连、重试和降级策略 |
| 工具调用时还强行逐字渲染 | 中途状态混乱 | 区分思考中、调用中、输出中三种状态 |
| 不记录中断指标 | 无法判断真实体验 | 统计取消率、断开率和异常结束率 |

---

## 九、阶段验收标准

- [ ] 能完成一种主流流式协议的接入与前端渲染
- [ ] 能设计断流、超时、中断和回退机制
- [ ] 能说明流式输出与工具调用、Token 计费之间的关系
- [ ] 能输出一份可上线的 Streaming 交互与性能治理方案

---

## 十、版本记录

- **2026-06-05** 补充文件头、学习目标、企业级设计模板、常见误区补充与阶段验收标准
- **2026-06-03** 初版完成，涵盖 SSE、多平台流式实现、前端渲染与性能优化

---

## 十一、参考资源

### 相关章节

| 章节 | 关联说明 |
|------|---------|
| [OpenAI_API](./OpenAI_API.md) | OpenAI stream=True 的参数和响应格式 |
| [Claude_API](./Claude_API.md) | Claude messages.stream() 和事件类型 |
| [Gemini_API](./Gemini_API.md) | Gemini 的流式生成实现 |
| [DeepSeek_API](./DeepSeek_API.md) | R1 推理模型的流式 reasoning_content |
| [FunctionCalling](./FunctionCalling.md) | 流式输出中累积 tool_calls 分片的技巧 |
| [Token管理](./Token管理.md) | 流式输出的 Token 计费和首 Token 延迟指标 |
| [成本优化](./成本优化.md) | 流式输出对成本的影响和优化策略 |

### 外部资源

- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [OpenAI Streaming Guide](https://platform.openai.com/docs/api-reference/streaming)
- [FastAPI StreamingResponse](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)
- [React Streaming Patterns](https://react.dev/reference/react/useTransition)

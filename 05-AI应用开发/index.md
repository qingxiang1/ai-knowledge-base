<!--
  文件描述: 05-AI应用开发章节目录页，汇总所有子章节入口
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# 05 - AI 应用开发

> 本章系统讲解 AI 应用开发的核心技术栈，从主流大模型 API 接入、函数调用与工具编排，到流式输出、Token 管理与成本优化，帮助开发者构建生产级 AI 应用。

---

## 章节导航

| 序号 | 文档 | 核心内容 |
|------|------|----------|
| 1 | [OpenAI_API.md](./OpenAI_API.md) | GPT-4o / GPT-4o-mini / DALL·E / Whisper / Embeddings 接入与最佳实践 |
| 2 | [Claude_API.md](./Claude_API.md) | Claude 3.5 Sonnet / Messages API / Vision / Tool Use / Computer Use |
| 3 | [Gemini_API.md](./Gemini_API.md) | Gemini 1.5 Pro / Flash / 多模态 / Grounding / Function Calling |
| 4 | [DeepSeek_API.md](./DeepSeek_API.md) | DeepSeek-V3 / R1 推理模型 / JSON Mode / 函数调用与成本优势 |
| 5 | [FunctionCalling.md](./FunctionCalling.md) | 函数调用核心概念、多平台实现差异、高级模式与最佳实践 |
| 6 | [ToolCalling.md](./ToolCalling.md) | 工具类型体系、Tool Registry、ReAct / Plan-and-Execute Agent、MCP、工作流引擎 |
| 7 | [Streaming.md](./Streaming.md) | SSE 协议、多平台流式实现、前端渲染、服务端架构与性能优化 |
| 8 | [Token管理.md](./Token管理.md) | Token 分词原理、计算实战、上下文窗口管理、使用监控与告警 |
| 9 | [成本优化.md](./成本优化.md) | 成本构成分析、分层模型架构、缓存策略、批处理与提示词优化 |

---

## 学习路径建议

```
入门路径（快速上手）
├── 1. OpenAI_API.md / DeepSeek_API.md（选其一熟悉基础调用）
├── 2. Streaming.md（掌握流式输出，提升用户体验）
├── 3. FunctionCalling.md（让模型具备外部能力）
└── 4. Token管理.md（理解计费与上下文限制）

进阶路径（生产级应用）
├── 1. 完整阅读所有 API 文档（对比各平台差异）
├── 2. ToolCalling.md（构建复杂 Agent 系统）
├── 3. 成本优化.md（系统性降本增效）
└── 4. 结合实际项目反复迭代

架构师路径（深度设计）
├── 1. 全章通读，建立完整技术图谱
├── 2. 重点研究 Agent 架构与 MCP 协议
├── 3. 设计企业级成本监控与模型路由体系
└── 4. 关注前沿：多模态、实时交互、边缘部署
```

---

## 核心能力矩阵

```
能力维度              涉及文档
─────────────────────────────────────────
API 接入与鉴权        OpenAI / Claude / Gemini / DeepSeek
流式交互体验          Streaming
工具与外部系统集成    FunctionCalling / ToolCalling
上下文与记忆管理      Token管理
成本控制与优化        成本优化 / Token管理
Agent 与工作流设计    ToolCalling
多模态处理           OpenAI / Claude / Gemini
```

---

## 关键术语速查

| 术语 | 说明 |
|------|------|
| **Token** | 模型处理文本的最小单位，直接影响计费与上下文长度 |
| **Streaming** | 流式输出，逐字返回模型响应，降低用户感知等待 |
| **Function Calling** | 模型识别需要调用的外部函数并生成参数 |
| **Tool Use / Tool Calling** | 更广义的工具调用体系，支持多轮、并行、Agent 编排 |
| **ReAct** | Reasoning + Acting 的 Agent 架构，交替推理与行动 |
| **MCP** | Model Context Protocol，标准化模型与外部工具的连接协议 |
| **SSE** | Server-Sent Events，流式输出的底层传输协议 |
| **TTFB / TTF Token** | 首字节时间 / 首 Token 时间，衡量响应速度的关键指标 |
| **Context Window** | 上下文窗口，模型一次能处理的最大 Token 数 |
| **RAG** | Retrieval-Augmented Generation，检索增强生成 |

---

## 版本记录

- **2026-06-03** 初版完成，涵盖 9 个核心子章节

<!--
  文件描述: 05-AI应用开发章节目录页，汇总所有子章节入口，提供前置知识、学习路径与章节关联
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-05
-->

# 05 - AI 应用开发

> 本章系统讲解 AI 应用开发的核心技术栈，从主流大模型 API 接入、函数调用与工具编排，到流式输出、Token 管理与成本优化，帮助你从"会用 ChatGPT"进阶到"能构建生产级 AI 应用"。

---

## 前置知识

学习本模块前，建议先掌握以下内容：

| 前置章节 | 为什么需要 | 关联点 |
|---------|----------|-------|
| [LLM工作原理](../02-AI基础知识/LLM工作原理.md) | 理解大模型工作机制 | API 调用的输入输出本质是 Token 序列的概率预测 |
| [Token机制](../02-AI基础知识/Token机制.md) | 理解 Token 和成本 | API 按 Token 计费，上下文窗口受 Token 数限制 |
| [Transformer](../02-AI基础知识/Transformer.md) | 理解模型架构 | 不同模型架构差异影响 API 参数和调用策略 |
| [大模型术语表](../02-AI基础知识/大模型术语表.md) | 理解专业术语 | API 文档中的 context window、temperature 等概念 |
| [Prompt基础](../03-Prompt工程/Prompt基础.md) | 掌握 Prompt 设计 | API 调用的 messages 参数本质是结构化 Prompt |
| [StructuredOutput](../03-Prompt工程/StructuredOutput.md) | 掌握结构化输出 | JSON Mode 和 response_format 是 API 的核心能力 |
| [模型选型指南](../04-大模型生态/模型选型指南.md) | 掌握模型选型方法 | 不同场景选择不同模型的 API，直接影响成本和效果 |
| [能力模型](../00-Roadmap/能力模型.md) | 了解 AI 产品能力维度 | API 开发对应「AI应用构建力 → 模型应用能力」核心能力 |

**能力对标**：本模块对应 [能力模型](../00-Roadmap/能力模型.md) 中「AI应用构建力 → 模型应用能力」核心能力，是 AI 产品经理的**必备硬技能**（掌握程度⭐⭐⭐⭐⭐）。掌握 AI 应用开发可帮助你从 L1（知道有 API 这回事）提升至 L3（能设计企业级 AI 应用的技术架构和成本方案）。

---

## 章节导航

### API 接入篇（四大主流平台）

| 序号 | 文档 | 核心内容 | 适合谁 |
|------|------|----------|--------|
| 1 | [OpenAI_API.md](./OpenAI_API.md) | GPT-4o / GPT-4o-mini / DALL·E / Whisper / Embeddings 接入与最佳实践 | 所有人（闭源标杆必读） |
| 2 | [Claude_API.md](./Claude_API.md) | Claude 3.5 Sonnet / Messages API / Vision / Tool Use / Computer Use | 关注代码/安全/长文本者 |
| 3 | [Gemini_API.md](./Gemini_API.md) | Gemini 1.5 Pro / Flash / 多模态 / Grounding / Function Calling | 关注多模态/超长上下文者 |
| 4 | [DeepSeek_API.md](./DeepSeek_API.md) | DeepSeek-V3 / R1 推理模型 / JSON Mode / 函数调用与成本优势 | 关注性价比/推理能力者 |

### 核心能力篇（四大关键技术）

| 序号 | 文档 | 核心内容 | 适合谁 |
|------|------|----------|--------|
| 5 | [FunctionCalling.md](./FunctionCalling.md) | 函数调用核心概念、多平台实现差异、高级模式与最佳实践 | 所有人（让 AI 连接外部世界） |
| 6 | [ToolCalling.md](./ToolCalling.md) | 工具类型体系、Tool Registry、ReAct / Plan-and-Execute Agent、MCP、工作流引擎 | 需构建复杂 Agent 系统者 |
| 7 | [Streaming.md](./Streaming.md) | SSE 协议、多平台流式实现、前端渲染、服务端架构与性能优化 | 所有人（现代 AI 应用必备） |
| 8 | [Token管理.md](./Token管理.md) | Token 分词原理、计算实战、上下文窗口管理、使用监控与告警 | 所有人（成本控制基础） |

### 运营优化篇

| 序号 | 文档 | 核心内容 | 适合谁 |
|------|------|----------|--------|
| 9 | [成本优化.md](./成本优化.md) | 成本构成分析、分层模型架构、缓存策略、批处理与提示词优化 | 需控制 AI 应用成本者 |

---

## 学习路径

### 按角色推荐

| 角色 | 必读章节 | 选读章节 | 学习目标 |
|------|---------|---------|---------|
| **AI 产品经理** | OpenAI_API → Streaming → FunctionCalling → Token管理 → 成本优化 | DeepSeek_API、ToolCalling | 能评估 API 选型、理解技术约束、控制成本 |
| **前端工程师** | OpenAI_API → Streaming → FunctionCalling → Token管理 | Claude_API、Gemini_API | 能实现流式渲染、工具调用、前后端对接 |
| **后端工程师** | 全部 API 文档 → FunctionCalling → ToolCalling → Token管理 → 成本优化 | Streaming（前端部分） | 能设计 API 网关、Agent 架构、成本监控 |
| **技术转型者** | DeepSeek_API → OpenAI_API → Streaming → FunctionCalling → Token管理 → 成本优化 | Claude_API、Gemini_API | 从零掌握 AI 应用开发全栈 |
| **运营/业务人员** | Token管理 → 成本优化 → OpenAI_API（基础部分） | DeepSeek_API | 理解成本结构和基本调用逻辑 |

### 按学习阶段

```
入门阶段（第1-2周）：建立 API 调用的基本认知
├── OpenAI_API.md 或 DeepSeek_API.md（选一个熟悉基础调用）
├── Streaming.md（掌握流式输出，理解现代 AI 交互模式）
├── Token管理.md（理解计费逻辑和上下文限制）
└── 动手实践：用 Python 调通一次 API，实现流式输出

进阶阶段（第3-4周）：掌握核心能力，构建完整应用
├── 完整阅读四大 API 文档（对比各平台差异）
├── FunctionCalling.md（让模型具备调用外部工具的能力）
├── 成本优化.md（建立成本意识和优化方法论）
└── 动手实践：构建一个带工具调用的 AI 助手

实战阶段（第5-6周）：设计生产级架构
├── ToolCalling.md（构建复杂 Agent 系统）
├── 设计分层模型路由架构
├── 实现缓存和监控体系
└── 动手实践：为自己的业务场景设计完整 AI 应用方案
```

---

## 与其他章节的关联

```
知识体系中的位置：

00-Roadmap（全局认知）
  └── 能力模型 → AI应用构建力 → 模型应用能力

01-产品经理基础（产品方法论）
  ├── PRD编写规范 → API 调用的 messages 结构是 AI 产品的"PRD"
  ├── 用户需求分析 → Function Calling 让 AI 满足用户操作需求
  └── 数据驱动决策 → Token 监控和成本数据驱动优化

02-AI基础知识（技术理解）      ← 05-AI应用开发（核心实操） →
  ├── LLM工作原理 → 理解 API 输入输出的本质
  ├── Token机制 → 理解计费和上下文限制
  └── Transformer → 理解模型架构对 API 参数的影响

03-Prompt工程（提示词设计）
  ├── Prompt基础 → messages 参数是结构化 Prompt
  ├── StructuredOutput → JSON Mode 和 response_format
  └── Prompt优化技巧 → 减少 Token 消耗的优化策略

04-大模型生态（模型认知）
  ├── 模型选型指南 → 不同场景选择不同 API
  ├── 模型对比分析 → 各平台 API 能力和定价差异
  └── 各模型系列 → 对应 API 的特有功能

05-AI应用开发（本模块）       → 后续章节
  ├── API 接入 → 06-RAG知识库（Embedding + 向量检索）
  ├── Function Calling → 07-Agent系统（工具编排 + 自主决策）
  ├── Tool Calling → 08-MCP生态（标准化工具协议）
  └── Streaming → 09-工作流编排（流式工作流执行）
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
| **Prompt Caching** | 提示词缓存，复用已处理的输入 Token 以降低成本和延迟 |
| **JSON Mode** | 强制模型输出合法 JSON 格式，便于程序解析 |
| **Grounding** | 搜索增强，让模型基于实时搜索结果回答问题 |

---

## 学习建议

1. **先跑通一个 API**：选择最熟悉的平台（推荐 OpenAI 或 DeepSeek），用 Python 调通一次基础调用
2. **理解 Token 经济学**：Token 是 AI 应用的"货币"，理解计费逻辑是一切优化的基础
3. **掌握流式输出**：现代 AI 应用的标配，直接影响用户体验
4. **重点突破 Function Calling**：这是 AI 从"聊天工具"进化为"智能代理"的关键能力
5. **建立成本意识**：每次 API 调用都有成本，养成监控和优化的习惯
6. **对比各平台差异**：同一功能在不同平台的实现方式不同，理解差异有助于选型
7. **动手实践**：每个知识点都要写代码验证，理论 + 实践才能真正掌握

---

## 版本记录

- **2026-06-05** 完善目录页：增加前置知识、能力对标、按角色推荐、按学习阶段、章节关联等结构化内容
- **2026-06-03** 初版完成，涵盖 9 个核心子章节

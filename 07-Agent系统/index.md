<!--
  文件描述: Agent系统模块目录页，汇总该模块下所有章节文档，提供前置知识、学习路径与章节关联
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-05
-->

# 07 - Agent 系统

> 本章系统讲解 AI Agent 的概念、架构与设计方法，从单 Agent 的 Planning/Memory/Tool/Reflection 四大组件，到 Multi-Agent 协作系统，再到 Agent 产品化设计与评测，帮助你从"理解 Agent 概念"进阶到"能设计生产级 Agent 产品"。

---

## 前置知识

学习本模块前，建议先掌握以下内容：

| 前置章节 | 为什么需要 | 关联点 |
|---------|----------|-------|
| [LLM工作原理](../02-AI基础知识/LLM工作原理.md) | 理解大模型工作机制 | Agent 的推理核心是 LLM，理解 LLM 才能理解 Agent |
| [Prompt基础](../03-Prompt工程/Prompt基础.md) | 掌握 Prompt 设计 | Agent 的行为由 Prompt 定义，系统 Prompt 是 Agent 的"大脑" |
| [ChainOfThought](../03-Prompt工程/ChainOfThought.md) | 掌握思维链技术 | Agent 的 Planning 需要思维链推理能力 |
| [StructuredOutput](../03-Prompt工程/StructuredOutput.md) | 掌握结构化输出 | Agent 的工具调用需要结构化参数输出 |
| [FunctionCalling](../05-AI应用开发/FunctionCalling.md) | 掌握函数调用 | Agent 的 Tool Calling 是 Function Calling 的进阶应用 |
| [ToolCalling](../05-AI应用开发/ToolCalling.md) | 掌握工具调用体系 | Agent 的工具编排是 Tool Calling 的核心场景 |
| [能力模型](../00-Roadmap/能力模型.md) | 了解 AI 产品能力维度 | Agent 设计对应「AI应用构建力 → Agent 架构能力」核心能力 |

**能力对标**：本模块对应 [能力模型](../00-Roadmap/能力模型.md) 中「AI应用构建力 → Agent 架构能力」核心能力，是 AI 产品经理的**进阶硬技能**（掌握程度⭐⭐⭐⭐）。掌握 Agent 系统可帮助你从 L1（知道 Agent 是什么）提升至 L3（能设计企业级 Multi-Agent 协作系统）。

---

## 章节导航

### Agent 基础篇

| 序号 | 文档 | 核心内容 | 适合谁 |
|------|------|----------|--------|
| 1 | [Agent概念](./Agent概念.md) | Agent 定义、分类、与 Chatbot 的区别、应用场景 | 所有人（Agent 入门必读） |
| 2 | [Agent架构](./Agent架构.md) | Agent 四大组件（Planning/Memory/Tool/Reflection）、主流框架对比 | 所有人（理解 Agent 架构） |

### Agent 核心组件篇

| 序号 | 文档 | 核心内容 | 适合谁 |
|------|------|----------|--------|
| 3 | [Planning](./Planning.md) | 任务规划与分解、ReAct / Plan-and-Execute / ToT 等推理模式 | 需设计 Agent 任务处理流程者 |
| 4 | [Memory](./Memory.md) | 短期/长期/工作记忆、向量检索、会话管理、记忆压缩 | 需设计 Agent 记忆系统者 |
| 5 | [ToolCalling](./ToolCalling.md) | 工具类型体系、Tool Registry、动态调用、错误处理 | 需设计 Agent 工具集成者 |
| 6 | [Reflection](./Reflection.md) | 自我反思机制、错误修正、迭代优化、质量评估 | 需提升 Agent 稳定性者 |

### Agent 进阶篇

| 序号 | 文档 | 核心内容 | 适合谁 |
|------|------|----------|--------|
| 7 | [MultiAgent](./MultiAgent.md) | 多 Agent 协作模式、角色分工、通信机制、冲突解决 | 需设计复杂协作系统者 |
| 8 | [Agent评测](./Agent评测.md) | Agent 评估指标、测试方法、基准测试、质量监控 | 需评估 Agent 性能者 |
| 9 | [Agent产品设计](./Agent产品设计.md) | Agent 产品化设计、用户体验、商业模式、落地实践 | 需落地 Agent 产品者 |

---

## 学习路径

### 按角色推荐

| 角色 | 必读章节 | 选读章节 | 学习目标 |
|------|---------|---------|---------|
| **AI 产品经理** | Agent概念 → Agent架构 → Planning → Memory → Agent产品设计 | ToolCalling、Reflection、MultiAgent、Agent评测 | 能设计 Agent 产品方案、评估架构可行性 |
| **技术架构师** | 全部章节 | - | 能设计 Agent 系统架构、选择框架、实现核心组件 |
| **Prompt 工程师** | Agent概念 → Agent架构 → Planning → Reflection → Agent产品设计 | Memory、ToolCalling、MultiAgent | 能设计高质量 Agent Prompt、优化推理流程 |
| **技术转型者** | Agent概念 → Agent架构 → Planning → Memory → ToolCalling → Reflection → MultiAgent → Agent评测 | Agent产品设计 | 从技术视角理解 Agent 全栈，掌握实现细节 |

### 按学习阶段

```
入门阶段（第1-2周）：建立 Agent 基本认知
├── Agent概念.md → 理解 Agent 是什么、与 Chatbot 的本质区别
├── Agent架构.md → 理解 Planning/Memory/Tool/Reflection 四大组件
└── 动手实践：用 LangChain/LangGraph 实现一个简单 Agent

进阶阶段（第3-4周）：掌握核心组件设计
├── Planning.md → 掌握 ReAct、Plan-and-Execute 等推理模式
├── Memory.md → 掌握短期/长期记忆的设计与实现
├── ToolCalling.md → 掌握工具注册、动态调用、错误处理
├── Reflection.md → 掌握自我反思与迭代优化机制
└── 动手实践：为 Agent 添加记忆、工具、反思能力

实战阶段（第5-6周）：设计复杂 Agent 系统
├── MultiAgent.md → 掌握多 Agent 协作的设计方法
├── Agent评测.md → 掌握 Agent 性能评估方法
├── Agent产品设计.md → 掌握 Agent 产品化落地方法
└── 动手实践：设计一个 Multi-Agent 协作系统
```

---

## 与其他章节的关联

```
知识体系中的位置：

00-Roadmap（全局认知）
  └── 能力模型 → AI应用构建力 → Agent 架构能力

02-AI基础知识（技术理解）      ← 07-Agent系统（核心进阶） →
  ├── LLM工作原理 → Agent 的推理核心
  ├── Token机制 → Agent 记忆的 Token 管理
  └── Embedding原理 → Agent 记忆的向量检索

03-Prompt工程（提示词设计）
  ├── Prompt基础 → Agent 的系统 Prompt 设计
  ├── ChainOfThought → Agent 的 Planning 推理
  ├── StructuredOutput → Agent 的工具参数输出
  └── Role设计 → Agent 的角色设定

05-AI应用开发（核心实操）      ← 07-Agent系统（进阶应用） →
  ├── FunctionCalling → Agent 的基础工具调用
  ├── ToolCalling → Agent 的工具编排体系
  ├── Streaming → Agent 的实时响应
  └── Token管理 → Agent 的记忆管理

06-RAG知识库（知识检索）
  ├── Embedding → Agent 记忆的向量存储
  ├── 向量数据库 → Agent 的长期记忆存储
  └── Recall → Agent 的记忆检索策略

07-Agent系统（本模块）        → 后续章节
  ├── Agent架构 → 08-MCP生态（标准化工具协议）
  ├── ToolCalling → 08-MCP生态（MCP 工具集成）
  ├── MultiAgent → 09-工作流编排（Agent 工作流）
  └── Agent产品设计 → 10-AI产品设计（Agent 交互设计）
```

---

## 核心能力矩阵

```
能力维度              涉及文档
─────────────────────────────────────────
Agent 概念与分类      Agent概念
Agent 架构设计        Agent架构
任务规划与推理        Planning
记忆系统设计          Memory
工具集成与调用        ToolCalling
自我反思与优化        Reflection
多 Agent 协作         MultiAgent
Agent 性能评测        Agent评测
Agent 产品化落地      Agent产品设计
```

---

## 关键术语速查

| 术语 | 说明 |
|------|------|
| **Agent** | 能自主感知、决策、行动的智能代理，区别于被动响应的 Chatbot |
| **Planning** | 任务规划，将复杂任务分解为可执行的子任务序列 |
| **Memory** | 记忆系统，存储 Agent 的历史交互、知识、上下文 |
| **Tool Calling** | 工具调用，Agent 通过调用外部工具扩展能力边界 |
| **Reflection** | 自我反思，Agent 对自身行为的评估与修正 |
| **ReAct** | Reasoning + Acting，交替推理与行动的 Agent 模式 |
| **Plan-and-Execute** | 先规划后执行，分离规划与执行的 Agent 模式 |
| **ToT** | Tree of Thought，树状思维推理模式 |
| **Multi-Agent** | 多 Agent 协作系统，多个 Agent 分工协作完成复杂任务 |
| **Tool Registry** | 工具注册中心，管理 Agent 可用的工具集合 |
| **Short-term Memory** | 短期记忆，当前对话上下文 |
| **Long-term Memory** | 长期记忆，持久化的历史知识和交互记录 |
| **Working Memory** | 工作记忆，当前任务执行过程中的临时状态 |

---

## 学习建议

1. **先理解概念**：Agent 与 Chatbot 的本质区别是"主动性"，理解这一点是后续学习的基石
2. **掌握四大组件**：Planning/Memory/Tool/Reflection 是 Agent 的核心，缺一不可
3. **重点突破 Planning**：任务规划是 Agent 的"大脑"，决定了 Agent 的智能程度
4. **动手实现**：用 LangChain/LangGraph 实现一个简单 Agent，理解各组件如何协作
5. **关注 Multi-Agent**：复杂业务场景往往需要多 Agent 协作，这是 Agent 的进阶应用
6. **重视评测**：Agent 的稳定性是产品化的关键，建立评测体系至关重要
7. **产品思维**：技术实现只是第一步，产品化落地需要考虑用户体验、商业模式

---

## 版本记录

- **2026-06-05** 完善目录页：增加前置知识、能力对标、章节导航分类、学习路径、章节关联、核心能力矩阵、关键术语速查
- **2026-06-03** 初版完成，涵盖 9 个核心子章节
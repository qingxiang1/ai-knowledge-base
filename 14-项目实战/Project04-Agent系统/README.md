<!--
  创建时间: 2026-06-12
  文件名: README.md
  文件描述: Agent 系统项目实战指南。讲解项目目标、真实目录结构、运行方式、已落地的 ReAct 工具调用能力、
            mock/API 双模式原理、改造方向与复盘方法。
  作者: Felix(LQX5731@163.com)
  版本号: v2.0.0
  最后更新时间: 2026-06-23
-->

# Project04 - Agent 系统（可直接运行的 ReAct Demo）

> 一个**真正会「思考 → 调用工具 → 观察结果 → 回答」**的 Agent 演示系统。技术栈为 `React + TypeScript + Vite + Express`。
> 与一般「只展示思考过程」的原型不同：本项目的工具是**真实执行**的——计算器会真的算、时间工具会返回真实时间、知识检索会真的命中内置知识库。
> **不配置任何 API Key 也能完整演示**（本地规则 Agent 真实执行工具）；配置 `OPENAI_API_KEY` 后则切换为大模型自主决策的 Function Calling 循环。

## 一、这个项目能直接做到什么

打开页面，输入下面任意一句，你都会看到一条**真实的 ReAct 执行轨迹**：

| 你问 | Agent 真实做的事 | 调用的工具 |
| --- | --- | --- |
| `(12 + 8) * 3 等于多少？` | 解析算式 → 安全求值 → 返回 `60` | `calculator` |
| `现在几点了？` | 读取系统时间并本地化格式化 | `current_datetime` |
| `什么是 RAG？` | 在内置知识库中检索最相关条目 | `knowledge_search` |
| `先告诉我现在时间，再帮我算 99 * 99` | **依次调用两个工具**并综合作答 | `current_datetime` + `calculator` |

每一步「思考 / 行动 / 观察 / 回答」都会在前端分色渲染，工具的真实入参与返回值都可见——不是写死的演示文本。

## 二、为什么这是一个「真 Agent」而不是「假装思考」

很多 Agent Demo 的思考过程是**写死的文本**，工具调用是**假的 ✓**。本项目刻意把这层补成真的：

- ✅ **工具真实执行**：`calculator` 用递归下降语法分析安全求值（**不使用 `eval`**），`current_datetime` 返回真实系统时间，`knowledge_search` 用中英文混合分词在内置知识库打分检索。
- ✅ **ReAct 循环真实存在**：mock 模式是确定性的规则规划器，API 模式是 OpenAI Function Calling 的**多轮循环**——模型自己决定调哪个工具、把工具结果喂回去再继续推理，直到能回答。
- ✅ **工具失败会被如实呈现**：除数为 0、表达式非法等错误会出现在「观察」步骤里，而不是被藏起来。
- ✅ **会话记忆真实生效**：按 `session_id` 在内存中保留最近若干轮对话，API 模式下作为多轮上下文。
- ✅ **优雅降级**：配了 Key 但调用失败时，自动回退到本地工具执行，保证 Demo 永远可用。

## 三、真实目录结构

```text
Project04-Agent系统/
├── server/
│   ├── routes/
│   │   └── agent.ts          # 路由：/chat 对话、/tools 工具清单、/session 清空记忆
│   ├── services/
│   │   ├── agent.ts          # ★ ReAct 引擎：mock 规则循环 + API Function Calling 循环
│   │   ├── tools.ts          # ★ 工具注册中心：calculator / current_datetime / knowledge_search
│   │   └── memory.ts         # 会话记忆（内存版，可替换为 Redis）
│   ├── types.ts              # 服务端共享类型（AgentStep / ToolCall / AgentResult ...）
│   ├── index.ts              # Express 入口 + 健康检查
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── components/
│   │   └── AgentChat.tsx      # 聊天界面 + ReAct 轨迹渲染 + 工具面板 + 示例问题
│   ├── services/
│   │   └── api.ts            # 前端 API 封装（chat / tools / clearSession）
│   ├── types/
│   │   └── index.ts          # 与服务端对齐的前端类型
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── README.md
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

> 带 ★ 的三个文件是这个项目最值得读的核心，建议从 `tools.ts` → `agent.ts` → `routes/agent.ts` 顺序阅读。

## 四、技术栈

- 前端：React 18 + TypeScript + Vite + Tailwind CSS（端口 `5173`）
- 后端：Express + TypeScript（端口 `8000`）
- 模型 SDK：OpenAI Node SDK（兼容 DeepSeek 等 OpenAI 协议服务）
- Agent 范式：ReAct（Reasoning + Acting）/ Function Calling
- 工具执行：纯本地、零外部依赖，离线可用

## 五、运行方式

### 1. 安装依赖

```bash
# 项目根目录：安装前端依赖
pnpm install

# 进入 server：安装服务端依赖
cd server && pnpm install
```

### 2. 配置环境变量（可选）

```bash
cd server
cp .env.example .env
```

```env
# 留空 = mock 模式（本地规则 Agent，仍真实执行工具）
OPENAI_API_KEY=
# 模型名（默认 gpt-4o-mini）
OPENAI_MODEL=gpt-4o-mini
# 兼容第三方 OpenAI 协议服务，如 https://api.deepseek.com（可选）
OPENAI_BASE_URL=
PORT=8000
```

> **不填 `OPENAI_API_KEY` 也能完整体验**——这是本项目的设计目标之一：零成本、可离线演示。

### 3. 启动

```bash
# 终端 1：启动后端（server 目录）
pnpm dev          # 或在根目录执行 pnpm server

# 终端 2：启动前端（根目录）
pnpm dev
```

### 4. 访问

- 前端页面：`http://localhost:5173`
- 健康检查：`http://localhost:8000/health`（会返回当前 `mock` / `api` 模式）

前端已在 `vite.config.ts` 配置 `/api` 代理，请求自动转发到后端。

## 六、API 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/v1/agent/chat` | 触发一次 ReAct 循环，返回回答 + 推理轨迹 + 工具调用 |
| `GET` | `/api/v1/agent/tools` | 列出可用工具与当前运行模式 |
| `DELETE` | `/api/v1/agent/session/:sessionId` | 清空某会话记忆 |
| `GET` | `/health` | 健康检查 |

`POST /chat` 返回结构：

```jsonc
{
  "answer": "计算结果：99 * 99 = 9801 ...",
  "thought_process": [
    { "type": "thought", "content": "制定执行计划..." },
    { "type": "action", "tool": "calculator", "args": { "expression": "99 * 99" }, "content": "调用工具 calculator" },
    { "type": "observation", "content": "99 * 99 = 9801" },
    { "type": "final", "content": "..." }
  ],
  "tool_calls": [
    { "tool": "calculator", "args": { "expression": "99 * 99" }, "result": "99 * 99 = 9801", "success": true }
  ],
  "iterations": 1,
  "mode": "mock"
}
```

用 `curl` 快速验证（启动后端后）：

```bash
curl -X POST http://localhost:8000/api/v1/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"query":"先告诉我现在时间，再帮我算 99 * 99","session_id":"demo"}'
```

## 七、两种模式的工作原理

### Mock 模式（无 API Key）

`server/services/agent.ts → runMockAgent()`：

1. **规划（thought）**：`planTools()` 根据问题关键词与算式识别，决定要调用哪些工具（可多个）。
2. **行动 + 观察（action / observation）**：逐个**真实调用** `runTool()`，记录入参与返回。
3. **回答（final）**：`synthesizeMockAnswer()` 把多个工具的真实观察结果合成自然语言回答。

它是**确定性**的——同样的输入永远得到同样的、可解释的执行轨迹，非常适合教学与离线演示。

### API 模式（配置 API Key）

`server/services/agent.ts → runApiAgent()`：

1. 把 `tools.ts` 的工具定义转成 OpenAI Function Calling 的 `tools` schema。
2. 进入**多轮循环**（最多 5 轮）：模型返回 `tool_calls` → 程序真实执行工具 → 把结果以 `role: "tool"` 回喂 → 模型继续推理，直到给出最终回答。
3. 全程记录 thought / action / observation / final 步骤，与 mock 模式返回结构完全一致。

## 八、如何新增一个工具（最有价值的练习）

工具系统是这个项目的可扩展点，新增工具只需改一个文件 `server/services/tools.ts`：

```ts
TOOLS.push({
  name: "weather",
  description: "查询某城市的天气。当问题涉及天气、气温时使用。",
  parameters: { city: "城市名，例如 北京" },
  run: async (args) => {
    const city = String(args.city ?? "");
    // 这里换成真实天气 API 调用
    return { result: `${city}：晴，26℃`, success: true };
  },
});
```

加完后：mock 模式记得在 `agent.ts` 的 `planTools()` 里补一条触发规则；API 模式则**无需改动**——模型会自己根据 `description` 决定是否调用它。这正好能让你直观体会「规则编排」与「模型自主编排」的差别。

## 九、如果你是产品经理，重点观察什么

1. **「展示思考」与「真实执行」的边界**：本项目两者都做到了，对比看会更清楚一个 Agent 产品的体验层与能力层分别由什么支撑。
2. **工具的可靠性才是 Agent 的下限**：计算器一旦算错，整个回答就不可信。观察 `tools.ts` 是如何用「不使用 eval 的安全求值 + 显式错误返回」保证可控的。
3. **规则编排 vs 模型编排**：mock 模式（规则）可控、可解释但不灵活；API 模式（模型）灵活但需要约束。企业落地往往是两者混合。
4. **可追溯性**：每一步 action/observation 都被记录下来，这是 Agent 进入企业场景（审计、回放、人工接管）的前提。

## 十、继续进阶的改造方向

当前已经是一个工具调用闭环完整的可运行系统，想进一步提升含金量，可以做：

1. **流式响应（SSE/WebSocket）**：让思考步骤与工具结果逐步回显，体验更接近真实 Agent 产品。
2. **更多真实工具**：天气、网页抓取摘要、SQL 查询、向量检索（接 Project03 的知识库）。
3. **把内置知识库换成真实向量检索**：用 Embedding + 向量库替换当前的关键词打分。
4. **持久化记忆**：把 `memory.ts` 从内存 Map 换成 Redis / 数据库，支持多实例与历史回看。
5. **企业级能力**：工具权限管理、人工确认节点、失败重试与回滚、任务审计日志、多 Agent 协作。

## 十一、怎么把它写进作品集 / 讲给面试官

> 我做了一个可直接运行的 Agent 系统：实现了完整的 ReAct（思考→行动→观察→回答）循环，工具是**真实执行**的（自研零依赖的安全计算器、时间、本地知识检索），并提供两种运行模式——离线规则编排（mock）与大模型 Function Calling 自主编排（API），两者返回结构一致、可优雅降级。前端把每一步推理与工具的真实入参/返回都做了可视化。我还实现了会话记忆与工具清单接口，并设计了「只改一个文件即可新增工具」的扩展点。这个项目让我能清楚区分 Agent 的 UI 层、orchestration 层与 runtime 层，并知道每一层在企业落地时分别要解决什么问题。

## 十二、最小复盘模板

1. mock 模式和 API 模式，分别是「谁」在决定调用哪个工具？
2. 为什么 `calculator` 坚持不用 `eval`？这体现了 Agent 工具设计的什么原则？
3. 一次回答里调用了多个工具时，结果是怎么被综合的？
4. 如果要新增一个「查天气」工具，两种模式各需要改哪里、为什么不一样？
5. 要把这个 Demo 推向企业生产，你认为第一个要补的能力是什么（流式？权限？审计？），为什么？

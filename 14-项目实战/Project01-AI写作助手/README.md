<!--
  创建时间: 2026-06-12
  文件名: README.md
  文件描述: AI 写作助手项目实战指南，面向新手和技术转型者系统讲解项目目标、真实目录结构、运行方式、核心能力、改造方向与复盘方法
  作者: Felix(LQX5731@163.com)
  版本号: v1.2.0
  最后更新时间: 2026-06-12
-->

# Project01-AI写作助手

> 这是 `14-项目实战` 里最适合作为第一站的项目之一。它的好处在于：问题清晰、结构简单、反馈直接、容易跑通，也很适合拿来理解一个最基础的 AI 工具类产品是如何从输入、Prompt、调用后端，到最终结果展示形成闭环的。如果你是第一次做 AI 产品项目，这个项目非常适合用来建立“从需求到实现”的完整感觉。

---

## 一、先理解这个项目在练什么

这个项目表面上是一个“AI 写作助手”，但对学习者来说，它真正训练的是下面几件事：

- 如何把一个高频内容生产场景做成 AI 工具
- 如何设计输入、操作类型和输出结果
- 如何把前端交互和后端模型调用接起来
- 如何在真实 API 不可用时提供 mock 降级，保证项目可演示
- 如何从一个简单 Demo 出发，继续向作品集或 MVP 发展

所以你在学习这个项目时，不要只把它当成“写作小工具”，而要把它当成最基础的 AI 应用模板。

---

## 二、项目目标与用户场景

### 1. 这个项目解决什么问题

很多人写作时会遇到几个高频痛点：

- 没有起稿思路
- 写到一半接不下去
- 内容表达不够顺
- 文本过长或过短，需要快速调整

这个项目就是围绕这些典型动作设计的。

### 2. 典型用户是谁

这个项目最适合拿来模拟下面这类用户：

- 内容运营
- 学生和研究人员
- 产品经理
- 需要快速起草文档的知识工作者

### 3. 核心使用场景是什么

当前版本聚焦的是五类高频动作：

- 生成
- 续写
- 润色
- 精简
- 扩展

这五类动作构成了一个非常典型的文本 AI 工具闭环。

---

## 三、当前项目能力概览

当前项目已经具备的核心能力包括：

- 多风格写作：正式、轻松、学术、创意、商务
- 多动作处理：生成、续写、润色、精简、扩展
- 结果实时展示：输入区、结果区、错误提示
- 历史记录：查看和删除历史写作记录
- mock 模式：未配置 `OPENAI_API_KEY` 也能运行和演示
- 企业工作流闭环：作者生成草稿、审核人审批、发布人内部模拟发布
- 本地持久化：服务重启后保留企业单据与审计记录
- 品牌规则校验：生成后自动扫描，阻断风险文案进入审核流

这意味着它既适合学习，也适合做面试演示或课堂演示。

---

## 四、真实目录结构

下面是当前仓库里的真实目录，不是旧版 README 中已经失真的结构：

```text
Project01-AI写作助手/
├── package.json
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── Editor.tsx
│   │   └── HistoryPanel.tsx
│   ├── hooks/
│   │   └── useWriting.ts
│   ├── services/
│   │   └── api.ts
│   └── types/
│       └── index.ts
└── server/
    ├── index.ts
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── routes/
    │   └── writing.ts
│   ├── config/
    ├── config/
    │   └── templates.ts
    ├── services/
    │   ├── document-store.ts
    │   ├── compliance.ts
    │   └── openai.ts
    └── types.ts
```

最重要的文件可以这样理解：

- `src/App.tsx`：企业工作流页面入口，组织角色切换与工作台布局
- `src/components/Editor.tsx`：主编辑区，负责草稿编辑、流程动作和合规结果展示
- `src/components/HistoryPanel.tsx`：企业单据列表与审计轨迹
- `src/hooks/useWriting.ts`：前端核心状态和工作流动作逻辑
- `server/routes/writing.ts`：企业单据生成、提审、审核、发布接口
- `server/services/openai.ts`：企业草稿 Prompt 构建、OpenAI 调用和 mock 降级
- `server/services/compliance.ts`：品牌规则扫描与提审阻断逻辑
- `server/index.ts`：服务端入口和健康检查

---

## 五、技术栈与实现方式

### 前端

- React 18
- TypeScript
- Vite
- Tailwind CSS

### 后端

- Node.js
- Express
- TypeScript

### AI 调用

- OpenAI SDK
- 支持真实 API 模式
- 支持 mock 降级模式

这个技术栈有一个很好的学习价值：

- 足够简单
- 足够主流
- 足够适合做第一个可讲清楚的 AI 项目

---

## 六、运行方式

### 1. 安装前端依赖

```bash
cd /Users/luoqingxiang/Documents/my-project/ai-project-manager/14-项目实战/Project01-AI写作助手
pnpm install
```

### 2. 安装后端依赖

```bash
cd /Users/luoqingxiang/Documents/my-project/ai-project-manager/14-项目实战/Project01-AI写作助手/server
pnpm install
```

### 3. 配置环境变量

项目后端目录已有 `.env.example`，可以复制为 `.env`：

```bash
cd /Users/luoqingxiang/Documents/my-project/ai-project-manager/14-项目实战/Project01-AI写作助手/server
cp .env.example .env
```

如果你有真实 API Key，可以填写：

```env
OPENAI_API_KEY=your_api_key_here
PORT=3000
```

如果不填 `OPENAI_API_KEY`，项目会自动进入 `mock` 模式，依然可以运行和演示。

### 4. 启动后端

```bash
cd /Users/luoqingxiang/Documents/my-project/ai-project-manager/14-项目实战/Project01-AI写作助手/server
pnpm dev
```

### 5. 启动前端

```bash
cd /Users/luoqingxiang/Documents/my-project/ai-project-manager/14-项目实战/Project01-AI写作助手
pnpm dev
```

### 6. 默认访问地址

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`
- 健康检查：`http://localhost:3000/health`

---

## 七、这个项目最值得看的代码点

### 1. 前端主流程

当前前端主流程已经升级为企业工作流：

- 作者填写标题、模板、摘要并生成草稿
- 系统自动执行品牌规则扫描并返回合规状态
- 作者根据风险提示修正文案后提交审核
- 审核人与发布人继续完成后续状态流转
- `HistoryPanel.tsx` 查看单据与审计轨迹

这个结构非常适合新手理解 AI 工具类产品的最小前端闭环。

### 2. 后端接口设计

当前后端主要提供企业工作流相关接口：

- `GET /api/writing/templates`
- `GET /api/writing/documents`
- `POST /api/writing/documents/generate`
- `POST /api/writing/documents/:id/submit-review`
- `POST /api/writing/documents/:id/review`
- `POST /api/writing/documents/:id/publish`

这套设计对应的是一个更贴近企业内容生产的接口模型：

- 草稿生成与版本递增
- 提审、审核、发布的状态流转
- 审计日志与持久化单据管理
- 品牌规则校验与提审拦截

### 3. mock 降级策略

这个项目最值得学习的地方之一，是 `server/services/openai.ts` 里做了 mock 降级：

- 有 API Key 就调用真实模型
- 没有 API Key 就返回模拟写作结果

这对于项目实战非常重要，因为它意味着：

- 项目不依赖外部 API 也能演示
- 更适合作为练习项目或作品集 Demo

### 4. Prompt 构建方式

后端把“风格”和“动作”都映射成 Prompt 逻辑，这说明：

- AI 产品的很多能力其实不是来自复杂架构
- 而是来自正确的任务拆解和 Prompt 设计

---

## 八、如果你是产品经理，应该重点观察什么

做这个项目时，不要只从代码角度看，更要从产品角度看下面几个问题：

### 1. 为什么是这五个动作

生成、续写、润色、精简、扩展，其实对应的是内容生产里最常见的五类用户意图。

### 2. 为什么要做风格切换

风格切换本质上是在提高工具的可配置性和场景适配性。

### 3. 为什么历史记录重要

AI 工具如果没有历史记录，用户很难复盘结果，也很难持续使用。历史记录虽然简单，但能显著提高产品完整度。

### 4. 为什么 mock 模式重要

对于实战项目来说，mock 模式不仅是技术便利，更是产品演示能力的一部分。

---

## 九、建议你至少做一次改造

如果你只跑起来，这个项目的学习价值会有限。建议至少做一类改造：

### 1. 交互改造

例如：

- 增加标题输入和正文输入分区
- 增加“复制结果”按钮
- 增加 Token 使用量展示

### 2. 能力改造

例如：

- 增加“改写为摘要”动作
- 增加“生成邮件”或“生成 PRD”模板
- 增加英文输出或双语输出

### 3. 产品改造

例如：

- 把它改造成营销文案助手
- 把它改造成学术写作助手
- 把它改造成产品文档助手

只要你做过一次方向性改造，这个项目就更像你的项目，而不是公共样例。

---

## 十、怎么把这个项目讲成作品集

如果你要把这个项目写进作品集或面试里，建议用下面的说法组织：

### 项目定位

- 一个面向知识工作者的 AI 写作辅助工具

### 核心能力

- 多风格文本生成
- 多动作文本处理
- 历史记录管理
- mock/API 双模式运行

### 关键取舍

- 用最小功能闭环换取最快可运行版本
- 先不做用户系统和数据库，降低复杂度
- 通过 mock 模式保证演示稳定性

### 下一步方向

- 接入真实权限中心和组织角色
- 将本地规则引擎替换为可配置的品牌规则中心
- 对接真实发布渠道或 CMS

这样讲，会比“我做了一个 AI 写作工具”更有说服力。

---

## 十一、最小复盘模板

你可以直接用下面这份模板复盘这个项目：

```md
## Project01 复盘

### 1. 项目目标

- 用最小成本搭建一个可运行的 AI 写作工具

### 2. 目标用户

- 内容运营、学生、产品经理、知识工作者

### 3. 核心能力

- 文本生成、续写、润色、精简、扩展

### 4. 当前优点

- 结构简单、容易运行、支持 mock、适合演示

### 5. 当前问题

- 数据未持久化、能力边界较浅、缺少模板化场景

### 6. 下一步迭代

- 增加模板库、结果复制、数据库持久化、任务型输入
```

---

## 十二、这个项目适合作为什么起点

如果你后面还要继续做更多项目，这个项目最适合作为以下几个方向的起点：

- 所有 AI 工具型产品的最小模板
- Prompt 驱动型产品的入门模板
- 前后端分离 AI Demo 的入门模板
- 作品集里的“第一个可运行 AI 项目”

所以它的价值不在于复杂，而在于“特别适合打基础”。

---

## 版本记录

### v1.2.0

- 重构为教程化项目实战文档
- 修复旧版 README 与真实目录结构不一致的问题
- 补充项目目标、运行说明、产品视角、改造建议与作品集表达方式

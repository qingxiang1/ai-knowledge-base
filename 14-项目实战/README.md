# 14-项目实战

本章节包含多个可直接运行的 AI 项目实战案例，每个项目均包含完整的前后端源码和配置文件。

## 项目列表

| 项目 | 名称 | 技术栈 | 端口 |
|------|------|--------|------|
| Project01 | AI 写作助手 | React + TypeScript + Node.js + OpenAI | 前端 5173 / 后端 3000 |
| Project03 | 企业知识库 | React + TypeScript + Node.js + LangChain + ChromaDB | 前端 5173 / 后端 8000 |
| Project04 | Agent 系统 | React + TypeScript + Node.js + LangChain | 前端 5173 / 后端 8000 |
| Project07 | AI 客服系统 | React + TypeScript + Node.js + Socket.IO | 前端 5173 / 后端 3000 |

## 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 8

### 通用运行步骤

每个项目均包含前端和后端，需要分别启动：

```bash
# 1. 进入项目目录
cd Project01-AI写作助手

# 2. 安装前端依赖并启动
pnpm install
pnpm dev

# 3. 新开终端，进入后端目录并启动
cd server
pnpm install
pnpm dev
```

### 各项目启动命令

#### Project01 - AI 写作助手

```bash
cd Project01-AI写作助手
pnpm install && pnpm dev
cd server && pnpm install && pnpm dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:3000

#### Project03 - 企业知识库

```bash
cd Project03-企业知识库
pnpm install && pnpm dev
cd server && pnpm install && pnpm dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:8000

#### Project04 - Agent 系统

```bash
cd Project04-Agent系统
pnpm install && pnpm dev
cd server && pnpm install && pnpm dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:8000

#### Project07 - AI 客服系统

```bash
cd Project07-AI客服系统
pnpm install && pnpm dev
cd server && pnpm install && pnpm dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:3000

## 环境变量配置

每个项目的后端目录下可创建 `.env` 文件：

```env
# OpenAI API Key（如需真实 AI 能力）
OPENAI_API_KEY=your_api_key_here

# 服务端口号（可选，默认见上表）
PORT=3000
```

> 当前项目已内置模拟响应，不配置 API Key 也可运行并查看效果。

## 项目结构说明

每个项目均采用前后端分离架构：

```
ProjectXX-项目名称/
├── package.json          # 前端依赖与脚本
├── vite.config.ts        # Vite 构建配置
├── tailwind.config.js    # Tailwind CSS 配置
├── tsconfig.json         # TypeScript 配置
├── index.html            # 入口 HTML
├── src/
│   ├── main.tsx          # 前端入口
│   ├── App.tsx           # 根组件
│   ├── index.css         # 全局样式
│   ├── types/            # TypeScript 类型定义
│   ├── services/         # API 服务层
│   └── components/       # React 组件
└── server/
    ├── package.json      # 后端依赖与脚本
    ├── index.ts          # 服务端入口
    └── routes/           # API 路由
```

## 功能概述

### Project01 - AI 写作助手
- 支持多种写作风格（正式、轻松、学术、创意、商务）
- 支持生成、续写、润色、精简、扩展等操作
- 历史记录管理

### Project03 - 企业知识库
- 文档上传与管理（PDF、DOCX、MD、TXT）
- 基于 RAG 的智能问答
- 参考来源展示

### Project04 - Agent 系统
- ReAct Agent 架构演示
- 思考过程可视化
- 工具调用展示

### Project07 - AI 客服系统
- 实时客服对话
- 意图识别与置信度展示
- Socket.IO 实时通信支持

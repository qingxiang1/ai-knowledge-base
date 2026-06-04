<!--
  文件描述: AI写作助手项目完整实战指南，包含需求分析、架构设计、代码实现与部署说明
  作者: AI-PM-Knowledge
  创建日期: 2026-06-04
  最后修改日期: 2026-06-04
-->

# Project01 - AI写作助手

> 一个基于 React + Node.js + OpenAI API 的 AI 辅助写作工具，支持文章生成、续写、润色等功能。

---

## 项目概述

### 功能特性

- **文章生成**：根据主题和关键词自动生成文章
- **智能续写**：基于上下文继续写作
- **文本润色**：优化语法、提升表达
- **多风格切换**：支持正式、轻松、学术等多种写作风格
- **历史记录**：保存写作历史，支持回溯

### 技术栈

```
前端: React 18 + TypeScript + Tailwind CSS
后端: Node.js + Express + TypeScript
AI: OpenAI GPT-4 API
部署: Docker + Nginx
```

---

## 项目结构

```
Project01-AI写作助手/
├── README.md                 # 项目说明
├── package.json              # 项目依赖
├── tsconfig.json             # TypeScript 配置
├── tailwind.config.js        # Tailwind 配置
├── vite.config.ts            # Vite 构建配置
├── public/
│   └── index.html            # HTML 入口
├── server/
│   ├── index.ts              # Express 服务端入口
│   ├── routes/
│   │   └── writing.ts        # 写作相关 API
│   └── services/
│       └── openai.ts         # OpenAI 服务封装
└── src/
    ├── main.tsx              # 前端入口
    ├── App.tsx               # 根组件
    ├── components/
    │   ├── Editor.tsx        # 编辑器组件
    │   ├── Sidebar.tsx       # 侧边栏组件
    │   ├── Toolbar.tsx       # 工具栏组件
    │   └── HistoryPanel.tsx  # 历史记录面板
    ├── hooks/
    │   └── useWriting.ts     # 写作逻辑 Hook
    ├── services/
    │   └── api.ts            # API 调用封装
    └── types/
        └── index.ts          # 类型定义
```

---

## 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装服务端依赖
cd server && npm install
```

### 2. 配置环境变量

```bash
# 根目录创建 .env 文件
VITE_API_URL=http://localhost:3001

# server 目录创建 .env 文件
OPENAI_API_KEY=your_openai_api_key
PORT=3001
```

### 3. 启动项目

```bash
# 启动服务端
cd server && npm run dev

# 新终端启动前端
npm run dev
```

### 4. 访问应用

打开浏览器访问 `http://localhost:5173`

---

## 核心代码实现

### 类型定义 (src/types/index.ts)

```typescript
/**
 * 写作风格枚举
 */
export enum WritingStyle {
  FORMAL = 'formal',      // 正式
  CASUAL = 'casual',      // 轻松
  ACADEMIC = 'academic',  // 学术
  CREATIVE = 'creative',  // 创意
  BUSINESS = 'business',  // 商务
}

/**
 * 写作请求参数
 */
export interface WritingRequest {
  content: string;           // 输入内容
  style: WritingStyle;       // 写作风格
  action: WritingAction;     // 操作类型
  temperature?: number;      // 创造性程度 (0-1)
}

/**
 * 写作操作类型
 */
export enum WritingAction {
  GENERATE = 'generate',    // 生成
  CONTINUE = 'continue',    // 续写
  POLISH = 'polish',        // 润色
  SHORTEN = 'shorten',      // 缩短
  EXPAND = 'expand',        // 扩展
}

/**
 * 写作响应
 */
export interface WritingResponse {
  result: string;            // 生成结果
  tokens_used: number;       // Token 使用量
  model: string;             // 使用的模型
}

/**
 * 历史记录项
 */
export interface HistoryItem {
  id: string;
  timestamp: number;
  request: WritingRequest;
  response: WritingResponse;
}
```

### API 服务封装 (src/services/api.ts)

```typescript
import { WritingRequest, WritingResponse, HistoryItem } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * 发送写作请求
 * @param request 写作请求参数
 * @returns 写作响应
 */
export async function generateWriting(request: WritingRequest): Promise<WritingResponse> {
  const response = await fetch(`${API_BASE}/api/writing/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '请求失败');
  }

  return response.json();
}

/**
 * 获取历史记录
 * @returns 历史记录列表
 */
export async function getHistory(): Promise<HistoryItem[]> {
  const response = await fetch(`${API_BASE}/api/writing/history`);
  return response.json();
}

/**
 * 删除历史记录
 * @param id 记录 ID
 */
export async function deleteHistoryItem(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/writing/history/${id}`, {
    method: 'DELETE',
  });
}
```

### 写作逻辑 Hook (src/hooks/useWriting.ts)

```typescript
import { useState, useCallback } from 'react';
import { WritingRequest, WritingResponse, WritingStyle, WritingAction } from '../types';
import { generateWriting } from '../services/api';

interface UseWritingReturn {
  content: string;
  result: string;
  loading: boolean;
  error: string | null;
  style: WritingStyle;
  setStyle: (style: WritingStyle) => void;
  setContent: (content: string) => void;
  handleAction: (action: WritingAction) => Promise<void>;
  clearResult: () => void;
}

/**
 * 写作功能核心 Hook
 * 管理写作状态和处理写作请求
 */
export function useWriting(): UseWritingReturn {
  const [content, setContent] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<WritingStyle>(WritingStyle.FORMAL);

  /**
   * 执行写作操作
   * @param action 操作类型
   */
  const handleAction = useCallback(async (action: WritingAction) => {
    if (!content.trim()) {
      setError('请输入内容');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: WritingRequest = {
        content,
        style,
        action,
        temperature: action === WritingAction.CREATIVE ? 0.8 : 0.5,
      };

      const response = await generateWriting(request);
      setResult(response.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [content, style]);

  const clearResult = useCallback(() => {
    setResult('');
    setError(null);
  }, []);

  return {
    content,
    result,
    loading,
    error,
    style,
    setStyle,
    setContent,
    handleAction,
    clearResult,
  };
}
```

### 编辑器组件 (src/components/Editor.tsx)

```typescript
import React from 'react';
import { WritingAction } from '../types';

interface EditorProps {
  content: string;
  result: string;
  loading: boolean;
  error: string | null;
  onContentChange: (value: string) => void;
  onAction: (action: WritingAction) => void;
  onClear: () => void;
}

/**
 * 编辑器组件
 * 提供文本输入和结果显示功能
 */
export const Editor: React.FC<EditorProps> = ({
  content,
  result,
  loading,
  error,
  onContentChange,
  onAction,
  onClear,
}) => {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* 输入区域 */}
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          输入内容
        </label>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="输入主题、关键词或段落..."
          className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onAction(WritingAction.GENERATE)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '生成中...' : '生成文章'}
        </button>
        <button
          onClick={() => onAction(WritingAction.CONTINUE)}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          续写
        </button>
        <button
          onClick={() => onAction(WritingAction.POLISH)}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          润色
        </button>
        <button
          onClick={() => onAction(WritingAction.SHORTEN)}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          精简
        </button>
        <button
          onClick={() => onAction(WritingAction.EXPAND)}
          disabled={loading}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          扩展
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          清空
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* 结果区域 */}
      {result && (
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            生成结果
          </label>
          <div className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-auto whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 服务端 - OpenAI 服务 (server/services/openai.ts)

```typescript
import OpenAI from 'openai';
import { WritingRequest, WritingResponse, WritingAction, WritingStyle } from '../../src/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 构建写作 Prompt
 * @param request 写作请求
 * @returns 系统提示和用户提示
 */
function buildPrompt(request: WritingRequest): { system: string; user: string } {
  const styleMap: Record<WritingStyle, string> = {
    [WritingStyle.FORMAL]: '正式、严谨',
    [WritingStyle.CASUAL]: '轻松、口语化',
    [WritingStyle.ACADEMIC]: '学术、专业',
    [WritingStyle.CREATIVE]: '富有创意、生动',
    [WritingStyle.BUSINESS]: '商务、简洁',
  };

  const actionMap: Record<WritingAction, string> = {
    [WritingAction.GENERATE]: `根据以下主题或关键词，生成一篇${styleMap[request.style]}风格的文章。要求结构清晰、内容充实。`,
    [WritingAction.CONTINUE]: `基于以下内容，继续${styleMap[request.style]}风格写作。保持上下文连贯，自然延伸。`,
    [WritingAction.POLISH]: `对以下内容进行润色优化。保持${styleMap[request.style]}风格，提升表达质量，修正语法错误。`,
    [WritingAction.SHORTEN]: `将以下内容精简压缩。保留核心信息，去除冗余表达，保持${styleMap[request.style]}风格。`,
    [WritingAction.EXPAND]: `对以下内容进行扩展丰富。增加细节、例子或论证，保持${styleMap[request.style]}风格。`,
  };

  return {
    system: `你是一位专业的写作助手，擅长根据用户需求生成高质量的文本内容。请用中文回复。`,
    user: `${actionMap[request.action]}\n\n${request.content}`,
  };
}

/**
 * 调用 OpenAI 生成文本
 * @param request 写作请求
 * @returns 写作响应
 */
export async function generateText(request: WritingRequest): Promise<WritingResponse> {
  const { system, user } = buildPrompt(request);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: request.temperature ?? 0.7,
    max_tokens: 2000,
  });

  const result = completion.choices[0]?.message?.content || '';
  const tokens_used = completion.usage?.total_tokens || 0;

  return {
    result,
    tokens_used,
    model: 'gpt-4',
  };
}
```

### 服务端 - API 路由 (server/routes/writing.ts)

```typescript
import { Router } from 'express';
import { generateText } from '../services/openai';
import { WritingRequest, HistoryItem } from '../../src/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 内存存储历史记录（生产环境应使用数据库）
const history: HistoryItem[] = [];

/**
 * POST /api/writing/generate
 * 生成写作内容
 */
router.post('/generate', async (req, res) => {
  try {
    const request: WritingRequest = req.body;

    // 参数校验
    if (!request.content?.trim()) {
      return res.status(400).json({ message: '内容不能为空' });
    }

    const response = await generateText(request);

    // 保存历史记录
    const historyItem: HistoryItem = {
      id: uuidv4(),
      timestamp: Date.now(),
      request,
      response,
    };
    history.unshift(historyItem);

    // 限制历史记录数量
    if (history.length > 100) {
      history.pop();
    }

    res.json(response);
  } catch (error) {
    console.error('生成失败:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : '生成失败',
    });
  }
});

/**
 * GET /api/writing/history
 * 获取历史记录
 */
router.get('/history', (req, res) => {
  res.json(history);
});

/**
 * DELETE /api/writing/history/:id
 * 删除历史记录
 */
router.delete('/history/:id', (req, res) => {
  const index = history.findIndex((item) => item.id === req.params.id);
  if (index > -1) {
    history.splice(index, 1);
  }
  res.status(204).send();
});

export default router;
```

### 服务端入口 (server/index.ts)

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import writingRoutes from './routes/writing';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/writing', writingRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 服务端运行在 http://localhost:${PORT}`);
});
```

### 前端入口 (src/main.tsx)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 根组件 (src/App.tsx)

```typescript
import React, { useState } from 'react';
import { Editor } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { HistoryPanel } from './components/HistoryPanel';
import { useWriting } from './hooks/useWriting';
import { WritingStyle } from './types';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  const {
    content,
    result,
    loading,
    error,
    style,
    setStyle,
    setContent,
    handleAction,
    clearResult,
  } = useWriting();

  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">AI 写作助手</h1>
          <div className="flex items-center gap-4">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as WritingStyle)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={WritingStyle.FORMAL}>正式风格</option>
              <option value={WritingStyle.CASUAL}>轻松风格</option>
              <option value={WritingStyle.ACADEMIC}>学术风格</option>
              <option value={WritingStyle.CREATIVE}>创意风格</option>
              <option value={WritingStyle.BUSINESS}>商务风格</option>
            </select>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              历史记录
            </button>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 编辑器 */}
          <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
            <Editor
              content={content}
              result={result}
              loading={loading}
              error={error}
              onContentChange={setContent}
              onAction={handleAction}
              onClear={clearResult}
            />
          </div>

          {/* 历史记录面板 */}
          {showHistory && (
            <div className="w-80">
              <HistoryPanel />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
```

---

## 配置文件

### package.json

```json
{
  "name": "ai-writing-assistant",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "server": "cd server && npm run dev"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
```

### server/package.json

```json
{
  "name": "ai-writing-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "openai": "^4.24.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/uuid": "^9.0.7",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 部署指南

### Docker 部署

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 构建
COPY . .
RUN npm run build

# 启动
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - '5173:5173'
    environment:
      - VITE_API_URL=http://server:3001

  server:
    build: ./server
    ports:
      - '3001:3001'
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PORT=3001
```

---

## 扩展建议

1. **用户系统**：添加登录注册，支持多用户
2. **数据持久化**：使用 PostgreSQL/MongoDB 存储数据
3. **文件导入**：支持 Word/PDF 导入导出
4. **模板库**：预设常见写作模板
5. **协作功能**：支持多人实时协作编辑

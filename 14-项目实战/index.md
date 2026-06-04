<!--
  文件描述: 项目实战模块目录页
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-04
-->

# 项目实战

> 从0到1的实战项目

本模块包含多个实战项目，覆盖AI产品的主要应用场景。每个项目都包含完整的代码实现，可直接运行使用。

---

## 项目列表

| 序号 | 项目 | 说明 | 技术栈 |
|:---:|:---|:---|:---|
| 01 | [Project01-AI写作助手](./Project01-AI写作助手) | AI辅助写作工具，支持文章生成、续写、润色 | React + Node.js + OpenAI API |
| 02 | [Project03-企业知识库](./Project03-企业知识库) | 企业级知识库系统，支持文档上传、语义检索、RAG问答 | React + Python FastAPI + LangChain + ChromaDB |
| 03 | [Project04-Agent系统](./Project04-Agent系统) | 智能Agent应用，支持任务规划、工具调用、多轮对话 | React + Python + LangGraph + Redis |
| 04 | [Project07-AI客服系统](./Project07-AI客服系统) | AI客服解决方案，支持智能问答、人工转接、工单管理 | React + Node.js + Socket.IO + PostgreSQL |

---

## 项目特点

### 完整可运行

每个项目都包含：
- **详细文档**：需求分析、架构设计、API说明
- **完整代码**：前端 + 后端 + 配置文件
- **Docker部署**：一键启动，开箱即用
- **扩展建议**：后续优化方向

### 技术覆盖

| 技术领域 | 涉及项目 |
|:---|:---|
| 前端开发 | 全部项目 |
| 后端API | 全部项目 |
| 大语言模型 | 全部项目 |
| 向量数据库 | Project03 |
| RAG检索 | Project03, Project07 |
| Agent框架 | Project04 |
| 实时通信 | Project07 |
| 数据库设计 | Project03, Project07 |

---

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+ (Project03, Project04)
- Docker & Docker Compose
- OpenAI API Key

### 通用启动步骤

```bash
# 1. 进入项目目录
cd ProjectXX-项目名称

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 OPENAI_API_KEY

# 3. Docker 一键启动
docker-compose up -d

# 4. 访问应用
# 前端: http://localhost:5173
# 后端: http://localhost:3000 或 8000
```

---

## 学习建议

1. **选择项目**：根据自身兴趣和技术栈选择实战项目
2. **完整实践**：从需求分析到上线运营全流程参与
3. **代码阅读**：理解每个模块的设计思路和实现细节
4. **动手修改**：尝试添加新功能或优化现有实现
5. **总结复盘**：记录项目过程中的问题与解决方案

---

## 项目详情

### Project01 - AI写作助手

**核心功能**：
- 文章生成、续写、润色、精简、扩展
- 多风格切换（正式、轻松、学术、创意、商务）
- 历史记录管理

**代码亮点**：
- React Hooks 封装业务逻辑
- OpenAI API 服务层抽象
- TypeScript 类型安全

[查看完整项目 →](./Project01-AI写作助手)

---

### Project03 - 企业知识库

**核心功能**：
- 多格式文档上传（PDF/DOCX/MD/TXT）
- 智能文本分块与向量化
- 语义检索 + RAG 问答
- 参考来源展示

**代码亮点**：
- LangChain 集成 OpenAI 嵌入模型
- ChromaDB 向量存储与检索
- FastAPI 异步处理

[查看完整项目 →](./Project03-企业知识库)

---

### Project04 - Agent系统

**核心功能**：
- ReAct 推理+行动循环
- 多工具调用（搜索、计算、天气、代码）
- WebSocket 实时通信
- 思考过程可视化

**代码亮点**：
- LangGraph 状态机工作流
- 工具注册与动态调用
- Redis 会话记忆管理

[查看完整项目 →](./Project04-Agent系统)

---

### Project07 - AI客服系统

**核心功能**：
- 智能问答与意图识别
- AI/人工无缝转接
- Socket.IO 实时聊天
- 满意度评价与数据分析

**代码亮点**：
- Socket.IO 房间管理
- PostgreSQL 数据持久化
- 情感分析与自动升级

[查看完整项目 →](./Project07-AI客服系统)

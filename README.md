<!--
  文件描述: AI产品经理知识库项目README，包含项目介绍、目录结构、学习路径及使用指南
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# AI产品经理知识库

> AI-PM-Knowledge | 系统学习AI产品管理知识体系，从入门到精通的完整成长路径

---

## 项目简介

本项目是一个面向 **AI产品经理** 的系统性知识体系仓库，涵盖从产品经理基础、AI技术原理、核心技术能力、产品设计与实战，到系统架构、商业化和职业发展的完整学习路径。

知识库采用模块化组织，每个章节包含理论讲解、代码示例（Python）和AI产品经理实践指南，帮助读者建立从理论到落地的完整认知。

**核心特点：**
- **体系完整**：19个模块、150+文档，覆盖AI产品全链路
- **理论与实践结合**：每个技术点配有可运行的Python代码示例
- **产品视角**：所有内容均从AI产品经理视角出发，强调技术原理的产品应用
- **持续更新**：跟随AI技术发展持续迭代

---

## 在线访问

本知识库已部署在 Gitee Pages：

**访问地址**: 

GitHub Pages: `https://qingxiang1.github.io/ai-knowledge-base/`
Gitee Pages: `https://weibo-3880270936.gitee.io/ai-knowledge-base/`

---

## 目录结构

```
AI-PM-Knowledge
├── README.md                    # 项目说明
├── index.html                   # Gitee Pages 入口页面
│
├── 00-Roadmap                   # 学习路线
│   ├── AI产品经理成长路线.md
│   ├── 年度学习计划.md
│   ├── 月度学习计划.md
│   └── 能力模型.md
│
├── 01-产品经理基础              # 产品基础能力
│   ├── 产品经理认知.md
│   ├── 用户需求分析.md
│   ├── 用户画像.md
│   ├── 用户旅程图.md
│   ├── JTBD理论.md
│   ├── 产品生命周期.md
│   ├── 产品规划方法论.md
│   ├── MVP设计.md
│   ├── PRD编写规范.md
│   └── 产品案例分析.md
│
├── 02-AI基础知识               # AI技术基础
│   ├── AI发展史.md
│   ├── MachineLearning.md
│   ├── DeepLearning.md
│   ├── NLP基础.md
│   ├── Transformer.md
│   ├── Attention机制.md
│   ├── Token机制.md
│   ├── Embedding原理.md
│   ├── LLM工作原理.md
│   └── 大模型术语表.md
│
├── 03-Prompt工程               # 提示词工程
│   ├── Prompt基础.md
│   ├── Role设计.md
│   ├── FewShot.md
│   ├── ChainOfThought.md
│   ├── StructuredOutput.md
│   ├── Prompt优化技巧.md
│   ├── Prompt模板库.md
│   └── 企业级Prompt案例.md
│
├── 04-大模型生态               # 主流模型
│   ├── GPT系列.md
│   ├── Claude系列.md
│   ├── Gemini系列.md
│   ├── DeepSeek系列.md
│   ├── Qwen系列.md
│   ├── Llama系列.md
│   ├── 模型对比分析.md
│   └── 模型选型指南.md
│
├── 05-AI应用开发               # API开发
│   ├── OpenAI_API.md
│   ├── Claude_API.md
│   ├── Gemini_API.md
│   ├── DeepSeek_API.md
│   ├── FunctionCalling.md
│   ├── ToolCalling.md
│   ├── Streaming.md
│   ├── Token管理.md
│   └── 成本优化.md
│
├── 06-RAG知识库                # 检索增强
│   ├── RAG基础.md
│   ├── Chunk策略.md
│   ├── Embedding.md
│   ├── Recall.md
│   ├── Rerank.md
│   ├── HybridSearch.md
│   ├── 向量数据库.md
│   ├── Milvus.md
│   ├── Chroma.md
│   ├── Weaviate.md
│   └── 企业知识库设计.md
│
├── 07-Agent系统                # 智能代理
│   ├── Agent概念.md
│   ├── Agent架构.md
│   ├── Planning.md
│   ├── Memory.md
│   ├── Reflection.md
│   ├── ToolCalling.md
│   ├── MultiAgent.md
│   ├── Agent评测.md
│   └── Agent产品设计.md
│
├── 08-MCP生态                  # 模型上下文协议
│   ├── MCP基础.md
│   ├── MCP协议.md
│   ├── MCP服务端开发.md
│   ├── MCP客户端开发.md
│   ├── GitHub_MCP.md
│   ├── Notion_MCP.md
│   ├── 飞书_MCP.md
│   ├── 数据库_MCP.md
│   └── MCP最佳实践.md
│
├── 09-工作流编排               # 自动化工作流
│   ├── Dify.md
│   ├── Coze.md
│   ├── n8n.md
│   ├── Flowise.md
│   ├── LangChain.md
│   ├── LangGraph.md
│   ├── 工作流设计.md
│   └── 企业自动化方案.md
│
├── 10-AI产品设计               # AI产品设计
│   ├── AI产品设计原则.md
│   ├── AI用户体验.md
│   ├── Copilot设计.md
│   ├── Agent产品设计.md
│   ├── AI搜索设计.md
│   ├── AI客服设计.md
│   ├── AI知识库设计.md
│   └── AI办公助手设计.md
│
├── 11-数据分析                 # 数据指标
│   ├── 数据分析基础.md
│   ├── DAU.md
│   ├── WAU.md
│   ├── MAU.md
│   ├── 留存分析.md
│   ├── 转化分析.md
│   ├── 漏斗分析.md
│   ├── AI产品指标.md
│   └── Agent指标.md
│
├── 12-商业化                   # 商业策略
│   ├── SaaS模式.md
│   ├── Subscription.md
│   ├── API收费.md
│   ├── 企业版销售.md
│   ├── ARR.md
│   ├── MRR.md
│   ├── CAC.md
│   ├── LTV.md
│   └── ROI.md
│
├── 13-竞品分析                 # 竞品研究
│   ├── ChatGPT分析.md
│   ├── Claude分析.md
│   ├── Gemini分析.md
│   ├── Cursor分析.md
│   ├── Windsurf分析.md
│   ├── Perplexity分析.md
│   ├── NotionAI分析.md
│   └── Manus分析.md
│
├── 14-项目实战                 # 实战项目
│   ├── Project01-AI写作助手
│   ├── Project02-AI代码助手
│   ├── Project03-企业知识库
│   ├── Project04-Agent系统
│   ├── Project05-AI产品经理Copilot
│   ├── Project06-AI招聘助手
│   ├── Project07-AI客服系统
│   └── Project08-AI销售助手
│
├── 15-系统设计                 # 架构设计
│   ├── AI系统架构.md
│   ├── 高并发设计.md
│   ├── 多租户设计.md
│   ├── AI网关设计.md
│   ├── Prompt管理平台.md
│   ├── RAG平台设计.md
│   └── Agent平台设计.md
│
├── 16-面试准备                 # 求职面试
│   ├── AI产品经理面试题.md
│   ├── AI产品负责人面试题.md
│   ├── Agent面试题.md
│   ├── RAG面试题.md
│   ├── MCP面试题.md
│   ├── 产品设计题.md
│   └── 项目答辩模板.md
│
├── 17-作品集                   # 个人作品集
│   ├── 个人介绍.md
│   ├── 项目介绍.md
│   ├── 技术栈.md
│   ├── 产品案例.md
│   ├── 架构设计.md
│   └── 求职简历.md
│
└── 18-AI创业                   # 创业指南
    ├── AI创业方向.md
    ├── SaaS产品设计.md
    ├── PMF验证.md
    ├── MVP开发.md
    ├── 冷启动增长.md
    ├── 出海策略.md
    └── AI公司运营.md
```

---

## 学习路径

| 阶段 | 模块 | 核心目标 | 预计时长 |
|------|------|----------|----------|
| **入门** | 00-01 | 建立产品思维基础，了解AI产品经理能力模型 | 2-4周 |
| **筑基** | 02-04 | 掌握AI技术原理，理解大模型工作机制 | 4-6周 |
| **进阶** | 05-09 | 掌握核心技术能力（Prompt、RAG、Agent、MCP、工作流） | 6-8周 |
| **实战** | 10-14 | 产品设计与项目实战，完成完整项目案例 | 8-12周 |
| **高级** | 15-18 | 系统设计、商业思维、面试准备与职业发展 | 持续学习 |

---

## 内容特点

### 每个技术文档包含

```
文档结构
├── 原理讲解
│   ├── 概念定义
│   ├── 工作机制
│   └── 核心算法
├── 代码示例
│   ├── Python实现
│   ├── 关键类/函数注释
│   └── 使用示例
└── AI产品经理关注点
    ├── 产品应用场景
    ├── 技术选型建议
    └── 落地注意事项
```

### 代码规范

- 所有代码示例使用 **Python 3.10+**
- 包含函数级注释和类型提示
- 每个文件包含 FileHeader 注释（文件描述、作者、创建日期、最后修改日期）
- 代码可直接运行或稍作修改即可使用

---

## 本地使用

### 克隆仓库

```bash
git clone https://gitee.com/weibo-3880270936/ai-knowledge-base.git
cd ai-knowledge-base
```

### 本地预览

```bash
# 使用 Python 启动简易服务器
python -m http.server 8000

# 或使用 Node.js
npx serve .
```

---

## 贡献指南

欢迎提交 Issue 和 Pull Request 来完善知识库内容。

### 提交规范

- **文档补充**：针对现有章节的补充或修正
- **代码优化**：代码示例的改进或 Bug 修复
- **新章节**：新增学习模块或实战项目

---

## 相关资源

- [Gitee 仓库](https://gitee.com/weibo-3880270936/ai-knowledge-base)
- [GitHub 仓库](https://github.com/qingxiang1/ai-knowledge-base)
- [在线文档](https://weibo-3880270936.gitee.io/ai-knowledge-base/)

---

## 许可证

本项目采用 [Apache License 2.0](LICENSE) 开源协议。

---

> **声明**：本知识库内容仅供学习参考，部分技术内容会随AI行业发展持续更新。建议结合官方文档和最新论文进行深入学习。

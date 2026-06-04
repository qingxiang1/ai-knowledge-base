<!--
  文件描述: n8n自动化工作流指南，涵盖核心概念、节点组件、AI集成、工作流搭建及部署
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# n8n

> n8n 是一个开源的工作流自动化工具，支持 400+ 集成节点，可连接各种应用和服务，实现复杂的自动化流程。

---

## 一、n8n 概述

### 1.1 什么是 n8n

```
n8n 定义：

n8n 平台
├── 本质：工作流自动化平台（Workflow Automation）
├── 发起方：Jan Oberhauser（2019年开源）
├── 技术基础：Node.js + TypeScript
├── 核心定位：连接一切，自动化一切
└── 部署方式：
    ├── 本地部署（Docker/npm）
    ├── 云服务（n8n Cloud）
    └── 嵌入式（n8n Embed）

核心特性
├── 400+ 集成节点
│   ├── 数据库：MySQL/PostgreSQL/MongoDB
│   ├── 云服务：AWS/Azure/GCP
│   ├── 办公工具：Google Workspace/Office 365
│   ├── 通讯工具：Slack/Teams/钉钉
│   ├── 开发工具：GitHub/GitLab/Jira
│   └── AI 服务：OpenAI/Anthropic/本地模型
├── 可视化编排
│   └── 拖拽式节点连接
├── 代码扩展
│   ├── JavaScript/Python 代码节点
│   └── 自定义节点开发
├── 数据转换
│   ├── JSON/XML/CSV 处理
│   └── 数据映射和转换
├── 错误处理
│   ├── 重试机制
│   └── 错误分支
└── 权限管理
    ├── 多用户协作
    └── 角色权限控制

与其他工具对比
├── n8n vs Zapier
│   ├── n8n：开源、可私有化、更灵活
│   └── Zapier：云服务、易用、集成多
├── n8n vs Make
│   ├── n8n：代码扩展能力强
│   └── Make：可视化更强
└── n8n vs 专用 AI 工具
    ├── n8n：通用自动化 + AI 能力
    └── Dify/Coze：专注 LLM 应用
```

### 1.2 核心价值

```python
"""
n8n 核心价值分析

从 AI 产品经理视角理解 n8n 的价值
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class N8nValue:
    """n8n 价值点"""
    capability: str
    description: str
    use_case: str

class N8nValueAnalysis:
    """n8n 价值分析器"""
    
    def __init__(self):
        """初始化价值分析"""
        self.values = [
            N8nValue(
                capability="通用自动化引擎",
                description="连接任何 API、数据库、服务",
                use_case="企业系统集成、数据同步"
            ),
            N8nValue(
                capability="AI 工作流编排",
                description="集成 OpenAI、向量数据库等 AI 能力",
                use_case="AI 应用后端、智能数据处理"
            ),
            N8nValue(
                capability="私有化部署",
                description="完全开源，可部署在自有服务器",
                use_case="金融、医疗等数据敏感行业"
            ),
            N8nValue(
                capability="代码扩展能力",
                description="通过代码节点实现任意逻辑",
                use_case="复杂业务逻辑、自定义处理"
            ),
            N8nValue(
                capability="成本优势",
                description="开源免费，自托管无使用限制",
                use_case="大规模自动化、高频任务"
            )
        ]
    
    def analyze(self) -> List[Dict]:
        """
        分析价值
        
        Returns:
            价值分析结果
        """
        return [
            {
                "能力": v.capability,
                "说明": v.description,
                "适用场景": v.use_case
            }
            for v in self.values
        ]

# 使用示例
"""
analysis = N8nValueAnalysis()
for item in analysis.analyze():
    print(f"\n{item['能力']}:")
    print(f"  说明: {item['说明']}")
    print(f"  适用场景: {item['适用场景']}")
"""
```

---

## 二、环境搭建

### 2.1 本地部署

```bash
# 方式一：npm 安装
npm install n8n -g
n8n start

# 方式二：Docker 部署
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# 方式三：Docker Compose
curl -o docker-compose.yml https://raw.githubusercontent.com/n8n-io/n8n/master/docker-compose.yml
docker compose up -d

# 访问 http://localhost:5678
```

### 2.2 环境变量配置

```bash
# .env 配置
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=password

# 数据库（默认 SQLite，生产建议 PostgreSQL）
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=password

# 执行模式
EXECUTIONS_MODE=regular  # regular | queue

# 数据保存
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
EXECUTIONS_DATA_SAVE_ON_PROGRESS=true

# 时区
GENERIC_TIMEZONE=Asia/Shanghai

# Webhook URL
WEBHOOK_URL=https://your-domain.com/
```

---

## 三、核心节点

### 3.1 节点类型

```python
"""
n8n 节点分类

工作流的基本构建单元
"""

class N8nNodes:
    """n8n 节点说明"""
    
    @staticmethod
    def get_node_categories() -> dict:
        """
        获取节点分类
        
        Returns:
            节点分类
        """
        return {
            "Triggers": {
                "description": "触发器节点",
                "nodes": [
                    "Webhook（HTTP 请求触发）",
                    "Schedule（定时触发）",
                    "Email Trigger（邮件触发）",
                    "Form Trigger（表单触发）",
                    "Chat Trigger（聊天触发）",
                    "Error Trigger（错误触发）"
                ]
            },
            "AI Nodes": {
                "description": "AI 节点",
                "nodes": [
                    "AI Agent（AI 智能体）",
                    "Basic LLM Chain（基础 LLM 链）",
                    "Retrieval QA Chain（RAG 问答链）",
                    "Embeddings（向量化）",
                    "Vector Store（向量数据库）",
                    "Text Splitter（文本分割）",
                    "Window Buffer Memory（窗口记忆）"
                ]
            },
            "Data & Transform": {
                "description": "数据处理",
                "nodes": [
                    "Code（代码节点）",
                    "Function（函数节点）",
                    "Set（设置变量）",
                    "IF（条件分支）",
                    "Switch（多分支）",
                    "Merge（合并数据）",
                    "Split Out（拆分数据）"
                ]
            },
            "Database": {
                "description": "数据库",
                "nodes": [
                    "MySQL",
                    "PostgreSQL",
                    "MongoDB",
                    "Redis",
                    "SQLite",
                    "Microsoft SQL"
                ]
            },
            "Communication": {
                "description": "通讯工具",
                "nodes": [
                    "Slack",
                    "Microsoft Teams",
                    "Telegram",
                    "Email",
                    "Discord",
                    "钉钉"
                ]
            },
            "Development": {
                "description": "开发工具",
                "nodes": [
                    "GitHub",
                    "GitLab",
                    "Jira",
                    "HTTP Request",
                    "GraphQL",
                    "Webhook"
                ]
            },
            "File & Media": {
                "description": "文件处理",
                "nodes": [
                    "Read Binary Files",
                    "Write Binary Files",
                    "Spreadsheet File",
                    "XML",
                    "JSON",
                    "CSV"
                ]
            }
        }
    
    @staticmethod
    def node_configuration_example() -> dict:
        """
        节点配置示例
        
        Returns:
            配置示例
        """
        return {
            "AI Agent": {
                "options": {
                    "systemMessage": "你是一个 helpful 的助手",
                    "maxIterations": 10
                },
                "model": "gpt-4",
                "tools": ["Calculator", "Web Search"]
            },
            "Webhook": {
                "httpMethod": "POST",
                "path": "webhook-path",
                "responseMode": "responseNode"
            },
            "Code": {
                "language": "python",
                "code": """
import json

# 获取输入数据
items = $input.all()

# 处理数据
results = []
for item in items:
    data = item.json
    # 自定义处理逻辑
    processed = {
        "original": data,
        "processed": True
    }
    results.append(processed)

# 返回结果
return results
"""
            }
        }

# 节点连接规则
"""
连接规则：

1. 触发器只能作为起点
2. 每个节点可以有多个输入
3. 每个节点可以有多个输出（通过 IF/Switch）
4. 循环需要特殊处理（Split In Batches）
5. 错误输出可以单独处理
"""
```

---

## 四、AI 工作流搭建

### 4.1 基础 AI 工作流

```python
"""
n8n AI 工作流搭建

使用 n8n 构建 AI 应用
"""

class N8nAIWorkflow:
    """n8n AI 工作流示例"""
    
    @staticmethod
    def simple_chat_workflow():
        """
        简单对话工作流
        
        节点连接：
        Webhook → Basic LLM Chain → Respond to Webhook
        """
        return {
            "name": "简单对话 API",
            "nodes": [
                {
                    "id": "webhook_1",
                    "type": "n8n-nodes-base.webhook",
                    "position": [250, 300],
                    "parameters": {
                        "httpMethod": "POST",
                        "path": "chat",
                        "responseMode": "responseNode"
                    }
                },
                {
                    "id": "llm_chain_1",
                    "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
                    "position": [450, 300],
                    "parameters": {
                        "model": "gpt-3.5-turbo",
                        "options": {
                            "temperature": 0.7
                        }
                    }
                },
                {
                    "id": "respond_1",
                    "type": "n8n-nodes-base.respondToWebhook",
                    "position": [650, 300],
                    "parameters": {
                        "options": {}
                    }
                }
            ],
            "connections": {
                "webhook_1": {
                    "main": [[{"node": "llm_chain_1", "type": "main", "index": 0}]]
                },
                "llm_chain_1": {
                    "main": [[{"node": "respond_1", "type": "main", "index": 0}]]
                }
            }
        }
    
    @staticmethod
    def rag_workflow():
        """
        RAG 知识库工作流
        
        节点连接：
        Webhook → Document Loader → Text Splitter → Embeddings → Vector Store
        Webhook → Vector Store Retriever → Retrieval QA Chain → Respond
        """
        return {
            "name": "RAG 知识库问答",
            "nodes": [
                {
                    "id": "webhook_1",
                    "type": "n8n-nodes-base.webhook",
                    "parameters": {
                        "httpMethod": "POST",
                        "path": "rag-chat",
                        "responseMode": "responseNode"
                    }
                },
                {
                    "id": "document_loader",
                    "type": "n8n-nodes-base.readBinaryFiles",
                    "parameters": {
                        "fileSelector": "=/docs/*.pdf"
                    }
                },
                {
                    "id": "text_splitter",
                    "type": "@n8n/n8n-nodes-langchain.textSplitter",
                    "parameters": {
                        "chunkSize": 1000,
                        "chunkOverlap": 200
                    }
                },
                {
                    "id": "embeddings",
                    "type": "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
                    "parameters": {
                        "model": "text-embedding-ada-002"
                    }
                },
                {
                    "id": "vector_store",
                    "type": "@n8n/n8n-nodes-langchain.vectorStoreInMemory",
                    "parameters": {}
                },
                {
                    "id": "retriever",
                    "type": "@n8n/n8n-nodes-langchain.retriever",
                    "parameters": {
                        "topK": 4
                    }
                },
                {
                    "id": "qa_chain",
                    "type": "@n8n/n8n-nodes-langchain.chainRetrievalQa",
                    "parameters": {
                        "options": {
                            "systemMessage": "基于以下文档回答问题"
                        }
                    }
                },
                {
                    "id": "respond_1",
                    "type": "n8n-nodes-base.respondToWebhook",
                    "parameters": {}
                }
            ]
        }
    
    @staticmethod
    def agent_workflow():
        """
        Agent 工作流
        
        节点连接：
        Chat Trigger → AI Agent (with Tools) → Respond
        """
        return {
            "name": "工具 Agent",
            "nodes": [
                {
                    "id": "chat_trigger",
                    "type": "@n8n/n8n-nodes-langchain.chatTrigger",
                    "parameters": {
                        "options": {
                            "public": True
                        }
                    }
                },
                {
                    "id": "ai_agent",
                    "type": "@n8n/n8n-nodes-langchain.agent",
                    "parameters": {
                        "options": {
                            "systemMessage": "你是一个 helpful 的助手，可以使用工具帮助用户",
                            "maxIterations": 10
                        }
                    }
                },
                {
                    "id": "calculator_tool",
                    "type": "@n8n/n8n-nodes-langchain.toolCalculator",
                    "parameters": {}
                },
                {
                    "id": "http_tool",
                    "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
                    "parameters": {
                        "method": "GET",
                        "url": "https://api.example.com/data"
                    }
                },
                {
                    "id": "respond_1",
                    "type": "n8n-nodes-base.respondToWebhook",
                    "parameters": {}
                }
            ]
        }

# 工作流设计技巧
"""
设计技巧：

1. 错误处理
   ├── 每个节点设置重试次数
   ├── 错误输出连接到通知节点
   └── 记录错误日志

2. 性能优化
   ├── 使用 Batch 处理大量数据
   ├── 设置合理的超时时间
   └── 使用 Queue 模式处理高并发

3. 数据管理
   ├── 使用 Set 节点清理数据
   ├── 使用 Code 节点自定义转换
   └── 使用 Merge 节点合并数据流

4. 安全考虑
   ├── 敏感信息使用 Credentials
   ├── Webhook 设置认证
   └── 限制执行权限
"""
```

---

## 五、高级功能

### 5.1 自定义节点开发

```python
"""
n8n 自定义节点开发

扩展 n8n 功能
"""

"""
自定义节点目录结构：

nodes/
├── MyCustomNode/
│   ├── MyCustomNode.node.ts    # 节点逻辑
│   ├── MyCustomNode.svg        # 节点图标
│   └── myCustomNode.svg        # 节点图标（备选）
└── package.json

"""

# MyCustomNode.node.ts 示例
"""
import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

export class MyCustomNode implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'My Custom Node',
        name: 'myCustomNode',
        icon: 'file:myCustomNode.svg',
        group: ['transform'],
        version: 1,
        description: '自定义节点示例',
        defaults: {
            name: 'My Custom Node',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Transform',
                        value: 'transform',
                        description: '转换数据',
                    },
                    {
                        name: 'Analyze',
                        value: 'analyze',
                        description: '分析数据',
                    },
                ],
                default: 'transform',
            },
            {
                displayName: 'Input Field',
                name: 'inputField',
                type: 'string',
                default: 'data',
                description: '输入字段名',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const operation = this.getNodeParameter('operation', 0) as string;

        for (let i = 0; i < items.length; i++) {
            try {
                const inputField = this.getNodeParameter('inputField', i) as string;
                const item = items[i].json;

                let result;
                if (operation === 'transform') {
                    result = {
                        original: item[inputField],
                        transformed: item[inputField]?.toUpperCase(),
                        timestamp: new Date().toISOString(),
                    };
                } else if (operation === 'analyze') {
                    const data = item[inputField];
                    result = {
                        length: data?.length || 0,
                        type: typeof data,
                        isEmpty: !data,
                    };
                }

                returnData.push({
                    json: result,
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
                        },
                    });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error);
            }
        }

        return [returnData];
    }
}
"""

# package.json
"""
{
  "name": "n8n-nodes-my-custom",
  "version": "0.1.0",
  "description": "n8n 自定义节点",
  "keywords": ["n8n", "node"],
  "license": "MIT",
  "homepage": "https://github.com/your-org/n8n-nodes-my-custom",
  "author": {
    "name": "Your Name",
    "email": "your@email.com"
  },
  "main": "index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint nodes credentials package.json"
  },
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [],
    "nodes": [
      "dist/nodes/MyCustomNode/MyCustomNode.node.js"
    ]
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "n8n-workflow": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
"""
```

### 5.2 工作流模板

```python
"""
n8n 工作流模板

常用工作流模式
"""

class N8nWorkflowTemplates:
    """n8n 工作流模板"""
    
    @staticmethod
    def data_sync_template():
        """
        数据同步模板
        
        定时从 API 获取数据，处理后存入数据库
        """
        return {
            "name": "数据同步",
            "trigger": {
                "type": "Schedule",
                "interval": "0 */6 * * *"  # 每6小时
            },
            "nodes": [
                "Schedule Trigger",
                "HTTP Request（获取数据）",
                "Code（数据清洗）",
                "IF（数据验证）",
                "PostgreSQL（插入数据）",
                "Slack（通知结果）"
            ]
        }
    
    @staticmethod
    def approval_workflow_template():
        """
        审批工作流模板
        
        表单提交 → 审批 → 通知 → 执行
        """
        return {
            "name": "审批流程",
            "trigger": {
                "type": "Form Trigger"
            },
            "nodes": [
                "Form Trigger（表单提交）",
                "Set（设置审批人）",
                "Email（发送审批邮件）",
                "Wait（等待审批）",
                "IF（审批结果）",
                "HTTP Request（执行操作）",
                "Slack（通知结果）"
            ]
        }
    
    @staticmethod
    def ai_content_pipeline():
        """
        AI 内容生成流水线
        
        主题输入 → AI 生成 → 审核 → 发布
        """
        return {
            "name": "AI 内容生成",
            "trigger": {
                "type": "Webhook",
                "path": "generate-content"
            },
            "nodes": [
                "Webhook（接收主题）",
                "Basic LLM Chain（生成大纲）",
                "Basic LLM Chain（生成内容）",
                "Code（内容格式化）",
                "IF（质量检查）",
                "HTTP Request（发布到 CMS）",
                "Email（通知完成）"
            ]
        }
    
    @staticmethod
    def error_handling_pattern():
        """
        错误处理模式
        
        主流程 + 错误捕获 + 通知
        """
        return {
            "name": "错误处理示例",
            "nodes": [
                "Trigger",
                "Main Operation",
                "IF（检查错误）",
                "Error Handler",
                "Slack（错误通知）",
                "Log（记录日志）"
            ],
            "error_handling": {
                "retry": {
                    "maxRetries": 3,
                    "waitBetweenRetries": 5000
                },
                "onError": {
                    "continue": False,
                    "notify": True
                }
            }
        }

# 模板使用建议
"""
使用建议：

1. 导入模板
   ├── 从 n8n 官网下载
   ├── 从社区获取
   └── 自定义模板

2. 修改模板
   ├── 修改触发器配置
   ├── 调整节点参数
   └── 添加业务逻辑

3. 保存模板
   ├── 导出为 JSON
   ├── 保存到版本控制
   └── 分享给团队
"""
```

---

## 六、AI 产品经理关注点

```
n8n 产品化要点：

适用场景
├── 强烈推荐
│   ├── 企业系统集成（ERP/CRM/OA）
│   ├── 数据同步与 ETL
│   ├── AI 应用后端编排
│   ├── 自动化运维
│   └── 业务流程自动化
├── 可以考虑
│   ├── 简单 AI 对话（有其他更优选择）
│   ├── 高并发实时处理
│   └── 复杂状态机工作流
└── 不推荐
    ├── 纯前端交互应用
    ├── 需要复杂 UI 的场景
    └── 实时协作编辑

团队要求
├── 技术能力
│   ├── JavaScript/Python 基础
│   ├── API 集成经验
│   ├── 数据库操作能力
│   └── Docker 部署知识
├── 人员配置
│   ├── 1 名技术（部署维护）
│   ├── 1 名产品经理
│   └── 1-2 名业务分析师

成本分析
├── 基础设施
│   ├── 服务器：$50-500/月
│   ├── 数据库：$20-200/月
│   └── 模型 API：按量计费
├── 人力成本
│   ├── 搭建：3-5 天
│   ├── 维护：0.5 人/月
│   └── 优化：按需投入
├── 与其他工具对比
│   ├── n8n Cloud：$20-50/月
│   ├── Zapier：$20-100/月
│   └── Make：$9-16/月

关键指标
├── 技术指标
│   ├── 执行成功率 > 95%
│   ├── 平均执行时间 < 30s
│   └── 并发处理能力
├── 业务指标
│   ├── 流程自动化率
│   ├── 人工处理减少率
│   └── 错误率 < 5%
└── 成本指标
    ├── 单次执行成本
    ├── 月运营成本
    └── ROI（投资回报率）

与竞品对比
├── n8n vs Dify
│   ├── n8n：通用自动化 + AI
│   └── Dify：专注 LLM 应用
├── n8n vs Coze
│   ├── n8n：开源可私有化
│   └── Coze：云服务快速上线
└── n8n vs 自研
    ├── n8n：快速搭建，维护成本低
    └── 自研：完全定制，开发成本高

落地建议
├── 阶段一：快速验证
│   ├── 使用 n8n Cloud 或 Docker 本地部署
│   ├── 搭建 1-2 个核心工作流
│   └── 验证业务价值
├── 阶段二：扩展应用
│   ├── 迁移到自托管（如需）
│   ├── 开发自定义节点
│   └── 建立工作流库
└── 阶段三：规模化
    ├── 配置高可用架构
    ├── 建立监控告警
    └── 制定运维规范
```

---

## 七、参考资源

- [n8n 官方文档](https://docs.n8n.io/) - n8n 官方文档
- [n8n GitHub](https://github.com/n8n-io/n8n) - 开源仓库
- [n8n 工作流市场](https://n8n.io/workflows) - 社区工作流模板
- [n8n 社区论坛](https://community.n8n.io/) - 社区支持
- [n8n AI 节点文档](https://docs.n8n.io/integrations/builtin/cluster-nodes/) - AI 节点说明

<!--
  文件描述: Flowise可视化编排指南，涵盖核心概念、节点组件、工作流搭建、API集成及部署
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Flowise

> Flowise 是一个开源的低代码 LLM 应用构建工具，通过拖拽式界面快速搭建 LangChain 工作流。

---

## 一、Flowise 概述

### 1.1 什么是 Flowise

```
Flowise 定义：

Flowise 平台
├── 本质：LangChain 的可视化封装工具
├── 发起方：FlowiseAI 团队（2023年开源）
├── 技术基础：Node.js + React + LangChain
├── 核心定位：让非开发者也能构建 LLM 应用
└── 部署方式：
    ├── 本地部署（Docker/npm）
    ├── 云服务（Flowise Cloud）
    └── 嵌入式（React Component）

核心特性
├── 拖拽式界面
│   └── 可视化节点编排
├── 与 LangChain 深度集成
│   └── 支持所有 LangChain 组件
├── 多种输出格式
│   ├── Chatflow（对话流）
    ├── Workflow（工作流）
    └── Agent（智能体）
├── API 自动生成
│   └── 构建完成后自动生成 API
└── 多模型支持
    └── OpenAI/Anthropic/Azure/本地模型

与 LangChain 的关系
├── Flowise 是 LangChain 的 GUI
├── 底层使用 LangChain 代码
├── 可以导出为 LangChain 代码
└── 支持自定义代码节点
```

### 1.2 核心价值

```python
"""
Flowise 核心价值分析

从 AI 产品经理视角理解 Flowise 的价值
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class FlowiseValue:
    """Flowise 价值点"""
    capability: str
    description: str
    target_user: str

class FlowiseValueAnalysis:
    """Flowise 价值分析器"""
    
    def __init__(self):
        """初始化价值分析"""
        self.values = [
            FlowiseValue(
                capability="可视化 LLM 编排",
                description="拖拽节点即可构建复杂的 LLM 工作流",
                target_user="非技术产品经理、业务人员"
            ),
            FlowiseValue(
                capability="LangChain 代码导出",
                description="可视化编排后可导出为 Python/JS 代码",
                target_user="开发者、技术团队"
            ),
            FlowiseValue(
                capability="快速原型验证",
                description="数小时完成 LLM 应用原型",
                target_user="初创团队、POC 验证"
            ),
            FlowiseValue(
                capability="API 自动生成",
                description="构建完成后自动提供 REST API",
                target_user="需要集成的开发团队"
            ),
            FlowiseValue(
                capability="私有化部署",
                description="支持本地/私有云部署，数据安全",
                target_user="金融、医疗等敏感行业"
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
                "目标用户": v.target_user
            }
            for v in self.values
        ]

# 使用示例
"""
analysis = FlowiseValueAnalysis()
for item in analysis.analyze():
    print(f"\n{item['能力']}:")
    print(f"  说明: {item['说明']}")
    print(f"  目标用户: {item['目标用户']}")
"""
```

---

## 二、环境搭建

### 2.1 本地部署

```bash
# 方式一：npm 安装
npm install -g flowise
npx flowise start

# 方式二：Docker 部署
docker run -d --name flowise \
  -p 3000:3000 \
  -v ~/.flowise:/root/.flowise \
  flowiseai/flowise

# 方式三：Docker Compose
git clone https://github.com/FlowiseAI/Flowise.git
cd Flowise/docker
 docker compose up -d

# 访问 http://localhost:3000
```

### 2.2 环境变量配置

```bash
# .env 配置
PORT=3000
FLOWISE_USERNAME=admin
FLOWISE_PASSWORD=password

# 数据库（可选，默认 SQLite）
DATABASE_TYPE=postgres
DATABASE_PORT=5432
DATABASE_HOST=localhost
DATABASE_NAME=flowise
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# 日志
LOG_LEVEL=info
LOG_PATH=/root/.flowise/logs

# 加密密钥
FLOWISE_SECRETKEY_OVERWRITE=mysecretkey
```

---

## 三、节点组件

### 3.1 核心节点类型

```python
"""
Flowise 节点组件

可视化编排的基本单元
"""

class FlowiseNodes:
    """Flowise 节点说明"""
    
    @staticmethod
    def get_node_categories() -> dict:
        """
        获取节点分类
        
        Returns:
            节点分类
        """
        return {
            "Agents": {
                "description": "智能体节点",
                "nodes": [
                    "Conversational Agent",
                    "OpenAI Function Agent",
                    "ReAct Agent",
                    "Tool Agent"
                ]
            },
            "Chains": {
                "description": "链式节点",
                "nodes": [
                    "LLM Chain",
                    "Retrieval QA Chain",
                    "Conversational Retrieval QA Chain",
                    "API Chain"
                ]
            },
            "Chat Models": {
                "description": "聊天模型",
                "nodes": [
                    "ChatOpenAI",
                    "ChatAnthropic",
                    "Azure ChatOpenAI",
                    "ChatLocalAI"
                ]
            },
            "Document Loaders": {
                "description": "文档加载器",
                "nodes": [
                    "Text File",
                    "PDF File",
                    "CSV File",
                    "Web Page",
                    "Notion",
                    "GitHub"
                ]
            },
            "Embeddings": {
                "description": "向量化模型",
                "nodes": [
                    "OpenAI Embeddings",
                    "Azure OpenAI Embeddings",
                    "LocalAI Embeddings",
                    "Ollama Embeddings"
                ]
            },
            "Memory": {
                "description": "记忆组件",
                "nodes": [
                    "Buffer Memory",
                    "Buffer Window Memory",
                    "Conversation Summary Memory",
                    "Vector Store Memory"
                ]
            },
            "Prompts": {
                "description": "提示词模板",
                "nodes": [
                    "Prompt Template",
                    "Chat Prompt Template",
                    "Few Shot Prompt Template"
                ]
            },
            "Retrievers": {
                "description": "检索器",
                "nodes": [
                    "Vector Store Retriever",
                    "Multi Query Retriever",
                    "Contextual Compression Retriever"
                ]
            },
            "Text Splitters": {
                "description": "文本分割器",
                "nodes": [
                    "Character Text Splitter",
                    "Recursive Character Text Splitter",
                    "Token Text Splitter"
                ]
            },
            "Tools": {
                "description": "工具",
                "nodes": [
                    "Calculator",
                    "Search API",
                    "Custom Tool",
                    "Web Browser"
                ]
            },
            "Vector Stores": {
                "description": "向量数据库",
                "nodes": [
                    "Chroma",
                    "Pinecone",
                    "Weaviate",
                    "Qdrant",
                    "In-Memory"
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
            "ChatOpenAI": {
                "modelName": "gpt-3.5-turbo",
                "temperature": 0.7,
                "maxTokens": 2000,
                "topP": 1,
                "frequencyPenalty": 0,
                "presencePenalty": 0,
                "timeout": 30000,
                "baseOptions": {
                    "apiKey": "${OPENAI_API_KEY}"
                }
            },
            "Chroma": {
                "collectionName": "flowise_collection",
                "chromaMetadata": {},
                "topK": 4
            },
            "Prompt Template": {
                "template": "基于以下上下文回答问题：\n\n{context}\n\n问题：{question}",
                "inputVariables": ["context", "question"]
            }
        }

# 节点连接规则
"""
连接规则：

1. 输入输出类型匹配
   ├── Text → Text
   ├── Document → Document
   ├── Vector → Vector
   └── Message → Message

2. 必需连接
   ├── Chat Model 必须有 API Key
   ├── Vector Store 必须有 Embeddings
   └── Retriever 必须有 Vector Store

3. 可选连接
   ├── Memory（可选）
   ├── Tools（可选）
   └── Callbacks（可选）
"""
```

---

## 四、工作流搭建

### 4.1 基础 Chatflow

```python
"""
Flowise 基础 Chatflow 搭建

对话型 LLM 应用的构建
"""

class FlowiseChatflow:
    """Flowise Chatflow 示例"""
    
    @staticmethod
    def simple_chatflow():
        """
        简单对话流
        
        节点连接：
        ChatOpenAI ← Prompt Template ← User Input
        """
        return {
            "name": "简单对话",
            "nodes": [
                {
                    "id": "chatOpenAI_1",
                    "type": "ChatOpenAI",
                    "position": {"x": 400, "y": 200},
                    "data": {
                        "modelName": "gpt-3.5-turbo",
                        "temperature": 0.7
                    }
                },
                {
                    "id": "promptTemplate_1",
                    "type": "Prompt Template",
                    "position": {"x": 200, "y": 100},
                    "data": {
                        "template": "你是一个 helpful 的助手。\n\n用户：{input}\n助手：",
                        "inputVariables": ["input"]
                    }
                }
            ],
            "edges": [
                {
                    "source": "promptTemplate_1",
                    "target": "chatOpenAI_1",
                    "sourceHandle": "output",
                    "targetHandle": "prompt"
                }
            ]
        }
    
    @staticmethod
    def rag_chatflow():
        """
        RAG 对话流
        
        节点连接：
        PDF File → Text Splitter → OpenAI Embeddings → Chroma
        Chroma → Vector Store Retriever → Retrieval QA Chain → ChatOpenAI
        """
        return {
            "name": "RAG 知识库问答",
            "nodes": [
                {
                    "id": "pdfFile_1",
                    "type": "PDF File",
                    "data": {"pdfFile": "./docs/knowledge.pdf"}
                },
                {
                    "id": "textSplitter_1",
                    "type": "Recursive Character Text Splitter",
                    "data": {
                        "chunkSize": 1000,
                        "chunkOverlap": 200
                    }
                },
                {
                    "id": "openAIEmbeddings_1",
                    "type": "OpenAI Embeddings",
                    "data": {"modelName": "text-embedding-ada-002"}
                },
                {
                    "id": "chroma_1",
                    "type": "Chroma",
                    "data": {"collectionName": "rag_collection"}
                },
                {
                    "id": "retriever_1",
                    "type": "Vector Store Retriever",
                    "data": {"topK": 4}
                },
                {
                    "id": "retrievalQAChain_1",
                    "type": "Retrieval QA Chain",
                    "data": {
                        "chainType": "stuff",
                        "returnSourceDocuments": True
                    }
                },
                {
                    "id": "chatOpenAI_1",
                    "type": "ChatOpenAI",
                    "data": {"modelName": "gpt-3.5-turbo"}
                }
            ],
            "edges": [
                {"source": "pdfFile_1", "target": "textSplitter_1"},
                {"source": "textSplitter_1", "target": "openAIEmbeddings_1"},
                {"source": "openAIEmbeddings_1", "target": "chroma_1"},
                {"source": "chroma_1", "target": "retriever_1"},
                {"source": "retriever_1", "target": "retrievalQAChain_1"},
                {"source": "chatOpenAI_1", "target": "retrievalQAChain_1"}
            ]
        }
    
    @staticmethod
    def agent_chatflow():
        """
        Agent 对话流
        
        节点连接：
        Tools + ChatOpenAI + Memory → Conversational Agent
        """
        return {
            "name": "工具 Agent",
            "nodes": [
                {
                    "id": "calculator_1",
                    "type": "Calculator",
                    "data": {"description": "用于数学计算"}
                },
                {
                    "id": "searchAPI_1",
                    "type": "Search API",
                    "data": {"apiKey": "${SEARCH_API_KEY}"}
                },
                {
                    "id": "chatOpenAI_1",
                    "type": "ChatOpenAI",
                    "data": {"modelName": "gpt-4"}
                },
                {
                    "id": "bufferMemory_1",
                    "type": "Buffer Memory",
                    "data": {"memoryKey": "chat_history"}
                },
                {
                    "id": "conversationalAgent_1",
                    "type": "Conversational Agent",
                    "data": {"systemMessage": "你是一个 helpful 的助手"}
                }
            ],
            "edges": [
                {"source": "calculator_1", "target": "conversationalAgent_1"},
                {"source": "searchAPI_1", "target": "conversationalAgent_1"},
                {"source": "chatOpenAI_1", "target": "conversationalAgent_1"},
                {"source": "bufferMemory_1", "target": "conversationalAgent_1"}
            ]
        }

# 搭建技巧
"""
搭建技巧：

1. 从左到右布局
   ├── 输入节点在左侧
   ├── 处理节点在中间
   └── 输出节点在右侧

2. 颜色编码
   ├── 蓝色：模型节点
   ├── 绿色：数据节点
   ├── 黄色：工具节点
   └── 紫色：链节点

3. 命名规范
   ├── 使用有意义的节点名
   ├── 添加节点描述
   └── 版本管理

4. 测试验证
   ├── 逐个节点测试
   ├── 使用 Debug 模式
   └── 查看中间输出
"""
```

---

## 五、API 集成

### 5.1 自动生成 API

```python
"""
Flowise API 集成

构建完成后自动生成 REST API
"""

import requests
import json

class FlowiseAPI:
    """Flowise API 客户端"""
    
    def __init__(self, base_url: str = "http://localhost:3000", api_key: str = None):
        """
        初始化客户端
        
        Args:
            base_url: Flowise 服务地址
            api_key: API 密钥（可选）
        """
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {
            "Content-Type": "application/json"
        }
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"
    
    def get_chatflows(self) -> list:
        """
        获取所有 Chatflow
        
        Returns:
            Chatflow 列表
        """
        response = requests.get(
            f"{self.base_url}/api/v1/chatflows",
            headers=self.headers
        )
        return response.json()
    
    def send_message(self, chatflow_id: str, message: str, 
                    streaming: bool = False) -> dict:
        """
        发送消息
        
        Args:
            chatflow_id: Chatflow ID
            message: 用户消息
            streaming: 是否流式输出
        
        Returns:
            响应结果
        """
        url = f"{self.base_url}/api/v1/prediction/{chatflow_id}"
        
        payload = {
            "question": message,
            "streaming": streaming
        }
        
        if streaming:
            response = requests.post(url, headers=self.headers, 
                                   json=payload, stream=True)
            for line in response.iter_lines():
                if line:
                    print(line.decode('utf-8'))
            return {}
        else:
            response = requests.post(url, headers=self.headers, json=payload)
            return response.json()
    
    def upload_document(self, chatflow_id: str, file_path: str) -> dict:
        """
        上传文档
        
        Args:
            chatflow_id: Chatflow ID
            file_path: 文件路径
        
        Returns:
            上传结果
        """
        url = f"{self.base_url}/api/v1/vectorstore/upsert/{chatflow_id}"
        
        with open(file_path, 'rb') as f:
            files = {'files': f}
            response = requests.post(url, headers={
                "Authorization": self.headers.get("Authorization", "")
            }, files=files)
        
        return response.json()

# API 使用示例
"""
client = FlowiseAPI(base_url="http://localhost:3000")

# 获取 Chatflow 列表
chatflows = client.get_chatflows()
chatflow_id = chatflows[0]["id"]

# 发送消息
result = client.send_message(
    chatflow_id=chatflow_id,
    message="什么是 RAG？"
)
print(result["text"])

# 流式输出
client.send_message(
    chatflow_id=chatflow_id,
    message="写一首诗",
    streaming=True
)
"""
```

---

## 六、AI 产品经理关注点

```
Flowise 产品化要点：

适用场景
├── 强烈推荐
│   ├── 快速 LLM 原型验证
│   ├── 内部工具搭建
│   ├── 知识库问答系统
│   └── 多模型对比测试
├── 可以考虑
│   ├── 生产环境部署（需优化）
│   ├── 复杂 Agent 系统
│   └── 高并发场景
└── 不推荐
    ├── 简单对话（直接调 API 即可）
    ├── 需要深度定制 UI
    └── 移动端应用

团队要求
├── 技术能力
│   ├── 基础 Docker 知识
│   ├── API 集成能力
│   └── 节点调试能力
├── 人员配置
│   ├── 0.5 名技术（部署维护）
│   ├── 1 名产品经理
│   └── 1 名业务专家

成本分析
├── 基础设施
│   ├── 服务器：$50-200/月
│   ├── 模型 API：按量计费
│   └── 向量数据库：$20-100/月
├── 人力成本
│   ├── 搭建：1-2 天
│   ├── 维护：0.2 人/月
│   └── 优化：按需投入

关键指标
├── 技术指标
│   ├── 响应时间 < 5s
│   ├── 可用性 > 99%
│   └── 并发支持 > 100
├── 业务指标
│   ├── 任务完成率 > 90%
│   ├── 用户满意度 > 4.0/5
│   └── 知识库准确率 > 85%
└── 成本指标
    ├── 单次调用成本
    ├── 月活跃用户成本
    └── 基础设施利用率

与竞品对比
├── Flowise vs Dify
│   ├── Flowise：更灵活，LangChain 原生
│   └── Dify：更完善，企业功能多
├── Flowise vs Coze
│   ├── Flowise：开源可私有化
│   └── Coze：云服务，快速上线
└── Flowise vs LangChain 代码
    ├── Flowise：可视化，快速搭建
    └── 代码：更灵活，性能更好

落地建议
├── 阶段一：快速验证
│   ├── 使用 Docker 本地部署
│   ├── 搭建简单 Chatflow
│   └── 验证核心场景
├── 阶段二：优化迭代
│   ├── 优化 Prompt 和参数
│   ├── 完善知识库
│   └── 添加监控
└── 阶段三：生产部署
    ├── 迁移到生产环境
    ├── 配置负载均衡
    └── 建立运维体系
```

---

## 七、参考资源

- [Flowise 官方文档](https://docs.flowiseai.com/) - Flowise 官方文档
- [Flowise GitHub](https://github.com/FlowiseAI/Flowise) - 开源仓库
- [Flowise 市场](https://flowiseai.com/marketplace) - 模板市场
- [LangChain 文档](https://python.langchain.com/) - LangChain 官方文档
- [Flowise YouTube](https://www.youtube.com/@FlowiseAI) - 视频教程

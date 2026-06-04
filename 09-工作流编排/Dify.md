<!--
  文件描述: Dify平台使用指南，涵盖核心概念、应用创建、工作流编排、知识库管理及模型配置
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Dify

> Dify 是一个开源的 LLM 应用开发平台，支持通过可视化界面快速构建 AI 应用、Agent 和工作流。

---

## 一、Dify 概述

### 1.1 什么是 Dify

```
Dify 定义：

Dify 平台
├── 本质：开源 LLM 应用开发平台
├── 发起方：LangGenius 团队
├── 核心定位：让开发者快速构建生产级 AI 应用
├── 部署方式：
│   ├── 云服务（dify.ai）
│   └── 社区版（Docker 本地部署）
└── 核心能力：
    ├── 可视化应用构建
    ├── 多模型支持
    ├── 知识库 RAG
    ├── Agent 编排
    └── 工作流设计

产品形态
├── Chatbot（对话型应用）
│   └── 类似 ChatGPT 的聊天界面
├── Text Generator（文本生成）
│   └── 单次文本生成任务
├── Agent（智能体）
│   └── 具备工具调用能力的自主 Agent
├── Workflow（工作流）
│   └── 复杂的多步骤自动化流程
└── Chatflow（对话流）
│   └── 结合对话交互的复杂流程
```

### 1.2 核心价值

```python
"""
Dify 核心价值分析

从 AI 产品经理视角理解 Dify 的价值
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class DifyValue:
    """Dify 价值点"""
    capability: str
    traditional_way: str
    dify_way: str
    time_saved: str

class DifyValueAnalysis:
    """Dify 价值分析器"""
    
    def __init__(self):
        """初始化价值分析"""
        self.values = [
            DifyValue(
                capability="AI 应用开发",
                traditional_way="编写大量代码，集成模型 API，处理上下文管理",
                dify_way="拖拽式界面，配置即可运行",
                time_saved="从数周缩短至数小时"
            ),
            DifyValue(
                capability="知识库搭建",
                traditional_way="自行实现文档解析、向量化、检索逻辑",
                dify_way="上传文档，自动完成 RAG 全流程",
                time_saved="从数天缩短至数分钟"
            ),
            DifyValue(
                capability="Prompt 管理",
                traditional_way="硬编码在代码中，版本混乱",
                dify_way="可视化编辑，版本管理，A/B 测试",
                time_saved="迭代效率提升 5x"
            ),
            DifyValue(
                capability="多模型切换",
                traditional_way="每个模型需要单独适配接口",
                dify_way="统一接口，一键切换模型",
                time_saved="迁移成本降低 90%"
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
                "传统方式": v.traditional_way,
                "Dify 方式": v.dify_way,
                "节省时间": v.time_saved
            }
            for v in self.values
        ]

# 使用示例
"""
analysis = DifyValueAnalysis()
for item in analysis.analyze():
    print(f"\n{item['能力']}:")
    print(f"  传统: {item['传统方式']}")
    print(f"  Dify: {item['Dify 方式']}")
    print(f"  收益: {item['节省时间']}")
"""
```

---

## 二、环境搭建

### 2.1 本地部署（Docker）

```bash
# 1. 克隆仓库
git clone https://github.com/langgenius/dify.git
cd dify/docker

# 2. 复制环境变量配置
cp .env.example .env

# 3. 启动服务（社区版）
docker compose up -d

# 4. 查看服务状态
docker compose ps

# 5. 访问 Dify
# 打开 http://localhost/install 完成初始化
```

### 2.2 环境变量配置

```bash
# .env 核心配置

# 数据库
DB_USERNAME=postgres
DB_PASSWORD=difyai123456
DB_HOST=db
DB_PORT=5432
DB_DATABASE=dify

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# 向量数据库（Weaviate）
WEAVIATE_HOST=weaviate
WEAVIATE_PORT=8080

# 存储
STORAGE_TYPE=local

# 模型 API Key（可选，也可在界面配置）
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
```

### 2.3 云服务使用

```
Dify 云服务：

1. 访问 https://dify.ai
2. 注册账号（支持邮箱/Google/GitHub）
3. 创建 Workspace
4. 配置模型提供商 API Key
5. 开始构建应用

免费额度：
├── 200 次 GPT-3.5 调用/天
├── 10 个应用
├── 5 个知识库
└── 社区支持
```

---

## 三、应用类型详解

### 3.1 Chatbot（对话应用）

```python
"""
Dify Chatbot 应用

最简单的对话型 AI 应用
"""

class DifyChatbot:
    """Dify Chatbot 应用说明"""
    
    def __init__(self):
        """初始化 Chatbot"""
        self.type = "chatbot"
        self.features = [
            "多轮对话",
            "上下文记忆",
            "预设提示词",
            "开场白设置",
            "追问建议"
        ]
    
    def configure(self, config: dict) -> dict:
        """
        配置 Chatbot
        
        Args:
            config: 配置参数
                - model: 模型名称
                - temperature: 温度参数
                - max_tokens: 最大token数
                - system_prompt: 系统提示词
                - opening_statement: 开场白
        
        Returns:
            配置结果
        """
        return {
            "type": self.type,
            "model": config.get("model", "gpt-3.5-turbo"),
            "temperature": config.get("temperature", 0.7),
            "system_prompt": config.get("system_prompt", ""),
            "opening_statement": config.get("opening_statement", "你好！有什么可以帮助你的？")
        }
    
    def get_api_example(self) -> dict:
        """
        获取 API 调用示例
        
        Returns:
            API 调用示例
        """
        return {
            "endpoint": "/v1/chat-messages",
            "method": "POST",
            "headers": {
                "Authorization": "Bearer {api_key}",
                "Content-Type": "application/json"
            },
            "body": {
                "inputs": {},
                "query": "你好",
                "response_mode": "streaming",
                "conversation_id": "",
                "user": "user-001"
            }
        }

# Chatbot 适用场景
"""
适用场景：
├── 客服机器人
├── 知识问答
├── 学习助手
├── 内容创作辅助
└── 日常对话
"""
```

### 3.2 Agent（智能体）

```python
"""
Dify Agent 应用

具备工具调用和自主决策能力的 AI Agent
"""

class DifyAgent:
    """Dify Agent 应用说明"""
    
    def __init__(self):
        """初始化 Agent"""
        self.type = "agent"
        self.strategy = "function_calling"  # 或 "react"
        self.tools = []
    
    def add_tool(self, tool_config: dict):
        """
        添加工具
        
        Args:
            tool_config: 工具配置
                - type: 工具类型（builtin/custom/api）
                - name: 工具名称
                - description: 工具描述
                - parameters: 工具参数
        """
        self.tools.append(tool_config)
    
    def configure_react(self, max_iterations: int = 5) -> dict:
        """
        配置 ReAct 策略
        
        Args:
            max_iterations: 最大迭代次数
        
        Returns:
            ReAct 配置
        """
        return {
            "strategy": "react",
            "max_iterations": max_iterations,
            "prompt": """你是一个智能助手，可以使用以下工具解决问题：

{tools}

请按照以下格式思考：
Thought: 我需要做什么
Action: 工具名称
Action Input: 工具输入
Observation: 工具返回结果

最终给出答案。"""
        }
    
    def configure_function_calling(self) -> dict:
        """
        配置 Function Calling 策略
        
        Returns:
            Function Calling 配置
        """
        return {
            "strategy": "function_calling",
            "prompt": "你是一个智能助手，可以根据需要调用工具来完成任务。"
        }

# Agent 内置工具
"""
内置工具：
├── Web Search（网页搜索）
│   └── 配置搜索引擎 API
├── DALL-E（图像生成）
│   └── 配置 OpenAI API Key
├── Stable Diffusion（图像生成）
│   └── 配置 SD 服务地址
├── Wikipedia（百科查询）
├── Google Search（谷歌搜索）
└── 自定义 API 工具
"""
```

### 3.3 Workflow（工作流）

```python
"""
Dify Workflow 应用

通过可视化节点编排复杂业务流程
"""

class DifyWorkflow:
    """Dify Workflow 应用说明"""
    
    def __init__(self):
        """初始化 Workflow"""
        self.type = "workflow"
        self.nodes = []
        self.edges = []
    
    def add_node(self, node_type: str, config: dict) -> str:
        """
        添加节点
        
        Args:
            node_type: 节点类型
            config: 节点配置
        
        Returns:
            节点 ID
        """
        node_id = f"{node_type}_{len(self.nodes)}"
        self.nodes.append({
            "id": node_id,
            "type": node_type,
            "config": config
        })
        return node_id
    
    def connect(self, from_node: str, to_node: str):
        """
        连接节点
        
        Args:
            from_node: 源节点 ID
            to_node: 目标节点 ID
        """
        self.edges.append({
            "from": from_node,
            "to": to_node
        })

# Workflow 节点类型
"""
核心节点：
├── 开始节点（Start）
│   └── 定义输入变量
├── LLM 节点（LLM）
│   └── 调用大模型
├── 知识检索（Knowledge Retrieval）
│   └── 从知识库检索内容
├── 条件分支（If/Else）
│   └── 根据条件分流
├── 代码执行（Code）
│   └── 执行 Python/Node.js 代码
├── 模板转换（Template Transform）
│   └── 数据格式转换
├── 变量聚合（Variable Aggregator）
│   └── 合并多个分支结果
├── HTTP 请求（HTTP Request）
│   └── 调用外部 API
├── 迭代器（Iteration）
│   └── 循环处理列表
├── 结束节点（End）
│   └── 定义输出变量
└── 问题分类（Question Classifier）
    └── 意图识别分流
"""
```

---

## 四、知识库（RAG）

### 4.1 创建知识库

```python
"""
Dify 知识库管理

实现文档的向量化存储和检索
"""

class DifyKnowledgeBase:
    """Dify 知识库管理"""
    
    def __init__(self, name: str):
        """
        初始化知识库
        
        Args:
            name: 知识库名称
        """
        self.name = name
        self.documents = []
        self.retrieval_setting = {
            "search_method": "semantic",  # semantic/keyword/hybrid
            "top_k": 3,
            "score_threshold": 0.5
        }
    
    def upload_document(self, file_path: str, indexing_type: str = "automatic") -> dict:
        """
        上传文档
        
        Args:
            file_path: 文件路径
            indexing_type: 索引方式（automatic/custom）
        
        Returns:
            上传结果
        """
        supported_formats = [
            ".txt", ".md", ".pdf", ".docx",
            ".html", ".json", ".csv"
        ]
        
        return {
            "status": "success",
            "document_id": "doc_001",
            "format": file_path.split(".")[-1],
            "chunks": 15,
            "indexing_type": indexing_type
        }
    
    def configure_retrieval(self, method: str = "semantic", top_k: int = 3) -> dict:
        """
        配置检索策略
        
        Args:
            method: 检索方法
            top_k: 返回结果数量
        
        Returns:
            检索配置
        """
        methods = {
            "semantic": "语义检索（向量相似度）",
            "keyword": "关键词检索",
            "hybrid": "混合检索（语义+关键词）"
        }
        
        return {
            "method": method,
            "description": methods.get(method, "未知"),
            "top_k": top_k,
            "rerank_enabled": True
        }
    
    def search(self, query: str) -> list:
        """
        检索知识库
        
        Args:
            query: 查询内容
        
        Returns:
            检索结果
        """
        return [
            {
                "content": "相关文档片段1...",
                "score": 0.92,
                "source": "document.pdf"
            },
            {
                "content": "相关文档片段2...",
                "score": 0.85,
                "source": "document.pdf"
            }
        ]

# 知识库最佳实践
"""
知识库优化建议：

1. 文档预处理
   ├── 清理无关内容（页眉页脚）
   ├── 统一编码格式
   └── 拆分长文档

2. 分块策略
   ├── 自动分块：按段落/句子
   ├── 自定义分块：指定分隔符
   └── 重叠设置：保持上下文连贯

3. 检索优化
   ├── 开启 Rerank 重排序
   ├── 调整 Top K 值
   ├── 设置分数阈值
   └── 使用混合检索

4. 持续维护
   ├── 定期更新文档
   ├── 监控检索质量
   └── 收集用户反馈
"""
```

---

## 五、模型配置

### 5.1 支持的模型提供商

```python
"""
Dify 模型配置

支持多种模型提供商和自定义模型
"""

class DifyModelConfig:
    """Dify 模型配置"""
    
    def __init__(self):
        """初始化模型配置"""
        self.providers = {
            "openai": {
                "name": "OpenAI",
                "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
                "requires_key": True
            },
            "anthropic": {
                "name": "Anthropic",
                "models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
                "requires_key": True
            },
            "azure_openai": {
                "name": "Azure OpenAI",
                "models": ["gpt-4", "gpt-35-turbo"],
                "requires_endpoint": True
            },
            "local": {
                "name": "本地模型",
                "models": ["ollama", "xinference"],
                "requires_endpoint": True
            },
            "bedrock": {
                "name": "AWS Bedrock",
                "models": ["claude", "llama2"],
                "requires_aws_credentials": True
            }
        }
    
    def configure_model(self, provider: str, model: str, **kwargs) -> dict:
        """
        配置模型
        
        Args:
            provider: 提供商名称
            model: 模型名称
            **kwargs: 额外配置
        
        Returns:
            模型配置
        """
        config = {
            "provider": provider,
            "model": model,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2000),
            "top_p": kwargs.get("top_p", 1.0),
            "frequency_penalty": kwargs.get("frequency_penalty", 0),
            "presence_penalty": kwargs.get("presence_penalty", 0)
        }
        
        if provider in ["openai", "anthropic"]:
            config["api_key"] = kwargs.get("api_key")
        
        return config
    
    def get_model_parameters(self) -> dict:
        """
        获取模型参数说明
        
        Returns:
            参数说明
        """
        return {
            "temperature": {
                "description": "温度参数，控制输出随机性",
                "range": "0-2",
                "default": 0.7,
                "tip": "创意任务调高，精确任务调低"
            },
            "max_tokens": {
                "description": "最大生成 token 数",
                "range": "1-模型上限",
                "default": 2000,
                "tip": "根据输出长度需求调整"
            },
            "top_p": {
                "description": "核采样参数",
                "range": "0-1",
                "default": 1.0,
                "tip": "与 temperature 二选一使用"
            }
        }

# 模型选择建议
"""
模型选择指南：

任务类型          | 推荐模型              | 说明
------------------|----------------------|------------------
通用对话          | gpt-3.5-turbo        | 性价比高
复杂推理          | gpt-4 / claude-3-opus | 能力强，成本高
代码生成          | gpt-4 / claude-3-sonnet | 代码理解好
长文档处理        | claude-3-opus (200K) | 上下文窗口大
实时响应          | gpt-3.5-turbo        | 速度快
低成本场景        | claude-3-haiku       | 价格最低
"""
```

---

## 六、API 集成

### 6.1 应用 API 调用

```python
"""
Dify API 集成示例

通过 API 将 Dify 应用集成到自有系统
"""

import requests
import json

class DifyAPIClient:
    """Dify API 客户端"""
    
    def __init__(self, api_key: str, base_url: str = "http://localhost/v1"):
        """
        初始化客户端
        
        Args:
            api_key: Dify 应用 API Key
            base_url: API 基础地址
        """
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def send_message(self, query: str, user_id: str, 
                     inputs: dict = None, response_mode: str = "blocking") -> dict:
        """
        发送消息
        
        Args:
            query: 用户输入
            user_id: 用户标识
            inputs: 输入变量
            response_mode: 响应模式（blocking/streaming）
        
        Returns:
            响应结果
        """
        url = f"{self.base_url}/chat-messages"
        
        payload = {
            "inputs": inputs or {},
            "query": query,
            "response_mode": response_mode,
            "conversation_id": "",
            "user": user_id
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()
    
    def upload_file(self, file_path: str, user_id: str) -> dict:
        """
        上传文件
        
        Args:
            file_path: 文件路径
            user_id: 用户标识
        
        Returns:
            上传结果
        """
        url = f"{self.base_url}/files/upload"
        
        with open(file_path, "rb") as f:
            files = {"file": f}
            data = {"user": user_id}
            response = requests.post(url, headers={
                "Authorization": f"Bearer {self.api_key}"
            }, files=files, data=data)
        
        return response.json()
    
    def get_conversations(self, user_id: str, limit: int = 20) -> list:
        """
        获取会话列表
        
        Args:
            user_id: 用户标识
            limit: 返回数量
        
        Returns:
            会话列表
        """
        url = f"{self.base_url}/conversations"
        
        params = {
            "user": user_id,
            "limit": limit
        }
        
        response = requests.get(url, headers=self.headers, params=params)
        return response.json().get("data", [])

# 使用示例
"""
client = DifyAPIClient(
    api_key="app-xxxxxxxxxxxxxxxx",
    base_url="https://api.dify.ai/v1"
)

# 发送消息
result = client.send_message(
    query="介绍一下 Dify",
    user_id="user-001",
    response_mode="blocking"
)
print(result["answer"])
"""
```

---

## 七、AI 产品经理关注点

```
Dify 产品化要点：

场景选择
├── 适合场景
│   ├── 快速原型验证
│   ├── 内部工具搭建
│   ├── 客服系统
│   ├── 知识库问答
│   └── 内容生成平台
├── 不适合场景
│   ├── 高度定制化 UI
│   ├── 复杂业务逻辑
│   ├── 高并发实时系统
│   └── 数据隐私要求极高

成本分析
├── 云服务成本
│   ├── 免费版：200 次/天
│   ├── 专业版：$29/月
│   ├── 团队版：$99/月
│   └── 企业版：定制报价
├── 自部署成本
│   ├── 服务器：$50-200/月
│   ├── 模型 API：按量计费
│   └── 运维人力：1-2 人

关键指标
├── 技术指标
│   ├── 响应时间 < 3s
│   ├── 可用性 > 99%
│   └── 并发支持数
├── 业务指标
│   ├── 用户满意度
│   ├── 任务完成率
│   └── 知识库准确率
└── 成本指标
    ├── 单次调用成本
    ├── 月活跃用户成本
    └── 模型费用占比

落地建议
├── 阶段一：验证
│   ├── 使用云服务快速搭建
│   ├── 选择 1-2 个场景试点
│   └── 收集用户反馈
├── 阶段二：扩展
│   ├── 迁移到自部署
│   ├── 扩展知识库
│   └── 优化 Prompt
└── 阶段三：规模化
    ├── 多应用管理
    ├── 团队协作
    └── 监控告警
```

---

## 八、参考资源

- [Dify 官方文档](https://docs.dify.ai/) - Dify 官方文档
- [Dify GitHub](https://github.com/langgenius/dify) - Dify 开源仓库
- [Dify 云服务](https://dify.ai/) - Dify 云服务平台
- [Dify 社区](https://github.com/langgenius/dify/discussions) - 社区讨论

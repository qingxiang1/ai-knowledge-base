<!--
  创建时间: 2026-06-03
  文件名: OpenAI_API.md
  文件描述: OpenAI API 使用指南，补充企业接入、稳定性治理、成本与验收清单
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# OpenAI API 使用指南

> OpenAI API 是目前最成熟、生态最完善的大模型接口服务，掌握其使用是 AI 应用开发的基础

---

## 零、前置知识

阅读本节前，建议先了解以下内容：

| 前置章节 | 关联点 |
|---------|-------|
| [LLM工作原理](../02-AI基础知识/LLM工作原理.md) | 理解 API 调用的输入输出本质是 Token 序列的概率预测 |
| [Token机制](../02-AI基础知识/Token机制.md) | 理解 API 按 Token 计费，上下文窗口受 Token 数限制 |
| [Prompt基础](../03-Prompt工程/Prompt基础.md) | messages 参数本质是结构化 Prompt |
| [StructuredOutput](../03-Prompt工程/StructuredOutput.md) | JSON Mode 和 response_format 的设计思路 |
| [GPT系列](../04-大模型生态/GPT系列.md) | 理解 GPT 模型家族的技术特点和演进历程 |

**能力对标**：本章对应 [能力模型](../00-Roadmap/能力模型.md) 中「AI应用构建力 → 模型 API 接入能力」和「技术理解力 → 平台能力评估」。掌握 OpenAI API，意味着你能从 Playground 试玩走向生产级接入、监控和成本治理。

---

## 本章学习目标

完成本节后，你应该能够：

- 区分 Chat、Embeddings、Images、Audio、Assistants 等核心接口的适用场景
- 为企业系统设计 OpenAI API 接入链路，包括鉴权、重试、限流、监控和审计
- 处理多轮对话、结构化输出、工具调用和多模态输入等核心能力
- 识别 OpenAI API 在成本、延迟、合规和供应商依赖上的风险
- 输出一份可用于研发评审的 OpenAI 接入方案

---

## 一、API 概述

### 1.1 核心能力矩阵

```
OpenAI API 核心服务：

文本生成
├── Chat Completions    对话补全（GPT-4o / GPT-4o-mini / o1 / o3-mini）
├── Completions         文本补全（Legacy，推荐用 Chat）
└── Assistants API      助手 API（支持文件、工具、线程管理）

嵌入向量
├── Embeddings          文本向量化（text-embedding-3-large / 3-small / ada-002）
└── 用途：语义搜索、推荐、聚类

多模态
├── Images              图像生成（DALL·E 3 / DALL·E 2）
├── Audio               语音转文字（Whisper）、文字转语音（TTS）
└── Vision              GPT-4o / GPT-4-Turbo 图像理解

微调
├── Fine-tuning         自定义模型训练
└── 用途：品牌语气、领域专用、格式固定
```

### 1.2 认证与基础配置

```python
"""
OpenAI API 认证方式
"""

import os
from openai import OpenAI

# 方式1：环境变量（推荐）
# export OPENAI_API_KEY="sk-..."
client = OpenAI()

# 方式2：显式传入
client = OpenAI(api_key="sk-your-api-key")

# 方式3：自定义 Base URL（代理/转发）
client = OpenAI(
    api_key="sk-your-api-key",
    base_url="https://api.openai.com/v1"  # 可替换为代理地址
)

# 方式4：Azure OpenAI（企业部署）
from openai import AzureOpenAI
client = AzureOpenAI(
    azure_endpoint="https://your-resource.openai.azure.com/",
    api_key="your-azure-api-key",
    api_version="2024-12-01-preview"
)
```

---

## 二、Chat Completions API

### 2.1 基础调用

```python
"""
Chat Completions 基础调用示例
"""

from openai import OpenAI

client = OpenAI()

# 基础对话
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "你是一个专业的AI产品经理助手。"},
        {"role": "user", "content": "请解释什么是RAG架构？"}
    ]
)

print(response.choices[0].message.content)

# 响应结构解析
"""
response 对象结构：
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1715000000,
  "model": "gpt-4o-2024-08-06",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "RAG（Retrieval-Augmented Generation）..."
      },
      "finish_reason": "stop"  # stop / length / content_filter / tool_calls
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 150,
    "total_tokens": 175
  }
}
"""
```

### 2.2 核心参数详解

```python
"""
Chat Completions 核心参数说明
"""

response = client.chat.completions.create(
    model="gpt-4o",                    # 模型选择
    messages=[...],                     # 消息列表
    temperature=0.7,                   # 随机性：0-2，越低越确定
    max_tokens=4096,                   # 最大输出token数
    top_p=1.0,                         # 核采样：0-1，与temperature二选一
    frequency_penalty=0.0,             # 频率惩罚：-2~2，减少重复
    presence_penalty=0.0,              # 存在惩罚：-2~2，鼓励新话题
    stop=None,                         # 停止序列：字符串或列表
    n=1,                               # 生成候选数：1-10
    stream=False,                      # 是否流式输出
    response_format={"type": "json_object"},  # 强制JSON输出
    tools=None,                        # 工具定义（Function Calling）
    tool_choice="auto",                # 工具选择策略
    seed=None,                         # 随机种子（保证可复现）
    user="user-123"                    # 用户标识（用于滥用监控）
)

"""
参数调优建议：

温度控制策略：
├── temperature=0 / top_p=0.1    → 事实问答、代码生成、分类
├── temperature=0.7 / top_p=0.9  → 通用对话、创意写作（默认推荐）
├── temperature=1.2 / top_p=1.0  → 头脑风暴、多样化生成
└── temperature=1.5+             → 艺术创作、探索性任务

max_tokens 设置：
├── 简单问答：256-512
├── 邮件/文档生成：1024-2048
├── 长文分析/代码：4096-8192
└── 注意：模型有总token上限（输入+输出）

penalty 使用场景：
├── frequency_penalty=0.5~1.0    → 减少重复用词
├── presence_penalty=0.5~1.0     → 鼓励覆盖更多要点
└── 两者同时使用时需谨慎，可能降低连贯性
"""
```

### 2.3 多轮对话管理

```python
"""
多轮对话状态管理
"""

class ChatSession:
    """维护多轮对话上下文"""
    
    def __init__(self, system_prompt: str, model: str = "gpt-4o"):
        self.model = model
        self.messages = [
            {"role": "system", "content": system_prompt}
        ]
        self.total_tokens = 0
    
    def send(self, user_message: str, **kwargs) -> str:
        """发送消息并获取回复"""
        self.messages.append(
            {"role": "user", "content": user_message}
        )
        
        response = client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            **kwargs
        )
        
        assistant_message = response.choices[0].message.content
        self.messages.append(
            {"role": "assistant", "content": assistant_message}
        )
        
        # 记录token消耗
        self.total_tokens += response.usage.total_tokens
        
        return assistant_message
    
    def clear_history(self, keep_system: bool = True):
        """清空对话历史"""
        if keep_system:
            self.messages = [self.messages[0]]
        else:
            self.messages = []
        self.total_tokens = 0
    
    def get_context_window(self) -> int:
        """获取当前上下文token数（估算）"""
        # 简单估算：英文1token≈0.75词，中文1token≈0.5字
        return self.total_tokens

# 使用示例
session = ChatSession(
    system_prompt="你是一位专业的数据分析师，擅长用简洁的语言解释复杂数据。"
)

reply1 = session.send("我们公司Q3销售额下降了15%，可能是什么原因？")
reply2 = session.send("那针对这些原因，你有什么改进建议？")  # 自动携带上文
```

### 2.4 结构化输出（JSON Mode）

```python
"""
强制JSON输出模式
"""

import json

# 方式1：JSON Mode（推荐，gpt-4o/gpt-4-turbo支持）
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": "你是一个产品需求分析助手。请将用户需求解析为结构化数据。"
        },
        {
            "role": "user",
            "content": "我想做一个智能客服系统，能自动回答用户关于订单、退款、物流的问题，预算50万，3个月上线。"
        }
    ],
    response_format={"type": "json_object"}
)

result = json.loads(response.choices[0].message.content)
print(json.dumps(result, indent=2, ensure_ascii=False))

"""
输出示例：
{
  "product_name": "智能客服系统",
  "core_features": [
    "订单查询自动回复",
    "退款流程自动处理",
    "物流状态自动查询"
  ],
  "budget": {
    "amount": 500000,
    "currency": "CNY"
  },
  "timeline": {
    "duration_months": 3,
    "urgency": "高"
  },
  "target_users": "电商平台用户"
}
"""

# 方式2：Prompt工程 + 显式要求JSON（兼容所有模型）
response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {
            "role": "user",
            "content": """分析以下用户评论的情感倾向，以JSON格式返回：
评论："这个产品太棒了，完全超出预期！"

要求格式：
{
  "sentiment": "positive/negative/neutral",
  "confidence": 0.0-1.0,
  "keywords": ["关键词1", "关键词2"]
}"""
        }
    ]
)
```

---

## 三、Vision API（图像理解）

```python
"""
GPT-4o / GPT-4-Turbo 图像理解
"""

import base64

# 方式1：Base64编码本地图片
with open("screenshot.png", "rb") as f:
    base64_image = base64.b64encode(f.read()).decode("utf-8")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "请分析这个UI设计稿，指出3个可以优化的地方。"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{base64_image}",
                        "detail": "high"  # low / high / auto
                    }
                }
            ]
        }
    ],
    max_tokens=1000
)

# 方式2：直接传入图片URL
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "这张图片里有什么？"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/image.jpg",
                        "detail": "auto"
                    }
                }
            ]
        }
    ]
)

"""
detail 参数说明：
- low：低分辨率模式，消耗约85 tokens，适合简单识别
- high：高分辨率模式，消耗更多tokens，适合细节分析
- auto：根据图片尺寸自动选择

多图输入：
- 单条消息可包含多张图片
- 总token消耗 = 文本 + 所有图片token
- 注意控制总token在模型限制内
"""
```

---

## 四、Embeddings API

```python
"""
文本嵌入向量：语义搜索与相似度计算
"""

# 生成嵌入向量
def get_embedding(text: str, model: str = "text-embedding-3-small") -> list[float]:
    """获取文本的embedding向量"""
    response = client.embeddings.create(
        model=model,
        input=text,
        dimensions=512  # 可选：text-embedding-3支持降维
    )
    return response.data[0].embedding

# 语义搜索示例
documents = [
    "GPT-4是OpenAI开发的大语言模型",
    "DALL·E可以生成各种风格的图像",
    "Whisper是OpenAI的语音识别模型",
    "Embedding用于将文本转换为向量"
]

# 构建向量库
doc_embeddings = [get_embedding(doc) for doc in documents]

# 搜索
query = "OpenAI有哪些图像生成工具？"
query_embedding = get_embedding(query)

# 计算余弦相似度
import numpy as np

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

similarities = [
    (doc, cosine_similarity(query_embedding, emb))
    for doc, emb in zip(documents, doc_embeddings)
]

# 排序返回最相关结果
similarities.sort(key=lambda x: x[1], reverse=True)
print(f"最相关: {similarities[0][0]} (相似度: {similarities[0][1]:.3f})")

"""
Embedding模型对比：

| 模型 | 维度 | 价格/1M tokens | 适用场景 |
|------|------|---------------|---------|
| text-embedding-3-small | 1536 (可降维) | $0.02 | 一般语义搜索 |
| text-embedding-3-large | 3072 (可降维) | $0.13 | 高精度搜索 |
| text-embedding-ada-002 | 1536 | $0.10 | 兼容旧系统 |

dimensions 参数：
- text-embedding-3系列支持降维（如512/1024）
- 降维可减少存储和计算成本
- 精度损失通常很小
"""
```

---

## 五、Images API（DALL·E）

```python
"""
DALL·E 图像生成
"""

# DALL·E 3 生成
response = client.images.generate(
    model="dall-e-3",
    prompt="一只穿着西装的猫坐在办公桌前使用笔记本电脑，卡通风格",
    size="1024x1024",        # 1024x1024 / 1792x1024 / 1024x1792
    quality="standard",       # standard / hd
    n=1,                      # DALL·E 3 仅支持 n=1
    style="vivid"             # vivid / natural
)

image_url = response.data[0].url
print(f"生成图片URL: {image_url}")

# DALL·E 2（支持编辑和变体）
response = client.images.generate(
    model="dall-e-2",
    prompt="一个极简风格的logo，包含字母AI",
    size="512x512",           # 256x256 / 512x512 / 1024x1024
    n=4                       # DALL·E 2 支持 n=1-10
)

"""
DALL·E 3 vs DALL·E 2：

| 特性 | DALL·E 3 | DALL·E 2 |
|------|----------|----------|
| 理解能力 | 极强，遵循复杂prompt | 一般 |
| 图像质量 | 更高 | 较低 |
| 单次生成 | 1张 | 最多10张 |
| 尺寸选项 | 3种 | 3种 |
| 编辑功能 | 不支持 | 支持 |
| 价格 | $0.04-0.08/张 | $0.016-0.020/张 |

Prompt建议：
- 详细描述主体、场景、风格、光线、构图
- DALL·E 3会自动优化prompt
- 避免生成真实人物（政策限制）
"""
```

---

## 六、Audio API

```python
"""
语音转文字（Whisper）和文字转语音（TTS）
"""

# Whisper 语音转文字
with open("audio.mp3", "rb") as audio_file:
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language="zh",           # 可选：指定语言提高准确率
        response_format="json",  # json / text / srt / verbose_json / vtt
        timestamp_granularities=["word"]  # segment / word
    )

print(transcript.text)

# TTS 文字转语音
response = client.audio.speech.create(
    model="tts-1",               # tts-1 / tts-1-hd
    voice="alloy",               # alloy / echo / fable / onyx / nova / shimmer
    input="你好，我是你的AI助手。",
    speed=1.0                    # 0.25-4.0
)

# 保存音频
response.stream_to_file("output.mp3")

"""
TTS 语音角色特点：
- alloy：中性、平衡
- echo：低沉、男性
- fable：叙事感、英国腔
- onyx：深沉、权威
- nova：明亮、女性
- shimmer：温暖、女性

Whisper 支持格式：
- 输入：mp3 / mp4 / mpeg / mpga / m4a / wav / webm
- 最大文件：25MB
- 多语言自动识别
"""
```

---

## 七、Assistants API

```python
"""
Assistants API：构建有状态的AI助手
"""

# 1. 创建助手
assistant = client.beta.assistants.create(
    name="产品需求分析师",
    instructions="你是一位资深AI产品经理，擅长分析产品需求并输出PRD文档。",
    model="gpt-4o",
    tools=[
        {"type": "code_interpreter"},  # 代码解释器
        {"type": "file_search"}        # 文件检索（RAG）
    ]
)

# 2. 创建对话线程
thread = client.beta.threads.create()

# 3. 添加用户消息
message = client.beta.threads.messages.create(
    thread_id=thread.id,
    role="user",
    content="请分析附件中的用户调研报告，总结3个核心需求。",
    attachments=[
        {
            "file_id": "file-xxx",
            "tools": [{"type": "file_search"}]
        }
    ]
)

# 4. 运行助手
run = client.beta.threads.runs.create(
    thread_id=thread.id,
    assistant_id=assistant.id
)

# 5. 轮询等待完成
import time
while run.status in ["queued", "in_progress", "cancelling"]:
    time.sleep(1)
    run = client.beta.threads.runs.retrieve(
        thread_id=thread.id,
        run_id=run.id
    )

# 6. 获取回复
messages = client.beta.threads.messages.list(thread_id=thread.id)
for msg in messages.data:
    if msg.role == "assistant":
        print(msg.content[0].text.value)

"""
Assistants API 适用场景：
- 需要长期记忆的多轮对话
- 基于文件的知识问答（RAG）
- 代码分析和数据可视化
- 复杂的多步骤任务

状态管理：
- Thread：对话线程，自动维护历史
- Run：一次执行，可跟踪状态
- 无需自行管理messages数组
"""
```

---

## 八、错误处理与最佳实践

```python
"""
错误处理与重试机制
"""

from openai import (
    OpenAI, 
    APIError, 
    APIConnectionError, 
    RateLimitError, 
    AuthenticationError
)
import time

def safe_chat_completion(
    messages,
    model="gpt-4o",
    max_retries=3,
    **kwargs
):
    """带重试的安全调用封装"""
    
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                **kwargs
            )
            return response
            
        except RateLimitError as e:
            # 限流：指数退避
            wait_time = 2 ** attempt
            print(f"Rate limit hit, retrying in {wait_time}s...")
            time.sleep(wait_time)
            
        except APIConnectionError as e:
            # 连接错误：立即重试
            print(f"Connection error, retrying... ({attempt+1}/{max_retries})")
            time.sleep(1)
            
        except AuthenticationError as e:
            # 认证错误：直接抛出
            print("Authentication failed, check your API key.")
            raise
            
        except APIError as e:
            # 其他API错误
            if e.code == "context_length_exceeded":
                print("Token超出限制，需要截断上下文")
                raise
            print(f"API error: {e}")
            time.sleep(1)
    
    raise Exception(f"Failed after {max_retries} retries")

"""
常见错误码：

| 错误类型 | HTTP状态 | 说明 | 处理建议 |
|---------|---------|------|---------|
| RateLimitError | 429 | 请求频率超限 | 指数退避重试 |
| APIConnectionError | - | 网络连接失败 | 检查网络，立即重试 |
| AuthenticationError | 401 | API Key无效 | 检查密钥配置 |
| APIError (context_length_exceeded) | 400 | 超出上下文限制 | 截断或拆分请求 |
| APIError (invalid_request_error) | 400 | 请求参数错误 | 检查参数格式 |
| APIError (server_error) | 500 | 服务端错误 | 稍后重试 |

最佳实践：
1. 始终设置超时（timeout=30）
2. 实现指数退避重试
3. 监控token消耗和成本
4. 对敏感操作添加人工确认
5. 使用stream模式提升用户体验
6. 定期轮换API Key
"""
```

---

## 九、AI产品经理关注点

```
OpenAI API 产品化要点：

成本控制：
├── 模型选择策略
│   ├── 简单任务 → GPT-4o-mini（便宜20倍）
│   ├── 标准任务 → GPT-4o
│   └── 复杂推理 → o1 / o3-mini
├── 输入优化
│   ├── 精简system prompt
│   ├── 使用更短的表达
│   └── 缓存重复内容
├── 输出控制
│   ├── 合理设置max_tokens
│   ├── 使用stop序列提前终止
│   └── 避免不必要的n>1
└── 监控告警
    ├── 设置日/月消费上限
    ├── 异常调用量告警
    └── 成本分摊统计

用户体验：
├── 延迟优化
│   ├── 使用stream模式
│   ├── 首token快速响应
│   └── 加载动画/打字机效果
├── 质量保障
│   ├── 温度参数调优
│   ├── JSON Mode保证格式
│   └── 输出后校验
└── 容错设计
    ├── 模型降级策略（4o→4o-mini）
    ├── 超时兜底回复
    └── 错误友好提示

合规安全：
├── 内容审核
│   ├── 输入过滤（Moderation API）
│   ├── 输出审核
│   └── 敏感词拦截
├── 数据保护
│   ├── 避免传输PII
│   ├── 零数据保留协议（企业版）
│   └── 数据脱敏处理
└── 审计追踪
    ├── 完整调用日志
    ├── 用户-请求关联
    └── 异常行为监控
```

---

## 十、企业级接入模板

### 10.1 OpenAI API 接入检查表

| 设计项 | 关键问题 | 输出物 |
| ------ | -------- | ------ |
| 模型选择 | 用 `gpt-4o`、`gpt-4o-mini` 还是推理模型？ | 模型路由表 |
| 调用路径 | 直连 OpenAI、代理层还是 Azure OpenAI？ | 接入架构图 |
| 稳定性 | 超时、限流、重试和熔断如何设计？ | 容错策略 |
| 安全合规 | 敏感数据如何脱敏、审计和隔离？ | 合规说明 |
| 成本控制 | 如何控制单请求成本、月预算和异常峰值？ | 成本测算表 |
| 可观测性 | 记录哪些日志、指标和告警？ | 监控指标清单 |

### 10.2 企业接入字段建议

```json
{
  "provider": "openai",
  "primary_model": "gpt-4o",
  "fallback_model": "gpt-4o-mini",
  "deployment_mode": "azure_openai",
  "rate_limit_policy": "per_user_and_per_app",
  "timeout_ms": 15000,
  "retry_policy": "exponential_backoff_3_times",
  "safety_controls": ["moderation", "pii_masking", "audit_log"],
  "cost_guardrail": {
    "max_cost_per_request": "USD 0.02",
    "monthly_budget": "USD 5000"
  }
}
```

---

## 十一、常见误区补充

| 误区 | 问题 | 正确做法 |
| ---- | ---- | -------- |
| 只会在 Playground 调参 | 无法支撑生产接入 | 建立代码化配置、日志、重试和监控体系 |
| 默认所有请求都用大模型 | 成本快速失控 | 用分层模型和场景路由控制成本 |
| 不记录 usage 数据 | 无法复盘成本与性能 | 全量记录 `usage`、延迟和失败原因 |
| 忽略 Azure/OpenAI 差异 | 企业接入方案不完整 | 同时评估公有 API 与 Azure 企业接入模式 |
| 没有回退模型 | 限流或故障时业务中断 | 设计主模型、备份模型和兜底响应 |

---

## 十二、阶段验收标准

- [ ] 能完成 OpenAI API 的基础接入与多轮对话管理
- [ ] 能设计企业级的鉴权、重试、限流、审计和监控方案
- [ ] 能说明 Chat、Embeddings、Images、Audio、Assistants 的适用边界
- [ ] 能完成基本成本测算并提出降本策略
- [ ] 能输出一份可上线评审的 OpenAI API 接入方案

---

## 十三、版本记录

- **2026-06-05** 补充文件头、能力对标、学习目标、企业级接入模板、常见误区补充与阶段验收标准
- **2026-06-03** 初版完成，涵盖 OpenAI API 核心接口、错误处理与产品关注点

---

## 十四、参考资源

### 相关章节

| 章节 | 关联说明 |
|------|---------|
| [Claude_API](./Claude_API.md) | 对比 Claude 的 API 设计差异（system prompt 位置、content 数组结构） |
| [DeepSeek_API](./DeepSeek_API.md) | 兼容 OpenAI SDK 的低成本替代方案 |
| [FunctionCalling](./FunctionCalling.md) | 深入理解 OpenAI 的 tools 和 tool_calls 机制 |
| [Streaming](./Streaming.md) | 掌握 stream=True 的流式输出实现 |
| [Token管理](./Token管理.md) | 深入理解 Token 计费和上下文管理策略 |
| [成本优化](./成本优化.md) | 基于 OpenAI API 的系统性降本方案 |
| [Embedding原理](../02-AI基础知识/Embedding原理.md) | 理解 Embeddings API 的底层向量原理 |
| [GPT系列](../04-大模型生态/GPT系列.md) | 理解 GPT 模型家族的技术演进 |

### 外部资源

- [OpenAI API 官方文档](https://platform.openai.com/docs)
- [OpenAI Playground](https://platform.openai.com/playground)
- [API 定价页](https://openai.com/pricing)
- [Cookbook 示例代码](https://github.com/openai/openai-cookbook)

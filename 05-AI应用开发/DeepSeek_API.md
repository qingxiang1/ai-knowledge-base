<!--
  文件描述: DeepSeek API 使用指南，涵盖 DeepSeek-V3、DeepSeek-R1、API 调用、推理能力等特性
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-05
-->

# DeepSeek API 使用指南

> DeepSeek 是幻方量化旗下的大模型品牌，以高性价比、强推理能力和开源策略著称，DeepSeek-R1 在数学和代码推理上达到业界顶尖水平

---

## 前置知识

阅读本节前，建议先了解以下内容：

| 前置章节 | 关联点 |
|---------|-------|
| [LLM工作原理](../02-AI基础知识/LLM工作原理.md) | 理解 DeepSeek MoE 架构和强化学习推理训练 |
| [Token机制](../02-AI基础知识/Token机制.md) | DeepSeek 的 Token 计费方式（约为 GPT-4 的 1/10） |
| [Prompt基础](../03-Prompt工程/Prompt基础.md) | DeepSeek 兼容 OpenAI SDK，Prompt 设计方式一致 |
| [ChainOfThought](../03-Prompt工程/ChainOfThought.md) | R1 推理模型自动展示思维链，与 CoT 技术密切相关 |
| [DeepSeek系列](../04-大模型生态/DeepSeek系列.md) | 理解 DeepSeek 模型家族的技术特点和开源生态 |
| [OpenAI_API](./OpenAI_API.md) | DeepSeek API 兼容 OpenAI SDK，理解差异即可快速上手 |

---

## 一、API 概述

### 1.1 核心特性

```
DeepSeek API 核心能力：

模型系列
├── DeepSeek-V3           通用对话模型（671B MoE，激活37B）
├── DeepSeek-R1           推理模型（强化学习训练，思维链展示）
├── DeepSeek-Coder-V2     代码专用模型
└── DeepSeek-V2.5         上一代通用模型

核心优势
├── 极致性价比            API价格约为GPT-4的1/10
├── 开源生态              模型权重完全开源
├── 强推理能力            R1在数学/代码推理上媲美o1
├── 长上下文              支持64K tokens
├── 中文优化              原生中文理解和生成
└── 国产合规              符合国内数据安全要求

推理特性（R1）
├── 思维链展示            自动展示推理过程
├── 自我验证              推理中自动检查答案
├── 多步推理              复杂问题分解求解
└── 强化学习              基于RL的推理能力训练
```

### 1.2 认证与客户端初始化

```python
"""
DeepSeek API 认证方式
"""

import os
from openai import OpenAI

# DeepSeek API 兼容 OpenAI SDK
# 方式1：环境变量
# export DEEPSEEK_API_KEY="sk-..."
client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

# 方式2：显式传入
client = OpenAI(
    api_key="sk-your-deepseek-api-key",
    base_url="https://api.deepseek.com"
)

# 方式3：国内代理地址（如需）
client = OpenAI(
    api_key="sk-your-deepseek-api-key",
    base_url="https://api.deepseek.com/v1"  # 部分代理需要/v1后缀
)

"""
DeepSeek API 与 OpenAI 的兼容性：

兼容的接口：
├── /chat/completions     对话接口（完全兼容）
├── /completions          文本补全（兼容）
├── /embeddings           向量嵌入（兼容）
└── /models               模型列表（兼容）

不兼容的接口：
├── /images/generations   文生图（不支持）
├── /audio/...            语音（不支持）
├── /assistants           助手API（不支持）
└── /fine-tuning          微调（不支持）

差异点：
1. 模型名称不同（deepseek-chat / deepseek-reasoner）
2. R1模型会返回 reasoning_content
3. 部分参数不支持（如response_format的json_schema）
"""
```

---

## 二、Chat Completions API

### 2.1 基础调用

```python
"""
DeepSeek Chat API 基础调用
"""

from openai import OpenAI

client = OpenAI(
    api_key="sk-your-api-key",
    base_url="https://api.deepseek.com"
)

# 基础对话（V3模型）
response = client.chat.completions.create(
    model="deepseek-chat",  # 对应 DeepSeek-V3
    messages=[
        {"role": "system", "content": "你是一位专业的AI产品经理。"},
        {"role": "user", "content": "请解释什么是RAG架构？"}
    ]
)

print(response.choices[0].message.content)

# 推理模型（R1）
response = client.chat.completions.create(
    model="deepseek-reasoner",  # 对应 DeepSeek-R1
    messages=[
        {"role": "user", "content": "解这个方程：2x² + 5x - 3 = 0"}
    ]
)

# R1 特有的推理内容
message = response.choices[0].message
print("推理过程:")
print(message.reasoning_content)  # DeepSeek R1 特有字段
print("\n最终答案:")
print(message.content)

"""
响应结构对比：

V3 响应：
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "RAG（Retrieval-Augmented Generation）..."
    }
  }]
}

R1 响应：
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "解为 x = 0.5 或 x = -3",
      "reasoning_content": "让我来解这个二次方程...\n首先，使用求根公式...\n判别式 Δ = 25 + 24 = 49...\n"
    }
  }]
}
"""
```

### 2.2 多轮对话管理

```python
"""
DeepSeek 多轮对话管理
"""

class DeepSeekChatSession:
    """维护多轮对话上下文"""
    
    def __init__(self, model: str = "deepseek-chat", system_prompt: str = None):
        self.model = model
        self.client = OpenAI(
            api_key=os.environ.get("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com"
        )
        self.messages = []
        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})
        self.total_tokens = 0
        self.total_reasoning_tokens = 0  # R1特有
    
    def send(self, user_message: str, **kwargs) -> dict:
        """发送消息并获取回复"""
        self.messages.append({"role": "user", "content": user_message})
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            **kwargs
        )
        
        message = response.choices[0].message
        assistant_content = message.content
        
        # 记录推理内容（R1模型）
        reasoning = getattr(message, 'reasoning_content', None)
        if reasoning:
            self.total_reasoning_tokens += len(reasoning) // 4  # 粗略估算
        
        self.messages.append({
            "role": "assistant",
            "content": assistant_content
        })
        
        self.total_tokens += response.usage.total_tokens
        
        return {
            "content": assistant_content,
            "reasoning": reasoning,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }
    
    def clear_history(self):
        """清空对话历史（保留system prompt）"""
        system_msg = self.messages[0] if self.messages and self.messages[0]["role"] == "system" else None
        self.messages = [system_msg] if system_msg else []
```

### 2.3 核心参数详解

```python
"""
DeepSeek API 核心参数说明
"""

response = client.chat.completions.create(
    model="deepseek-chat",           # deepseek-chat / deepseek-reasoner
    messages=[...],                   # 消息列表
    max_tokens=4096,                  # 最大输出token数
    temperature=1.0,                  # 随机性：0-2，默认1.0
    top_p=1.0,                        # 核采样：0-1，默认1.0
    frequency_penalty=0,              # 频率惩罚：-2到2
    presence_penalty=0,               # 存在惩罚：-2到2
    stop=None,                        # 停止序列
    stream=False,                     # 是否流式输出
    response_format={"type": "json_object"},  # JSON模式（V3支持）
    tools=None,                       # 工具定义（V3支持）
    tool_choice="auto"                # 工具选择策略
)

"""
参数调优建议：

模型选择策略：
├── deepseek-chat (V3)
│   ├── 通用对话、文本生成
│   ├── 代码生成、技术问答
│   ├── 创意写作、翻译
│   └── 支持JSON Mode、Function Calling
└── deepseek-reasoner (R1)
    ├── 数学推理、逻辑问题
    ├── 复杂代码调试
    ├── 多步分析、决策支持
    └── 自动展示思维链

温度控制：
├── temperature=0.0-0.3    → 代码生成、数学计算、结构化输出
├── temperature=0.5-0.8    → 分析、总结、问答
├── temperature=1.0        → 通用对话（默认）
└── temperature=1.0+       → 创意写作、头脑风暴

R1模型特殊注意：
├── reasoning_content会消耗额外token
├── 推理过程不可控（由模型自动生成）
├── 适合需要展示思考过程的场景
└── 不适合对延迟敏感的场景
"""
```

---

## 三、JSON Mode 与结构化输出

```python
"""
DeepSeek JSON Mode（V3支持）
"""

import json

# 方式1：JSON Mode
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "你是一个数据提取助手，只输出JSON格式。"},
        {"role": "user", "content": """
        请从以下需求中提取关键信息：
        "我想做一个智能客服系统，能回答产品使用问题，预算50万，3个月上线。"
        """}
    ],
    response_format={"type": "json_object"}
)

result = json.loads(response.choices[0].message.content)
print(json.dumps(result, indent=2, ensure_ascii=False))

# 方式2：Prompt约束（兼容R1）
response = client.chat.completions.create(
    model="deepseek-reasoner",  # R1不支持JSON Mode，用prompt约束
    messages=[
        {"role": "user", "content": """
        分析以下用户反馈，提取情感倾向和关键问题。
        反馈："这个App经常闪退，特别是在上传图片的时候，非常影响使用体验。"
        
        请按以下JSON格式输出，不要包含其他内容：
        {
          "sentiment": "positive/negative/neutral",
          "issues": ["问题1", "问题2"],
          "severity": "high/medium/low"
        }
        """}
    ]
)

# 方式3：强制JSON Schema（V3）
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "user", "content": "提取以下信息：姓名张三，年龄25岁"}
    ],
    response_format={
        "type": "json_object",
        "schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"}
            },
            "required": ["name", "age"]
        }
    }
)
```

---

## 四、Function Calling

```python
"""
DeepSeek Function Calling（V3支持，R1暂不支持）
"""

# 定义工具
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名称"},
                    "date": {"type": "string", "description": "日期，格式YYYY-MM-DD"}
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "执行数学计算",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "数学表达式"}
                },
                "required": ["expression"]
            }
        }
    }
]

# 发送请求
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "user", "content": "北京明天天气怎么样？25乘以36等于多少？"}
    ],
    tools=tools,
    tool_choice="auto"
)

# 处理工具调用
message = response.choices[0].message
if message.tool_calls:
    for tool_call in message.tool_calls:
        function_name = tool_call.function.name
        arguments = json.loads(tool_call.function.arguments)
        
        print(f"调用函数: {function_name}")
        print(f"参数: {arguments}")
        
        # 执行函数...

"""
DeepSeek Function Calling 限制：
- 仅 deepseek-chat (V3) 支持
- deepseek-reasoner (R1) 暂不支持
- 工具定义格式与OpenAI完全兼容
- 支持并行工具调用
"""
```

---

## 五、推理模型 R1 深度使用

```python
"""
DeepSeek-R1 推理模型深度使用
"""

# 数学推理
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=[
        {"role": "user", "content": """
        一个水池有两个进水管和一个排水管。
        甲管单独注满需6小时，乙管单独注满需4小时，
        排水管单独排空需3小时。
        如果三个管同时打开，多久能注满水池？
        """}
    ]
)

message = response.choices[0].message
print("=== 推理过程 ===")
print(message.reasoning_content)
print("\n=== 最终答案 ===")
print(message.content)

# 代码调试
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=[
        {"role": "user", "content": """
        这段代码有bug，请找出并修复：
        ```python
        def fibonacci(n):
            if n <= 1:
                return n
            return fibonacci(n-1) + fibonacci(n-2)
        
        print(fibonacci(100))  # 运行非常慢
        ```
        """}
    ]
)

# 逻辑推理
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=[
        {"role": "user", "content": """
        有三扇门，背后分别是一辆车和两只山羊。
        你选择一扇门后，主持人（知道门后是什么）打开另一扇有山羊的门，
        然后问你要不要换门。你应该换吗？为什么？
        """}
    ]
)

"""
R1 推理过程特点：
1. 自动展示完整思维链
2. 会自我验证和修正
3. 多语言推理（中英文混合）
4. 推理长度可能很长（消耗较多token）

R1 适用场景：
├── 数学问题求解
├── 复杂代码调试
├── 逻辑推理题
├── 多步决策分析
└── 需要解释思考过程的教育场景

R1 不适用场景：
├── 对延迟敏感的场景
├── 简单问答（浪费token）
├── 需要Function Calling的场景
└── 严格格式约束的输出
"""
```

---

## 六、错误处理与最佳实践

```python
"""
DeepSeek API 错误处理
"""

from openai import (
    OpenAI,
    APIError,
    APIConnectionError,
    RateLimitError,
    AuthenticationError,
    BadRequestError
)
import time

def safe_deepseek_request(
    messages,
    model="deepseek-chat",
    max_retries=3,
    **kwargs
):
    """带重试的安全调用封装"""
    
    client = OpenAI(
        api_key=os.environ.get("DEEPSEEK_API_KEY"),
        base_url="https://api.deepseek.com"
    )
    
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model=model,
                messages=messages,
                **kwargs
            )
            
        except RateLimitError as e:
            wait_time = 2 ** attempt
            print(f"Rate limit, retry in {wait_time}s...")
            time.sleep(wait_time)
            
        except APIConnectionError as e:
            print(f"Connection error, retrying...")
            time.sleep(1)
            
        except AuthenticationError as e:
            print("Auth failed, check API key.")
            raise
            
        except BadRequestError as e:
            if "context length" in str(e).lower():
                print("Context too long, need truncation.")
            raise
            
        except APIError as e:
            print(f"API error: {e}")
            time.sleep(1)
    
    raise Exception(f"Failed after {max_retries} retries")

"""
DeepSeek 特有最佳实践：

1. 模型选择：
   - 通用任务 → V3 (deepseek-chat)
   - 推理任务 → R1 (deepseek-reasoner)
   - 不要混用（R1不支持tools/json_mode）

2. 成本控制：
   - R1的reasoning_content消耗token
   - 简单任务不要用R1
   - 利用超长上下文减少调用次数

3. 中文优化：
   - 中文prompt效果优于英文翻译
   - 支持中文技术术语
   - 代码注释可用中文

4. 开源优势：
   - 可本地部署（需足够算力）
   - 可微调适配特定场景
   - 社区生态丰富

5. 合规注意：
   - 国内数据不出境
   - 符合国内AI监管要求
   - 企业版提供额外安全保障
"""
```

---

## 七、AI产品经理关注点

```
DeepSeek API 产品化要点：

成本优势：
├── API定价
│   ├── V3输入：¥1/百万tokens（缓存命中¥0.5）
│   ├── V3输出：¥2/百万tokens
│   ├── R1输入：¥4/百万tokens
│   ├── R1输出：¥16/百万tokens
│   └── 约为GPT-4的1/10-1/20
├── 开源降本
│   ├── 可本地部署（无API费用）
│   ├── 适合高频调用场景
│   └── 需要GPU资源（8xA100/H100）
└── 成本对比
    ├── 原型阶段：API调用
    ├── 规模化：考虑本地部署
    └── 混合方案：简单任务API，复杂任务本地

场景适配：
├── 适合场景
│   ├── 成本敏感的AI应用
│   ├── 中文内容生成
│   ├── 数学/代码教育产品
│   ├── 需要推理过程展示
│   └── 国内合规要求高的场景
├── 不适合场景
│   ├── 需要多模态（图/音/视频）
│   ├── 需要Function Calling + 推理
│   ├── 超低延迟要求
│   └── 需要与海外生态集成

产品策略：
├── 模型切换
│   ├── 用户可选V3/R1
│   ├── 根据问题类型自动路由
│   └── 复杂问题用R1，简单问题用V3
├── 推理展示
│   ├── R1的思维链可展示给用户
│   ├── 增强透明度和信任
│   └── 教育场景价值大
└── 混合架构
    ├── DeepSeek处理核心推理
    ├── 其他模型处理多模态
    └── 自建RAG补充知识库
```

---

## 八、延伸阅读与参考资源

### 相关章节

| 章节 | 关联说明 |
|------|---------|
| [OpenAI_API](./OpenAI_API.md) | DeepSeek 兼容 OpenAI SDK，可参考 OpenAI 的调用方式 |
| [FunctionCalling](./FunctionCalling.md) | DeepSeek V3 支持 Function Calling，R1 暂不支持 |
| [Streaming](./Streaming.md) | R1 推理模型的流式输出包含 reasoning_content 字段 |
| [Token管理](./Token管理.md) | R1 的 reasoning_content 会消耗额外 Token |
| [成本优化](./成本优化.md) | DeepSeek 的极致性价比是成本优化的核心策略 |
| [ChainOfThought](../03-Prompt工程/ChainOfThought.md) | R1 自动展示思维链，是 CoT 技术的产品化实现 |
| [DeepSeek系列](../04-大模型生态/DeepSeek系列.md) | 理解 DeepSeek 模型家族的技术演进和开源生态 |

### 外部资源

- [DeepSeek 官方文档](https://platform.deepseek.com/docs)
- [DeepSeek API 控制台](https://platform.deepseek.com/)
- [DeepSeek GitHub](https://github.com/deepseek-ai)
- [DeepSeek-V3 技术报告](https://arxiv.org/abs/2412.19437)
- [DeepSeek-R1 技术报告](https://arxiv.org/abs/2501.12948)
- [API 定价页](https://platform.deepseek.com/pricing)

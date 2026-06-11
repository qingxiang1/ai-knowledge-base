<!--
  创建时间: 2026-06-03
  文件名: Claude_API.md
  文件描述: Anthropic Claude API 使用指南，补充企业接入、长上下文治理与验收清单
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# Claude API 使用指南

> Claude API 以超长上下文、出色的代码能力和安全对齐著称，是企业级 AI 应用的重要选择

---

## 零、前置知识

阅读本节前，建议先了解以下内容：

| 前置章节                                                 | 关联点                                        |
| -------------------------------------------------------- | --------------------------------------------- |
| [LLM工作原理](../02-AI基础知识/LLM工作原理.md)           | 理解 Claude 的 Constitutional AI 安全对齐机制 |
| [Token机制](../02-AI基础知识/Token机制.md)               | Claude 的 200K 上下文窗口和 Token 计费方式    |
| [Prompt基础](../03-Prompt工程/Prompt基础.md)             | Claude 特有的 XML 标签 Prompt 组织方式        |
| [StructuredOutput](../03-Prompt工程/StructuredOutput.md) | Claude 输出结构化数据的策略                   |
| [Claude系列](../04-大模型生态/Claude系列.md)             | 理解 Claude 模型家族的技术特点和产品生态      |
| [OpenAI_API](./OpenAI_API.md)                            | 对比 OpenAI API 的设计差异，便于迁移和选型    |

---

## 本章学习目标

完成本节后，你应该能够：

- 理解 Claude Messages API、Tool Use、Computer Use 和 Prompt Caching 的适用边界
- 为长文本、代码和安全敏感场景设计 Claude API 接入方案
- 处理 Claude 的上下文成本、流式输出、工具调用和错误恢复
- 识别 Claude API 在供应商依赖、权限控制和企业合规上的风险
- 输出一份可用于研发评审的 Claude API 接入方案

## 一、API 概述

### 1.1 核心特性

```
Claude API 核心能力：

文本生成
├── Messages API        对话接口（Claude 3.5 Sonnet / Opus / Haiku）
├── 超长上下文          200K tokens（约15万字）
├── 代码能力            业界领先的代码生成与理解
└── 创意写作            自然流畅的长文本创作

多模态
├── Vision              图像理解与分析（Claude 3系列）
└── PDF文档解析         直接上传PDF进行问答

工具使用
├── Tool Use            函数调用与外部工具集成
├── Computer Use        模拟人类操作计算机（3.5 Sonnet）
└── 提示词缓存          Prompt Caching 降低长上下文成本

安全特性
├── Constitutional AI   宪法AI对齐
├── 拒绝有害请求        内置安全过滤
└── 企业合规            SOC 2 Type II 认证
```

### 1.2 认证与客户端初始化

```python
"""
Claude API 认证方式
"""

import os
from anthropic import Anthropic

# 方式1：环境变量（推荐）
# export ANTHROPIC_API_KEY="sk-ant-..."
client = Anthropic()

# 方式2：显式传入
client = Anthropic(api_key="sk-ant-your-api-key")

# 方式3：自定义 Base URL（代理/转发）
client = Anthropic(
    api_key="sk-ant-your-api-key",
    base_url="https://api.anthropic.com"  # 可替换为代理地址
)

# 方式4：AWS Bedrock（企业部署）
from anthropic import AnthropicBedrock
client = AnthropicBedrock(
    aws_access_key="your-access-key",
    aws_secret_key="your-secret-key",
    aws_region="us-east-1"
)

# 方式5：Google Cloud Vertex AI
from anthropic import AnthropicVertex
client = AnthropicVertex(
    project_id="your-project",
    region="us-east5"
)
```

---

## 二、Messages API

### 2.1 基础调用

```python
"""
Messages API 基础调用
"""

from anthropic import Anthropic

client = Anthropic()

# 基础对话
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    messages=[
        {"role": "user", "content": "请解释什么是RAG架构？"}
    ]
)

print(response.content[0].text)

# 响应结构解析
"""
response 对象结构：
{
  "id": "msg_01Xxx...",
  "type": "message",
  "role": "assistant",
  "model": "claude-3-5-sonnet-20241022",
  "content": [
    {
      "type": "text",
      "text": "RAG（Retrieval-Augmented Generation）..."
    }
  ],
  "stop_reason": "end_turn",  # end_turn / max_tokens / stop_sequence
  "stop_sequence": None,
  "usage": {
    "input_tokens": 25,
    "output_tokens": 150
  }
}

与 OpenAI 的差异：
1. 没有 system 参数，system prompt 放在顶层
2. content 是数组，支持多模态块
3. 必须指定 max_tokens
4. stop_reason 值不同
"""
```

### 2.2 System Prompt 与多轮对话

```python
"""
System Prompt 和多轮对话管理
"""

# System Prompt 使用
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    system="你是一位专业的AI产品经理，擅长用简洁的语言解释技术概念。",
    messages=[
        {"role": "user", "content": "什么是向量数据库？"}
    ]
)

# 多轮对话
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    system="你是一位资深技术顾问。",
    messages=[
        {"role": "user", "content": "我们公司想引入AI客服，有什么建议？"},
        {"role": "assistant", "content": "引入AI客服是一个很好的方向..."},
        {"role": "user", "content": "那预算50万够吗？"}  # 自动关联上文
    ]
)

# Claude 对话状态管理类
class ClaudeChatSession:
    """维护多轮对话上下文"""

    def __init__(self, system_prompt: str, model: str = "claude-3-5-sonnet-20241022"):
        self.model = model
        self.system_prompt = system_prompt
        self.messages = []
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def send(self, user_message: str, **kwargs) -> str:
        """发送消息并获取回复"""
        self.messages.append({
            "role": "user",
            "content": user_message
        })

        response = client.messages.create(
            model=self.model,
            max_tokens=kwargs.get("max_tokens", 4096),
            system=self.system_prompt,
            messages=self.messages,
            **{k: v for k, v in kwargs.items() if k != "max_tokens"}
        )

        assistant_text = response.content[0].text
        self.messages.append({
            "role": "assistant",
            "content": assistant_text
        })

        # 记录token消耗
        self.total_input_tokens += response.usage.input_tokens
        self.total_output_tokens += response.usage.output_tokens

        return assistant_text

    def get_usage(self) -> dict:
        """获取token使用统计"""
        return {
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "total_tokens": self.total_input_tokens + self.total_output_tokens
        }
```

### 2.3 核心参数详解

```python
"""
Messages API 核心参数说明
"""

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",  # 模型选择
    max_tokens=4096,                      # 最大输出token数（必填）
    messages=[...],                       # 消息列表
    system="system prompt",               # 系统提示词（可选）
    temperature=1.0,                      # 随机性：0-1，默认1.0
    top_p=1.0,                            # 核采样：0-1，默认1.0
    top_k=0,                              # Top-k采样：0-500，默认0（关闭）
    stop_sequences=None,                  # 停止序列：字符串列表
    stream=False,                         # 是否流式输出
    metadata={"user_id": "user-123"},     # 元数据（用于追踪）
    tools=None,                           # 工具定义
    tool_choice={"type": "auto"}          # 工具选择策略
)

"""
参数调优建议：

温度控制策略：
├── temperature=0.0              → 事实问答、代码生成、分类（最确定）
├── temperature=0.3-0.7          → 分析、总结、结构化输出
├── temperature=1.0（默认）       → 通用对话、创意写作
└── temperature=1.0+             → 头脑风暴、探索性任务

注意：Claude 的 temperature 范围是 0-1（与 OpenAI 的 0-2 不同）

max_tokens 设置：
├── 简单问答：256-512
├── 邮件/文档生成：1024-2048
├── 代码生成/长文分析：4096-8192
└── 注意：Claude 3.5 Sonnet 最大输出 8192 tokens

stop_sequences 使用：
├── ["\n\n"]                      → 在空行处停止
├── ["Human:", "Assistant:"]     → 对话格式控制
└── ["</answer>"]                → XML标签控制输出边界
"""
```

---

## 三、Vision API（图像理解）

```python
"""
Claude Vision 图像理解
"""

import base64

# 方式1：Base64编码本地图片
with open("design_mockup.png", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=2048,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data
                    }
                },
                {
                    "type": "text",
                    "text": "请分析这个UI设计稿，指出3个可以优化的地方，并给出具体建议。"
                }
            ]
        }
    ]
)

# 方式2：直接传入图片URL
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "url",
                        "url": "https://example.com/chart.png"
                    }
                },
                {
                    "type": "text",
                    "text": "这张图表展示了什么趋势？"
                }
            ]
        }
    ]
)

# 方式3：PDF文档解析（Claude 3系列支持）
with open("report.pdf", "rb") as f:
    pdf_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": pdf_data
                    }
                },
                {
                    "type": "text",
                    "text": "请总结这份报告的核心观点，并列出3个关键数据。"
                }
            ]
        }
    ]
)

"""
Vision 使用限制：
- 单张图片最大 5MB
- 支持格式：image/jpeg, image/png, image/gif, image/webp
- PDF最大 32MB，最多 100页
- 图片会被缩放到特定尺寸处理
- 图片消耗额外token（约800-1600 tokens/张）
"""
```

---

## 四、Tool Use（函数调用）

```python
"""
Claude Tool Use（函数调用）
"""

# 1. 定义工具
tools = [
    {
        "name": "get_weather",
        "description": "获取指定城市的天气信息",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "城市名称，如'北京'"
                },
                "date": {
                    "type": "string",
                    "description": "日期，格式YYYY-MM-DD，默认为今天"
                }
            },
            "required": ["city"]
        }
    },
    {
        "name": "search_products",
        "description": "搜索商品信息",
        "input_schema": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "搜索关键词"
                },
                "category": {
                    "type": "string",
                    "enum": ["electronics", "clothing", "food"],
                    "description": "商品类别"
                }
            },
            "required": ["keyword"]
        }
    }
]

# 2. 发送请求（Claude决定是否需要调用工具）
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=tools,
    tool_choice={"type": "auto"},  # auto / any / tool / none
    messages=[
        {"role": "user", "content": "北京明天天气怎么样？适合穿什么衣服？"}
    ]
)

# 3. 处理响应
if response.stop_reason == "tool_use":
    # Claude请求调用工具
    tool_use = response.content[-1]  # 最后一个content块是tool_use
    tool_name = tool_use.name
    tool_input = tool_use.input

    print(f"Claude请求调用: {tool_name}")
    print(f"参数: {tool_input}")

    # 4. 执行工具（实际业务逻辑）
    if tool_name == "get_weather":
        weather_result = get_weather_api(
            city=tool_input["city"],
            date=tool_input.get("date")
        )

    # 5. 将工具结果返回给Claude
    follow_up_response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        tools=tools,
        messages=[
            {"role": "user", "content": "北京明天天气怎么样？适合穿什么衣服？"},
            {"role": "assistant", "content": response.content},
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": str(weather_result)
                    }
                ]
            }
        ]
    )

    print(follow_up_response.content[0].text)

"""
Tool Use 与 OpenAI Function Calling 的差异：

1. 参数结构：
   - Claude: tools[].input_schema
   - OpenAI: tools[].function.parameters

2. 调用响应：
   - Claude: content数组中包含tool_use块
   - OpenAI: message.tool_calls数组

3. 结果返回：
   - Claude: content数组中包含tool_result块
   - OpenAI: message.role="tool"

4. 强制调用：
   - Claude: tool_choice={"type": "any"} 或 {"type": "tool", "name": "xxx"}
   - OpenAI: tool_choice="required" 或 {"type": "function", "function": {"name": "xxx"}}
"""
```

---

## 五、Computer Use（计算机使用）

```python
"""
Claude 3.5 Sonnet Computer Use 功能
允许Claude模拟人类操作计算机（截图、鼠标、键盘）
"""

# Computer Use 工具定义
computer_tool = {
    "type": "computer_20241022",
    "name": "computer",
    "display_width_px": 1920,
    "display_height_px": 1080,
    "display_number": 1
}

# 发送请求
response = client.beta.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    tools=[{"type": "computer_20241022", "name": "computer"}],
    messages=[
        {
            "role": "user",
            "content": "请打开计算器，计算 1234 * 5678 的结果"
        }
    ]
)

# 处理Computer Use请求
while response.stop_reason == "tool_use":
    for content in response.content:
        if content.type == "tool_use":
            action = content.input

            # 执行计算机操作
            if action["action"] == "screenshot":
                # 截取屏幕
                screenshot = take_screenshot()
                tool_result = {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": screenshot
                    }
                }

            elif action["action"] == "mouse_move":
                # 移动鼠标
                move_mouse(action["coordinate"])
                tool_result = {"type": "text", "text": "鼠标已移动"}

            elif action["action"] == "click":
                # 点击
                click_mouse(action["coordinate"])
                tool_result = {"type": "text", "text": "已点击"}

            elif action["action"] == "type":
                # 输入文字
                type_text(action["text"])
                tool_result = {"type": "text", "text": "已输入"}

            # 返回操作结果
            response = client.beta.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                tools=[{"type": "computer_20241022", "name": "computer"}],
                messages=[
                    # ... 包含历史消息和tool_result
                ]
            )

"""
Computer Use 应用场景：
- 自动化UI测试
- 网页数据抓取
- 跨应用工作流自动化
- 复杂多步骤软件操作

注意事项：
- 目前为beta功能
- 需要在安全沙箱中运行
- 操作延迟较高（每次截图-分析-操作循环）
- 适合非实时场景
"""
```

---

## 六、Prompt Caching（提示词缓存）

```python
"""
Prompt Caching：降低长上下文重复调用的成本
"""

# 使用缓存块（cache_control）
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "你是一位专业的法律助手。"
        },
        {
            "type": "text",
            "text": "[这里是10万字的法律条文和案例库...]",
            "cache_control": {"type": "ephemeral"}  # 标记为可缓存
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "请根据上述法律条文，分析这个合同纠纷案例。"
        }
    ]
)

"""
Prompt Caching 原理：
- 将不常变化的长内容标记为 cache_control
- 首次调用：正常计费，服务端缓存处理结果
- 后续调用（5分钟内）：命中缓存，输入token成本降低90%

适用场景：
- RAG知识库（大量固定文档）
- 多轮对话中的长system prompt
- 重复的分析任务（相同背景资料）

限制：
- 缓存块最小 1024 tokens
- 缓存有效期约5分钟
- 仅支持 Claude 3.5 Sonnet 和 Claude 3 Opus
"""
```

---

## 七、错误处理与最佳实践

```python
"""
Claude API 错误处理
"""

from anthropic import (
    Anthropic,
    APIError,
    APIConnectionError,
    RateLimitError,
    AuthenticationError,
    BadRequestError
)
import time

def safe_claude_request(
    messages,
    model="claude-3-5-sonnet-20241022",
    max_retries=3,
    **kwargs
):
    """带重试的安全调用封装"""

    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=kwargs.get("max_tokens", 4096),
                messages=messages,
                **{k: v for k, v in kwargs.items() if k != "max_tokens"}
            )
            return response

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
常见错误处理：

| 错误类型 | 说明 | 处理建议 |
|---------|------|---------|
| RateLimitError | 请求频率超限 | 指数退避重试 |
| APIConnectionError | 网络连接失败 | 检查网络，立即重试 |
| AuthenticationError | API Key无效 | 检查密钥 |
| BadRequestError | 请求参数错误 | 检查参数，context_length需截断 |
| APIError (overloaded) | 服务端过载 | 稍后重试或换模型 |

Claude 特有最佳实践：
1. 始终设置合理的 max_tokens
2. 长上下文使用 Prompt Caching 降低成本
3. 代码任务优先使用 Claude 3.5 Sonnet
4. 使用 XML标签组织复杂prompt
5. 多模态任务控制图片数量和大小
"""
```

---

## 八、AI产品经理关注点

```
Claude API 产品化要点：

成本优化：
├── 模型选择策略
│   ├── 简单任务 → Haiku（最快最便宜）
│   ├── 标准任务 → Sonnet（性价比最优）
│   ├── 复杂推理 → Opus（能力最强）
│   └── 代码任务 → 3.5 Sonnet（代码能力顶尖）
├── 长上下文优化
│   ├── 使用 Prompt Caching
│   ├── 避免重复发送大段背景
│   └── 合理截断历史消息
└── 输出控制
    ├── 设置合适的 max_tokens
    ├── 使用 stop_sequences 控制输出边界
    └── 避免不必要的多候选生成

体验优化：
├── 延迟优化
│   ├── Haiku 首token延迟最低
│   ├── 流式输出提升感知速度
│   └── 预加载常用上下文
├── 质量保障
│   ├── temperature 根据场景调整
│   ├── 使用 XML 结构化 prompt
│   └── 代码任务提供示例格式
└── 长文本处理
    ├── 200K上下文支持长文档
    ├── PDF直接解析无需预处理
    └── 分块处理超长内容

安全合规：
├── 内置安全
│   ├── Constitutional AI 减少有害输出
│   ├── 自动拒绝危险请求
│   └── 企业级 SOC 2 认证
├── 数据保护
│   ├── 零数据保留选项（企业版）
│   ├── 不用于模型训练（默认）
│   └── AWS/GCP 私有部署选项
└── 审计追踪
    ├── metadata 字段追踪请求
    ├── 完整调用日志
    └── 与现有SIEM集成
```

---

## 九、企业级接入模板

### 9.1 Claude API 接入检查表

| 设计项     | 关键问题                                 | 输出物       |
| ---------- | ---------------------------------------- | ------------ |
| 主场景     | 是否为长文本、代码、审阅或安全敏感任务？ | 场景判断说明 |
| 上下文治理 | 200K 上下文如何做预算、裁剪和缓存？      | 上下文策略   |
| 工具能力   | 是否启用 Tool Use 或 Computer Use？      | 工具接入方案 |
| 稳定性     | 超时、重试、限流和回退模型如何设计？     | 稳定性方案   |
| 合规安全   | 数据保留、审计、权限和内容安全如何控制？ | 合规说明     |

### 9.2 企业接入字段建议

```json
{
  "provider": "anthropic",
  "primary_model": "claude-3-5-sonnet",
  "fallback_model": "claude-3-haiku",
  "features": ["tool_use", "prompt_caching", "streaming"],
  "max_context_tokens": 200000,
  "timeout_ms": 20000,
  "audit_enabled": true,
  "safety_controls": ["input_filter", "approval_for_computer_use"]
}
```

---

## 十、常见误区补充

| 误区                           | 问题                     | 正确做法                          |
| ------------------------------ | ------------------------ | --------------------------------- |
| 看到 200K 上下文就直接全量塞入 | 成本和延迟显著上升       | 先做摘要、裁剪和缓存              |
| 把 Computer Use 当默认能力     | 高风险且治理复杂         | 仅在明确场景下启用并做人工确认    |
| 忽视 OpenAI/Claude 结构差异    | 迁移成本和兼容问题被低估 | 提前抽象统一调用层                |
| 不做长文本评测                 | 长上下文效果被高估       | 用真实长文档样本做 POC            |
| 不设计备份模型                 | 供应商波动时业务中断     | 配置 Haiku 或其他模型作为降级路径 |

---

## 十一、阶段验收标准

- [ ] 能完成 Claude Messages API 的基础接入与多轮管理
- [ ] 能说明 Tool Use、Computer Use、Prompt Caching 的适用边界
- [ ] 能设计长上下文场景的成本和性能治理方案
- [ ] 能输出一份企业级 Claude API 接入与回退方案

---

## 十二、版本记录

- **2026-06-05** 补充文件头、学习目标、企业级接入模板、常见误区补充与阶段验收标准
- **2026-06-03** 初版完成，涵盖 Claude API 核心接口、Tool Use、Computer Use 与最佳实践

---

## 十三、参考资源

### 相关章节

| 章节                                         | 关联说明                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| [OpenAI_API](./OpenAI_API.md)                | 对比 OpenAI 的 API 设计差异（system prompt 位置、content 结构、tool_calls 格式） |
| [FunctionCalling](./FunctionCalling.md)      | 深入理解 Claude Tool Use 与 OpenAI Function Calling 的差异                       |
| [Streaming](./Streaming.md)                  | Claude 流式输出的实现方式和事件类型                                              |
| [Token管理](./Token管理.md)                  | Claude 200K 上下文窗口的管理策略                                                 |
| [成本优化](./成本优化.md)                    | Prompt Caching 降低长上下文成本的策略                                            |
| [ToolCalling](./ToolCalling.md)              | Computer Use 是 Tool Calling 的高级形态                                          |
| [Claude系列](../04-大模型生态/Claude系列.md) | 理解 Claude 模型家族的技术演进和产品生态                                         |

### 外部资源

- [Claude API 官方文档](https://docs.anthropic.com/claude/reference)
- [Anthropic Console](https://console.anthropic.com/)
- [API 定价页](https://www.anthropic.com/pricing)
- [Prompt Engineering 指南](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Claude 3 模型卡](https://www-cdn.anthropic.com/de8ba9b01c9ab7cbabf5c33b80b7bbc618857627/Model_Card_Claude_3.pdf)

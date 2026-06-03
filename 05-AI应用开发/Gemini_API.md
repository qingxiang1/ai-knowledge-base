<!--
  文件描述: Google Gemini API 使用指南，涵盖 Gemini Pro/Flash、Vertex AI、多模态、Grounding 等特性
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Gemini API 使用指南

> Gemini 是 Google DeepMind 推出的多模态大模型系列，原生支持文本、图像、音频、视频理解，与 Google 生态深度集成

---

## 一、API 概述

### 1.1 核心特性

```
Gemini API 核心能力：

模型系列
├── Gemini 1.5 Pro      长上下文（1M/2M tokens），复杂推理
├── Gemini 1.5 Flash    快速响应，高性价比
├── Gemini 1.0 Ultra    最强能力（已逐步被Pro取代）
└── Gemini 1.0 Pro      通用任务

多模态原生支持
├── 文本理解            多语言、长文档
├── 图像理解            视觉问答、OCR、图表分析
├── 音频理解            语音转录、音频内容分析
├── 视频理解            视频内容理解、时序分析
└── 多模态组合          图文音视频混合输入

Google 生态集成
├── Vertex AI           企业级部署平台
├── Google Search       Grounding 实时信息检索
├── Google Drive        直接读取云端文档
├── BigQuery            数据分析集成
└── Firebase            移动端集成

开发者友好
├── 免费额度             generous 免费层
├── 多语言SDK           Python/Node.js/Go/Java等
├── REST API            标准HTTP接口
└── 流式输出            实时响应
```

### 1.2 认证与客户端初始化

```python
"""
Gemini API 认证方式
"""

import google.generativeai as genai

# 方式1：环境变量（推荐）
# export GOOGLE_API_KEY="your-api-key"
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

# 方式2：显式传入
genai.configure(api_key="your-api-key")

# 方式3：Vertex AI（企业部署）
from google.cloud import aiplatform
from vertexai.generative_models import GenerativeModel

aiplatform.init(project="your-project", location="us-central1")
model = GenerativeModel("gemini-1.5-pro")

# 方式4：服务账号（生产环境）
from google.oauth2 import service_account
credentials = service_account.Credentials.from_service_account_file(
    "service-account.json"
)
genai.configure(credentials=credentials)

"""
两种接入方式对比：

| 特性 | Gemini API (genai) | Vertex AI |
|------|-------------------|-----------|
| 定位 | 开发者快速接入 | 企业级生产部署 |
| 免费额度 | 有（ generous ） | 按量计费 |
| 数据隐私 | 数据可能用于改进 | 不用于模型训练 |
| Grounding | 支持 | 支持 |
| 自定义模型 | 不支持 | 支持微调 |
| SLA保障 | 无 | 有 |
| 网络要求 | 需访问Google API | 需配置VPC |
"""
```

---

## 二、Generative Model API

### 2.1 基础文本生成

```python
"""
Gemini 基础文本生成
"""

import google.generativeai as genai

genai.configure(api_key="your-api-key")

# 初始化模型
model = genai.GenerativeModel('gemini-1.5-pro')

# 基础调用
response = model.generate_content("请解释什么是RAG架构？")
print(response.text)

# 带配置的调用
response = model.generate_content(
    "请解释什么是RAG架构？",
    generation_config=genai.types.GenerationConfig(
        temperature=0.7,
        top_p=0.95,
        top_k=40,
        max_output_tokens=2048,
        candidate_count=1,  # 生成候选数
        stop_sequences=["###"]
    )
)

# 响应结构解析
"""
response 对象结构：
{
  "candidates": [
    {
      "content": {
        "parts": [{"text": "RAG（Retrieval-Augmented Generation）..."}],
        "role": "model"
      },
      "finish_reason": "STOP",  # STOP / MAX_TOKENS / SAFETY / RECITATION / OTHER
      "safety_ratings": [...],
      "index": 0
    }
  ],
  "usage_metadata": {
    "prompt_token_count": 25,
    "candidates_token_count": 150,
    "total_token_count": 175
  }
}
"""
```

### 2.2 对话模式（Chat）

```python
"""
Gemini 对话模式
"""

# 启动对话
model = genai.GenerativeModel('gemini-1.5-pro')
chat = model.start_chat(history=[])

# 发送消息
response = chat.send_message("你好，请介绍一下你自己。")
print(response.text)

# 继续对话（自动维护上下文）
response = chat.send_message("你能帮我做什么？")
print(response.text)

# 查看对话历史
for message in chat.history:
    print(f"{message.role}: {message.parts[0].text}")

# 带配置的对话
response = chat.send_message(
    "请详细说明",
    generation_config=genai.types.GenerationConfig(temperature=0.5)
)

# 对话状态管理类
class GeminiChatSession:
    """维护多轮对话上下文"""
    
    def __init__(self, model_name: str = "gemini-1.5-pro", system_prompt: str = None):
        self.model = genai.GenerativeModel(
            model_name,
            system_instruction=system_prompt  # Gemini支持system instruction
        )
        self.chat = self.model.start_chat(history=[])
        self.total_input_tokens = 0
        self.total_output_tokens = 0
    
    def send(self, message: str, **kwargs) -> str:
        """发送消息并获取回复"""
        response = self.chat.send_message(message, **kwargs)
        
        # 记录token消耗
        usage = response.usage_metadata
        self.total_input_tokens += usage.prompt_token_count
        self.total_output_tokens += usage.candidates_token_count
        
        return response.text
    
    def get_history(self) -> list:
        """获取对话历史"""
        return [
            {"role": msg.role, "content": msg.parts[0].text}
            for msg in self.chat.history
        ]
```

### 2.3 System Instruction

```python
"""
Gemini System Instruction 使用
"""

# 方式1：模型初始化时设置
model = genai.GenerativeModel(
    'gemini-1.5-pro',
    system_instruction="你是一位专业的AI产品经理，擅长将技术概念转化为业务语言。"
)

# 方式2：多轮system instruction
model = genai.GenerativeModel(
    'gemini-1.5-pro',
    system_instruction="""
    你是一位产品需求分析师。你的职责是：
    1. 理解用户的业务需求
    2. 将其转化为清晰的产品需求文档
    3. 识别潜在的技术风险和依赖
    4. 提供可执行的迭代建议
    
    输出格式要求：
    - 使用Markdown格式
    - 包含需求背景、功能描述、验收标准
    - 标注优先级（P0/P1/P2）
    """
)

# 注意：Gemini的system_instruction是模型级配置
# 不像OpenAI/Claude那样每轮可变的system message
```

---

## 三、多模态输入

### 3.1 图像理解

```python
"""
Gemini 图像理解
"""

import PIL.Image

# 方式1：本地图片
image = PIL.Image.open('product_design.png')

response = model.generate_content([
    "请分析这个产品设计图，指出3个用户体验问题并给出改进建议。",
    image
])

# 方式2：多张图片
image1 = PIL.Image.open('before.png')
image2 = PIL.Image.open('after.png')

response = model.generate_content([
    "对比这两张设计图，分析改进了哪些方面？",
    image1,
    image2
])

# 方式3：图片URL（Vertex AI）
from vertexai.generative_models import Part

response = model.generate_content([
    "描述这张图片",
    Part.from_uri("gs://your-bucket/image.jpg", mime_type="image/jpeg")
])

# 方式4：Base64编码
import base64

with open("chart.png", "rb") as f:
    image_data = base64.b64encode(f.read()).decode('utf-8')

response = model.generate_content([
    {"text": "分析这张数据图表的趋势"},
    {
        "inline_data": {
            "mime_type": "image/png",
            "data": image_data
        }
    }
])
```

### 3.2 音频与视频理解

```python
"""
Gemini 音频和视频理解
"""

# 音频理解
audio_file = genai.upload_file(path="meeting_recording.mp3")

response = model.generate_content([
    "请总结这场会议的主要内容，列出决策事项和待办任务。",
    audio_file
])

# 视频理解
video_file = genai.upload_file(path="product_demo.mp4")

response = model.generate_content([
    "分析这个产品的演示视频，列出3个核心功能和2个可以改进的地方。",
    video_file
])

# 获取文件状态（大文件需要处理时间）
print(f"Video file state: {video_file.state}")
# 等待处理完成
import time
while video_file.state.name == "PROCESSING":
    time.sleep(5)
    video_file = genai.get_file(video_file.name)

# 删除上传的文件
genai.delete_file(video_file.name)

"""
文件上传限制：
- 音频：最大 1GB，支持 MP3, WAV, FLAC 等
- 视频：最大 1GB，支持 MP4, MOV, AVI 等
- 大文件上传后需要等待处理
- 文件默认保存2天，可手动删除
"""
```

### 3.3 PDF文档解析

```python
"""
Gemini PDF文档解析
"""

# 方式1：上传PDF文件
pdf_file = genai.upload_file(path="annual_report.pdf")

response = model.generate_content([
    "请总结这份年报的核心财务数据，列出营收、利润、增长率等关键指标。",
    pdf_file
])

# 方式2：多PDF对比分析
pdf1 = genai.upload_file(path="report_2023.pdf")
pdf2 = genai.upload_file(path="report_2024.pdf")

response = model.generate_content([
    "对比这两份年报，分析公司今年的主要变化和发展趋势。",
    pdf1,
    pdf2
])

# 方式3：针对特定页面提问
response = model.generate_content([
    "请详细解读第15页的风险因素部分，评估对投资的影响。",
    pdf_file
])

"""
PDF解析优势：
- 原生支持，无需预处理
- 保留文档结构和格式
- 支持图表和表格理解
- 1.5 Pro支持超长文档（1M tokens）
"""
```

---

## 四、Grounding（实时信息检索）

```python
"""
Gemini Grounding：结合Google搜索提供实时信息
"""

from google.generativeai.types import GenerationConfig

# 启用Grounding
grounding_tool = {
    "google_search_retrieval": {
        "dynamic_retrieval_config": {
            "mode": "MODE_DYNAMIC",  # 动态决定是否使用搜索
            "dynamic_threshold": 0.7   # 阈值：越高越倾向于使用搜索
        }
    }
}

response = model.generate_content(
    "2024年最新的AI大模型发展趋势是什么？",
    tools=[grounding_tool]
)

# 查看Grounding来源
for candidate in response.candidates:
    if candidate.grounding_metadata:
        print("搜索查询:", candidate.grounding_metadata.web_search_queries)
        print("来源页面:")
        for source in candidate.grounding_metadata.grounding_chunks:
            print(f"  - {source.web.title}: {source.web.uri}")

# 固定使用Google搜索（非动态）
fixed_search_tool = {
    "google_search_retrieval": {
        "dynamic_retrieval_config": {
            "mode": "MODE_UNSPECIFIED"
        }
    }
}

"""
Grounding 使用场景：
- 实时新闻查询
- 股价/汇率等动态数据
- 最新产品信息
- 时效性强的问答

限制：
- 仅支持Gemini 1.5 Pro/Flash
- 可能增加延迟
- 搜索结果质量影响回答质量
"""
```

---

## 五、Function Calling（函数调用）

```python
"""
Gemini Function Calling
"""

# 1. 定义工具
def get_weather(city: str, date: str = None) -> dict:
    """获取指定城市的天气信息"""
    # 实际实现...
    return {"temperature": 25, "condition": "sunny"}

def search_products(keyword: str, category: str = None) -> list:
    """搜索商品信息"""
    # 实际实现...
    return [{"name": "iPhone 15", "price": 5999}]

# 2. 创建FunctionDeclaration
tools = [
    genai.protos.Tool(
        function_declarations=[
            genai.protos.FunctionDeclaration(
                name="get_weather",
                description="获取指定城市的天气信息",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "city": genai.protos.Schema(type=genai.protos.Type.STRING),
                        "date": genai.protos.Schema(type=genai.protos.Type.STRING)
                    },
                    required=["city"]
                )
            ),
            genai.protos.FunctionDeclaration(
                name="search_products",
                description="搜索商品信息",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "keyword": genai.protos.Schema(type=genai.protos.Type.STRING),
                        "category": genai.protos.Schema(type=genai.protos.Type.STRING)
                    },
                    required=["keyword"]
                )
            )
        ]
    )
]

# 3. 发送请求
model = genai.GenerativeModel('gemini-1.5-pro')
chat = model.start_chat()

response = chat.send_message(
    "北京明天天气怎么样？适合穿什么衣服？",
    tools=tools,
    tool_config={'function_calling_config': 'AUTO'}  # AUTO / ANY / NONE
)

# 4. 处理Function Call
function_call = response.candidates[0].content.parts[0].function_call
print(f"调用函数: {function_call.name}")
print(f"参数: {function_call.args}")

# 5. 执行函数并返回结果
if function_call.name == "get_weather":
    result = get_weather(**function_call.args)
    
    # 返回结果给模型
    response = chat.send_message(
        genai.protos.Content(
            parts=[
                genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name="get_weather",
                        response={"result": result}
                    )
                )
            ]
        )
    )
    print(response.text)

"""
Gemini Function Calling 特点：
1. 支持并行函数调用（一次请求调用多个函数）
2. 函数声明使用proto格式
3. 支持强制调用（tool_config={'function_calling_config': 'ANY'}）
4. 函数结果通过FunctionResponse返回
"""
```

---

## 六、JSON Mode 与结构化输出

```python
"""
Gemini 结构化输出
"""

import json

# 方式1：JSON Mode（通过response_mime_type）
response = model.generate_content(
    "分析以下用户需求，提取关键信息：\n"
    "我想做一个智能客服系统，能回答产品使用问题，预算50万，3个月上线。",
    generation_config=genai.types.GenerationConfig(
        response_mime_type="application/json",
        response_schema={
            "type": "object",
            "properties": {
                "project_name": {"type": "string"},
                "requirements": {"type": "array", "items": {"type": "string"}},
                "budget": {"type": "number"},
                "timeline": {"type": "string"},
                "priority": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["project_name", "requirements", "budget"]
        }
    )
)

result = json.loads(response.text)
print(json.dumps(result, indent=2, ensure_ascii=False))

# 方式2：通过prompt约束（旧版本兼容）
response = model.generate_content("""
请将以下信息解析为JSON格式：
用户：张三，年龄：30岁，城市：北京，职业：产品经理

要求：
- 只输出JSON，不要其他文字
- 字段名使用英文
- 格式如下：
{
  "name": "...",
  "age": ...,
  "city": "...",
  "job": "..."
}
""")

# 方式3：Enum约束输出
response = model.generate_content(
    "这段用户反馈的情感倾向是什么？",
    generation_config=genai.types.GenerationConfig(
        response_mime_type="text/x.enum",
        response_schema={
            "type": "string",
            "enum": ["positive", "negative", "neutral"]
        }
    )
)
```

---

## 七、安全过滤与配置

```python
"""
Gemini 安全过滤配置
"""

from google.generativeai.types import HarmCategory, HarmBlockThreshold

# 自定义安全设置
safety_settings = [
    {
        "category": HarmCategory.HARM_CATEGORY_HARASSMENT,
        "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    },
    {
        "category": HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        "threshold": HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
    },
    {
        "category": HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    },
    {
        "category": HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        "threshold": HarmBlockThreshold.BLOCK_ONLY_HIGH
    }
]

response = model.generate_content(
    "用户输入内容",
    safety_settings=safety_settings
)

# 检查是否被安全过滤阻断
if response.candidates[0].finish_reason.name == "SAFETY":
    print("内容被安全过滤阻断")
    for rating in response.candidates[0].safety_ratings:
        print(f"  {rating.category}: {rating.probability}")

"""
安全过滤阈值：
- BLOCK_NONE：不阻断（最宽松）
- BLOCK_ONLY_HIGH：仅阻断高概率
- BLOCK_MEDIUM_AND_ABOVE：阻断中高风险（默认）
- BLOCK_LOW_AND_ABOVE：阻断低风险（最严格）

注意：
- 某些类别无法设置为BLOCK_NONE
- 医疗、金融等专业领域可能需要调整阈值
- 被阻断时response.text可能为空
"""
```

---

## 八、错误处理与最佳实践

```python
"""
Gemini API 错误处理
"""

from google.api_core import retry
from google.api_core.exceptions import (
    ResourceExhausted,  # 配额超限
    InvalidArgument,     # 参数错误
    PermissionDenied,    # 权限不足
    ServiceUnavailable   # 服务不可用
)

def safe_gemini_request(prompt, max_retries=3, **kwargs):
    """带重试的安全调用封装"""
    
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt, **kwargs)
            return response
            
        except ResourceExhausted as e:
            wait_time = 2 ** attempt
            print(f"Quota exceeded, retry in {wait_time}s...")
            time.sleep(wait_time)
            
        except InvalidArgument as e:
            print(f"Invalid argument: {e}")
            raise
            
        except PermissionDenied as e:
            print("Permission denied, check API key.")
            raise
            
        except ServiceUnavailable as e:
            print("Service unavailable, retrying...")
            time.sleep(2)
    
    raise Exception(f"Failed after {max_retries} retries")

# 使用google-api-core的retry装饰器
@retry.Retry(predicate=retry.if_exception_type(ResourceExhausted))
def retryable_request(prompt):
    return model.generate_content(prompt)

"""
Gemini 特有最佳实践：

1. 模型选择：
   - 快速响应 → Flash
   - 复杂推理 → Pro
   - 超长文档 → Pro (1M/2M context)

2. 多模态优化：
   - 图片分辨率建议 < 4096x4096
   - 视频先提取关键帧可降低成本
   - 音频建议先转文本（如只需内容）

3. 成本控制：
   - 使用Flash替代Pro进行初步筛选
   - 合理设置max_output_tokens
   - 及时删除上传的文件

4. 安全合规：
   - 根据业务场景调整safety_settings
   - 处理被阻断的情况（给友好提示）
   - 敏感内容添加人工审核
"""
```

---

## 九、AI产品经理关注点

```
Gemini API 产品化要点：

生态集成优势：
├── Google Workspace
│   ├── Gmail：邮件智能分类、回复建议
│   ├── Docs：文档协作、内容生成
│   ├── Sheets：数据分析、公式生成
│   └── Drive：文档问答、知识库构建
├── 搜索增强
│   ├── Grounding提供实时信息
│   ├── 降低幻觉风险
│   └── 适合新闻、行情类应用
└── 移动端
    ├── Firebase集成
    ├── 端侧推理（Gemini Nano）
    └── 离线能力

多模态产品场景：
├── 智能客服
│   ├── 用户上传截图描述问题
│   ├── 视频教程自动解析
│   └── 语音工单处理
├── 内容审核
│   ├── 图文联合审核
│   ├── 视频内容理解
│   └── 多语言支持
└── 教育辅助
    ├── 作业拍照解答
    ├── 视频课程总结
    └── 多模态学习材料

成本与性能：
├── 免费额度
│   ├── Gemini API： generous 免费层
│   ├── 适合原型开发和测试
│   └── 注意速率限制
├── 性价比
│   ├── Flash： cheapest per token
│   ├── Pro： best quality/price
│   └── 1.5系列优于1.0
└── 延迟优化
    ├── Flash首token延迟低
    ├── 流式输出
    └── 缓存常用响应
```

---

## 十、参考资源

- [Gemini API 官方文档](https://ai.google.dev/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [Vertex AI 文档](https://cloud.google.com/vertex-ai/docs/generative-ai/overview)
- [API 定价页](https://ai.google.dev/pricing)
- [Python SDK GitHub](https://github.com/google/generative-ai-python)

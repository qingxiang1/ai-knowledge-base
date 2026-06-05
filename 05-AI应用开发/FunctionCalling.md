<!--
  文件描述: Function Calling 函数调用详解，涵盖原理、多平台实现、最佳实践和高级模式
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-05
-->

# Function Calling 详解

> Function Calling（函数调用）是大模型与外部世界交互的核心机制，让AI能够调用API、查询数据库、执行计算，从"聊天工具"进化为"智能代理"

---

## 前置知识

阅读本节前，建议先了解以下内容：

| 前置章节 | 关联点 |
|---------|-------|
| [LLM工作原理](../02-AI基础知识/LLM工作原理.md) | 理解模型如何"决定"调用哪个函数——本质是概率预测 |
| [Token机制](../02-AI基础知识/Token机制.md) | 工具定义和返回结果都消耗 Token，影响成本 |
| [StructuredOutput](../03-Prompt工程/StructuredOutput.md) | Function Calling 的参数本质是结构化输出 |
| [OpenAI_API](./OpenAI_API.md) | OpenAI 的 tools 和 tool_calls 参数是 Function Calling 的入口 |
| [Claude_API](./Claude_API.md) | Claude 的 Tool Use 是 Function Calling 的另一种实现 |
| [模型选型指南](../04-大模型生态/模型选型指南.md) | 不同模型的 Function Calling 能力差异显著 |

---

## 一、核心概念

### 1.1 什么是 Function Calling

```
Function Calling 工作流程：

用户提问
    ↓
大模型分析意图
    ↓
判断是否需要调用工具
    ├── 否 → 直接生成文本回答
    └── 是 → 生成函数调用请求
                ↓
        提取函数名和参数
                ↓
        执行本地/远程函数
                ↓
        获取执行结果
                ↓
        将结果返回给大模型
                ↓
        大模型基于结果生成最终回答
                ↓
        返回给用户

核心价值：
├── 扩展能力边界        让模型获得实时数据、执行操作
├── 提高回答准确性      基于真实数据而非训练数据推测
├── 实现Agent能力       多步骤任务自动执行
└── 结构化交互          标准化的输入输出格式
```

### 1.2 与 Tool Calling 的关系

```
术语演进：

OpenAI          Function Calling
Claude          Tool Use
Gemini          Function Calling
DeepSeek        Function Calling

本质相同：
├── 都是让模型调用外部功能
├── 都需要定义工具/函数描述
├── 都遵循"请求-执行-返回"流程
└── 都可以实现多轮工具调用

细微差异：
├── OpenAI: tools[].function 结构
├── Claude: tools[].input_schema 结构
├── Gemini: tools[].function_declarations 结构
└── 参数传递和返回格式略有不同
```

---

## 二、基础实现（OpenAI）

### 2.1 定义与调用

```python
"""
Function Calling 基础实现
"""

from openai import OpenAI
import json

client = OpenAI()

# 1. 定义工具（函数描述）
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_current_weather",
            "description": "获取指定城市的当前天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "城市名称，如'北京'、'Shanghai'"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "温度单位"
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "在电商平台搜索商品",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {
                        "type": "string",
                        "description": "搜索关键词"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["electronics", "clothing", "food", "books"],
                        "description": "商品类别"
                    },
                    "price_range": {
                        "type": "object",
                        "properties": {
                            "min": {"type": "number"},
                            "max": {"type": "number"}
                        }
                    }
                },
                "required": ["keyword"]
            }
        }
    }
]

# 2. 发送请求（让模型决定是否调用）
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "北京今天天气怎么样？适合穿什么衣服？"}
    ],
    tools=tools,
    tool_choice="auto"  # auto / required / none
)

# 3. 处理响应
message = response.choices[0].message

if message.tool_calls:
    # 模型请求调用工具
    for tool_call in message.tool_calls:
        function_name = tool_call.function.name
        arguments = json.loads(tool_call.function.arguments)
        
        print(f"模型请求调用: {function_name}")
        print(f"参数: {arguments}")
        
        # 4. 执行函数（实际业务逻辑）
        if function_name == "get_current_weather":
            result = get_weather_from_api(
                location=arguments["location"],
                unit=arguments.get("unit", "celsius")
            )
        
        # 5. 将结果返回给模型
        follow_up = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": "北京今天天气怎么样？适合穿什么衣服？"},
                {"role": "assistant", "content": None, "tool_calls": [tool_call]},
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": function_name,
                    "content": json.dumps(result, ensure_ascii=False)
                }
            ],
            tools=tools
        )
        
        print(f"最终回答: {follow_up.choices[0].message.content}")
```

### 2.2 强制调用与选择策略

```python
"""
Tool Choice 策略控制
"""

# 策略1：自动判断（默认）
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "你好"}],
    tools=tools,
    tool_choice="auto"  # 模型自己决定是否调用
)

# 策略2：强制调用至少一个工具
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "查一下天气"}],
    tools=tools,
    tool_choice="required"  # 必须调用工具
)

# 策略3：强制调用指定工具
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "北京天气"}],
    tools=tools,
    tool_choice={
        "type": "function",
        "function": {"name": "get_current_weather"}
    }
)

# 策略4：禁止调用工具
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "你好"}],
    tools=tools,
    tool_choice="none"  # 不调用工具，纯文本回复
)
```

---

## 三、多平台实现对比

### 3.1 OpenAI

```python
"""
OpenAI Function Calling
"""

# 工具定义
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "获取天气",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string"}
            },
            "required": ["city"]
        }
    }
}]

# 调用
response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

# 处理 tool_calls
if response.choices[0].message.tool_calls:
    tool_call = response.choices[0].message.tool_calls[0]
    # tool_call.id, tool_call.function.name, tool_call.function.arguments
```

### 3.2 Claude

```python
"""
Claude Tool Use
"""

from anthropic import Anthropic

client = Anthropic()

# 工具定义
tools = [{
    "name": "get_weather",
    "description": "获取天气",
    "input_schema": {
        "type": "object",
        "properties": {
            "city": {"type": "string"}
        },
        "required": ["city"]
    }
}]

# 调用
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=tools,
    tool_choice={"type": "auto"},  # auto / any / tool / none
    messages=[{"role": "user", "content": "北京天气"}]
)

# 处理 tool_use
if response.stop_reason == "tool_use":
    tool_use = response.content[-1]  # 最后一个content块
    # tool_use.name, tool_use.input
    
    # 返回结果
    follow_up = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        tools=tools,
        messages=[
            {"role": "user", "content": "北京天气"},
            {"role": "assistant", "content": response.content},
            {
                "role": "user",
                "content": [{
                    "type": "tool_result",
                    "tool_use_id": tool_use.id,
                    "content": str(result)
                }]
            }
        ]
    )
```

### 3.3 Gemini

```python
"""
Gemini Function Calling
"""

import google.generativeai as genai

# 工具定义
tools = [genai.protos.Tool(
    function_declarations=[
        genai.protos.FunctionDeclaration(
            name="get_weather",
            description="获取天气",
            parameters=genai.protos.Schema(
                type=genai.protos.Type.OBJECT,
                properties={
                    "city": genai.protos.Schema(type=genai.protos.Type.STRING)
                },
                required=["city"]
            )
        )
    ]
)]

# 调用
model = genai.GenerativeModel('gemini-1.5-pro')
chat = model.start_chat()

response = chat.send_message(
    "北京天气",
    tools=tools,
    tool_config={'function_calling_config': 'AUTO'}  # AUTO / ANY / NONE
)

# 处理 function_call
function_call = response.candidates[0].content.parts[0].function_call
# function_call.name, function_call.args

# 返回结果
response = chat.send_message(
    genai.protos.Content(parts=[
        genai.protos.Part(
            function_response=genai.protos.FunctionResponse(
                name="get_weather",
                response={"result": result}
            )
        )
    ])
)
```

### 3.4 DeepSeek

```python
"""
DeepSeek Function Calling（兼容OpenAI格式）
"""

from openai import OpenAI

client = OpenAI(
    api_key="sk-xxx",
    base_url="https://api.deepseek.com"
)

# 工具定义（与OpenAI完全一致）
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "获取天气",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string"}
            },
            "required": ["city"]
        }
    }
}]

# 调用（与OpenAI完全一致）
response = client.chat.completions.create(
    model="deepseek-chat",  # 仅V3支持
    messages=[{"role": "user", "content": "北京天气"}],
    tools=tools
)

# 处理方式与OpenAI相同
```

---

## 四、高级模式

### 4.1 多轮工具调用

```python
"""
多轮工具调用：一个用户请求触发多次工具调用
"""

class MultiTurnToolAgent:
    """支持多轮工具调用的Agent"""
    
    def __init__(self, client, tools, max_iterations=5):
        self.client = client
        self.tools = tools
        self.max_iterations = max_iterations
        self.available_functions = {
            "get_weather": self._get_weather,
            "search_flights": self._search_flights,
            "book_hotel": self._book_hotel,
            "get_exchange_rate": self._get_exchange_rate
        }
    
    def run(self, user_query: str) -> str:
        """执行用户请求，自动处理多轮工具调用"""
        messages = [{"role": "user", "content": user_query}]
        
        for i in range(self.max_iterations):
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                tools=self.tools
            )
            
            message = response.choices[0].message
            
            # 如果没有工具调用，直接返回结果
            if not message.tool_calls:
                return message.content
            
            # 添加助手消息（包含工具调用请求）
            messages.append({
                "role": "assistant",
                "content": message.content,
                "tool_calls": [tc.model_dump() for tc in message.tool_calls]
            })
            
            # 执行所有请求的工具调用
            for tool_call in message.tool_calls:
                function_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                
                if function_name in self.available_functions:
                    result = self.available_functions[function_name](**arguments)
                else:
                    result = {"error": f"Unknown function: {function_name}"}
                
                # 添加工具结果到消息列表
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": function_name,
                    "content": json.dumps(result, ensure_ascii=False)
                })
        
        return "达到最大迭代次数，任务未完成。"
    
    def _get_weather(self, location: str, unit: str = "celsius"):
        # 实际实现...
        return {"temperature": 25, "condition": "sunny"}
    
    def _search_flights(self, origin: str, destination: str, date: str):
        # 实际实现...
        return [{"flight_no": "CA1234", "price": 1200}]
    
    def _book_hotel(self, city: str, check_in: str, check_out: str):
        # 实际实现...
        return {"booking_id": "BK123", "status": "confirmed"}
    
    def _get_exchange_rate(self, from_currency: str, to_currency: str):
        # 实际实现...
        return {"rate": 7.2}

# 使用示例
agent = MultiTurnToolAgent(client, tools)
result = agent.run("帮我规划一下下周去东京的行程，包括机票、酒店和当地的天气")
print(result)
```

### 4.2 并行工具调用

```python
"""
并行工具调用：一次请求调用多个工具
"""

# OpenAI 默认支持并行调用
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": "北京和上海今天的天气怎么样？"
    }],
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取天气",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"}
                },
                "required": ["city"]
            }
        }
    }]
)

# 模型可能同时请求两个城市的天气
message = response.choices[0].message
if message.tool_calls:
    print(f"并行调用 {len(message.tool_calls)} 个工具")
    
    # 并行执行所有工具调用
    import concurrent.futures
    
    def execute_tool(tool_call):
        function_name = tool_call.function.name
        arguments = json.loads(tool_call.function.arguments)
        result = available_functions[function_name](**arguments)
        return {
            "tool_call_id": tool_call.id,
            "result": result
        }
    
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = [executor.submit(execute_tool, tc) for tc in message.tool_calls]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    # 将所有结果返回给模型
    messages = [
        {"role": "user", "content": "北京和上海今天的天气怎么样？"},
        {"role": "assistant", "content": None, "tool_calls": [tc.model_dump() for tc in message.tool_calls]}
    ]
    
    for result in results:
        messages.append({
            "role": "tool",
            "tool_call_id": result["tool_call_id"],
            "content": json.dumps(result["result"], ensure_ascii=False)
        })
    
    final_response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools
    )
    
    print(final_response.choices[0].message.content)
```

### 4.3 工具调用与流式输出结合

```python
"""
工具调用 + 流式输出
"""

import json

def stream_with_tools():
    """流式处理工具调用"""
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "北京天气"}],
        tools=tools,
        stream=True
    )
    
    tool_calls_buffer = {}
    current_content = ""
    
    for chunk in response:
        delta = chunk.choices[0].delta
        
        # 处理文本内容
        if delta.content:
            current_content += delta.content
            print(delta.content, end="", flush=True)
        
        # 处理工具调用（流式累积）
        if delta.tool_calls:
            for tc in delta.tool_calls:
                index = tc.index
                if index not in tool_calls_buffer:
                    tool_calls_buffer[index] = {
                        "id": "",
                        "function": {"name": "", "arguments": ""}
                    }
                
                if tc.id:
                    tool_calls_buffer[index]["id"] += tc.id
                if tc.function.name:
                    tool_calls_buffer[index]["function"]["name"] += tc.function.name
                if tc.function.arguments:
                    tool_calls_buffer[index]["function"]["arguments"] += tc.function.arguments
    
    # 如果有工具调用，执行并获取最终结果
    if tool_calls_buffer:
        print("\n[执行工具调用...]")
        
        # 构建完整的tool_calls
        full_tool_calls = []
        for index in sorted(tool_calls_buffer.keys()):
            tc = tool_calls_buffer[index]
            full_tool_calls.append({
                "id": tc["id"],
                "type": "function",
                "function": tc["function"]
            })
        
        # 执行工具调用并获取最终回答...
        # （与常规流程相同）

stream_with_tools()
```

---

## 五、工具定义最佳实践

### 5.1 函数描述设计

```python
"""
工具定义最佳实践
"""

# 好的示例：描述清晰、参数明确
good_tools = [{
    "type": "function",
    "function": {
        "name": "search_products",
        "description": "在电商平台搜索商品。当用户想要查找、购买或了解商品信息时调用。",
        "parameters": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "搜索关键词，如'iPhone 15'、'无线耳机'"
                },
                "category": {
                    "type": "string",
                    "enum": ["electronics", "clothing", "food", "books"],
                    "description": "商品类别，用于缩小搜索范围"
                },
                "sort_by": {
                    "type": "string",
                    "enum": ["price_asc", "price_desc", "rating", "sales"],
                    "description": "排序方式，默认为相关性"
                }
            },
            "required": ["keyword"]
        }
    }
}]

# 差的示例：描述模糊、参数不清
bad_tools = [{
    "type": "function",
    "function": {
        "name": "func1",
        "description": "一个功能",  # 太模糊
        "parameters": {
            "type": "object",
            "properties": {
                "arg1": {"type": "string"},  # 无描述
                "arg2": {"type": "string"}
            }
        }
    }
}]

"""
工具描述设计原则：

1. 函数名：
   ├── 使用动词开头：get_、search_、create_、update_
   ├── 清晰表达功能：get_weather 而非 func1
   └── 使用snake_case

2. 描述：
   ├── 说明功能："获取指定城市的天气"
   ├── 说明触发条件："当用户询问天气时调用"
   └── 避免歧义

3. 参数：
   ├── 每个参数都要有description
   ├── 使用enum限制可选值
   ├── 明确required字段
   └── 提供示例值

4. 粒度：
   ├── 一个工具只做一件事
   ├── 避免过于复杂的嵌套参数
   └── 工具数量控制在10个以内
"""
```

### 5.2 工具结果返回

```python
"""
工具结果返回最佳实践
"""

# 好的结果格式：结构化、包含元数据
def format_tool_result(success: bool, data: dict, error: str = None) -> str:
    """格式化工具返回结果"""
    result = {
        "success": success,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }
    if error:
        result["error"] = error
    
    return json.dumps(result, ensure_ascii=False)

# 成功示例
success_result = format_tool_result(
    success=True,
    data={
        "temperature": 25,
        "condition": "sunny",
        "humidity": 60,
        "wind": "3级"
    }
)

# 失败示例
error_result = format_tool_result(
    success=False,
    data={},
    error="城市不存在，请检查城市名称"
)

"""
结果返回原则：

1. 始终返回结构化数据（JSON）
2. 包含success字段标识执行状态
3. 错误时提供清晰的错误信息
4. 包含时间戳等元数据
5. 数据字段名清晰易懂
6. 避免返回过长的原始数据（截断或摘要）
"""
```

---

## 六、AI产品经理关注点

```
Function Calling 产品化要点：

产品设计：
├── 工具范围界定
│   ├── 明确AI能做什么（工具覆盖范围）
│   ├── 明确AI不能做什么（边界提示）
│   └── 设计兜底策略（无法处理时转人工）
├── 用户体验
│   ├── 展示工具调用过程（增加透明度）
│   ├── 提供中断/重试机制
│   ├── 错误时友好提示
│   └── 控制响应延迟
└── 安全控制
    ├── 工具权限分级
    ├── 敏感操作二次确认
    ├── 调用频率限制
    └── 审计日志记录

技术实现：
├── 工具注册机制
│   ├── 动态加载工具
│   ├── 版本管理
│   └── 依赖管理
├── 错误处理
│   ├── 工具执行超时
│   ├── 工具返回错误
│   ├── 网络异常
│   └── 降级策略
└── 性能优化
    ├── 并行工具调用
    ├── 结果缓存
    ├── 异步执行
    └── 超时控制

常见陷阱：
├── 工具描述不清 → 模型调用错误
├── 参数验证缺失 → 执行失败
├── 结果过长 → 超出上下文限制
├── 循环调用 → 无限递归
└── 权限过大 → 安全风险
```

---

## 七、延伸阅读与参考资源

### 相关章节

| 章节 | 关联说明 |
|------|---------|
| [ToolCalling](./ToolCalling.md) | Function Calling 的高级形态——Agent 架构、MCP 协议、工具编排 |
| [OpenAI_API](./OpenAI_API.md) | OpenAI 的 tools 和 tool_choice 参数详解 |
| [Claude_API](./Claude_API.md) | Claude Tool Use 的 input_schema 和 tool_result 格式 |
| [Gemini_API](./Gemini_API.md) | Gemini Function Calling 的 proto 格式定义 |
| [DeepSeek_API](./DeepSeek_API.md) | DeepSeek V3 支持 Function Calling，R1 暂不支持 |
| [Streaming](./Streaming.md) | 流式输出中处理 tool_calls 分片的技巧 |
| [Token管理](./Token管理.md) | 工具定义和返回结果的 Token 消耗计算 |
| [成本优化](./成本优化.md) | 减少工具调用次数和 Token 消耗的优化策略 |
| [StructuredOutput](../03-Prompt工程/StructuredOutput.md) | Function Calling 参数生成的底层原理 |

### 外部资源

- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Claude Tool Use Documentation](https://docs.anthropic.com/claude/docs/tool-use)
- [Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [DeepSeek API Docs](https://platform.deepseek.com/docs)
- [Function Calling Best Practices](https://cookbook.openai.com/examples/how_to_call_functions_with_chat_models)

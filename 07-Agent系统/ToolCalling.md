<!--
  创建时间: 2026-06-03
  文件名: ToolCalling.md
  文件描述: Agent工具调用模块详解，补充工具定义、调用协议、错误处理、安全控制与产品化验收清单
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# Tool Calling（工具调用）

> 工具调用是 Agent 扩展能力边界的核心机制。通过调用外部工具，Agent 可以获取实时信息、执行计算、操作外部系统，突破大模型本身的知识和时效限制。

---

## 零、前置知识

阅读本节前，建议先掌握以下内容：

| 前置章节                                                 | 关联点                                             |
| -------------------------------------------------------- | -------------------------------------------------- |
| [FunctionCalling](../05-AI应用开发/FunctionCalling.md)   | Agent 工具调用建立在函数调用和结构化参数生成之上   |
| [ToolCalling](../05-AI应用开发/ToolCalling.md)           | 理解通用工具调用流程、工具 schema 和执行结果处理   |
| [StructuredOutput](../03-Prompt工程/StructuredOutput.md) | 工具参数、返回值和错误信息需要结构化表达           |
| [Agent架构](./Agent架构.md)                              | 理解 Tool Registry、执行器、安全网关在架构中的位置 |
| [Planning](./Planning.md)                                | 计划步骤需要映射为具体工具调用或人工确认动作       |
| [MCP基础](../08-MCP生态/MCP基础.md)                      | MCP 是工具标准化接入的重要协议方向                 |

**能力对标**：Tool Calling 对应 [能力模型](../00-Roadmap/能力模型.md) 中「AI应用构建力 → 工具集成能力」和「技术理解力 → API/系统集成能力」。掌握 Tool Calling，意味着你能为 Agent 设计安全、可控、可扩展的外部能力边界。

---

## 本章学习目标

完成本节后，你应该能够：

- 设计工具定义、参数 schema、返回结构、错误码和调用协议
- 判断工具适合做成原子工具、组合技能、插件还是 MCP Server
- 设计工具注册、发现、权限控制、人工确认、审计日志和限流机制
- 处理工具调用失败、超时、参数错误、权限不足和结果不可信等问题
- 定义 Tool Calling 的质量指标，包括调用成功率、参数有效率、延迟、安全事件和用户确认通过率

---

## 一、工具调用的本质与价值

### 1.1 为什么 Agent 需要工具

```
Agent 工具调用的必要性：

大模型的局限
├── 知识截止：训练数据有截止日期，无法获取最新信息
│   └── "2024年最新的AI技术趋势是什么？"
├── 无法计算：复杂数学计算容易出错
│   └── "计算 2347 * 8921 的精确结果"
├── 无法行动：不能执行实际操作
│   └── "帮我预订明天去上海的机票"
├── 幻觉风险：可能生成看似合理但错误的信息
│   └── "请列出某公司的真实财务数据"
└── 无法感知：不能获取实时环境信息
    └── "现在北京的天气怎么样？"

工具带来的能力扩展
├── 信息获取
│   ├── 搜索引擎：获取最新信息
│   ├── 数据库查询：检索结构化数据
│   └── API 调用：获取实时数据
├── 计算能力
│   ├── 代码执行：精确计算
│   ├── 数学引擎：复杂公式求解
│   └── 数据分析：统计和可视化
├── 行动执行
│   ├── 邮件发送：主动通知
│   ├── 日程管理：创建和修改日程
│   └── 系统操作：文件读写、配置修改
└── 专业领域
    ├── 代码解释器：执行和调试代码
    ├── 图像生成：文生图、图生图
    └── 语音识别：音频转文字

工具 vs 技能 vs 插件
├── 工具（Tool）
│   ├── 原子能力单元
│   ├── 明确的输入输出
│   └── 可被 Agent 直接调用
├── 技能（Skill）
│   ├── 工具的组合和编排
│   ├── 包含业务逻辑
│   └── 面向特定场景
└── 插件（Plugin）
    ├── 完整的应用扩展
    ├── 独立的 UI 和逻辑
    └── 通常需要用户授权
```

### 1.2 工具调用的核心挑战

```
工具调用面临的挑战：

选择困难
├── 工具数量多，如何选择最合适的？
├── 多个工具可以组合使用
└── 应对：工具描述优化、意图匹配

参数生成
├── 需要生成正确的参数格式
├── 参数值需要从上下文中提取
└── 应对：参数验证、错误重试

错误处理
├── 工具调用失败怎么办？
├── 返回结果不符合预期
└── 应对：重试机制、降级策略

安全风险
├── 工具可能被恶意调用
├── 敏感数据泄露
└── 应对：权限控制、输入过滤

性能问题
├── 工具调用增加延迟
├── 并发调用资源竞争
└── 应对：异步调用、缓存策略
```

---

## 二、工具定义与注册

### 2.1 工具定义规范

```python
"""
Agent 工具系统实现

工具定义、注册、调用和安全控制
"""

from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
from enum import Enum
import json
import inspect

class ToolCategory(Enum):
    """工具分类"""
    SEARCH = "search"           # 搜索类
    CALCULATION = "calculation" # 计算类
    DATA = "data"               # 数据类
    ACTION = "action"           # 行动类
    COMMUNICATION = "communication"  # 通信类
    MEDIA = "media"             # 媒体类
    SYSTEM = "system"           # 系统类

@dataclass
class ToolParameter:
    """工具参数定义"""
    name: str
    description: str
    type: str  # string, number, boolean, array, object
    required: bool = True
    default: Any = None
    enum: List[str] = None  # 枚举值
    example: Any = None

@dataclass
class ToolDefinition:
    """工具定义"""
    name: str
    description: str
    category: ToolCategory
    parameters: List[ToolParameter]
    return_type: str = "string"
    examples: List[Dict] = field(default_factory=list)
    timeout: int = 30  # 超时时间（秒）
    retry_count: int = 3  # 重试次数
    requires_confirmation: bool = False  # 是否需要用户确认

class BaseTool(ABC):
    """工具基类"""

    def __init__(self, definition: ToolDefinition):
        """
        初始化工具

        Args:
            definition: 工具定义
        """
        self.definition = definition

    @abstractmethod
    def execute(self, **kwargs) -> Dict[str, Any]:
        """
        执行工具

        Args:
            **kwargs: 工具参数

        Returns:
            执行结果
        """
        pass

    def validate_params(self, params: Dict) -> tuple[bool, str]:
        """
        验证参数

        Args:
            params: 参数字典

        Returns:
            (是否有效, 错误信息)
        """
        for param in self.definition.parameters:
            # 检查必填参数
            if param.required and param.name not in params:
                return False, f"缺少必填参数: {param.name}"

            # 检查类型
            if param.name in params:
                value = params[param.name]
                if not self._check_type(value, param.type):
                    return False, f"参数 {param.name} 类型错误，期望 {param.type}"

            # 检查枚举
            if param.enum and param.name in params:
                if params[param.name] not in param.enum:
                    return False, f"参数 {param.name} 值不在允许范围内"

        return True, ""

    def _check_type(self, value: Any, expected_type: str) -> bool:
        """检查类型"""
        type_map = {
            "string": str,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict
        }

        expected = type_map.get(expected_type)
        if expected:
            return isinstance(value, expected)

        return True

    def to_function_schema(self) -> Dict:
        """
        转换为 OpenAI Function Calling 格式

        Returns:
            Function schema
        """
        properties = {}
        required = []

        for param in self.definition.parameters:
            prop = {
                "type": param.type,
                "description": param.description
            }

            if param.enum:
                prop["enum"] = param.enum

            if param.example is not None:
                prop["example"] = param.example

            properties[param.name] = prop

            if param.required:
                required.append(param.name)

        return {
            "type": "function",
            "function": {
                "name": self.definition.name,
                "description": self.definition.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required
                }
            }
        }

# 示例工具实现
class SearchTool(BaseTool):
    """搜索工具"""

    def __init__(self, search_engine):
        """
        初始化搜索工具

        Args:
            search_engine: 搜索引擎实例
        """
        definition = ToolDefinition(
            name="web_search",
            description="搜索互联网获取最新信息",
            category=ToolCategory.SEARCH,
            parameters=[
                ToolParameter(
                    name="query",
                    description="搜索关键词",
                    type="string",
                    required=True,
                    example="2024年人工智能发展趋势"
                ),
                ToolParameter(
                    name="num_results",
                    description="返回结果数量",
                    type="number",
                    required=False,
                    default=5
                )
            ],
            return_type="string"
        )

        super().__init__(definition)
        self.search_engine = search_engine

    def execute(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """
        执行搜索

        Args:
            query: 搜索关键词
            num_results: 结果数量

        Returns:
            搜索结果
        """
        try:
            results = self.search_engine.search(query, num_results)

            return {
                "status": "success",
                "data": results,
                "query": query,
                "result_count": len(results)
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "query": query
            }

class CalculatorTool(BaseTool):
    """计算器工具"""

    def __init__(self):
        """初始化计算器工具"""
        definition = ToolDefinition(
            name="calculate",
            description="执行数学计算",
            category=ToolCategory.CALCULATION,
            parameters=[
                ToolParameter(
                    name="expression",
                    description="数学表达式",
                    type="string",
                    required=True,
                    example="(100 + 200) * 3"
                )
            ],
            return_type="number"
        )

        super().__init__(definition)

    def execute(self, expression: str) -> Dict[str, Any]:
        """
        执行计算

        Args:
            expression: 数学表达式

        Returns:
            计算结果
        """
        try:
            # 安全评估：只允许基本数学运算
            allowed_chars = set("0123456789+-*/().^% ")
            if not all(c in allowed_chars for c in expression):
                return {
                    "status": "error",
                    "error": "表达式包含非法字符"
                }

            # 替换 ^ 为 **
            expression = expression.replace("^", "**")

            # 安全计算
            result = eval(expression, {"__builtins__": {}}, {})

            return {
                "status": "success",
                "result": result,
                "expression": expression
            }
        except Exception as e:
            return {
                "status": "error",
                "error": f"计算错误: {str(e)}"
            }

class DatabaseQueryTool(BaseTool):
    """数据库查询工具"""

    def __init__(self, db_connection):
        """
        初始化数据库查询工具

        Args:
            db_connection: 数据库连接
        """
        definition = ToolDefinition(
            name="query_database",
            description="查询数据库获取结构化数据",
            category=ToolCategory.DATA,
            parameters=[
                ToolParameter(
                    name="query",
                    description="SQL 查询语句（只支持 SELECT）",
                    type="string",
                    required=True,
                    example="SELECT * FROM users WHERE age > 18"
                ),
                ToolParameter(
                    name="limit",
                    description="返回记录数限制",
                    type="number",
                    required=False,
                    default=100
                )
            ],
            return_type="array",
            requires_confirmation=True  # 需要用户确认
        )

        super().__init__(definition)
        self.db = db_connection

    def execute(self, query: str, limit: int = 100) -> Dict[str, Any]:
        """
        执行数据库查询

        Args:
            query: SQL 查询
            limit: 记录数限制

        Returns:
            查询结果
        """
        # 安全检查：只允许 SELECT
        query_lower = query.strip().lower()
        if not query_lower.startswith("select"):
            return {
                "status": "error",
                "error": "只允许 SELECT 查询"
            }

        try:
            # 添加 LIMIT
            if "limit" not in query_lower:
                query = f"{query} LIMIT {limit}"

            results = self.db.execute(query).fetchall()

            return {
                "status": "success",
                "data": results,
                "row_count": len(results)
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
```

### 2.2 工具注册中心

```python
"""
工具注册中心

管理工具的注册、发现和调用
"""

class ToolRegistry:
    """工具注册中心"""

    def __init__(self):
        """初始化工具注册中心"""
        self.tools: Dict[str, BaseTool] = {}
        self.categories: Dict[ToolCategory, List[str]] = {
            cat: [] for cat in ToolCategory
        }

    def register(self, tool: BaseTool):
        """
        注册工具

        Args:
            tool: 工具实例
        """
        name = tool.definition.name

        if name in self.tools:
            raise ValueError(f"工具 {name} 已存在")

        self.tools[name] = tool
        self.categories[tool.definition.category].append(name)

    def unregister(self, name: str):
        """
        注销工具

        Args:
            name: 工具名称
        """
        if name in self.tools:
            tool = self.tools.pop(name)
            self.categories[tool.definition.category].remove(name)

    def get(self, name: str) -> Optional[BaseTool]:
        """
        获取工具

        Args:
            name: 工具名称

        Returns:
            工具实例
        """
        return self.tools.get(name)

    def list_tools(self, category: ToolCategory = None) -> List[ToolDefinition]:
        """
        列出工具

        Args:
            category: 分类过滤

        Returns:
            工具定义列表
        """
        if category:
            return [
                self.tools[name].definition
                for name in self.categories[category]
            ]

        return [tool.definition for tool in self.tools.values()]

    def get_schemas(self) -> List[Dict]:
        """
        获取所有工具的 Function Schema

        Returns:
            Schema 列表
        """
        return [tool.to_function_schema() for tool in self.tools.values()]

    def search(self, query: str) -> List[ToolDefinition]:
        """
        搜索工具

        Args:
            query: 搜索关键词

        Returns:
            匹配的工具定义
        """
        results = []
        query_lower = query.lower()

        for tool in self.tools.values():
            # 匹配名称和描述
            if (query_lower in tool.definition.name.lower() or
                query_lower in tool.definition.description.lower()):
                results.append(tool.definition)

        return results

# 使用示例
"""
# 创建注册中心
registry = ToolRegistry()

# 注册工具
registry.register(SearchTool(search_engine))
registry.register(CalculatorTool())
registry.register(DatabaseQueryTool(db_connection))

# 获取工具列表
schemas = registry.get_schemas()
print(f"已注册 {len(schemas)} 个工具")

# 搜索工具
search_tools = registry.search("搜索")
"""
```

---

## 三、工具调用协议

### 3.1 调用流程

```python
"""
工具调用执行器

处理工具调用的完整生命周期
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import asyncio
import json

@dataclass
class ToolCall:
    """工具调用请求"""
    id: str
    tool_name: str
    parameters: Dict[str, Any]
    timestamp: datetime

@dataclass
class ToolResult:
    """工具调用结果"""
    call_id: str
    tool_name: str
    status: str  # success, error, timeout
    data: Any
    error_message: Optional[str] = None
    execution_time: float = 0.0

class ToolExecutor:
    """工具执行器"""

    def __init__(self, registry: ToolRegistry):
        """
        初始化执行器

        Args:
            registry: 工具注册中心
        """
        self.registry = registry
        self.history: List[Dict] = []

    async def execute(self, call: ToolCall) -> ToolResult:
        """
        执行工具调用

        Args:
            call: 调用请求

        Returns:
            调用结果
        """
        start_time = datetime.now()

        # 1. 查找工具
        tool = self.registry.get(call.tool_name)

        if not tool:
            return ToolResult(
                call_id=call.id,
                tool_name=call.tool_name,
                status="error",
                data=None,
                error_message=f"工具 {call.tool_name} 不存在"
            )

        # 2. 验证参数
        valid, error = tool.validate_params(call.parameters)

        if not valid:
            return ToolResult(
                call_id=call.id,
                tool_name=call.tool_name,
                status="error",
                data=None,
                error_message=error
            )

        # 3. 执行工具（带超时和重试）
        for attempt in range(tool.definition.retry_count):
            try:
                # 设置超时
                result = await asyncio.wait_for(
                    self._run_tool(tool, call.parameters),
                    timeout=tool.definition.timeout
                )

                execution_time = (datetime.now() - start_time).total_seconds()

                # 记录历史
                self._record_history(call, result, execution_time)

                return ToolResult(
                    call_id=call.id,
                    tool_name=call.tool_name,
                    status="success",
                    data=result,
                    execution_time=execution_time
                )

            except asyncio.TimeoutError:
                if attempt == tool.definition.retry_count - 1:
                    return ToolResult(
                        call_id=call.id,
                        tool_name=call.tool_name,
                        status="timeout",
                        data=None,
                        error_message="工具调用超时"
                    )

                await asyncio.sleep(1 * (attempt + 1))  # 指数退避

            except Exception as e:
                if attempt == tool.definition.retry_count - 1:
                    return ToolResult(
                        call_id=call.id,
                        tool_name=call.tool_name,
                        status="error",
                        data=None,
                        error_message=str(e)
                    )

                await asyncio.sleep(1 * (attempt + 1))

    async def _run_tool(self, tool: BaseTool, params: Dict) -> Any:
        """运行工具"""
        # 同步工具在异步环境中运行
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, tool.execute, **params)

    def _record_history(self, call: ToolCall, result: Any, execution_time: float):
        """记录调用历史"""
        self.history.append({
            "call": {
                "id": call.id,
                "tool_name": call.tool_name,
                "parameters": call.parameters
            },
            "result": result,
            "execution_time": execution_time,
            "timestamp": datetime.now().isoformat()
        })

    def get_history(self) -> List[Dict]:
        """获取调用历史"""
        return self.history

# 使用示例
"""
executor = ToolExecutor(registry)

# 创建调用请求
call = ToolCall(
    id="call_001",
    tool_name="calculate",
    parameters={"expression": "100 + 200"},
    timestamp=datetime.now()
)

# 执行调用
result = await executor.execute(call)
print(f"状态: {result.status}")
print(f"结果: {result.data}")
"""
```

### 3.2 与 LLM 集成

```python
"""
LLM 工具调用集成

将工具调用与 LLM 推理结合
"""

class LLMToolIntegration:
    """LLM 工具调用集成"""

    def __init__(self, llm_client, tool_registry: ToolRegistry):
        """
        初始化集成

        Args:
            llm_client: LLM 客户端
            tool_registry: 工具注册中心
        """
        self.llm = llm_client
        self.registry = tool_registry
        self.executor = ToolExecutor(tool_registry)

    async def chat_with_tools(
        self,
        messages: List[Dict],
        max_tool_calls: int = 10
    ) -> Dict:
        """
        支持工具调用的对话

        Args:
            messages: 对话历史
            max_tool_calls: 最大工具调用次数

        Returns:
            最终回复
        """
        tool_schemas = self.registry.get_schemas()

        for _ in range(max_tool_calls):
            # 调用 LLM
            response = self.llm.chat(
                messages=messages,
                tools=tool_schemas
            )

            # 检查是否需要调用工具
            if not response.get("tool_calls"):
                # 直接返回回复
                return {
                    "content": response["content"],
                    "tool_calls": []
                }

            # 执行工具调用
            tool_results = []

            for tool_call in response["tool_calls"]:
                call = ToolCall(
                    id=tool_call["id"],
                    tool_name=tool_call["function"]["name"],
                    parameters=json.loads(tool_call["function"]["arguments"]),
                    timestamp=datetime.now()
                )

                result = await self.executor.execute(call)

                tool_results.append({
                    "tool_call_id": call.id,
                    "role": "tool",
                    "name": call.tool_name,
                    "content": json.dumps(result.data) if result.status == "success" else result.error_message
                })

            # 将工具结果加入对话
            messages.append({
                "role": "assistant",
                "content": response["content"],
                "tool_calls": response["tool_calls"]
            })

            for result in tool_results:
                messages.append(result)

        # 达到最大调用次数，返回最后回复
        return {
            "content": "已达到最大工具调用次数",
            "tool_calls": []
        }

# 使用示例
"""
integration = LLMToolIntegration(llm, registry)

messages = [
    {"role": "user", "content": "计算 2347 * 8921 的结果，并搜索一下 2024年AI趋势"}
]

result = await integration.chat_with_tools(messages)
print(result["content"])
"""
```

---

## 四、工具安全控制

### 4.1 权限管理

```python
"""
工具安全控制

权限管理、输入过滤和审计日志
"""

from typing import Dict, List, Set
from enum import Enum

class PermissionLevel(Enum):
    """权限级别"""
    PUBLIC = "public"       # 公开可用
    USER = "user"           # 需要用户身份
    ADMIN = "admin"         # 需要管理员权限
    RESTRICTED = "restricted"  # 受限，需要特殊授权

class ToolSecurityManager:
    """工具安全管理器"""

    def __init__(self):
        """初始化安全管理器"""
        self.permissions: Dict[str, PermissionLevel] = {}
        self.allowed_users: Dict[str, Set[str]] = {}
        self.blocked_patterns = [
            "rm -rf", "drop table", "delete from",
            "exec(", "eval(", "system("
        ]

    def set_permission(self, tool_name: str, level: PermissionLevel):
        """
        设置工具权限

        Args:
            tool_name: 工具名称
            level: 权限级别
        """
        self.permissions[tool_name] = level

    def check_permission(
        self,
        tool_name: str,
        user_id: str,
        user_role: str
    ) -> bool:
        """
        检查权限

        Args:
            tool_name: 工具名称
            user_id: 用户 ID
            user_role: 用户角色

        Returns:
            是否有权限
        """
        level = self.permissions.get(tool_name, PermissionLevel.PUBLIC)

        if level == PermissionLevel.PUBLIC:
            return True

        if level == PermissionLevel.USER:
            return user_id is not None

        if level == PermissionLevel.ADMIN:
            return user_role == "admin"

        if level == PermissionLevel.RESTRICTED:
            allowed = self.allowed_users.get(tool_name, set())
            return user_id in allowed

        return False

    def validate_input(self, params: Dict) -> tuple[bool, str]:
        """
        验证输入安全

        Args:
            params: 参数字典

        Returns:
            (是否安全, 错误信息)
        """
        # 将参数转为字符串检查
        param_str = json.dumps(params).lower()

        for pattern in self.blocked_patterns:
            if pattern in param_str:
                return False, f"输入包含危险模式: {pattern}"

        return True, ""

    def audit_log(
        self,
        user_id: str,
        tool_name: str,
        params: Dict,
        result: Dict
    ):
        """
        记录审计日志

        Args:
            user_id: 用户 ID
            tool_name: 工具名称
            params: 参数
            result: 结果
        """
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "tool_name": tool_name,
            "parameters": params,
            "result_status": result.get("status", "unknown")
        }

        # 记录到日志系统
        print(f"[AUDIT] {json.dumps(log_entry)}")

# 使用示例
"""
security = ToolSecurityManager()

# 设置权限
security.set_permission("query_database", PermissionLevel.ADMIN)
security.set_permission("send_email", PermissionLevel.USER)

# 检查权限
has_permission = security.check_permission(
    "query_database",
    user_id="user_123",
    user_role="user"
)
print(f"有权限: {has_permission}")  # False

# 验证输入
safe, error = security.validate_input({"expression": "rm -rf /"})
print(f"安全: {safe}, 错误: {error}")
"""
```

### 4.2 人工确认机制

```python
"""
人工确认机制

对敏感操作要求用户确认
"""

class HumanConfirmation:
    """人工确认管理"""

    def __init__(self):
        """初始化确认管理"""
        self.pending_confirmations: Dict[str, Dict] = {}

    def request_confirmation(
        self,
        call_id: str,
        tool_name: str,
        params: Dict,
        description: str
    ) -> str:
        """
        请求确认

        Args:
            call_id: 调用 ID
            tool_name: 工具名称
            params: 参数
            description: 操作描述

        Returns:
            确认请求 ID
        """
        confirmation_id = f"confirm_{call_id}"

        self.pending_confirmations[confirmation_id] = {
            "call_id": call_id,
            "tool_name": tool_name,
            "params": params,
            "description": description,
            "status": "pending",
            "timestamp": datetime.now().isoformat()
        }

        return confirmation_id

    def confirm(self, confirmation_id: str) -> bool:
        """
        确认操作

        Args:
            confirmation_id: 确认请求 ID

        Returns:
            是否成功
        """
        if confirmation_id not in self.pending_confirmations:
            return False

        self.pending_confirmations[confirmation_id]["status"] = "confirmed"
        return True

    def reject(self, confirmation_id: str) -> bool:
        """
        拒绝操作

        Args:
            confirmation_id: 确认请求 ID

        Returns:
            是否成功
        """
        if confirmation_id not in self.pending_confirmations:
            return False

        self.pending_confirmations[confirmation_id]["status"] = "rejected"
        return True

    def get_status(self, confirmation_id: str) -> Optional[str]:
        """
        获取确认状态

        Args:
            confirmation_id: 确认请求 ID

        Returns:
            状态
        """
        confirmation = self.pending_confirmations.get(confirmation_id)
        return confirmation["status"] if confirmation else None

# 使用示例
"""
confirmation = HumanConfirmation()

# 请求确认
confirm_id = confirmation.request_confirmation(
    call_id="call_001",
    tool_name="send_email",
    params={"to": "user@example.com", "subject": "重要通知"},
    description="发送邮件给用户 user@example.com"
)

# 用户确认
confirmation.confirm(confirm_id)

# 检查状态
status = confirmation.get_status(confirm_id)
print(f"确认状态: {status}")  # confirmed
"""
```

---

## 五、AI 产品经理关注点

```
Tool Calling 产品化要点：

工具设计原则
├── 原子性
│   ├── 每个工具只做一件事
│   ├── 工具之间可以组合
│   └── 避免大而全的万能工具
├── 可解释性
│   ├── 工具名称和描述清晰
│   ├── 参数含义明确
│   └── 返回结果结构化
├── 安全性
│   ├── 敏感操作需要确认
│   ├── 输入验证和过滤
│   └── 权限分级管理
└── 稳定性
    ├── 超时和重试机制
    ├── 降级方案
    └── 错误信息友好

工具生态建设
├── 官方工具
│   ├── 高频场景覆盖
│   ├── 质量保证
│   └── 文档完善
├── 第三方工具
│   ├── 开放接入标准
│   ├── 安全审核
│   └── 用户评价
└── 自定义工具
    ├── 低代码配置
    ├── 模板市场
    └── 版本管理

用户体验设计
├── 透明度
│   ├── 展示正在使用的工具
│   ├── 显示工具调用结果
│   └── 允许查看调用历史
├── 可控性
│   ├── 用户可关闭特定工具
│   ├── 敏感操作确认
│   └── 撤销机制
└── 反馈
    ├── 工具调用进度
    ├── 错误提示和解决方案
    └── 结果展示优化

关键指标
├── 调用成功率
│   ├── 目标 > 95%
│   └── 监控失败原因
├── 响应时间
│   ├── P99 < 2s
│   └── 超时率 < 1%
├── 用户满意度
│   ├── 工具结果有用性评分
│   └── 重复调用率
└── 安全指标
    ├── 恶意调用拦截率
    ├── 敏感操作确认率
    └── 安全事件数

优化方向
├── 智能选择
│   ├── 基于意图的工具推荐
│   ├── 多工具自动编排
│   └── 上下文感知选择
├── 结果优化
│   ├── 结果摘要和格式化
│   ├── 多源信息融合
│   └── 可信度评估
└── 性能优化
    ├── 并行调用
    ├── 结果缓存
    └── 预加载热点工具
```

---

## 六、产品设计模板

### 6.1 工具接入 PRD 检查表

| 设计项      | 关键问题                                        | 输出物         |
| ----------- | ----------------------------------------------- | -------------- |
| 工具边界    | 工具是原子能力、组合技能、插件还是 MCP Server？ | 工具分层清单   |
| Schema 设计 | 参数、返回值、错误码是否结构化且可验证？        | Tool Schema    |
| 权限控制    | 谁能调用工具？哪些场景需要二次授权？            | 权限矩阵       |
| 人工确认    | 哪些调用会产生外部影响，需要用户确认？          | 高风险操作清单 |
| 执行策略    | 工具超时、失败、限流时如何处理？                | 重试与降级策略 |
| 结果可信    | 工具结果是否需要校验、引用来源或置信度？        | 结果校验规则   |
| 审计追踪    | 调用人、参数、结果、时间、错误是否可追溯？      | 审计日志规范   |

### 6.2 工具 Schema 字段建议

```json
{
  "name": "send_email",
  "description": "向指定收件人发送邮件",
  "category": "communication",
  "parameters": {
    "type": "object",
    "properties": {
      "to": {
        "type": "string",
        "description": "收件人邮箱"
      },
      "subject": {
        "type": "string",
        "description": "邮件标题"
      },
      "content": {
        "type": "string",
        "description": "邮件正文"
      }
    },
    "required": ["to", "subject", "content"]
  },
  "permissions": {
    "level": "user",
    "requires_confirmation": true
  },
  "runtime": {
    "timeout_seconds": 10,
    "retry_count": 2,
    "rate_limit": "10/minute"
  }
}
```

---

## 七、常见误区

| 误区               | 问题                                 | 正确做法                                       |
| ------------------ | ------------------------------------ | ---------------------------------------------- |
| 工具描述过短       | 模型无法准确选择工具                 | 用清晰名称、适用场景、反例和参数说明提升可选性 |
| 工具过于万能       | 参数复杂、失败率高、难审计           | 拆成原子工具，再通过 Planning 组合             |
| 不做权限控制       | 可能执行越权、破坏性或高成本操作     | 按工具风险设置权限、确认和审计                 |
| 工具失败只返回错误 | Agent 无法恢复任务                   | 返回结构化错误码、原因和建议动作               |
| 忽略结果可信度     | 工具返回的数据可能过期、不完整或冲突 | 加入来源、时间戳、置信度和校验机制             |

---

## 八、阶段验收标准

- [ ] 能设计一个工具的名称、描述、参数 schema、返回结构和错误码
- [ ] 能区分原子工具、组合技能、插件、MCP Server 的适用场景
- [ ] 能设计 Tool Registry、Tool Executor、Security Manager 的基础架构
- [ ] 能为敏感工具设计权限控制、人工确认、审计日志和撤销机制
- [ ] 能定义工具调用指标，包括调用成功率、参数有效率、P99 延迟、超时率和安全事件数

---

## 九、版本记录

- **2026-06-05** 补充前置知识、能力对标、学习目标、产品设计模板、常见误区和阶段验收标准
- **2026-06-03** 初版完成，涵盖工具定义、工具注册、调用协议、LLM 集成、安全控制与产品关注点

---

## 十、参考资源

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling) - OpenAI 函数调用指南
- [LangChain Tools](https://python.langchain.com/docs/modules/agents/tools/) - LangChain 工具模块
- [Toolformer](https://arxiv.org/abs/2302.04761) - 工具使用的大模型训练
- [Gorilla](https://gorilla.cs.berkeley.edu/) - 大模型 API 调用
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) - 模型上下文协议
- [Tool Learning Survey](https://arxiv.org/abs/2402.17176) - 工具学习综述

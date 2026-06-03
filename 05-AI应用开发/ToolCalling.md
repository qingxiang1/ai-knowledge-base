<!--
  文件描述: Tool Calling 工具调用高级模式，涵盖 Agent 架构、MCP、工具编排和复杂工作流
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Tool Calling 高级模式

> Tool Calling 不仅是简单的函数调用，更是构建 AI Agent 的核心基础设施。本章节深入探讨工具编排、Agent 架构和复杂工作流实现。

---

## 一、从 Function Calling 到 Tool Calling

### 1.1 概念升级

```
Function Calling → Tool Calling 的演进：

Function Calling（基础）
├── 单次函数调用
├── 简单参数传递
├── 直接结果返回
└── 被动响应式

Tool Calling（高级）
├── 多工具编排         工具链、工具图
├── 状态管理           上下文维护、记忆
├── 自主决策           Agent自主规划
├── 错误恢复           重试、降级、回滚
└── 工作流引擎         复杂业务流程

Tool Calling 核心组件：
├── Tool Registry      工具注册中心
├── Tool Router        工具路由/调度
├── Tool Executor      工具执行器
├── Result Processor   结果处理器
├── State Manager      状态管理器
└── Error Handler      错误处理器
```

### 1.2 工具类型体系

```python
"""
工具类型分类体系
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

class ToolCategory(Enum):
    """工具分类"""
    DATA_QUERY = "data_query"        # 数据查询：数据库、API、搜索引擎
    DATA_MODIFY = "data_modify"      # 数据修改：写入、更新、删除
    CALCULATION = "calculation"      # 计算：数学、统计、逻辑
    EXTERNAL_API = "external_api"    # 外部API：天气、地图、支付
    SYSTEM_CONTROL = "system_control" # 系统控制：文件、进程、配置
    COMMUNICATION = "communication"   # 通信：邮件、消息、通知
    CODE_EXECUTION = "code_execution" # 代码执行：Python、SQL、Shell

class ToolRiskLevel(Enum):
    """工具风险等级"""
    READ_ONLY = 1      # 只读，无风险
    LOW = 2            # 低风险，可自动执行
    MEDIUM = 3         # 中风险，需确认
    HIGH = 4           # 高风险，需授权
    CRITICAL = 5       # 关键操作，需多重确认

@dataclass
class Tool:
    """工具定义"""
    name: str
    description: str
    category: ToolCategory
    risk_level: ToolRiskLevel
    parameters: Dict[str, Any]
    required_permissions: List[str]
    timeout: int = 30
    retry_count: int = 3
    cache_enabled: bool = False
    
    def to_function_schema(self) -> Dict:
        """转换为Function Calling Schema"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }

# 工具示例
tools = [
    Tool(
        name="query_database",
        description="查询数据库获取信息",
        category=ToolCategory.DATA_QUERY,
        risk_level=ToolRiskLevel.READ_ONLY,
        parameters={
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "SQL查询语句"}
            },
            "required": ["sql"]
        },
        required_permissions=["db:read"]
    ),
    Tool(
        name="send_email",
        description="发送邮件",
        category=ToolCategory.COMMUNICATION,
        risk_level=ToolRiskLevel.MEDIUM,
        parameters={
            "type": "object",
            "properties": {
                "to": {"type": "string"},
                "subject": {"type": "string"},
                "body": {"type": "string"}
            },
            "required": ["to", "subject", "body"]
        },
        required_permissions=["email:send"]
    )
]
```

---

## 二、Tool Registry 与动态发现

### 2.1 工具注册中心

```python
"""
Tool Registry：动态工具注册与发现
"""

class ToolRegistry:
    """工具注册中心"""
    
    def __init__(self):
        self._tools: Dict[str, Tool] = {}
        self._handlers: Dict[str, callable] = {}
        self._categories: Dict[ToolCategory, List[str]] = {}
    
    def register(self, tool: Tool, handler: callable) -> None:
        """注册工具"""
        if tool.name in self._tools:
            raise ValueError(f"Tool {tool.name} already registered")
        
        self._tools[tool.name] = tool
        self._handlers[tool.name] = handler
        
        if tool.category not in self._categories:
            self._categories[tool.category] = []
        self._categories[tool.category].append(tool.name)
    
    def unregister(self, tool_name: str) -> None:
        """注销工具"""
        if tool_name not in self._tools:
            return
        
        tool = self._tools.pop(tool_name)
        self._handlers.pop(tool_name)
        self._categories[tool.category].remove(tool_name)
    
    def get_tool(self, name: str) -> Optional[Tool]:
        """获取工具定义"""
        return self._tools.get(name)
    
    def get_handler(self, name: str) -> Optional[callable]:
        """获取工具处理器"""
        return self._handlers.get(name)
    
    def list_tools(self, category: ToolCategory = None) -> List[Tool]:
        """列出工具"""
        if category:
            return [self._tools[name] for name in self._categories.get(category, [])]
        return list(self._tools.values())
    
    def get_schemas(self, category: ToolCategory = None) -> List[Dict]:
        """获取工具Schema列表（用于Function Calling）"""
        return [tool.to_function_schema() for tool in self.list_tools(category)]
    
    def search_tools(self, keyword: str) -> List[Tool]:
        """搜索工具"""
        keyword = keyword.lower()
        return [
            tool for tool in self._tools.values()
            if keyword in tool.name.lower() or keyword in tool.description.lower()
        ]

# 使用示例
registry = ToolRegistry()

# 注册工具
registry.register(
    Tool(name="get_weather", ...),
    handler=lambda **kwargs: get_weather_api(**kwargs)
)

# 获取所有工具Schema
schemas = registry.get_schemas()
```

### 2.2 动态工具加载

```python
"""
动态工具加载：从配置文件、数据库或远程服务加载工具
"""

import importlib
import yaml

class DynamicToolLoader:
    """动态工具加载器"""
    
    def __init__(self, registry: ToolRegistry):
        self.registry = registry
    
    def load_from_config(self, config_path: str) -> None:
        """从YAML配置文件加载工具"""
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        for tool_config in config.get('tools', []):
            tool = Tool(
                name=tool_config['name'],
                description=tool_config['description'],
                category=ToolCategory(tool_config['category']),
                risk_level=ToolRiskLevel(tool_config['risk_level']),
                parameters=tool_config['parameters'],
                required_permissions=tool_config.get('permissions', [])
            )
            
            # 动态加载处理器
            handler = self._load_handler(
                tool_config['handler_module'],
                tool_config['handler_function']
            )
            
            self.registry.register(tool, handler)
    
    def load_from_module(self, module_path: str) -> None:
        """从Python模块加载工具"""
        module = importlib.import_module(module_path)
        
        # 查找模块中所有带有@tool装饰器的函数
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if hasattr(attr, '_tool_metadata'):
                metadata = attr._tool_metadata
                tool = Tool(**metadata)
                self.registry.register(tool, attr)
    
    def _load_handler(self, module: str, function: str) -> callable:
        """动态加载处理器函数"""
        mod = importlib.import_module(module)
        return getattr(mod, function)

# 配置文件示例 (tools.yaml)
"""
tools:
  - name: get_weather
    description: 获取天气信息
    category: external_api
    risk_level: 1
    parameters:
      type: object
      properties:
        city:
          type: string
          description: 城市名称
      required: [city]
    permissions: []
    handler_module: handlers.weather
    handler_function: get_weather

  - name: query_database
    description: 查询数据库
    category: data_query
    risk_level: 1
    parameters:
      type: object
      properties:
        sql:
          type: string
          description: SQL语句
      required: [sql]
    permissions: [db:read]
    handler_module: handlers.database
    handler_function: execute_query
"""

# 装饰器方式注册
def tool(**metadata):
    """工具装饰器"""
    def decorator(func):
        func._tool_metadata = metadata
        return func
    return decorator

# 使用示例
@tool(
    name="calculate",
    description="执行数学计算",
    category="calculation",
    risk_level=1,
    parameters={
        "type": "object",
        "properties": {
            "expression": {"type": "string", "description": "数学表达式"}
        },
        "required": ["expression"]
    }
)
def calculate(expression: str) -> float:
    """计算表达式"""
    return eval(expression)
```

---

## 三、Agent 架构设计

### 3.1 ReAct 模式

```python
"""
ReAct (Reasoning + Acting) Agent 实现
"""

from typing import List, Dict, Any
import json

class ReActAgent:
    """
    ReAct Agent：交替进行推理(Reasoning)和行动(Acting)
    
    工作流程：
    Thought → Action → Observation → Thought → Action → ... → Answer
    """
    
    def __init__(self, client, registry: ToolRegistry, max_iterations: int = 10):
        self.client = client
        self.registry = registry
        self.max_iterations = max_iterations
    
    def run(self, query: str) -> str:
        """执行用户查询"""
        
        # 构建系统提示词
        system_prompt = self._build_system_prompt()
        
        # 初始化消息
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]
        
        for i in range(self.max_iterations):
            # 调用模型
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                tools=self.registry.get_schemas()
            )
            
            message = response.choices[0].message
            
            # 检查是否完成
            if not message.tool_calls:
                return message.content
            
            # 执行工具调用
            tool_results = self._execute_tools(message.tool_calls)
            
            # 构建观察结果
            observation = self._build_observation(tool_results)
            
            # 添加到消息历史
            messages.append({
                "role": "assistant",
                "content": message.content,
                "tool_calls": [tc.model_dump() for tc in message.tool_calls]
            })
            
            for tool_result in tool_results:
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_result["tool_call_id"],
                    "content": json.dumps(tool_result["result"], ensure_ascii=False)
                })
        
        return "达到最大迭代次数，任务未完成。"
    
    def _build_system_prompt(self) -> str:
        """构建ReAct系统提示词"""
        tools_desc = "\n".join([
            f"- {tool.name}: {tool.description}"
            for tool in self.registry.list_tools()
        ])
        
        return f"""你是一个智能助手，可以使用以下工具完成任务：

可用工具：
{tools_desc}

工作方式：
1. 分析用户需求，思考解决方案
2. 如果需要，调用合适的工具获取信息
3. 基于工具返回的结果，继续思考或给出最终答案
4. 每个步骤都要清晰说明你的思考过程

重要：
- 每次只调用必要的工具
- 如果一次调用可以获取所有信息，不要分多次
- 工具返回错误时，尝试其他方案
"""
    
    def _execute_tools(self, tool_calls: List[Any]) -> List[Dict]:
        """执行工具调用"""
        results = []
        
        for tool_call in tool_calls:
            tool_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)
            
            tool = self.registry.get_tool(tool_name)
            handler = self.registry.get_handler(tool_name)
            
            try:
                result = handler(**arguments)
                results.append({
                    "tool_call_id": tool_call.id,
                    "tool_name": tool_name,
                    "result": result,
                    "success": True
                })
            except Exception as e:
                results.append({
                    "tool_call_id": tool_call.id,
                    "tool_name": tool_name,
                    "result": {"error": str(e)},
                    "success": False
                })
        
        return results
    
    def _build_observation(self, tool_results: List[Dict]) -> str:
        """构建观察结果文本"""
        observations = []
        for result in tool_results:
            status = "成功" if result["success"] else "失败"
            observations.append(
                f"工具 {result['tool_name']} 调用{status}：{result['result']}"
            )
        return "\n".join(observations)
```

### 3.2 Plan-and-Execute 模式

```python
"""
Plan-and-Execute Agent：先规划后执行
"""

class PlanAndExecuteAgent:
    """
    计划-执行 Agent
    
    工作流程：
    1. 理解任务 → 2. 制定计划 → 3. 逐步执行 → 4. 汇总结果
    """
    
    def __init__(self, client, registry: ToolRegistry):
        self.client = client
        self.registry = registry
    
    def run(self, query: str) -> str:
        """执行用户查询"""
        
        # 步骤1：制定计划
        plan = self._create_plan(query)
        print(f"执行计划：{plan}")
        
        # 步骤2：执行计划
        context = {"query": query, "results": []}
        
        for step in plan["steps"]:
            print(f"执行步骤：{step['description']}")
            
            result = self._execute_step(step, context)
            context["results"].append(result)
            
            # 如果步骤失败，重新规划
            if not result["success"]:
                plan = self._replan(context)
                if not plan:
                    return "任务执行失败，无法完成。"
        
        # 步骤3：汇总结果
        return self._summarize_results(context)
    
    def _create_plan(self, query: str) -> Dict:
        """创建执行计划"""
        
        tools_desc = "\n".join([
            f"- {tool.name}: {tool.description}"
            for tool in self.registry.list_tools()
        ])
        
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "system",
                "content": f"""你是一个任务规划专家。根据用户需求，制定详细的执行计划。

可用工具：
{tools_desc}

请输出JSON格式的计划：
{{
  "steps": [
    {{
      "step_number": 1,
      "description": "步骤描述",
      "tool": "工具名（如不需要则为null）",
      "parameters": {{}},
      "expected_output": "预期输出"
    }}
  ]
}}"""
            }, {
                "role": "user",
                "content": f"请为以下任务制定计划：{query}"
            }],
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
    
    def _execute_step(self, step: Dict, context: Dict) -> Dict:
        """执行单个步骤"""
        tool_name = step.get("tool")
        
        if not tool_name:
            # 无需工具，直接推理
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": f"基于以下上下文，{step['description']}\n\n上下文：{context}"
                }]
            )
            return {
                "success": True,
                "output": response.choices[0].message.content
            }
        
        # 调用工具
        handler = self.registry.get_handler(tool_name)
        parameters = step.get("parameters", {})
        
        try:
            result = handler(**parameters)
            return {"success": True, "output": result}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _replan(self, context: Dict) -> Optional[Dict]:
        """重新规划"""
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": f"原计划执行失败，请基于当前上下文重新规划：\n{json.dumps(context, ensure_ascii=False)}"
            }],
            response_format={"type": "json_object"}
        )
        
        plan = json.loads(response.choices[0].message.content)
        return plan if plan.get("steps") else None
    
    def _summarize_results(self, context: Dict) -> str:
        """汇总执行结果"""
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": f"基于以下执行结果，给出最终答案：\n{json.dumps(context, ensure_ascii=False)}"
            }]
        )
        
        return response.choices[0].message.content
```

---

## 四、MCP (Model Context Protocol)

```python
"""
MCP (Model Context Protocol)：标准化工具调用协议

MCP是Anthropic推出的开放协议，用于标准化AI模型与外部工具的交互。
"""

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

class MCPClient:
    """MCP客户端"""
    
    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
    
    async def connect(self, server_script_path: str):
        """连接到MCP服务器"""
        server_params = StdioServerParameters(
            command="python",
            args=[server_script_path],
            env=None
        )
        
        stdio_transport = await self.exit_stack.enter_async_context(
            stdio_client(server_params)
        )
        self.stdio, self.write = stdio_transport
        self.session = await self.exit_stack.enter_async_context(
            ClientSession(self.stdio, self.write)
        )
        
        await self.session.initialize()
    
    async def list_tools(self) -> List[Dict]:
        """列出可用工具"""
        response = await self.session.list_tools()
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.inputSchema
            }
            for tool in response.tools
        ]
    
    async def call_tool(self, name: str, arguments: Dict) -> Any:
        """调用工具"""
        result = await self.session.call_tool(name, arguments=arguments)
        return result
    
    async def close(self):
        """关闭连接"""
        await self.exit_stack.aclose()

# MCP服务器示例 (server.py)
"""
from mcp.server import Server
from mcp.types import Tool
import mcp.types as types

server = Server("example-server")

@server.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="get_weather",
            description="获取天气信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {"type": "string"}
                },
                "required": ["city"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> List[types.TextContent]:
    if name == "get_weather":
        city = arguments["city"]
        # 实际获取天气逻辑
        weather = f"{city}今天晴天，25°C"
        return [types.TextContent(type="text", text=weather)]
    
    raise ValueError(f"Unknown tool: {name}")

if __name__ == "__main__":
    from mcp.server.stdio import stdio_server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())
"""
```

---

## 五、复杂工作流实现

### 5.1 工作流引擎

```python
"""
工作流引擎：可视化编排工具调用流程
"""

from typing import Dict, List, Any, Optional
from enum import Enum
import json

class NodeType(Enum):
    """节点类型"""
    START = "start"
    LLM = "llm"
    TOOL = "tool"
    CONDITION = "condition"
    LOOP = "loop"
    END = "end"

class WorkflowNode:
    """工作流节点"""
    
    def __init__(self, node_id: str, node_type: NodeType, config: Dict):
        self.node_id = node_id
        self.node_type = node_type
        self.config = config
        self.next_nodes: List[str] = []
    
    async def execute(self, context: Dict) -> Dict:
        """执行节点逻辑"""
        raise NotImplementedError

class LLMNode(WorkflowNode):
    """LLM节点"""
    
    async def execute(self, context: Dict) -> Dict:
        client = context["client"]
        prompt = self.config["prompt"].format(**context)
        
        response = client.chat.completions.create(
            model=self.config.get("model", "gpt-4o"),
            messages=[{"role": "user", "content": prompt}]
        )
        
        context["last_output"] = response.choices[0].message.content
        return context

class ToolNode(WorkflowNode):
    """工具节点"""
    
    async def execute(self, context: Dict) -> Dict:
        registry = context["registry"]
        tool_name = self.config["tool"]
        parameters = self.config.get("parameters", {})
        
        # 参数可能包含变量引用
        resolved_params = {}
        for key, value in parameters.items():
            if isinstance(value, str) and value.startswith("$"):
                resolved_params[key] = context.get(value[1:])
            else:
                resolved_params[key] = value
        
        handler = registry.get_handler(tool_name)
        result = handler(**resolved_params)
        
        context["last_output"] = result
        context[f"tool_result_{tool_name}"] = result
        return context

class ConditionNode(WorkflowNode):
    """条件节点"""
    
    async def execute(self, context: Dict) -> Dict:
        condition = self.config["condition"]
        # 简单条件判断
        result = eval(condition, {"__builtins__": {}}, context)
        context["condition_result"] = result
        return context

class WorkflowEngine:
    """工作流引擎"""
    
    def __init__(self):
        self.nodes: Dict[str, WorkflowNode] = {}
    
    def add_node(self, node: WorkflowNode) -> None:
        """添加节点"""
        self.nodes[node.node_id] = node
    
    def connect(self, from_id: str, to_id: str) -> None:
        """连接节点"""
        if from_id in self.nodes and to_id in self.nodes:
            self.nodes[from_id].next_nodes.append(to_id)
    
    async def execute(self, start_node_id: str, context: Dict) -> Dict:
        """执行工作流"""
        current_id = start_node_id
        visited = set()
        
        while current_id and current_id not in visited:
            visited.add(current_id)
            node = self.nodes[current_id]
            
            # 执行当前节点
            context = await node.execute(context)
            
            # 确定下一个节点
            if node.node_type == NodeType.END:
                break
            
            if node.node_type == NodeType.CONDITION:
                # 条件节点根据结果选择分支
                if context.get("condition_result"):
                    current_id = node.next_nodes[0] if node.next_nodes else None
                else:
                    current_id = node.next_nodes[1] if len(node.next_nodes) > 1 else None
            else:
                current_id = node.next_nodes[0] if node.next_nodes else None
        
        return context

# 工作流定义示例
workflow = WorkflowEngine()

# 定义节点
workflow.add_node(WorkflowNode("start", NodeType.START, {}))
workflow.add_node(LLMNode("analyze", NodeType.LLM, {
    "prompt": "分析以下需求：{query}",
    "model": "gpt-4o"
}))
workflow.add_node(ToolNode("search", NodeType.TOOL, {
    "tool": "search_database",
    "parameters": {"keyword": "$last_output"}
}))
workflow.add_node(ConditionNode("check_result", NodeType.CONDITION, {
    "condition": "len($last_output) > 0"
}))
workflow.add_node(LLMNode("generate", NodeType.LLM, {
    "prompt": "基于搜索结果生成回答：{last_output}"
}))
workflow.add_node(LLMNode("fallback", NodeType.LLM, {
    "prompt": "未找到相关信息，请给出通用建议"
}))
workflow.add_node(WorkflowNode("end", NodeType.END, {}))

# 连接节点
workflow.connect("start", "analyze")
workflow.connect("analyze", "search")
workflow.connect("search", "check_result")
workflow.connect("check_result", "generate")  # 条件为真
workflow.connect("check_result", "fallback")  # 条件为假
workflow.connect("generate", "end")
workflow.connect("fallback", "end")
```

---

## 六、AI产品经理关注点

```
Tool Calling 产品化要点：

架构设计：
├── 工具分层
│   ├── 基础工具层：通用能力（搜索、计算、API调用）
│   ├── 业务工具层：领域特定（订单查询、库存检查）
│   └── 编排层：工作流引擎、Agent框架
├── 权限模型
│   ├── 基于角色的工具访问控制
│   ├── 敏感操作审批流程
│   └── 操作审计追踪
└── 可观测性
    ├── 工具调用链路追踪
    ├── 性能监控（延迟、成功率）
    └── 成本分析

用户体验：
├── 透明度
│   ├── 展示AI正在使用的工具
│   ├── 显示工具调用结果摘要
│   └── 允许用户中断或修正
├── 可控性
│   ├── 用户确认敏感操作
│   ├── 提供工具开关
│   └── 自定义工具偏好
└── 容错性
    ├── 工具失败时优雅降级
    ├── 自动重试机制
    └── 人工接管入口

运营策略：
├── 工具生态
│   ├── 内置常用工具
│   ├── 支持自定义工具
│   └── 工具市场/插件商店
├── 质量保障
│   ├── 工具效果评估
│   ├── 用户满意度反馈
│   └── 持续优化迭代
└── 商业模式
    ├── 基础工具免费
    ├── 高级工具付费
    └── 按调用量计费
```

---

## 七、参考资源

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [LangChain Tools Documentation](https://python.langchain.com/docs/modules/agents/tools/)
- [AutoGPT Architecture](https://github.com/Significant-Gravitas/AutoGPT)
- [ReAct Paper](https://arxiv.org/abs/2210.03629)
- [Plan-and-Solve Prompting](https://arxiv.org/abs/2305.04091)

<!--
  文件描述: MCP协议规范详解，涵盖JSON-RPC通信、工具定义、资源访问、能力协商及错误处理
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# MCP 协议

> MCP 协议基于 JSON-RPC 2.0 构建，定义了 Host、Client、Server 之间的标准通信规范。

---

## 一、协议基础

### 1.1 JSON-RPC 2.0 基础

```python
"""
JSON-RPC 2.0 基础

MCP 协议建立在 JSON-RPC 2.0 之上
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import json

@dataclass
class JSONRPCRequest:
    """JSON-RPC 请求"""
    jsonrpc: str = "2.0"
    method: str = ""
    params: Optional[Dict[str, Any]] = None
    id: Optional[str] = None

@dataclass
class JSONRPCResponse:
    """JSON-RPC 响应"""
    jsonrpc: str = "2.0"
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    id: Optional[str] = None

class JSONRPCProtocol:
    """JSON-RPC 协议处理"""
    
    @staticmethod
    def create_request(method: str, params: Dict = None, req_id: str = None) -> str:
        """
        创建 JSON-RPC 请求
        
        Args:
            method: 方法名
            params: 参数
            req_id: 请求ID
        
        Returns:
            JSON 字符串
        """
        request = {
            "jsonrpc": "2.0",
            "method": method,
            "id": req_id or f"req_{hash(method) % 10000}"
        }
        if params:
            request["params"] = params
        
        return json.dumps(request, ensure_ascii=False)
    
    @staticmethod
    def create_response(result: Any = None, error: Dict = None, req_id: str = None) -> str:
        """
        创建 JSON-RPC 响应
        
        Args:
            result: 结果数据
            error: 错误信息
            req_id: 请求ID
        
        Returns:
            JSON 字符串
        """
        response = {"jsonrpc": "2.0", "id": req_id}
        
        if error:
            response["error"] = error
        else:
            response["result"] = result
        
        return json.dumps(response, ensure_ascii=False)
    
    @staticmethod
    def parse_message(data: str) -> Dict[str, Any]:
        """
        解析 JSON-RPC 消息
        
        Args:
            data: JSON 字符串
        
        Returns:
            解析后的字典
        """
        try:
            message = json.loads(data)
            
            # 验证基本结构
            if message.get("jsonrpc") != "2.0":
                raise ValueError("不支持的 JSON-RPC 版本")
            
            return message
            
        except json.JSONDecodeError:
            raise ValueError("无效的 JSON 格式")

# 使用示例
"""
protocol = JSONRPCProtocol()

# 创建请求
request = protocol.create_request(
    method="tools/list",
    params={},
    req_id="001"
)
print(f"请求: {request}")

# 创建响应
response = protocol.create_response(
    result={"tools": [{"name": "search"}]},
    req_id="001"
)
print(f"响应: {response}")

# 解析消息
parsed = protocol.parse_message(request)
print(f"方法: {parsed['method']}")
"""
```

### 1.2 MCP 消息类型

```python
"""
MCP 消息类型

MCP 协议定义的标准消息类型
"""

from typing import Dict, List, Any, Optional
from enum import Enum

class MCPMethod(Enum):
    """MCP 标准方法"""
    # 生命周期
    INITIALIZE = "initialize"
    INITIALIZED = "initialized"
    
    # 工具
    TOOLS_LIST = "tools/list"
    TOOLS_CALL = "tools/call"
    
    # 资源
    RESOURCES_LIST = "resources/list"
    RESOURCES_READ = "resources/read"
    
    # 提示
    PROMPTS_LIST = "prompts/list"
    PROMPTS_GET = "prompts/get"
    
    # 能力
    COMPLETION_COMPLETE = "completion/complete"

class MCPMessageType:
    """MCP 消息类型说明"""
    
    def __init__(self):
        """初始化消息类型说明"""
        self.messages = {
            MCPMethod.INITIALIZE: {
                "方向": "Client → Server",
                "说明": "初始化连接，协商协议版本和能力",
                "必需": True,
                "参数": {
                    "protocolVersion": "协议版本",
                    "capabilities": "客户端能力",
                    "clientInfo": "客户端信息"
                }
            },
            MCPMethod.INITIALIZED: {
                "方向": "Server → Client",
                "说明": "确认初始化完成",
                "必需": True,
                "参数": {
                    "protocolVersion": "协议版本",
                    "capabilities": "服务端能力",
                    "serverInfo": "服务端信息"
                }
            },
            MCPMethod.TOOLS_LIST: {
                "方向": "Client → Server",
                "说明": "获取可用工具列表",
                "必需": False,
                "参数": {}
            },
            MCPMethod.TOOLS_CALL: {
                "方向": "Client → Server",
                "说明": "调用指定工具",
                "必需": False,
                "参数": {
                    "name": "工具名称",
                    "arguments": "工具参数"
                }
            },
            MCPMethod.RESOURCES_LIST: {
                "方向": "Client → Server",
                "说明": "获取可用资源列表",
                "必需": False,
                "参数": {}
            },
            MCPMethod.RESOURCES_READ: {
                "方向": "Client → Server",
                "说明": "读取指定资源",
                "必需": False,
                "参数": {
                    "uri": "资源URI"
                }
            }
        }
    
    def describe(self, method: MCPMethod) -> Dict:
        """
        获取消息说明
        
        Args:
            method: 方法枚举
        
        Returns:
            说明字典
        """
        return self.messages.get(method, {"说明": "未知方法"})

# 使用示例
"""
msg_types = MCPMessageType()

for method in MCPMethod:
    info = msg_types.describe(method)
    print(f"\n{method.value}")
    for key, value in info.items():
        print(f"  {key}: {value}")
"""
```

---

## 二、核心协议流程

### 2.1 初始化握手

```python
"""
MCP 初始化握手

Client 和 Server 建立连接时的协商过程
"""

from typing import Dict, Any
import json

class MCPHandshake:
    """MCP 握手处理器"""
    
    def __init__(self):
        """初始化握手处理器"""
        self.protocol_version = "2024-11-05"
    
    def create_initialize_request(self) -> str:
        """
        创建初始化请求
        
        Returns:
            JSON-RPC 请求字符串
        """
        request = {
            "jsonrpc": "2.0",
            "id": 0,
            "method": "initialize",
            "params": {
                "protocolVersion": self.protocol_version,
                "capabilities": {
                    "tools": {},
                    "resources": {
                        "subscribe": True
                    }
                },
                "clientInfo": {
                    "name": "ai-pm-client",
                    "version": "1.0.0"
                }
            }
        }
        
        return json.dumps(request, ensure_ascii=False)
    
    def create_initialize_response(self, req_id: Any) -> str:
        """
        创建初始化响应
        
        Args:
            req_id: 请求ID
        
        Returns:
            JSON-RPC 响应字符串
        """
        response = {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": self.protocol_version,
                "capabilities": {
                    "tools": {
                        "listChanged": True
                    },
                    "resources": {
                        "subscribe": True,
                        "listChanged": True
                    }
                },
                "serverInfo": {
                    "name": "ai-pm-server",
                    "version": "1.0.0"
                }
            }
        }
        
        return json.dumps(response, ensure_ascii=False)
    
    def create_initialized_notification(self) -> str:
        """
        创建初始化完成通知
        
        Returns:
            JSON-RPC 通知字符串
        """
        notification = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        }
        
        return json.dumps(notification, ensure_ascii=False)
    
    def validate_version(self, server_version: str) -> bool:
        """
        验证协议版本兼容性
        
        Args:
            server_version: 服务端版本
        
        Returns:
            是否兼容
        """
        # 简化实现：版本号前缀匹配
        return server_version.startswith("2024-11")

# 使用示例
"""
handshake = MCPHandshake()

# 1. Client 发送初始化请求
init_request = handshake.create_initialize_request()
print(f"初始化请求:\n{init_request}\n")

# 2. Server 返回初始化响应
init_response = handshake.create_initialize_response(req_id=0)
print(f"初始化响应:\n{init_response}\n")

# 3. Client 发送初始化完成通知
init_notification = handshake.create_initialized_notification()
print(f"初始化通知:\n{init_notification}")
"""
```

### 2.2 工具调用流程

```python
"""
MCP 工具调用流程

标准的工具发现和调用过程
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json

@dataclass
class MCPTool:
    """MCP 工具定义"""
    name: str
    description: str
    inputSchema: Dict[str, Any]

class MCPToolFlow:
    """MCP 工具调用流程"""
    
    def __init__(self):
        """初始化工具流程"""
        self.tools: Dict[str, MCPTool] = {}
    
    def register_tool(self, tool: MCPTool):
        """
        注册工具
        
        Args:
            tool: 工具定义
        """
        self.tools[tool.name] = tool
    
    def create_tools_list_response(self, req_id: Any) -> str:
        """
        创建工具列表响应
        
        Args:
            req_id: 请求ID
        
        Returns:
            JSON-RPC 响应
        """
        tools_list = []
        for tool in self.tools.values():
            tools_list.append({
                "name": tool.name,
                "description": tool.description,
                "inputSchema": tool.inputSchema
            })
        
        response = {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": tools_list
            }
        }
        
        return json.dumps(response, ensure_ascii=False)
    
    def create_tool_call_request(self, tool_name: str, arguments: Dict, req_id: Any) -> str:
        """
        创建工具调用请求
        
        Args:
            tool_name: 工具名称
            arguments: 调用参数
            req_id: 请求ID
        
        Returns:
            JSON-RPC 请求
        """
        request = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        
        return json.dumps(request, ensure_ascii=False)
    
    def create_tool_call_response(self, result: Any, req_id: Any) -> str:
        """
        创建工具调用响应
        
        Args:
            result: 调用结果
            req_id: 请求ID
        
        Returns:
            JSON-RPC 响应
        """
        response = {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": str(result)
                    }
                ],
                "isError": False
            }
        }
        
        return json.dumps(response, ensure_ascii=False)
    
    def create_tool_call_error(self, error_msg: str, req_id: Any) -> str:
        """
        创建工具调用错误响应
        
        Args:
            error_msg: 错误信息
            req_id: 请求ID
        
        Returns:
            JSON-RPC 错误响应
        """
        response = {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": error_msg
                    }
                ],
                "isError": True
            }
        }
        
        return json.dumps(response, ensure_ascii=False)

# 使用示例
"""
flow = MCPToolFlow()

# 注册工具
flow.register_tool(MCPTool(
    name="search",
    description="搜索知识库",
    inputSchema={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "搜索关键词"}
        },
        "required": ["query"]
    }
))

# 1. 获取工具列表
list_response = flow.create_tools_list_response(req_id=1)
print(f"工具列表:\n{list_response}\n")

# 2. 调用工具
call_request = flow.create_tool_call_request(
    tool_name="search",
    arguments={"query": "MCP协议"},
    req_id=2
)
print(f"调用请求:\n{call_request}\n")

# 3. 返回结果
call_response = flow.create_tool_call_response(
    result="找到 5 条关于 MCP 协议的记录",
    req_id=2
)
print(f"调用响应:\n{call_response}")
"""
```

---

## 三、协议规范详解

### 3.1 工具定义规范

```python
"""
MCP 工具定义规范

工具描述必须符合 JSON Schema 标准
"""

from typing import Dict, Any, List
from dataclasses import dataclass

@dataclass
class ToolParameter:
    """工具参数"""
    name: str
    param_type: str
    description: str
    required: bool = True
    enum: List[str] = None

class ToolSchemaBuilder:
    """工具 Schema 构建器"""
    
    def __init__(self):
        """初始化构建器"""
        self.schema = {
            "type": "object",
            "properties": {},
            "required": []
        }
    
    def add_parameter(self, param: ToolParameter):
        """
        添加参数
        
        Args:
            param: 参数定义
        """
        property_def = {
            "type": param.param_type,
            "description": param.description
        }
        
        if param.enum:
            property_def["enum"] = param.enum
        
        self.schema["properties"][param.name] = property_def
        
        if param.required:
            self.schema["required"].append(param.name)
        
        return self
    
    def build(self) -> Dict[str, Any]:
        """
        构建 Schema
        
        Returns:
            JSON Schema 字典
        """
        return self.schema
    
    @staticmethod
    def create_example_tool() -> Dict[str, Any]:
        """
        创建示例工具定义
        
        Returns:
            完整的工具定义
        """
        return {
            "name": "query_database",
            "description": "查询数据库获取信息",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "table": {
                        "type": "string",
                        "description": "要查询的数据表",
                        "enum": ["users", "orders", "products"]
                    },
                    "conditions": {
                        "type": "string",
                        "description": "查询条件（SQL WHERE 子句）"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回结果数量限制",
                        "default": 10
                    }
                },
                "required": ["table"]
            }
        }

# 使用示例
"""
builder = ToolSchemaBuilder()

schema = builder\
    .add_parameter(ToolParameter(
        name="query",
        param_type="string",
        description="搜索关键词",
        required=True
    ))\
    .add_parameter(ToolParameter(
        name="limit",
        param_type="integer",
        description="结果数量",
        required=False
    ))\
    .build()

print(json.dumps(schema, ensure_ascii=False, indent=2))
"""
```

### 3.2 错误处理规范

```python
"""
MCP 错误处理规范

标准化的错误码和错误处理机制
"""

from typing import Dict, Any
from enum import Enum

class MCPErrorCode(Enum):
    """MCP 标准错误码"""
    # 协议错误
    PARSE_ERROR = -32700
    INVALID_REQUEST = -32600
    METHOD_NOT_FOUND = -32601
    INVALID_PARAMS = -32602
    INTERNAL_ERROR = -32603
    
    # MCP 特定错误
    INITIALIZATION_ERROR = -32000
    TOOL_NOT_FOUND = -32001
    TOOL_EXECUTION_ERROR = -32002
    RESOURCE_NOT_FOUND = -32003
    RESOURCE_ACCESS_DENIED = -32004

class MCPError:
    """MCP 错误处理"""
    
    @staticmethod
    def create_error(code: MCPErrorCode, message: str, data: Any = None) -> Dict[str, Any]:
        """
        创建标准错误响应
        
        Args:
            code: 错误码
            message: 错误信息
            data: 附加数据
        
        Returns:
            错误字典
        """
        error = {
            "code": code.value,
            "message": message
        }
        
        if data:
            error["data"] = data
        
        return error
    
    @staticmethod
    def parse_error(data: str) -> Dict[str, Any]:
        """
        解析错误
        
        Args:
            data: 错误数据
        
        Returns:
            解析后的错误信息
        """
        return {
            "type": "parse_error",
            "suggestion": "检查 JSON 格式是否正确"
        }
    
    @staticmethod
    def tool_not_found(tool_name: str) -> Dict[str, Any]:
        """
        工具未找到错误
        
        Args:
            tool_name: 工具名称
        
        Returns:
            错误字典
        """
        return MCPError.create_error(
            code=MCPErrorCode.TOOL_NOT_FOUND,
            message=f"工具 '{tool_name}' 不存在",
            data={"available_tools": []}
        )
    
    @staticmethod
    def tool_execution_error(tool_name: str, error_msg: str) -> Dict[str, Any]:
        """
        工具执行错误
        
        Args:
            tool_name: 工具名称
            error_msg: 错误信息
        
        Returns:
            错误字典
        """
        return MCPError.create_error(
            code=MCPErrorCode.TOOL_EXECUTION_ERROR,
            message=f"工具 '{tool_name}' 执行失败: {error_msg}"
        )

# 使用示例
"""
# 创建工具未找到错误
error = MCPError.tool_not_found("unknown_tool")
print(f"错误响应: {error}")

# 创建执行错误
exec_error = MCPError.tool_execution_error("database", "连接超时")
print(f"执行错误: {exec_error}")
"""
```

---

## 四、AI 产品经理关注点

```
MCP 协议产品化要点：

协议兼容性
├── 版本管理
│   ├── 关注协议版本更新
│   ├── 评估升级影响范围
│   └── 制定版本兼容策略
├── 能力协商
│   ├── 明确必需 vs 可选能力
│   ├── 优雅降级处理
│   └── 能力发现机制
└── 错误处理
    ├── 用户友好的错误提示
    ├── 自动重试机制
    └── 兜底方案设计

安全考虑
├── 工具权限控制
│   ├── 敏感工具需确认
│   ├── 分级权限管理
│   └── 操作审计日志
├── 资源访问限制
│   ├── 防止未授权访问
│   ├── 数据脱敏处理
│   └── 访问频率限制
└── 输入验证
    ├── 参数类型检查
    ├── 范围限制
    └── 防止注入攻击

性能优化
├── 连接管理
│   ├── 连接池复用
│   ├── 心跳检测
│   └── 超时控制
├── 调用优化
│   ├── 批量请求
│   ├── 缓存策略
│   └── 异步处理
└── 监控指标
    ├── 调用成功率
    ├── 平均响应时间
    └── 错误率统计

关键指标
├── 协议层面
│   ├── 握手成功率 > 99%
│   ├── 工具发现时间 < 100ms
│   └── 调用响应时间 < 2s
├── 业务层面
│   ├── 工具调用成功率 > 95%
│   ├── 用户满意度 > 4.0/5
│   └── 功能可用性 > 99.9%
└── 生态层面
    ├── MCP Server 接入数量
    ├── 工具复用率
    └── 开发者活跃度
```

---

## 五、参考资源

- [MCP 协议规范](https://spec.modelcontextprotocol.io/) - 官方协议文档
- [JSON-RPC 2.0 规范](https://www.jsonrpc.org/specification) - 底层协议规范
- [JSON Schema](https://json-schema.org/) - 工具参数定义标准

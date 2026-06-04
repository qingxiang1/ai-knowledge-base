<!--
  文件描述: MCP客户端开发指南，涵盖环境搭建、连接管理、工具调用、会话状态及错误处理
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# MCP 客户端开发

> 学习如何开发 MCP Client，连接并使用 MCP Server 提供的工具能力。

---

## 一、环境准备

### 1.1 开发环境搭建

```bash
# 创建项目目录
mkdir mcp-client-demo && cd mcp-client-demo

# 初始化 Python 项目
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# 安装 MCP SDK
pip install mcp

# 安装开发依赖
pip install pytest black mypy

# 验证安装
python -c "import mcp; print(mcp.__version__)"
```

### 1.2 项目结构

```
MCP Client 项目结构：

mcp-client-demo/
├── src/
│   └── my_mcp_client/
│       ├── __init__.py
│       ├── client.py          # 客户端主入口
│       ├── connection.py      # 连接管理
│       ├── tools.py           # 工具调用封装
│       ├── resources.py       # 资源访问封装
│       └── session.py         # 会话管理
├── tests/                     # 测试目录
│   ├── __init__.py
│   └── test_client.py
├── pyproject.toml             # 项目配置
├── README.md                  # 项目说明
└── .env                       # 环境变量
```

---

## 二、基础 Client 开发

### 2.1 最小可运行 Client

```python
"""
MCP 最小客户端示例

展示如何创建一个最基本的 MCP Client
"""

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import asyncio


async def main():
    """主函数"""
    # 配置 Server 启动参数
    server_params = StdioServerParameters(
        command="python",
        args=["server.py"],  # 替换为实际的 Server 路径
        env=None
    )
    
    # 建立连接
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # 初始化连接
            await session.initialize()
            
            # 获取可用工具列表
            tools = await session.list_tools()
            print(f"可用工具: {[tool.name for tool in tools.tools]}")
            
            # 调用工具
            result = await session.call_tool(
                "echo",
                arguments={"message": "Hello MCP!"}
            )
            print(f"工具返回: {result}")


if __name__ == "__main__":
    asyncio.run(main())
```

### 2.2 使用 FastMCP 简化开发

```python
"""
使用 FastMCP 快速开发

FastMCP 是 MCP SDK 提供的高级封装，简化 Client 开发
"""

from mcp.client.fastmcp import FastMCPClient
import asyncio


async def main():
    """主函数"""
    # 创建 FastMCPClient 实例
    client = FastMCPClient("fast-demo-server")
    
    # 连接到 Server
    await client.connect(
        command="python",
        args=["server.py"]
    )
    
    # 获取可用工具列表
    tools = await client.list_tools()
    print(f"可用工具: {tools}")
    
    # 调用工具
    result = await client.call_tool(
        "calculate",
        arguments={"expression": "1 + 2 * 3"}
    )
    print(f"计算结果: {result}")
    
    # 访问资源
    resource = await client.read_resource("greeting://Alice")
    print(f"资源内容: {resource}")
    
    # 断开连接
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
```

---

## 三、连接管理

### 3.1 连接池管理

```python
"""
MCP 连接池管理

管理多个 MCP Server 的连接
"""

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from typing import Dict, List, Optional
from dataclasses import dataclass
import asyncio


@dataclass
class ServerConfig:
    """Server 配置"""
    name: str
    command: str
    args: List[str]
    env: Optional[Dict[str, str]] = None


class MCPConnectionPool:
    """MCP 连接池"""
    
    def __init__(self):
        """初始化连接池"""
        self.connections: Dict[str, ClientSession] = {}
        self.configs: Dict[str, ServerConfig] = {}
    
    def register_server(self, config: ServerConfig):
        """
        注册 Server 配置
        
        Args:
            config: Server 配置
        """
        self.configs[config.name] = config
    
    async def connect(self, server_name: str) -> ClientSession:
        """
        连接到指定 Server
        
        Args:
            server_name: Server 名称
        
        Returns:
            ClientSession 实例
        """
        if server_name in self.connections:
            return self.connections[server_name]
        
        config = self.configs.get(server_name)
        if not config:
            raise ValueError(f"未找到 Server 配置: {server_name}")
        
        server_params = StdioServerParameters(
            command=config.command,
            args=config.args,
            env=config.env
        )
        
        read, write = await stdio_client(server_params).__aenter__()
        session = await ClientSession(read, write).__aenter__()
        await session.initialize()
        
        self.connections[server_name] = session
        return session
    
    async def disconnect(self, server_name: str):
        """
        断开指定 Server 连接
        
        Args:
            server_name: Server 名称
        """
        if server_name in self.connections:
            session = self.connections[server_name]
            await session.__aexit__(None, None, None)
            del self.connections[server_name]
    
    async def disconnect_all(self):
        """断开所有连接"""
        for server_name in list(self.connections.keys()):
            await self.disconnect(server_name)


# 使用示例
async def main():
    """主函数"""
    pool = MCPConnectionPool()
    
    # 注册 Server
    pool.register_server(ServerConfig(
        name="search-server",
        command="python",
        args=["search_server.py"]
    ))
    
    pool.register_server(ServerConfig(
        name="calc-server",
        command="python",
        args=["calc_server.py"]
    ))
    
    # 连接并使用
    search_session = await pool.connect("search-server")
    tools = await search_session.list_tools()
    print(f"搜索工具: {[tool.name for tool in tools.tools]}")
    
    calc_session = await pool.connect("calc-server")
    result = await calc_session.call_tool(
        "calculate",
        arguments={"expression": "1 + 2 * 3"}
    )
    print(f"计算结果: {result}")
    
    # 断开连接
    await pool.disconnect_all()


if __name__ == "__main__":
    asyncio.run(main())
```

### 3.2 连接状态管理

```python
"""
MCP 连接状态管理

管理连接状态，支持重连和心跳检测
"""

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from enum import Enum
from typing import Optional
import asyncio


class ConnectionState(Enum):
    """连接状态"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    ERROR = "error"


class MCPConnectionManager:
    """MCP 连接管理器"""
    
    def __init__(self, server_params: StdioServerParameters):
        """初始化连接管理器"""
        self.server_params = server_params
        self.session: Optional[ClientSession] = None
        self.state = ConnectionState.DISCONNECTED
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 3
        self.heartbeat_interval = 30  # 秒
    
    async def connect(self) -> ClientSession:
        """
        建立连接
        
        Returns:
            ClientSession 实例
        """
        self.state = ConnectionState.CONNECTING
        
        try:
            read, write = await stdio_client(self.server_params).__aenter__()
            self.session = await ClientSession(read, write).__aenter__()
            await self.session.initialize()
            
            self.state = ConnectionState.CONNECTED
            self.reconnect_attempts = 0
            
            # 启动心跳检测
            asyncio.create_task(self._heartbeat())
            
            return self.session
        
        except Exception as e:
            self.state = ConnectionState.ERROR
            raise ConnectionError(f"连接失败: {str(e)}")
    
    async def disconnect(self):
        """断开连接"""
        if self.session:
            await self.session.__aexit__(None, None, None)
            self.session = None
        
        self.state = ConnectionState.DISCONNECTED
    
    async def reconnect(self) -> ClientSession:
        """
        重新连接
        
        Returns:
            ClientSession 实例
        """
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            raise ConnectionError("超过最大重连次数")
        
        self.state = ConnectionState.RECONNECTING
        self.reconnect_attempts += 1
        
        # 等待后重连
        await asyncio.sleep(2 ** self.reconnect_attempts)
        
        return await self.connect()
    
    async def _heartbeat(self):
        """心跳检测"""
        while self.state == ConnectionState.CONNECTED:
            try:
                # 发送心跳（通过 list_tools 检测连接）
                await self.session.list_tools()
                await asyncio.sleep(self.heartbeat_interval)
            except Exception:
                self.state = ConnectionState.ERROR
                break


# 使用示例
async def main():
    """主函数"""
    server_params = StdioServerParameters(
        command="python",
        args=["server.py"]
    )
    
    manager = MCPConnectionManager(server_params)
    
    try:
        session = await manager.connect()
        print("连接成功")
        
        # 使用连接
        tools = await session.list_tools()
        print(f"可用工具: {[tool.name for tool in tools.tools]}")
    
    except ConnectionError as e:
        print(f"连接错误: {e}")
        
        # 尝试重连
        try:
            session = await manager.reconnect()
            print("重连成功")
        except ConnectionError:
            print("重连失败")
    
    finally:
        await manager.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
```

---

## 四、工具调用封装

### 4.1 工具调用封装

```python
"""
MCP 工具调用封装

封装工具调用，提供更友好的 API
"""

from mcp import ClientSession
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import asyncio


@dataclass
class ToolResult:
    """工具调用结果"""
    success: bool
    data: Any
    error: Optional[str] = None


class MCPToolClient:
    """MCP 工具客户端"""
    
    def __init__(self, session: ClientSession):
        """初始化工具客户端"""
        self.session = session
        self.tools_cache: Dict[str, Any] = {}
    
    async def list_tools(self) -> List[str]:
        """
        获取可用工具列表
        
        Returns:
            工具名称列表
        """
        tools = await self.session.list_tools()
        return [tool.name for tool in tools.tools]
    
    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> ToolResult:
        """
        调用工具
        
        Args:
            name: 工具名称
            arguments: 工具参数
        
        Returns:
            工具调用结果
        """
        try:
            result = await self.session.call_tool(name, arguments=arguments)
            
            # 解析结果
            if result.content:
                data = result.content[0].text
                return ToolResult(success=True, data=data)
            else:
                return ToolResult(success=True, data=None)
        
        except Exception as e:
            return ToolResult(success=False, data=None, error=str(e))
    
    async def call_tool_safe(self, name: str, arguments: Dict[str, Any], 
                            timeout: float = 10.0) -> ToolResult:
        """
        安全调用工具（带超时）
        
        Args:
            name: 工具名称
            arguments: 工具参数
            timeout: 超时时间（秒）
        
        Returns:
            工具调用结果
        """
        try:
            result = await asyncio.wait_for(
                self.call_tool(name, arguments),
                timeout=timeout
            )
            return result
        
        except asyncio.TimeoutError:
            return ToolResult(success=False, data=None, error="工具调用超时")


# 使用示例
async def main():
    """主函数"""
    # 假设已经建立了 session
    session = None  # 替换为实际的 session
    
    tool_client = MCPToolClient(session)
    
    # 获取工具列表
    tools = await tool_client.list_tools()
    print(f"可用工具: {tools}")
    
    # 调用工具
    result = await tool_client.call_tool(
        "search",
        arguments={"query": "MCP"}
    )
    
    if result.success:
        print(f"搜索结果: {result.data}")
    else:
        print(f"搜索失败: {result.error}")


if __name__ == "__main__":
    asyncio.run(main())
```

### 4.2 批量工具调用

```python
"""
MCP 批量工具调用

支持批量调用多个工具
"""

from mcp import ClientSession
from typing import Dict, Any, List
from dataclasses import dataclass
import asyncio


@dataclass
class BatchToolRequest:
    """批量工具请求"""
    name: str
    arguments: Dict[str, Any]


@dataclass
class BatchToolResult:
    """批量工具结果"""
    name: str
    success: bool
    data: Any
    error: Optional[str] = None


class MCPBatchClient:
    """MCP 批量客户端"""
    
    def __init__(self, session: ClientSession):
        """初始化批量客户端"""
        self.session = session
    
    async def call_tools_batch(self, requests: List[BatchToolRequest]) -> List[BatchToolResult]:
        """
        批量调用工具
        
        Args:
            requests: 工具请求列表
        
        Returns:
            工具结果列表
        """
        tasks = []
        for request in requests:
            task = self._call_single_tool(request)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
    
    async def _call_single_tool(self, request: BatchToolRequest) -> BatchToolResult:
        """
        调用单个工具
        
        Args:
            request: 工具请求
        
        Returns:
            工具结果
        """
        try:
            result = await self.session.call_tool(
                request.name,
                arguments=request.arguments
            )
            
            if result.content:
                data = result.content[0].text
                return BatchToolResult(name=request.name, success=True, data=data)
            else:
                return BatchToolResult(name=request.name, success=True, data=None)
        
        except Exception as e:
            return BatchToolResult(name=request.name, success=False, data=None, error=str(e))


# 使用示例
async def main():
    """主函数"""
    # 假设已经建立了 session
    session = None  # 替换为实际的 session
    
    batch_client = MCPBatchClient(session)
    
    # 批量调用
    requests = [
        BatchToolRequest(name="search", arguments={"query": "MCP"}),
        BatchToolRequest(name="calculate", arguments={"expression": "1 + 2"}),
        BatchToolRequest(name="format", arguments={"data": "{\"key\": \"value\"}"})
    ]
    
    results = await batch_client.call_tools_batch(requests)
    
    for result in results:
        if result.success:
            print(f"{result.name}: {result.data}")
        else:
            print(f"{result.name}: 失败 - {result.error}")


if __name__ == "__main__":
    asyncio.run(main())
```

---

## 五、会话管理

### 5.1 会话状态管理

```python
"""
MCP 会话状态管理

管理会话状态，支持上下文保持
"""

from mcp import ClientSession
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import asyncio


@dataclass
class SessionContext:
    """会话上下文"""
    session_id: str
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    history: List[Dict[str, Any]] = field(default_factory=list)


class MCPSessionManager:
    """MCP 会话管理器"""
    
    def __init__(self, session: ClientSession):
        """初始化会话管理器"""
        self.session = session
        self.contexts: Dict[str, SessionContext] = {}
        self.current_context: Optional[SessionContext] = None
    
    def create_context(self, session_id: str, user_id: Optional[str] = None) -> SessionContext:
        """
        创建会话上下文
        
        Args:
            session_id: 会话ID
            user_id: 用户ID
        
        Returns:
            会话上下文
        """
        context = SessionContext(session_id=session_id, user_id=user_id)
        self.contexts[session_id] = context
        self.current_context = context
        return context
    
    def get_context(self, session_id: str) -> Optional[SessionContext]:
        """
        获取会话上下文
        
        Args:
            session_id: 会话ID
        
        Returns:
            会话上下文
        """
        return self.contexts.get(session_id)
    
    def add_to_history(self, tool_name: str, arguments: Dict[str, Any], result: Any):
        """
        添加到历史记录
        
        Args:
            tool_name: 工具名称
            arguments: 工具参数
            result: 工具结果
        """
        if self.current_context:
            self.current_context.history.append({
                "tool": tool_name,
                "arguments": arguments,
                "result": result,
                "timestamp": asyncio.get_event_loop().time()
            })
    
    def get_history(self, session_id: str) -> List[Dict[str, Any]]:
        """
        获取历史记录
        
        Args:
            session_id: 会话ID
        
        Returns:
            历史记录
        """
        context = self.contexts.get(session_id)
        if context:
            return context.history
        return []


# 使用示例
async def main():
    """主函数"""
    # 假设已经建立了 session
    session = None  # 替换为实际的 session
    
    session_manager = MCPSessionManager(session)
    
    # 创建会话
    context = session_manager.create_context("session_001", user_id="user_001")
    print(f"创建会话: {context.session_id}")
    
    # 调用工具并记录历史
    result = await session.call_tool("search", arguments={"query": "MCP"})
    session_manager.add_to_history("search", {"query": "MCP"}, result)
    
    # 查看历史
    history = session_manager.get_history("session_001")
    print(f"历史记录: {history}")


if __name__ == "__main__":
    asyncio.run(main())
```

---

## 六、AI 产品经理关注点

```
MCP Client 产品化要点：

客户端设计原则
├── 易用性
│   ├── 简洁的 API 设计
│   ├── 清晰的错误提示
│   └── 完善的文档
├── 稳定性
│   ├── 连接重试机制
│   ├── 超时控制
│   └── 降级策略
├── 性能
│   ├── 连接池复用
│   ├── 批量调用
│   └── 异步处理
└── 安全性
    ├── 输入验证
    ├── 权限控制
    └── 数据加密

开发流程
├── 需求分析
│   ├── 识别需要集成的工具
│   ├── 定义调用场景
│   └── 评估技术可行性
├── 客户端设计
│   ├── 设计 API 接口
│   ├── 确定连接方式
│   └── 设计错误处理策略
├── 开发实现
│   ├── 核心逻辑开发
│   ├── 连接管理
│   └── 单元测试
├── 集成测试
│   ├── 与 Server 联调
│   ├── 端到端测试
│   └── 性能测试
└── 发布运维
    ├── 版本管理
    ├── 监控告警
    └── 文档更新

关键指标
├── 技术指标
│   ├── 连接成功率 > 99%
│   ├── 工具调用成功率 > 95%
│   ├── 平均响应时间 < 2s
│   └── 错误率 < 1%
├── 业务指标
│   ├── 工具使用频次
│   ├── 用户满意度
│   └── 功能覆盖率
└── 体验指标
    ├── 首次连接时间
    ├── 工具发现时间
    └── 错误恢复时间
```

---

## 七、参考资源

- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) - 官方 Python SDK
- [MCP Client 示例](https://github.com/modelcontextprotocol/python-sdk/tree/main/examples) - 官方示例集合
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) - MCP 调试工具

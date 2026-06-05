<!--
  创建时间: 2026-06-03
  文件名: Agent架构.md
  文件描述: Agent系统架构设计详解，补充企业级架构选型、治理闭环与验收标准
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# Agent 架构

> Agent 架构是智能体系统的骨架，决定了系统的可扩展性、可维护性和运行效率。合理的架构设计能够支撑从简单单任务到复杂多智能体协作的各种场景。

---

## 零、前置知识

阅读本节前，建议先了解以下内容：

| 前置章节                                            | 关联点                                   |
| --------------------------------------------------- | ---------------------------------------- |
| [Agent概念](./Agent概念.md)                         | 理解 Agent 与 LLM、Chatbot、工作流的边界 |
| [Planning](./Planning.md)                           | 架构中的任务规划模块                     |
| [Memory](./Memory.md)                               | 架构中的状态、上下文与长期记忆模块       |
| [ToolCalling](./ToolCalling.md)                     | 架构中的工具注册、权限和调用链路         |
| [企业知识库设计](../06-RAG知识库/企业知识库设计.md) | Agent 记忆和知识访问常依赖企业知识库     |
| [能力模型](../00-Roadmap/能力模型.md)               | 对应 Agent 架构设计与系统化落地能力      |

**能力对标**：本章对应 [能力模型](../00-Roadmap/能力模型.md) 中「AI应用构建力 → Agent 架构能力」和「技术理解力 → 系统架构理解」。掌握 Agent 架构，意味着你能把概念型 Agent 拆成可部署、可监控、可治理的工程系统。

---

## 一、分层架构设计

### 1.1 经典四层架构

```
Agent 系统分层架构：

┌─────────────────────────────────────────────────────────────┐
│                      交互层（Interaction）                    │
│  用户界面 / API 网关 / WebSocket / 消息队列 / 事件总线         │
│  职责：接收输入、返回输出、管理连接、限流熔断                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      编排层（Orchestration）                  │
│  Agent 调度器 / 工作流引擎 / 状态机 / 路由策略 / 负载均衡       │
│  职责：任务分发、Agent 选择、执行编排、异常处理                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      智能层（Intelligence）                   │
│  Agent 实例 / 规划模块 / 记忆模块 / 反思模块 / 工具调用          │
│  职责：推理决策、任务分解、知识检索、自我修正                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      能力层（Capability）                     │
│  工具集 / 外部 API / 数据库 / 向量存储 / 文件系统 / 计算资源     │
│  职责：提供 Agent 执行动作所需的所有外部能力                    │
└─────────────────────────────────────────────────────────────┘

数据流：
用户请求 → 交互层 → 编排层（创建/选择 Agent）→ 智能层（推理执行）→ 能力层（工具调用）
                                                                            ↓
用户 ← 交互层 ← 编排层（结果组装）← 智能层（结果生成）← 能力层（返回数据）
```

### 1.2 微服务架构模式

```python
"""
Agent 微服务架构实现

展示如何将 Agent 系统拆分为独立部署的服务单元
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Callable
from enum import Enum
import asyncio
import json
from datetime import datetime

class ServiceType(Enum):
    """服务类型"""
    GATEWAY = "gateway"           # API 网关
    ORCHESTRATOR = "orchestrator" # 编排服务
    AGENT_RUNTIME = "agent_runtime" # Agent 运行时
    MEMORY_SERVICE = "memory_service" # 记忆服务
    TOOL_REGISTRY = "tool_registry"   # 工具注册中心
    MODEL_SERVICE = "model_service"   # 模型服务

@dataclass
class ServiceInstance:
    """服务实例"""
    service_type: ServiceType
    instance_id: str
    host: str
    port: int
    health_status: str = "healthy"
    last_heartbeat: datetime = None
    metadata: Dict = None

class ServiceRegistry:
    """服务注册中心"""

    def __init__(self):
        """初始化服务注册中心"""
        self.services: Dict[ServiceType, List[ServiceInstance]] = {
            st: [] for st in ServiceType
        }

    def register(self, instance: ServiceInstance):
        """注册服务实例"""
        self.services[instance.service_type].append(instance)

    def discover(self, service_type: ServiceType) -> Optional[ServiceInstance]:
        """服务发现，返回健康实例"""
        healthy = [
            s for s in self.services[service_type]
            if s.health_status == "healthy"
        ]

        if not healthy:
            return None

        # 简单轮询负载均衡
        return healthy[0]  # 实际应实现轮询/随机/权重策略

    def deregister(self, instance_id: str):
        """注销服务实例"""
        for service_list in self.services.values():
            service_list[:] = [
                s for s in service_list
                if s.instance_id != instance_id
            ]

class MessageBus:
    """消息总线"""

    def __init__(self):
        """初始化消息总线"""
        self.subscribers: Dict[str, List[Callable]] = {}
        self.message_queue: asyncio.Queue = asyncio.Queue()

    def subscribe(self, topic: str, handler: Callable):
        """订阅主题"""
        if topic not in self.subscribers:
            self.subscribers[topic] = []
        self.subscribers[topic].append(handler)

    async def publish(self, topic: str, message: Dict):
        """发布消息"""
        await self.message_queue.put({"topic": topic, "message": message})

    async def start(self):
        """启动消息消费"""
        while True:
            item = await self.message_queue.get()
            topic = item["topic"]
            message = item["message"]

            handlers = self.subscribers.get(topic, [])
            for handler in handlers:
                asyncio.create_task(handler(message))

class APIGateway:
    """API 网关服务"""

    def __init__(self, registry: ServiceRegistry, message_bus: MessageBus):
        """
        初始化 API 网关

        Args:
            registry: 服务注册中心
            message_bus: 消息总线
        """
        self.registry = registry
        self.message_bus = message_bus
        self.rate_limiter = TokenBucketRateLimiter()

    async def handle_request(self, request: Dict) -> Dict:
        """
        处理外部请求

        流程：
        1. 认证鉴权
        2. 限流检查
        3. 路由到编排服务
        4. 返回结果
        """
        # 1. 限流检查
        user_id = request.get("user_id")
        if not self.rate_limiter.allow(user_id):
            return {"error": "Rate limit exceeded", "status": 429}

        # 2. 发现编排服务
        orchestrator = self.registry.discover(ServiceType.ORCHESTRATOR)
        if not orchestrator:
            return {"error": "Service unavailable", "status": 503}

        # 3. 发送任务到消息总线
        task_id = f"task_{datetime.now().timestamp()}"
        await self.message_bus.publish("task.created", {
            "task_id": task_id,
            "request": request,
            "timestamp": datetime.now().isoformat()
        })

        # 4. 返回任务 ID（异步模式）
        return {
            "task_id": task_id,
            "status": "accepted",
            "message": "Task is being processed"
        }

class TokenBucketRateLimiter:
    """令牌桶限流器"""

    def __init__(self, rate: int = 100, capacity: int = 1000):
        """
        初始化令牌桶

        Args:
            rate: 每秒产生令牌数
            capacity: 桶容量
        """
        self.rate = rate
        self.capacity = capacity
        self.tokens: Dict[str, float] = {}
        self.last_update: Dict[str, datetime] = {}

    def allow(self, key: str) -> bool:
        """检查是否允许通过"""
        now = datetime.now()

        if key not in self.tokens:
            self.tokens[key] = self.capacity
            self.last_update[key] = now

        # 计算新增令牌
        elapsed = (now - self.last_update[key]).total_seconds()
        self.tokens[key] = min(
            self.capacity,
            self.tokens[key] + elapsed * self.rate
        )
        self.last_update[key] = now

        # 消费令牌
        if self.tokens[key] >= 1:
            self.tokens[key] -= 1
            return True

        return False

# 使用示例
"""
# 初始化基础设施
registry = ServiceRegistry()
message_bus = MessageBus()

# 注册服务
registry.register(ServiceInstance(
    service_type=ServiceType.ORCHESTRATOR,
    instance_id="orch-1",
    host="localhost",
    port=8081
))

# 启动网关
gateway = APIGateway(registry, message_bus)

# 处理请求
response = await gateway.handle_request({
    "user_id": "user_123",
    "query": "分析本月销售数据",
    "agent_type": "data_analyst"
})
"""
```

---

## 二、核心模块详解

### 2.1 Agent 运行时（Agent Runtime）

```python
"""
Agent 运行时实现

管理 Agent 的生命周期、状态和执行上下文
"""

from enum import Enum, auto
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import uuid
import asyncio

class AgentStatus(Enum):
    """Agent 状态"""
    CREATED = auto()      # 已创建
    INITIALIZING = auto() # 初始化中
    IDLE = auto()         # 空闲
    RUNNING = auto()      # 运行中
    PAUSED = auto()       # 已暂停
    COMPLETED = auto()    # 已完成
    FAILED = auto()       # 失败
    TERMINATED = auto()   # 已终止

@dataclass
class ExecutionContext:
    """执行上下文"""
    task_id: str
    user_id: str
    session_id: str
    start_time: datetime
    timeout_seconds: int = 300
    max_iterations: int = 50
    metadata: Dict = field(default_factory=dict)

class AgentRuntime:
    """Agent 运行时"""

    def __init__(
        self,
        agent_id: str,
        agent_config: Dict,
        model_service,
        memory_service,
        tool_registry
    ):
        """
        初始化 Agent 运行时

        Args:
            agent_id: Agent 唯一标识
            agent_config: Agent 配置
            model_service: 模型服务客户端
            memory_service: 记忆服务客户端
            tool_registry: 工具注册中心
        """
        self.agent_id = agent_id
        self.config = agent_config
        self.model = model_service
        self.memory = memory_service
        self.tools = tool_registry

        self.status = AgentStatus.CREATED
        self.context: Optional[ExecutionContext] = None
        self.state: Dict = {}
        self.execution_history: List[Dict] = []

    async def initialize(self, context: ExecutionContext):
        """
        初始化 Agent 执行环境

        加载记忆、准备工具、设置初始状态
        """
        self.status = AgentStatus.INITIALIZING
        self.context = context

        # 加载用户长期记忆
        user_memory = await self.memory.load(
            user_id=context.user_id,
            session_id=context.session_id
        )
        self.state["user_memory"] = user_memory

        # 加载可用工具
        available_tools = self.tools.get_tools_for_agent(self.agent_id)
        self.state["tools"] = available_tools

        # 设置系统提示
        self.state["system_prompt"] = self._build_system_prompt()

        self.status = AgentStatus.IDLE

    def _build_system_prompt(self) -> str:
        """构建系统提示"""
        tools_desc = "\n".join([
            f"- {t['name']}: {t['description']}"
            for t in self.state.get("tools", [])
        ])

        return f"""你是一个智能助手，可以使用以下工具完成任务：

{tools_desc}

请遵循以下原则：
1. 先思考，再行动
2. 如果工具调用失败，尝试替代方案
3. 保持回答简洁、准确
4. 不确定时，坦诚告知用户
"""

    async def execute_task(self, task: Dict) -> Dict:
        """
        执行任务

        主执行循环
        """
        self.status = AgentStatus.RUNNING

        try:
            # 创建执行记录
            execution_record = {
                "task_id": self.context.task_id,
                "start_time": datetime.now().isoformat(),
                "steps": []
            }

            # 主循环
            for iteration in range(self.context.max_iterations):
                # 检查超时
                if self._is_timeout():
                    raise TimeoutError("任务执行超时")

                # 单步执行
                step_result = await self._execute_step(task, iteration)
                execution_record["steps"].append(step_result)

                # 检查是否完成
                if step_result.get("is_final"):
                    break

                # 检查是否出错
                if step_result.get("status") == "error":
                    # 尝试恢复
                    recovered = await self._recover_from_error(step_result)
                    if not recovered:
                        break

            # 保存执行历史
            self.execution_history.append(execution_record)

            # 保存记忆
            await self.memory.save(
                user_id=self.context.user_id,
                session_id=self.context.session_id,
                data={
                    "task": task,
                    "result": step_result,
                    "timestamp": datetime.now().isoformat()
                }
            )

            self.status = AgentStatus.COMPLETED
            return {
                "status": "success",
                "result": step_result.get("output"),
                "steps_taken": len(execution_record["steps"])
            }

        except Exception as e:
            self.status = AgentStatus.FAILED
            return {
                "status": "error",
                "error": str(e),
                "agent_id": self.agent_id
            }

    async def _execute_step(self, task: Dict, iteration: int) -> Dict:
        """执行单步"""
        # 构建提示
        prompt = self._build_step_prompt(task, iteration)

        # 调用模型
        response = await self.model.generate(
            prompt,
            system_prompt=self.state["system_prompt"]
        )

        # 解析响应
        parsed = self._parse_response(response)

        # 执行工具调用
        if parsed.get("action") == "tool_call":
            tool_result = await self._execute_tool(parsed["tool"], parsed["parameters"])
            parsed["tool_result"] = tool_result

        return parsed

    def _build_step_prompt(self, task: Dict, iteration: int) -> str:
        """构建步骤提示"""
        history = "\n".join([
            f"Step {i}: {step.get('thought', '')}"
            for i, step in enumerate(self.execution_history[-5:])
        ])

        return f"""任务：{task.get('description')}

历史步骤：
{history}

当前步骤：{iteration + 1}

请思考并决定下一步行动。"""

    def _parse_response(self, response: str) -> Dict:
        """解析模型响应"""
        # 简化实现，实际应使用结构化输出
        return {
            "thought": response,
            "action": "output",
            "output": response,
            "is_final": True
        }

    async def _execute_tool(self, tool_name: str, parameters: Dict) -> Any:
        """执行工具"""
        tool = self.tools.get_tool(tool_name)
        if not tool:
            return {"error": f"工具 {tool_name} 不存在"}

        return await tool.execute(parameters)

    async def _recover_from_error(self, error_step: Dict) -> bool:
        """从错误中恢复"""
        # 简化实现：记录错误，返回失败
        print(f"执行出错: {error_step}")
        return False

    def _is_timeout(self) -> bool:
        """检查是否超时"""
        if not self.context:
            return False

        elapsed = (datetime.now() - self.context.start_time).total_seconds()
        return elapsed > self.context.timeout_seconds

    async def pause(self):
        """暂停执行"""
        if self.status == AgentStatus.RUNNING:
            self.status = AgentStatus.PAUSED

    async def resume(self):
        """恢复执行"""
        if self.status == AgentStatus.PAUSED:
            self.status = AgentStatus.RUNNING

    async def terminate(self):
        """终止 Agent"""
        self.status = AgentStatus.TERMINATED
        # 清理资源
        self.state.clear()

# 使用示例
"""
# 创建运行时
runtime = AgentRuntime(
    agent_id="agent_001",
    agent_config={"type": "general_assistant"},
    model_service=model_client,
    memory_service=memory_client,
    tool_registry=tool_registry
)

# 初始化
context = ExecutionContext(
    task_id="task_001",
    user_id="user_123",
    session_id="session_001",
    start_time=datetime.now()
)
await runtime.initialize(context)

# 执行任务
result = await runtime.execute_task({
    "description": "查询订单状态",
    "order_id": "ORD-2024-001"
})
"""
```

### 2.2 状态管理

```python
"""
Agent 状态管理实现

支持多种状态持久化策略
"""

from typing import Dict, Optional, Any
from abc import ABC, abstractmethod
import json
import redis
import sqlite3

class StateStore(ABC):
    """状态存储抽象"""

    @abstractmethod
    async def save(self, agent_id: str, state: Dict):
        """保存状态"""
        pass

    @abstractmethod
    async def load(self, agent_id: str) -> Optional[Dict]:
        """加载状态"""
        pass

    @abstractmethod
    async def delete(self, agent_id: str):
        """删除状态"""
        pass

class MemoryStateStore(StateStore):
    """内存状态存储"""

    def __init__(self):
        """初始化内存存储"""
        self.states: Dict[str, Dict] = {}

    async def save(self, agent_id: str, state: Dict):
        """保存到内存"""
        self.states[agent_id] = state.copy()

    async def load(self, agent_id: str) -> Optional[Dict]:
        """从内存加载"""
        return self.states.get(agent_id)

    async def delete(self, agent_id: str):
        """从内存删除"""
        self.states.pop(agent_id, None)

class RedisStateStore(StateStore):
    """Redis 状态存储"""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        """
        初始化 Redis 存储

        Args:
            redis_url: Redis 连接地址
        """
        self.client = redis.from_url(redis_url)

    async def save(self, agent_id: str, state: Dict):
        """保存到 Redis"""
        key = f"agent:state:{agent_id}"
        self.client.setex(
            key,
            3600,  # 1小时过期
            json.dumps(state)
        )

    async def load(self, agent_id: str) -> Optional[Dict]:
        """从 Redis 加载"""
        key = f"agent:state:{agent_id}"
        data = self.client.get(key)

        if data:
            return json.loads(data)
        return None

    async def delete(self, agent_id: str):
        """从 Redis 删除"""
        key = f"agent:state:{agent_id}"
        self.client.delete(key)

class SQLiteStateStore(StateStore):
    """SQLite 状态存储"""

    def __init__(self, db_path: str = "agent_states.db"):
        """
        初始化 SQLite 存储

        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """初始化数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_states (
                agent_id TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        conn.close()

    async def save(self, agent_id: str, state: Dict):
        """保存到 SQLite"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT OR REPLACE INTO agent_states (agent_id, state)
            VALUES (?, ?)
        """, (agent_id, json.dumps(state)))

        conn.commit()
        conn.close()

    async def load(self, agent_id: str) -> Optional[Dict]:
        """从 SQLite 加载"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            "SELECT state FROM agent_states WHERE agent_id = ?",
            (agent_id,)
        )

        row = cursor.fetchone()
        conn.close()

        if row:
            return json.loads(row[0])
        return None

    async def delete(self, agent_id: str):
        """从 SQLite 删除"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM agent_states WHERE agent_id = ?",
            (agent_id,)
        )

        conn.commit()
        conn.close()

class StateManager:
    """状态管理器"""

    def __init__(self, store: StateStore):
        """
        初始化状态管理器

        Args:
            store: 状态存储后端
        """
        self.store = store
        self.local_cache: Dict[str, Dict] = {}

    async def checkpoint(self, agent_id: str, state: Dict):
        """
        创建状态检查点

        用于故障恢复和长时间任务的中断续跑
        """
        # 保存到本地缓存
        self.local_cache[agent_id] = state.copy()

        # 持久化到存储
        await self.store.save(agent_id, state)

    async def restore(self, agent_id: str) -> Optional[Dict]:
        """
        恢复状态

        优先从本地缓存恢复，否则从持久化存储加载
        """
        # 先查本地缓存
        if agent_id in self.local_cache:
            return self.local_cache[agent_id].copy()

        # 从持久化存储加载
        state = await self.store.load(agent_id)
        if state:
            self.local_cache[agent_id] = state

        return state

    async def clear(self, agent_id: str):
        """清除状态"""
        self.local_cache.pop(agent_id, None)
        await self.store.delete(agent_id)

# 使用示例
"""
# 选择存储后端
store = RedisStateStore("redis://localhost:6379")
# store = SQLiteStateStore("states.db")
# store = MemoryStateStore()

# 创建状态管理器
state_manager = StateManager(store)

# 保存检查点
await state_manager.checkpoint("agent_001", {
    "current_step": 5,
    "intermediate_results": [...],
    "context": {...}
})

# 恢复状态
state = await state_manager.restore("agent_001")
"""
```

---

## 三、通信机制

### 3.1 内部通信

```python
"""
Agent 内部通信机制

支持同步/异步、点对点/发布订阅模式
"""

from typing import Dict, List, Callable, Optional
from dataclasses import dataclass
from datetime import datetime
import asyncio
from enum import Enum

class MessagePriority(Enum):
    """消息优先级"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class Message:
    """消息定义"""
    msg_id: str
    msg_type: str
    sender: str
    receiver: Optional[str]  # None 表示广播
    payload: Dict
    priority: MessagePriority = MessagePriority.NORMAL
    timestamp: datetime = None
    correlation_id: Optional[str] = None  # 用于关联请求和响应

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

class MessageRouter:
    """消息路由器"""

    def __init__(self):
        """初始化消息路由器"""
        self.handlers: Dict[str, List[Callable]] = {}
        self.agent_queues: Dict[str, asyncio.Queue] = {}

    def register_handler(self, msg_type: str, handler: Callable):
        """注册消息处理器"""
        if msg_type not in self.handlers:
            self.handlers[msg_type] = []
        self.handlers[msg_type].append(handler)

    def register_agent(self, agent_id: str):
        """注册 Agent 队列"""
        self.agent_queues[agent_id] = asyncio.Queue()

    async def route(self, message: Message):
        """
        路由消息

        根据消息类型和接收者进行路由
        """
        # 1. 如果是点对点消息，发送到对应 Agent 队列
        if message.receiver:
            if message.receiver in self.agent_queues:
                await self.agent_queues[message.receiver].put(message)
            return

        # 2. 如果是广播，发送给所有注册的处理器
        handlers = self.handlers.get(message.msg_type, [])
        for handler in handlers:
            asyncio.create_task(handler(message))

    async def send_to_agent(self, agent_id: str, message: Message) -> Optional[Message]:
        """
        发送消息到指定 Agent（同步等待响应）
        """
        if agent_id not in self.agent_queues:
            return None

        # 创建响应等待
        response_event = asyncio.Event()
        response_msg = None

        async def wait_for_response():
            nonlocal response_msg
            while True:
                msg = await self.agent_queues[agent_id].get()
                if msg.correlation_id == message.msg_id:
                    response_msg = msg
                    response_event.set()
                    break

        # 发送消息
        await self.agent_queues[agent_id].put(message)

        # 等待响应（带超时）
        try:
            await asyncio.wait_for(response_event.wait(), timeout=30)
        except asyncio.TimeoutError:
            return None

        return response_msg

class AgentCommunicator:
    """Agent 通信器"""

    def __init__(self, agent_id: str, router: MessageRouter):
        """
        初始化通信器

        Args:
            agent_id: Agent 标识
            router: 消息路由器
        """
        self.agent_id = agent_id
        self.router = router
        self.pending_requests: Dict[str, asyncio.Future] = {}

    async def send(
        self,
        receiver: str,
        msg_type: str,
        payload: Dict,
        wait_response: bool = False,
        timeout: float = 30.0
    ) -> Optional[Message]:
        """
        发送消息

        Args:
            receiver: 接收者 ID
            msg_type: 消息类型
            payload: 消息内容
            wait_response: 是否等待响应
            timeout: 超时时间

        Returns:
            如果 wait_response=True，返回响应消息
        """
        msg_id = f"msg_{datetime.now().timestamp()}"

        message = Message(
            msg_id=msg_id,
            msg_type=msg_type,
            sender=self.agent_id,
            receiver=receiver,
            payload=payload
        )

        if wait_response:
            # 创建 Future 等待响应
            future = asyncio.Future()
            self.pending_requests[msg_id] = future

            # 发送消息
            await self.router.route(message)

            # 等待响应
            try:
                return await asyncio.wait_for(future, timeout=timeout)
            except asyncio.TimeoutError:
                self.pending_requests.pop(msg_id, None)
                return None
        else:
            await self.router.route(message)
            return None

    async def broadcast(self, msg_type: str, payload: Dict):
        """广播消息"""
        message = Message(
            msg_id=f"msg_{datetime.now().timestamp()}",
            msg_type=msg_type,
            sender=self.agent_id,
            receiver=None,
            payload=payload
        )

        await self.router.route(message)

    async def handle_incoming(self, message: Message):
        """处理收到的消息"""
        # 检查是否是响应
        if message.correlation_id and message.correlation_id in self.pending_requests:
            future = self.pending_requests.pop(message.correlation_id)
            future.set_result(message)
            return

        # 处理普通消息
        await self._process_message(message)

    async def _process_message(self, message: Message):
        """处理消息（子类可重写）"""
        print(f"[{self.agent_id}] 收到消息: {message.msg_type}")

# 使用示例
"""
# 创建路由器
router = MessageRouter()

# 注册 Agent
router.register_agent("agent_a")
router.register_agent("agent_b")

# 创建通信器
comm_a = AgentCommunicator("agent_a", router)
comm_b = AgentCommunicator("agent_b", router)

# Agent A 发送消息给 Agent B
response = await comm_a.send(
    receiver="agent_b",
    msg_type="query",
    payload={"question": "今天天气如何？"},
    wait_response=True
)
"""
```

---

## 四、生产级部署

### 4.1 部署架构

```
生产级部署架构：

负载均衡层
├── Nginx / Kong / Traefik
├── SSL 终止
├── 请求路由
└── 限流配置

应用服务层（Kubernetes / Docker Swarm）
├── API Gateway（3 副本）
│   └── 处理外部请求，认证鉴权
├── Orchestrator Service（3 副本）
│   └── 任务调度，Agent 生命周期管理
├── Agent Runtime Pool（动态扩缩容）
│   ├── 通用 Agent（5-20 副本）
│   ├── 专业 Agent（2-5 副本）
│   └── 根据负载自动扩缩容
└── Worker Service（异步任务）
    └── 处理耗时操作（文件处理、数据分析）

数据层
├── PostgreSQL / MySQL
│   └── 用户数据、任务记录、配置
├── Redis Cluster
│   └── 状态缓存、消息队列、会话存储
├── Vector Database（Milvus / Weaviate）
│   └── 知识库向量存储
└── Object Storage（S3 / MinIO）
    └── 文件存储、模型缓存

监控运维层
├── Prometheus + Grafana
│   └── 指标采集与可视化
├── ELK Stack
│   └── 日志收集与分析
├── Jaeger / Zipkin
│   └── 分布式链路追踪
└── AlertManager
    └── 告警通知
```

### 4.2 高可用设计

```python
"""
Agent 系统高可用实现

包含故障检测、自动恢复、优雅降级等机制
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import asyncio
import random

@dataclass
class HealthStatus:
    """健康状态"""
    instance_id: str
    status: str  # healthy, degraded, unhealthy
    last_check: datetime
    metrics: Dict
    consecutive_failures: int = 0

class HealthChecker:
    """健康检查器"""

    def __init__(self, check_interval: int = 30, failure_threshold: int = 3):
        """
        初始化健康检查器

        Args:
            check_interval: 检查间隔（秒）
            failure_threshold: 故障阈值
        """
        self.check_interval = check_interval
        self.failure_threshold = failure_threshold
        self.health_records: Dict[str, HealthStatus] = {}
        self.check_callbacks: Dict[str, Callable] = {}

    def register(self, instance_id: str, check_callback: Callable):
        """注册健康检查"""
        self.check_callbacks[instance_id] = check_callback
        self.health_records[instance_id] = HealthStatus(
            instance_id=instance_id,
            status="unknown",
            last_check=datetime.now(),
            metrics={}
        )

    async def start_monitoring(self):
        """启动健康监控"""
        while True:
            for instance_id, callback in self.check_callbacks.items():
                try:
                    # 执行健康检查
                    is_healthy = await callback()

                    record = self.health_records[instance_id]
                    record.last_check = datetime.now()

                    if is_healthy:
                        record.status = "healthy"
                        record.consecutive_failures = 0
                    else:
                        record.consecutive_failures += 1

                        if record.consecutive_failures >= self.failure_threshold:
                            record.status = "unhealthy"
                            # 触发故障处理
                            await self._handle_unhealthy(instance_id)
                        else:
                            record.status = "degraded"

                except Exception as e:
                    print(f"健康检查失败 {instance_id}: {e}")
                    record = self.health_records[instance_id]
                    record.consecutive_failures += 1

            await asyncio.sleep(self.check_interval)

    async def _handle_unhealthy(self, instance_id: str):
        """处理不健康实例"""
        print(f"实例 {instance_id} 不健康，触发恢复流程")
        # 实际实现：
        # 1. 从负载均衡中移除
        # 2. 启动新实例
        # 3. 迁移任务
        # 4. 通知运维

class CircuitBreaker:
    """熔断器"""

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        half_open_max_calls: int = 3
    ):
        """
        初始化熔断器

        Args:
            failure_threshold: 触发熔断的失败次数
            recovery_timeout: 熔断后尝试恢复的时间
            half_open_max_calls: 半开状态最大测试调用数
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self.state = "closed"  # closed, open, half_open
        self.failure_count = 0
        self.last_failure_time = None
        self.half_open_calls = 0

    async def call(self, func: Callable, *args, **kwargs):
        """
        执行受保护的调用

        根据熔断器状态决定是否执行
        """
        if self.state == "open":
            # 检查是否可以进入半开状态
            if self._can_attempt_reset():
                self.state = "half_open"
                self.half_open_calls = 0
            else:
                raise CircuitBreakerOpen("熔断器开启，拒绝调用")

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _can_attempt_reset(self) -> bool:
        """检查是否可以尝试重置"""
        if not self.last_failure_time:
            return True

        elapsed = (datetime.now() - self.last_failure_time).total_seconds()
        return elapsed >= self.recovery_timeout

    def _on_success(self):
        """成功回调"""
        if self.state == "half_open":
            self.half_open_calls += 1
            if self.half_open_calls >= self.half_open_max_calls:
                self.state = "closed"
                self.failure_count = 0
        else:
            self.failure_count = 0

    def _on_failure(self):
        """失败回调"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()

        if self.state == "half_open":
            self.state = "open"
        elif self.failure_count >= self.failure_threshold:
            self.state = "open"

class GracefulDegradation:
    """优雅降级"""

    def __init__(self):
        """初始化降级策略"""
        self.fallbacks: Dict[str, Callable] = {}
        self.degradation_levels: Dict[str, int] = {}

    def register_fallback(self, service: str, fallback: Callable):
        """注册降级方案"""
        self.fallbacks[service] = fallback

    async def execute_with_fallback(
        self,
        service: str,
        primary_func: Callable,
        *args,
        **kwargs
    ):
        """
        带降级保护的执行

        主服务失败时自动切换到降级方案
        """
        try:
            return await primary_func(*args, **kwargs)
        except Exception as e:
            print(f"主服务 {service} 失败: {e}")

            # 检查是否有降级方案
            fallback = self.fallbacks.get(service)
            if fallback:
                print(f"切换到降级方案: {service}")
                return await fallback(*args, **kwargs)

            raise

# 使用示例
"""
# 健康检查
health_checker = HealthChecker()

async def check_agent_runtime():
    # 实际检查逻辑
    return True

health_checker.register("agent-runtime-1", check_agent_runtime)
await health_checker.start_monitoring()

# 熔断器
breaker = CircuitBreaker(failure_threshold=5)

async def call_external_api():
    # 调用外部 API
    pass

result = await breaker.call(call_external_api)

# 优雅降级
degradation = GracefulDegradation()

async def fallback_search(query: str):
    # 降级到本地搜索
    return ["本地结果1", "本地结果2"]

degradation.register_fallback("search", fallback_search)

result = await degradation.execute_with_fallback(
    "search",
    call_external_search_api,
    query="AI Agent"
)
"""
```

---

## 五、企业级产品经理关注点

```
Agent 架构产品化要点：

架构决策
├── 单体 vs 微服务
│   ├── 单体：开发简单，适合 MVP 验证
│   ├── 微服务：可扩展，适合生产环境
│   └── 建议：MVP 用单体，产品化后拆微服务
├── 同步 vs 异步
│   ├── 同步：响应快，适合简单任务
│   ├── 异步：吞吐量高，适合复杂任务
│   └── 建议：用户交互同步，后台处理异步
├── 有状态 vs 无状态
│   ├── 有状态：实现简单，难扩展
│   ├── 无状态：易扩展，需要外部存储
│   └── 建议：Agent 无状态，状态存 Redis/DB
└── 自研 vs 开源框架
    ├── 自研：完全可控，开发成本高
    ├── LangChain：生态丰富，学习成本中等
    ├── AutoGen：多 Agent 强，微软支持
    └── 建议：初期用开源，成熟后逐步自研核心

性能指标
├── 响应延迟
│   ├── P50 < 2s（简单任务）
│   ├── P95 < 10s（复杂任务）
│   └── 优化：缓存、预加载、异步化
├── 吞吐量
│   ├── QPS > 100（单实例）
│   └── 优化：水平扩展、连接池、批处理
├── 可用性
│   ├── SLA 99.9%
│   └── 措施：多副本、故障转移、熔断降级
└── 资源利用率
    ├── CPU < 70%
    ├── 内存 < 80%
    └── GPU 利用率 > 60%

成本优化
├── 模型调用成本
│   ├── 缓存常见查询结果
│   ├── 使用小模型做意图识别
│   └── 批量处理减少 API 调用
├── 基础设施成本
│   ├── 按需扩缩容
│   ├── 使用 Spot 实例处理异步任务
│   └── 冷热数据分离存储
└── 人力成本
    ├── 使用成熟框架减少开发
    ├── 自动化测试减少 QA 人力
    └── 监控告警减少运维人力

扩展性规划
├── 水平扩展
│   ├── Agent 实例无状态化
│   ├── 任务队列解耦
│   └── 数据库分片
├── 功能扩展
│   ├── 插件化工具系统
│   ├── 配置化工作流
│   └── 多模型路由
└── 多租户支持
    ├── 数据隔离
    ├── 资源配额
    └── 计费统计
```

---

## 六、企业级验收标准

### 6.1 学完本章后至少应做到

- [ ] 能画出 Agent 系统从输入、编排、推理、工具执行到结果返回的完整链路
- [ ] 能解释交互层、编排层、智能层、能力层各自的职责边界
- [ ] 能根据任务复杂度、并发量、状态要求和团队能力选择单体、微服务或工作流架构
- [ ] 能说明状态管理、消息通信、熔断降级、审计日志在生产级 Agent 中的作用
- [ ] 能识别 Agent 架构中的常见风险：状态丢失、工具不可控、并发冲突、成本失控和错误无法追踪

### 6.2 企业级交付物建议

- **Agent 系统架构图**：包含入口、编排、模型、工具、状态、记忆、日志和监控模块
- **关键链路时序图**：说明一次 Agent 任务如何规划、调用工具、处理失败并返回结果
- **架构治理清单**：覆盖权限控制、超时重试、人工接管、成本预算、灰度发布和回滚机制

---

## 七、参考资源

- [LangChain Architecture](https://python.langchain.com/docs/concepts/architecture/) - LangChain 架构设计
- [AutoGen Design](https://microsoft.github.io/autogen/docs/design/) - AutoGen 系统设计
- [Kubernetes Patterns](https://k8spatterns.io/) - Kubernetes 部署模式
- [Microservices Patterns](https://microservices.io/patterns/) - 微服务设计模式
- [Building LLM Systems](https://www.oreilly.com/library/view/building-llm-apps/9781098153815/) - LLM 系统构建实践

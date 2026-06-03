<!--
  文件描述: 多Agent系统详解，涵盖协作模式、通信机制、任务分配、冲突解决及AI产品经理关注点
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Multi-Agent（多 Agent 协作）

> 多 Agent 系统通过多个专业 Agent 的协作，解决单一 Agent 难以应对的复杂问题。每个 Agent 专注于特定领域，通过协作实现整体目标。

---

## 一、多 Agent 的本质与价值

### 1.1 为什么需要多 Agent

```
多 Agent 系统的必要性：

单一 Agent 的局限
├── 能力边界：一个 Agent 难以精通所有领域
│   └── 编程 + 设计 + 测试 + 部署
├── 效率瓶颈：串行处理复杂任务耗时
│   └── 多个子任务可以并行执行
├── 单点故障：一个 Agent 出错导致整体失败
│   └── 缺乏容错和备份机制
├── 上下文膨胀：处理复杂问题时上下文过长
│   └── 超出模型上下文窗口限制
└── 专业深度：通用 Agent 缺乏领域深度
    └── 法律、医学等专业领域

多 Agent 的优势
├── 专业分工：每个 Agent 专注特定领域
├── 并行处理：多个任务同时执行
├── 容错冗余：一个 Agent 失败不影响整体
├── 可扩展性：动态添加新 Agent
└── 协同增强：组合产生更强能力

协作模式对比
├── 层级协作（Hierarchical）
│   ├── 主管 Agent + 执行 Agent
│   ├── 适合：任务分解明确的场景
│   └── 特点：结构清晰，控制集中
├── 对等协作（Peer-to-Peer）
│   ├── Agent 之间平等协商
│   ├── 适合：需要多方讨论的场景
│   └── 特点：灵活，但协调复杂
├── 市场协作（Market-based）
│   ├── Agent 竞标任务
│   ├── 适合：资源分配优化场景
│   └── 特点：效率高，但设计复杂
└── 混合协作（Hybrid）
    ├── 多种模式组合
    ├── 适合：复杂多变场景
    └── 特点：灵活适应，实现复杂
```

### 1.2 多 Agent 的核心挑战

```
多 Agent 系统面临的挑战：

协调复杂性
├── 任务如何分解和分配？
├── Agent 之间如何同步？
└── 应对：明确的协议和中间件

通信开销
├── Agent 之间频繁通信
├── 信息传递延迟和丢失
└── 应对：异步消息、批处理

冲突解决
├── 多个 Agent 意见不一致
├── 资源竞争
└── 应对：投票机制、优先级、仲裁

一致性保证
├── 共享状态如何同步？
├── 分布式决策一致性
└── 应对：共识算法、状态管理

性能优化
├── 避免过度协作
├── 减少无效通信
└── 应对：智能调度、缓存
```

---

## 二、多 Agent 架构设计

### 2.1 系统架构

```
多 Agent 系统架构：

┌─────────────────────────────────────────┐
│              协调层（Orchestration）       │
│  任务分解 / Agent 调度 / 冲突仲裁 / 结果汇总  │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│              通信层（Communication）       │
│  消息总线 / 路由 / 序列化 / 可靠性保证       │
└─────────────────────────────────────────┘
                   ↓
┌──────────┬──────────┬──────────┬─────────┐
│ Agent A  │ Agent B  │ Agent C  │ Agent D │
│ 研究员    │ 程序员    │ 测试员    │ 设计师   │
├──────────┼──────────┼──────────┼─────────┤
│ 规划模块  │ 规划模块  │ 规划模块  │ 规划模块 │
│ 记忆模块  │ 记忆模块  │ 记忆模块  │ 记忆模块 │
│ 工具模块  │ 工具模块  │ 工具模块  │ 工具模块 │
│ 反思模块  │ 反思模块  │ 反思模块  │ 反思模块 │
└──────────┴──────────┴──────────┴─────────┘
                   ↓
┌─────────────────────────────────────────┐
│              共享层（Shared）              │
│  知识库 / 状态存储 / 配置中心 / 监控日志     │
└─────────────────────────────────────────┘

协作模式
├── 主管-工人模式
│   ├── 主管：分解任务、分配工作、汇总结果
│   └── 工人：执行具体任务
├── 流水线模式
│   ├── Agent A → Agent B → Agent C
│   └── 每个 Agent 处理一个阶段
├── 委员会模式
│   ├── 多个 Agent 投票决策
│   └── 适用于需要共识的场景
└── 竞争模式
    ├── 多个 Agent 同时解决同一问题
    └── 选择最优结果
```

### 2.2 协调器实现

```python
"""
多 Agent 协调器实现

任务分解、Agent 调度和结果汇总
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import asyncio
import json

class AgentRole(Enum):
    """Agent 角色"""
    COORDINATOR = "coordinator"  # 协调者
    RESEARCHER = "researcher"    # 研究员
    DEVELOPER = "developer"      # 开发者
    TESTER = "tester"            # 测试员
    DESIGNER = "designer"        # 设计师
    REVIEWER = "reviewer"        # 审查员

@dataclass
class Agent:
    """Agent 定义"""
    id: str
    name: str
    role: AgentRole
    capabilities: List[str]
    status: str = "idle"  # idle, busy, offline
    current_task: Optional[str] = None

@dataclass
class SubTask:
    """子任务"""
    id: str
    description: str
    required_role: AgentRole
    dependencies: List[str] = field(default_factory=list)
    status: str = "pending"  # pending, running, completed, failed
    result: Any = None
    assigned_agent: Optional[str] = None

class MultiAgentOrchestrator:
    """多 Agent 协调器"""
    
    def __init__(self):
        """初始化协调器"""
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, SubTask] = {}
        self.message_queue: asyncio.Queue = asyncio.Queue()
    
    def register_agent(self, agent: Agent):
        """
        注册 Agent
        
        Args:
            agent: Agent 实例
        """
        self.agents[agent.id] = agent
    
    async def execute_task(
        self,
        goal: str,
        context: Dict = None
    ) -> Dict:
        """
        执行任务
        
        Args:
            goal: 目标描述
            context: 上下文信息
        
        Returns:
            执行结果
        """
        # 1. 分解任务
        subtasks = await self._decompose_task(goal, context)
        
        # 2. 分配任务
        self._assign_tasks(subtasks)
        
        # 3. 执行并监控
        results = await self._execute_subtasks(subtasks)
        
        # 4. 汇总结果
        final_result = self._aggregate_results(results, goal)
        
        return final_result
    
    async def _decompose_task(
        self,
        goal: str,
        context: Dict
    ) -> List[SubTask]:
        """
        分解任务
        
        将大目标分解为可并行执行的子任务
        """
        # 使用 LLM 进行任务分解
        prompt = f"""
        请将以下目标分解为多个子任务：

        目标：{goal}
        上下文：{json.dumps(context or {}, ensure_ascii=False)}

        可用角色：
        - researcher: 研究和信息收集
        - developer: 开发和实现
        - tester: 测试和验证
        - designer: 设计和规划
        - reviewer: 审查和评估

        请输出 JSON 格式：
        {{
            "subtasks": [
                {{
                    "id": "task_1",
                    "description": "任务描述",
                    "required_role": "developer",
                    "dependencies": []
                }}
            ]
        }}
        """
        
        # 这里简化实现，实际应调用 LLM
        subtasks = [
            SubTask(
                id="research",
                description=f"研究目标：{goal}",
                required_role=AgentRole.RESEARCHER,
                dependencies=[]
            ),
            SubTask(
                id="design",
                description=f"设计方案",
                required_role=AgentRole.DESIGNER,
                dependencies=["research"]
            ),
            SubTask(
                id="develop",
                description=f"开发实现",
                required_role=AgentRole.DEVELOPER,
                dependencies=["design"]
            ),
            SubTask(
                id="test",
                description=f"测试验证",
                required_role=AgentRole.TESTER,
                dependencies=["develop"]
            )
        ]
        
        for task in subtasks:
            self.tasks[task.id] = task
        
        return subtasks
    
    def _assign_tasks(self, subtasks: List[SubTask]):
        """
        分配任务
        
        将子任务分配给合适的 Agent
        """
        for task in subtasks:
            # 查找匹配的 Agent
            available_agents = [
                agent for agent in self.agents.values()
                if agent.role == task.required_role and agent.status == "idle"
            ]
            
            if available_agents:
                # 选择第一个可用的
                assigned = available_agents[0]
                task.assigned_agent = assigned.id
                assigned.status = "busy"
                assigned.current_task = task.id
    
    async def _execute_subtasks(
        self,
        subtasks: List[SubTask]
    ) -> Dict[str, Any]:
        """
        执行子任务
        
        按依赖关系执行
        """
        results = {}
        completed = set()
        
        while len(completed) < len(subtasks):
            # 查找可执行的任务（依赖已完成）
            ready_tasks = [
                task for task in subtasks
                if task.status == "pending" and
                all(dep in completed for dep in task.dependencies)
            ]
            
            if not ready_tasks:
                break
            
            # 并行执行就绪任务
            tasks = []
            for task in ready_tasks:
                task.status = "running"
                agent = self.agents.get(task.assigned_agent)
                if agent:
                    tasks.append(self._run_subtask(task, agent))
            
            # 等待完成
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for task, result in zip(ready_tasks, batch_results):
                if isinstance(result, Exception):
                    task.status = "failed"
                    task.result = str(result)
                else:
                    task.status = "completed"
                    task.result = result
                    completed.add(task.id)
                
                results[task.id] = task.result
        
        return results
    
    async def _run_subtask(self, task: SubTask, agent: Agent) -> Any:
        """
        运行子任务
        
        Args:
            task: 子任务
            agent: 执行 Agent
        
        Returns:
            执行结果
        """
        # 模拟执行
        await asyncio.sleep(1)
        
        # 更新 Agent 状态
        agent.status = "idle"
        agent.current_task = None
        
        return f"{agent.name} 完成了 {task.description}"
    
    def _aggregate_results(
        self,
        results: Dict[str, Any],
        goal: str
    ) -> Dict:
        """
        汇总结果
        
        Args:
            results: 子任务结果
            goal: 原始目标
        
        Returns:
            汇总结果
        """
        return {
            "goal": goal,
            "status": "completed",
            "subtask_results": results,
            "summary": f"已完成 {len(results)} 个子任务",
            "timestamp": datetime.now().isoformat()
        }

# 使用示例
"""
orchestrator = MultiAgentOrchestrator()

# 注册 Agent
orchestrator.register_agent(Agent(
    id="agent_1",
    name="研究员",
    role=AgentRole.RESEARCHER,
    capabilities=["搜索", "分析"]
))

orchestrator.register_agent(Agent(
    id="agent_2",
    name="开发者",
    role=AgentRole.DEVELOPER,
    capabilities=["编程", "调试"]
))

# 执行任务
result = await orchestrator.execute_task(
    goal="开发一个电商推荐系统",
    context={"tech_stack": "Python, React"}
)

print(f"结果: {result['summary']}")
for task_id, task_result in result['subtask_results'].items():
    print(f"  {task_id}: {task_result}")
"""
```

---

## 三、Agent 通信机制

### 3.1 消息协议

```python
"""
Agent 通信系统

消息定义、路由和可靠性保证
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import uuid

class MessageType(Enum):
    """消息类型"""
    TASK_ASSIGNMENT = "task_assignment"    # 任务分配
    TASK_RESULT = "task_result"            # 任务结果
    REQUEST_INFO = "request_info"          # 请求信息
    SHARE_INFO = "share_info"              # 共享信息
    COORDINATION = "coordination"          # 协调消息
    ERROR = "error"                        # 错误消息

@dataclass
class Message:
    """消息定义"""
    id: str
    type: MessageType
    sender: str
    receiver: str  # 可以是 "broadcast"
    content: Dict[str, Any]
    timestamp: datetime
    correlation_id: Optional[str] = None  # 关联消息 ID
    priority: int = 5  # 1-10，数字越小优先级越高

class MessageBus:
    """消息总线"""
    
    def __init__(self):
        """初始化消息总线"""
        self.subscribers: Dict[str, List[callable]] = {}
        self.message_history: List[Message] = []
    
    def subscribe(self, agent_id: str, handler: callable):
        """
        订阅消息
        
        Args:
            agent_id: Agent ID
            handler: 消息处理函数
        """
        if agent_id not in self.subscribers:
            self.subscribers[agent_id] = []
        
        self.subscribers[agent_id].append(handler)
    
    def unsubscribe(self, agent_id: str, handler: callable):
        """
        取消订阅
        
        Args:
            agent_id: Agent ID
            handler: 消息处理函数
        """
        if agent_id in self.subscribers:
            self.subscribers[agent_id].remove(handler)
    
    async def send(self, message: Message):
        """
        发送消息
        
        Args:
            message: 消息
        """
        # 记录消息
        self.message_history.append(message)
        
        # 路由消息
        if message.receiver == "broadcast":
            # 广播
            for agent_id, handlers in self.subscribers.items():
                if agent_id != message.sender:
                    for handler in handlers:
                        await handler(message)
        else:
            # 点对点
            handlers = self.subscribers.get(message.receiver, [])
            for handler in handlers:
                await handler(message)
    
    def get_message_history(
        self,
        sender: str = None,
        receiver: str = None,
        message_type: MessageType = None,
        limit: int = 100
    ) -> List[Message]:
        """
        获取消息历史
        
        Args:
            sender: 发送者过滤
            receiver: 接收者过滤
            message_type: 消息类型过滤
            limit: 数量限制
        
        Returns:
            消息列表
        """
        messages = self.message_history
        
        if sender:
            messages = [m for m in messages if m.sender == sender]
        
        if receiver:
            messages = [m for m in messages if m.receiver == receiver]
        
        if message_type:
            messages = [m for m in messages if m.type == message_type]
        
        return messages[-limit:]

class AgentCommunicator:
    """Agent 通信器"""
    
    def __init__(self, agent_id: str, message_bus: MessageBus):
        """
        初始化通信器
        
        Args:
            agent_id: Agent ID
            message_bus: 消息总线
        """
        self.agent_id = agent_id
        self.bus = message_bus
        self.inbox: asyncio.Queue = asyncio.Queue()
        
        # 订阅消息
        self.bus.subscribe(agent_id, self._handle_message)
    
    async def _handle_message(self, message: Message):
        """处理接收到的消息"""
        await self.inbox.put(message)
    
    async def send(
        self,
        receiver: str,
        message_type: MessageType,
        content: Dict,
        correlation_id: str = None
    ):
        """
        发送消息
        
        Args:
            receiver: 接收者
            message_type: 消息类型
            content: 内容
            correlation_id: 关联 ID
        """
        message = Message(
            id=str(uuid.uuid4()),
            type=message_type,
            sender=self.agent_id,
            receiver=receiver,
            content=content,
            timestamp=datetime.now(),
            correlation_id=correlation_id
        )
        
        await self.bus.send(message)
    
    async def broadcast(self, message_type: MessageType, content: Dict):
        """
        广播消息
        
        Args:
            message_type: 消息类型
            content: 内容
        """
        await self.send("broadcast", message_type, content)
    
    async def receive(self, timeout: float = None) -> Optional[Message]:
        """
        接收消息
        
        Args:
            timeout: 超时时间
        
        Returns:
            消息或 None
        """
        try:
            return await asyncio.wait_for(
                self.inbox.get(),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            return None

# 使用示例
"""
bus = MessageBus()

# 创建通信器
comm_a = AgentCommunicator("agent_a", bus)
comm_b = AgentCommunicator("agent_b", bus)

# 发送消息
await comm_a.send(
    receiver="agent_b",
    message_type=MessageType.REQUEST_INFO,
    content={"query": "需要设计文档"}
)

# 接收消息
message = await comm_b.receive(timeout=5.0)
if message:
    print(f"收到消息: {message.content}")
"""
```

---

## 四、冲突解决机制

### 4.1 冲突检测与解决

```python
"""
冲突解决系统

检测和解决 Agent 之间的冲突
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

class ConflictType(Enum):
    """冲突类型"""
    RESOURCE = "resource"       # 资源竞争
    OPINION = "opinion"         # 意见分歧
    DEPENDENCY = "dependency"   # 依赖冲突
    PRIORITY = "priority"       # 优先级冲突

@dataclass
class Conflict:
    """冲突定义"""
    id: str
    type: ConflictType
    agents_involved: List[str]
    description: str
    proposals: Dict[str, Any]  # 各 Agent 的提案
    status: str = "open"  # open, resolving, resolved

class ConflictResolver:
    """冲突解决器"""
    
    def __init__(self):
        """初始化冲突解决器"""
        self.conflicts: Dict[str, Conflict] = {}
        self.resolution_strategies = {
            ConflictType.RESOURCE: self._resolve_resource_conflict,
            ConflictType.OPINION: self._resolve_opinion_conflict,
            ConflictType.DEPENDENCY: self._resolve_dependency_conflict,
            ConflictType.PRIORITY: self._resolve_priority_conflict
        }
    
    def detect_conflict(
        self,
        agent_actions: Dict[str, Any]
    ) -> Optional[Conflict]:
        """
        检测冲突
        
        Args:
            agent_actions: 各 Agent 的行动
        
        Returns:
            冲突或 None
        """
        # 检查资源竞争
        resource_usage = {}
        for agent_id, action in agent_actions.items():
            resource = action.get("resource")
            if resource:
                if resource in resource_usage:
                    # 发现资源冲突
                    return Conflict(
                        id=f"conflict_{len(self.conflicts)}",
                        type=ConflictType.RESOURCE,
                        agents_involved=[resource_usage[resource], agent_id],
                        description=f"资源 {resource} 竞争",
                        proposals={
                            resource_usage[resource]: action,
                            agent_id: action
                        }
                    )
                resource_usage[resource] = agent_id
        
        return None
    
    def resolve(self, conflict: Conflict) -> Dict:
        """
        解决冲突
        
        Args:
            conflict: 冲突
        
        Returns:
            解决方案
        """
        strategy = self.resolution_strategies.get(conflict.type)
        
        if strategy:
            resolution = strategy(conflict)
            conflict.status = "resolved"
            return resolution
        
        return {"status": "unresolved", "reason": "无可用策略"}
    
    def _resolve_resource_conflict(self, conflict: Conflict) -> Dict:
        """解决资源冲突"""
        # 策略：优先级高的 Agent 获得资源
        # 简化实现：第一个 Agent 获得资源
        winner = conflict.agents_involved[0]
        
        return {
            "status": "resolved",
            "winner": winner,
            "reason": "基于优先级",
            "compensation": {
                agent: "等待下一个周期"
                for agent in conflict.agents_involved
                if agent != winner
            }
        }
    
    def _resolve_opinion_conflict(self, conflict: Conflict) -> Dict:
        """解决意见冲突"""
        # 策略：投票或仲裁
        # 简化实现：选择第一个提案
        proposals = conflict.proposals
        winner = list(proposals.keys())[0]
        
        return {
            "status": "resolved",
            "winner": winner,
            "reason": "基于提案质量",
            "merged_proposal": proposals[winner]
        }
    
    def _resolve_dependency_conflict(self, conflict: Conflict) -> Dict:
        """解决依赖冲突"""
        # 策略：重新排序
        return {
            "status": "resolved",
            "reason": "重新排序任务",
            "new_order": conflict.agents_involved
        }
    
    def _resolve_priority_conflict(self, conflict: Conflict) -> Dict:
        """解决优先级冲突"""
        # 策略：高优先级优先
        return {
            "status": "resolved",
            "reason": "基于任务优先级",
            "winner": conflict.agents_involved[0]
        }

# 使用示例
"""
resolver = ConflictResolver()

# 检测冲突
agent_actions = {
    "agent_a": {"resource": "database", "action": "write"},
    "agent_b": {"resource": "database", "action": "read"}
}

conflict = resolver.detect_conflict(agent_actions)
if conflict:
    print(f"发现冲突: {conflict.description}")
    
    # 解决冲突
    resolution = resolver.resolve(conflict)
    print(f"解决方案: {resolution}")
"""
```

---

## 五、AI 产品经理关注点

```
Multi-Agent 产品化要点：

协作模式选择
├── 简单任务
│   ├── 单一 Agent 足够
│   └── 避免过度设计
├── 复杂任务
│   ├── 主管-工人模式
│   ├── 流水线模式
│   └── 根据任务特点选择
├── 创意任务
│   ├── 委员会模式
│   ├── 头脑风暴模式
│   └── 鼓励多样性
└── 紧急任务
    ├── 竞争模式
    ├── 并行执行
    └── 快速迭代

Agent 设计原则
├── 职责清晰
│   ├── 每个 Agent 有明确边界
│   ├── 避免职责重叠
│   └── 减少协调成本
├── 能力互补
│   ├── Agent 之间能力互补
│   ├── 覆盖完整需求
│   └── 避免能力冗余
└── 可替换性
    ├── 同角色 Agent 可替换
    ├── 动态扩缩容
    └── 故障转移

用户体验设计
├── 透明度
│   ├── 展示 Agent 分工
│   ├── 显示协作过程
│   └── 提供进度追踪
├── 可控性
│   ├── 用户可指定 Agent
│   ├── 调整协作策略
│   └── 干预执行过程
└── 反馈
    ├── 中间结果展示
    ├── 冲突提示和选择
    └── 最终结果解释

关键指标
├── 协作效率
│   ├── 任务完成时间
│   ├── 并行度
│   └── 资源利用率
├── 协作质量
│   ├── 结果一致性
│   ├── 错误率
│   └── 用户满意度
├── 系统稳定性
│   ├── Agent 故障率
│   ├── 冲突频率
│   └── 恢复时间
└── 可扩展性
    ├── 新增 Agent 成本
    ├── 任务类型覆盖
    └── 负载均衡效果

优化方向
├── 智能调度
│   ├── 基于负载的调度
│   ├── 基于能力的匹配
│   └── 预测性调度
├── 通信优化
│   ├── 消息压缩
│   ├── 批处理
│   └── 异步化
└── 冲突预防
    ├── 资源预留
    ├── 依赖优化
    └── 优先级动态调整
```

---

## 六、参考资源

- [AutoGen](https://github.com/microsoft/autogen) - 微软多 Agent 框架
- [CrewAI](https://www.crewai.com/) - 多 Agent 团队协作框架
- [MetaGPT](https://github.com/geekan/MetaGPT) - 多 Agent 软件开发
- [CAMEL](https://github.com/camel-ai/camel) -  communicative Agent 框架
- [Multi-Agent Reinforcement Learning](https://www.marl-book.com/) - 多 Agent 强化学习
- [Distributed AI](https://distai.org/) - 分布式 AI 研究

<!--
  文件描述: Agent系统核心概念详解，涵盖Agent定义、核心组件、与LLM的区别、分类体系及典型应用
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Agent 概念

> Agent（智能体）是大模型从"对话工具"进化为"自主执行系统"的关键形态，能够感知环境、进行决策并执行动作以达成目标。

---

## 一、Agent 定义与本质

### 1.1 什么是 Agent

```
Agent 的核心定义：

学术定义
├── 能够感知环境并采取行动以实现目标的自主实体
├── 具备状态（State）、行为（Action）、转移（Transition）的数学模型
└── 在 AI 领域：基于大模型的自主决策系统

工程定义
├── 以大语言模型为"大脑"的控制系统
├── 通过工具（Tools）扩展能力边界
├── 通过记忆（Memory）维持上下文连续性
└── 通过规划（Planning）实现复杂任务分解

类比理解
├── 传统软件：输入 → 处理 → 输出（确定性）
├── LLM 对话：输入 → 生成（概率性，无状态）
└── Agent：目标 → 感知 → 规划 → 执行 → 反馈（闭环自主）

关键特征
├── 自主性（Autonomy）：无需人工干预即可运行
├── 反应性（Reactivity）：感知环境变化并响应
├── 主动性（Pro-activeness）：主动追求目标
└── 社会性（Social Ability）：与其他 Agent/人类交互
```

### 1.2 Agent 与 LLM 的区别

```
LLM vs Agent 对比：

维度          LLM（大语言模型）          Agent（智能体）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
交互方式      一问一答                  自主循环执行
状态管理      无状态（每次独立）         有状态（记忆累积）
工具使用      无法直接调用外部工具       可调用 API、数据库、计算资源
任务复杂度    单次推理                  多步骤规划与执行
反馈机制      无                        执行结果反馈到下一轮决策
环境感知      仅文本输入                多模态感知（文本、数据、事件）
持续运行      被动等待输入               主动监控、定时触发

典型场景对比：

场景：查询明天北京的天气并设置提醒

LLM 方式
用户：查一下明天北京天气
LLM：明天北京晴，15-25°C
用户：帮我设置一个提醒
LLM：我无法设置提醒，您可以使用手机日历...
（需要人工介入，无法完成闭环）

Agent 方式
用户：明天如果北京下雨，提醒我带伞
Agent：
  1. 调用天气 API 获取明天北京天气预报
  2. 分析结果：降水概率 80%，有雨
  3. 调用日历 API 创建提醒事项"带伞"
  4. 反馈用户：已为您设置明天 8:00 的带伞提醒
（自主完成多步骤任务）
```

---

## 二、Agent 核心组件

### 2.1 组件架构

```
Agent 核心组件：

┌─────────────────────────────────────────┐
│              环境（Environment）          │
│  用户输入 / 系统事件 / 外部数据 / 工具返回  │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│              感知（Perception）           │
│  解析输入、提取意图、识别实体、理解上下文   │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│              记忆（Memory）               │
│  短期记忆（对话上下文）/ 长期记忆（知识库）  │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│              规划（Planning）             │
│  任务分解 / 策略选择 / 路径规划 / 反思修正  │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│              行动（Action）               │
│  工具调用 / API 请求 / 代码执行 / 输出生成  │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│              反馈（Feedback）             │
│  执行结果 → 感知 → 下一轮决策循环         │
└─────────────────────────────────────────┘
```

### 2.2 各组件详解

```python
"""
Agent 核心组件实现

展示 Agent 各组件的基本结构和交互方式
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import json

@dataclass
class AgentState:
    """Agent 状态"""
    current_goal: str = ""
    current_step: int = 0
    total_steps: int = 0
    context: Dict = field(default_factory=dict)
    last_action_result: Any = None
    status: str = "idle"  # idle, running, paused, completed, error

@dataclass
class Action:
    """行动定义"""
    action_type: str  # tool_call, code_execution, output, wait
    name: str
    parameters: Dict = field(default_factory=dict)
    description: str = ""

@dataclass
class Observation:
    """环境观察"""
    source: str  # user, tool, system
    content: Any
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict = field(default_factory=dict)

class BaseAgent:
    """Agent 基类"""
    
    def __init__(
        self,
        name: str,
        llm_client,
        memory=None,
        tools=None,
        planner=None
    ):
        """
        初始化 Agent
        
        Args:
            name: Agent 名称
            llm_client: 大模型客户端
            memory: 记忆模块
            tools: 工具列表
            planner: 规划模块
        """
        self.name = name
        self.llm = llm_client
        self.memory = memory
        self.tools = tools or []
        self.planner = planner
        self.state = AgentState()
    
    def perceive(self, observation: Observation) -> Dict:
        """
        感知环境输入
        
        将原始输入转换为结构化理解
        """
        # 提取意图、实体、情感等
        perception = {
            "raw_input": observation.content,
            "source": observation.source,
            "timestamp": observation.timestamp,
            "intent": self._extract_intent(observation.content),
            "entities": self._extract_entities(observation.content),
            "urgency": self._assess_urgency(observation.content)
        }
        
        # 存入短期记忆
        if self.memory:
            self.memory.add_short_term(perception)
        
        return perception
    
    def _extract_intent(self, content: str) -> str:
        """提取用户意图"""
        # 简化实现，实际使用 LLM 或分类模型
        intents = {
            "查询": ["查", "找", "搜索", "是什么"],
            "执行": ["做", "执行", "运行", "调用"],
            "创建": ["创建", "新建", "添加", "生成"],
            "修改": ["修改", "更新", "编辑", "改"]
        }
        
        for intent, keywords in intents.items():
            if any(kw in content for kw in keywords):
                return intent
        
        return "unknown"
    
    def _extract_entities(self, content: str) -> List[str]:
        """提取实体"""
        # 简化实现
        return []
    
    def _assess_urgency(self, content: str) -> str:
        """评估紧急程度"""
        urgent_keywords = ["紧急", "立刻", "马上", "现在", " ASAP"]
        if any(kw in content for kw in urgent_keywords):
            return "high"
        return "normal"
    
    def plan(self, goal: str, context: Dict) -> List[Action]:
        """
        规划行动序列
        
        将目标分解为可执行的步骤
        """
        if self.planner:
            return self.planner.plan(goal, context, self.tools)
        
        # 默认规划：直接调用 LLM 生成计划
        prompt = f"""
        目标：{goal}
        可用工具：{[t.name for t in self.tools]}
        
        请将目标分解为具体的执行步骤，每个步骤对应一个工具调用。
        返回 JSON 格式的步骤列表：
        [
            {{"step": 1, "action": "工具名", "parameters": {{...}}}},
            ...
        ]
        """
        
        response = self.llm.generate(prompt)
        
        try:
            steps = json.loads(response)
            return [
                Action(
                    action_type="tool_call",
                    name=step["action"],
                    parameters=step.get("parameters", {})
                )
                for step in steps
            ]
        except:
            return []
    
    def execute(self, action: Action) -> Observation:
        """
        执行行动
        
        调用工具或执行代码
        """
        print(f"[{self.name}] 执行: {action.name}")
        
        # 查找对应工具
        tool = next(
            (t for t in self.tools if t.name == action.name),
            None
        )
        
        if tool:
            try:
                result = tool.run(**action.parameters)
                return Observation(
                    source="tool",
                    content=result,
                    metadata={"tool": action.name, "status": "success"}
                )
            except Exception as e:
                return Observation(
                    source="tool",
                    content=str(e),
                    metadata={"tool": action.name, "status": "error"}
                )
        
        return Observation(
            source="system",
            content=f"未知工具: {action.name}",
            metadata={"status": "error"}
        )
    
    def run(self, goal: str) -> Dict:
        """
        运行 Agent 完成目标
        
        主循环：感知 → 规划 → 执行 → 反馈
        """
        self.state = AgentState(
            current_goal=goal,
            status="running"
        )
        
        # 1. 规划
        actions = self.plan(goal, {})
        self.state.total_steps = len(actions)
        
        results = []
        
        # 2. 执行循环
        for i, action in enumerate(actions):
            self.state.current_step = i + 1
            
            # 执行
            observation = self.execute(action)
            results.append(observation)
            
            # 反馈到状态
            self.state.last_action_result = observation.content
            
            # 如果出错，尝试修正或停止
            if observation.metadata.get("status") == "error":
                print(f"步骤 {i+1} 失败: {observation.content}")
                # 可以在这里添加重试或修正逻辑
        
        self.state.status = "completed"
        
        return {
            "goal": goal,
            "steps_executed": len(results),
            "results": results,
            "final_state": self.state
        }

# 使用示例
"""
# 初始化 Agent
agent = BaseAgent(
    name="助手Agent",
    llm_client=llm,
    memory=memory_module,
    tools=[weather_tool, calendar_tool, search_tool],
    planner=react_planner
)

# 运行任务
result = agent.run("查询明天北京天气，如果有雨则设置提醒")
"""
```

---

## 三、Agent 分类体系

### 3.1 按能力维度分类

```
Agent 分类体系：

按自主性级别
├── 简单反射型（Simple Reflex）
│   ├── 特点：条件-动作规则，无状态
│   ├── 示例：IF 天气=下雨 THEN 提醒带伞
│   └── 适用：简单、确定性任务
├── 基于模型的反射型（Model-based）
│   ├── 特点：维护内部状态，基于状态决策
│   ├── 示例：根据用户历史偏好推荐内容
│   └── 适用：需要上下文记忆的任务
├── 基于目标的（Goal-based）
│   ├── 特点：明确目标，选择行动以达成目标
│   ├── 示例：自动完成数据分析报告
│   └── 适用：目标明确的复杂任务
├── 基于效用的（Utility-based）
│   ├── 特点：最大化效用函数，权衡多目标
│   ├── 示例：在成本、质量、速度间优化
│   └── 适用：多目标优化场景
└── 学习型（Learning）
    ├── 特点：从经验中学习，持续改进
    ├── 示例：根据用户反馈优化推荐策略
    └── 适用：长期运行的智能系统

按应用场景
├── 个人助手型
│   ├── 日程管理、提醒、信息查询
│   └── 示例：Siri、Google Assistant、Copilot
├── 专业工具型
│   ├── 代码生成、数据分析、文案创作
│   └── 示例：GitHub Copilot、Cursor
├── 业务流程型
│   ├── 自动处理审批、客服、运维
│   └── 示例：智能客服、RPA+AI
├── 多智能体协作型
│   ├── 多个 Agent 分工协作
│   └── 示例：AutoGen、MetaGPT
└── 自主探索型
    ├── 自主研究、实验、学习
    └── 示例：AutoGPT、BabyAGI
```

### 3.2 典型 Agent 框架对比

```
主流 Agent 框架对比：

框架          ReAct        AutoGPT        LangChain Agent    AutoGen
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
核心思想      推理+行动      自主目标驱动     工具链编排          多 Agent 对话
规划能力      ★★★☆☆       ★★★★☆        ★★★☆☆            ★★★★☆
工具使用      ★★★★☆       ★★★★★        ★★★★★           ★★★★☆
记忆管理      ★★☆☆☆       ★★★☆☆        ★★★★☆            ★★★☆☆
多 Agent      ★☆☆☆☆       ★☆☆☆☆        ★★☆☆☆            ★★★★★
易用性        ★★★★☆       ★★☆☆☆        ★★★★★           ★★★☆☆
适用场景      单任务推理     自主探索        企业应用集成        复杂协作

ReAct（Reasoning + Acting）
├── 论文：ReAct: Synergizing Reasoning and Acting in Language Models
├── 核心：交替进行推理（Thought）和行动（Action）
├── 优势：可解释性强，适合单步决策
└── 局限：无长期记忆，复杂任务规划能力有限

AutoGPT
├── 核心：自主设定子目标，循环执行
├── 优势：高度自主，可长时间运行
├── 局限：容易陷入循环，成本不可控
└── 适用：探索性任务，非生产环境

LangChain Agent
├── 核心：工具编排 + 提示工程
├── 优势：生态丰富，企业友好
├── 局限：需要较多配置
└── 适用：快速构建生产级 Agent

AutoGen（Microsoft）
├── 核心：多 Agent 对话协作
├── 优势：灵活的角色定义，人机协作
├── 局限：学习曲线较陡
└── 适用：复杂多角色协作场景
```

---

## 四、Agent 工作模式

### 4.1 ReAct 模式

```python
"""
ReAct（Reasoning + Acting）模式实现

Agent 通过交替进行推理和行动来解决问题
"""

class ReActAgent(BaseAgent):
    """ReAct 模式 Agent"""
    
    def __init__(self, llm_client, tools, max_iterations: int = 10):
        """
        初始化 ReAct Agent
        
        Args:
            llm_client: 大模型客户端
            tools: 可用工具列表
            max_iterations: 最大迭代次数
        """
        super().__init__(
            name="ReActAgent",
            llm_client=llm_client,
            tools=tools
        )
        self.max_iterations = max_iterations
        self.thought_history = []
    
    def run(self, query: str) -> str:
        """
        执行 ReAct 循环
        
        Thought → Action → Observation → ... → Answer
        """
        self.state = AgentState(current_goal=query, status="running")
        
        prompt_template = """你需要回答以下问题，可以通过使用工具来获取信息。

可用工具：
{tools_description}

请按以下格式思考：
Thought: 你的推理过程
Action: 工具名称
Action Input: 工具参数

工具将返回 Observation，然后你继续思考。

当获得足够信息时，输出：
Thought: 我已获得足够信息
Final Answer: 最终答案

开始！

Question: {query}
{history}
"""
        
        history = ""
        
        for i in range(self.max_iterations):
            # 构建提示
            tools_desc = "\n".join([
                f"- {t.name}: {t.description}"
                for t in self.tools
            ])
            
            prompt = prompt_template.format(
                tools_description=tools_desc,
                query=query,
                history=history
            )
            
            # 调用 LLM
            response = self.llm.generate(prompt)
            
            # 解析响应
            if "Final Answer:" in response:
                answer = response.split("Final Answer:")[1].strip()
                self.state.status = "completed"
                return answer
            
            # 提取 Thought 和 Action
            thought = self._extract_thought(response)
            action = self._extract_action(response)
            action_input = self._extract_action_input(response)
            
            self.thought_history.append(thought)
            
            # 执行 Action
            if action:
                obs = self.execute(Action(
                    action_type="tool_call",
                    name=action,
                    parameters={"input": action_input}
                ))
                
                # 更新历史
                history += f"\nThought: {thought}\nAction: {action}\nAction Input: {action_input}\nObservation: {obs.content}\n"
            else:
                # 没有 Action，直接返回答案
                self.state.status = "completed"
                return response
        
        self.state.status = "completed"
        return "达到最大迭代次数，未能完成。"
    
    def _extract_thought(self, response: str) -> str:
        """提取 Thought"""
        if "Thought:" in response:
            return response.split("Thought:")[1].split("Action:")[0].strip()
        return ""
    
    def _extract_action(self, response: str) -> str:
        """提取 Action"""
        if "Action:" in response:
            return response.split("Action:")[1].split("Action Input:")[0].strip()
        return ""
    
    def _extract_action_input(self, response: str) -> str:
        """提取 Action Input"""
        if "Action Input:" in response:
            return response.split("Action Input:")[1].strip()
        return ""

# 使用示例
"""
react_agent = ReActAgent(
    llm_client=openai_client,
    tools=[search_tool, calculator_tool]
)

answer = react_agent.run("2024年诺贝尔奖物理学奖得主是谁？他/她的主要贡献是什么？")
"""
```

### 4.2 Plan-and-Execute 模式

```python
"""
Plan-and-Execute 模式

先制定完整计划，再逐步执行
"""

class PlanAndExecuteAgent(BaseAgent):
    """Plan-and-Execute 模式 Agent"""
    
    def __init__(self, llm_client, tools):
        super().__init__(
            name="PlanExecuteAgent",
            llm_client=llm_client,
            tools=tools
        )
    
    def run(self, goal: str) -> Dict:
        """
        执行 Plan-and-Execute
        
        1. 制定计划
        2. 执行计划
        3. 根据反馈调整
        """
        # 第一步：制定计划
        plan = self._create_plan(goal)
        print(f"计划：{plan}")
        
        # 第二步：执行计划
        results = []
        for step in plan:
            print(f"\n执行步骤: {step['description']}")
            
            # 执行
            action = Action(
                action_type="tool_call",
                name=step["tool"],
                parameters=step["parameters"]
            )
            
            observation = self.execute(action)
            results.append({
                "step": step,
                "result": observation.content,
                "status": observation.metadata.get("status", "unknown")
            })
            
            # 如果失败，重新规划
            if observation.metadata.get("status") == "error":
                print("步骤失败，重新规划...")
                plan = self._replan(goal, results)
        
        # 第三步：总结结果
        summary = self._summarize_results(goal, results)
        
        return {
            "goal": goal,
            "plan": plan,
            "results": results,
            "summary": summary
        }
    
    def _create_plan(self, goal: str) -> List[Dict]:
        """创建执行计划"""
        prompt = f"""
        请为以下目标制定详细的执行计划：
        
        目标：{goal}
        
        可用工具：
        {chr(10).join([f"- {t.name}: {t.description}" for t in self.tools])}
        
        请返回 JSON 格式的步骤列表：
        [
            {{
                "step_number": 1,
                "description": "步骤描述",
                "tool": "工具名称",
                "parameters": {{"key": "value"}}
            }}
        ]
        """
        
        response = self.llm.generate(prompt)
        
        try:
            return json.loads(response)
        except:
            return []
    
    def _replan(self, goal: str, previous_results: List[Dict]) -> List[Dict]:
        """根据执行结果重新规划"""
        prompt = f"""
        原目标：{goal}
        
        已执行步骤及结果：
        {json.dumps(previous_results, ensure_ascii=False, indent=2)}
        
        部分步骤失败，请重新制定剩余计划。
        返回 JSON 格式的步骤列表。
        """
        
        response = self.llm.generate(prompt)
        
        try:
            return json.loads(response)
        except:
            return []
    
    def _summarize_results(self, goal: str, results: List[Dict]) -> str:
        """总结执行结果"""
        prompt = f"""
        目标：{goal}
        
        执行结果：
        {json.dumps(results, ensure_ascii=False, indent=2)}
        
        请总结最终结果，回答原始目标。
        """
        
        return self.llm.generate(prompt)

# 使用示例
"""
plan_agent = PlanAndExecuteAgent(
    llm_client=openai_client,
    tools=[search_tool, file_tool, email_tool]
)

result = plan_agent.run("搜索最新的 AI 论文，总结关键发现，并发送邮件给团队")
print(result["summary"])
"""
```

---

## 五、AI 产品经理关注点

```
Agent 产品化要点：

核心决策
├── 是否需要 Agent
│   ├── 简单问答：直接用 LLM 即可
│   ├── 单步工具调用：Function Calling
│   ├── 多步复杂任务：Agent 模式
│   └── 长期自主运行：高级 Agent
├── Agent 类型选择
│   ├── 个人效率：ReAct / Plan-and-Execute
│   ├── 企业流程：LangChain Agent + 工作流
│   ├── 探索研究：AutoGPT 模式
│   └── 团队协作：AutoGen 多 Agent
├── 自主性级别
│   ├── 辅助型（人类确认每一步）
│   ├── 半自主型（关键节点确认）
│   └── 全自主型（完全自动化）
└── 成本考量
    ├── Token 消耗（推理链长）
    ├── API 调用次数
    └── 运行时间

关键指标
├── 任务成功率
│   ├── 简单任务 > 95%
│   ├── 中等任务 > 80%
│   └── 复杂任务 > 60%
├── 执行效率
│   ├── 平均步骤数
│   ├── 任务完成时间
│   └── Token 消耗量
├── 用户体验
│   ├── 响应延迟
│   ├── 可解释性（推理过程透明）
│   └── 错误恢复能力
└── 成本控制
    ├── 单次任务成本
    └── 日/月总成本

风险与应对
├── 无限循环
│   ├── 设置最大迭代次数
│   ├── 检测重复模式
│   └── 人工介入机制
├── 工具滥用
│   ├── 权限控制
│   ├── 调用频率限制
│   └── 敏感操作确认
├── 成本失控
│   ├── 预算上限
│   ├── 成本监控告警
│   └── 降级策略
└── 安全风险
    ├── 输入过滤
    ├── 输出审核
    └── 操作审计

设计原则
├── 渐进式自主
│   └── 从辅助到自主，逐步放开
├── 透明可解释
│   └── 展示推理过程，让用户理解
├── 可控可干预
│   └── 随时可暂停、修改、接管
└── 失败优雅
    └── 失败时给出清晰原因和备选方案
```

---

## 六、参考资源

- [ReAct Paper](https://arxiv.org/abs/2210.03629) - ReAct: Synergizing Reasoning and Acting in Language Models
- [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) - 自主运行型 Agent
- [LangChain Agents](https://python.langchain.com/docs/modules/agents/) - LangChain Agent 框架
- [AutoGen](https://github.com/microsoft/autogen) - 微软多 Agent 协作框架
- [BabyAGI](https://github.com/yoheinakajima/babyagi) - 任务驱动型 Agent
- [Agent 设计模式](https://www.deeplearning.ai/the-batch/agentic-design-patterns/) - 吴恩达 Agent 设计模式

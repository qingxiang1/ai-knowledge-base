<!--
  文件描述: Agent规划模块详解，涵盖任务分解、规划策略、计划执行、动态重规划及AI产品经理关注点
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Planning（规划）

> 规划是 Agent 的核心能力之一，决定了 Agent 如何将复杂目标分解为可执行的步骤，并在执行过程中动态调整计划以应对变化。

---

## 一、规划的本质与挑战

### 1.1 为什么需要规划

```
规划的必要性：

复杂任务的挑战
├── 目标模糊："帮我准备一份市场分析报告"
│   └── 需要分解为：确定范围 → 收集数据 → 分析 → 撰写 → 审校
├── 依赖关系：步骤 A 的输出是步骤 B 的输入
│   └── 需要先完成数据收集，才能进行分析
├── 资源约束：时间、成本、工具可用性
│   └── 需要在有限预算内选择最优方案
└── 不确定性：执行过程中可能遇到意外
    └── 需要动态调整计划

无规划的问题
├── 盲目执行：不知道下一步该做什么
├── 重复劳动：做了很多无用功
├── 遗漏关键步骤：结果不完整
└── 无法处理复杂任务：只能完成简单指令

规划带来的价值
├── 可预见性：提前知道执行路径
├── 可解释性：用户能理解 Agent 的决策过程
├── 可优化：基于执行反馈改进计划
└── 可协作：多 Agent 按 plan 分工
```

### 1.2 规划的核心挑战

```
规划面临的挑战：

搜索空间爆炸
├── 问题：N 个步骤，每个步骤 M 个选择，组合数为 M^N
├── 示例：10 个步骤，每步 5 个选择 → 976 万种可能
└── 应对：启发式搜索、剪枝、分层规划

不确定性
├── 环境动态变化：工具可能不可用、数据可能缺失
├── 执行结果不确定：同一操作可能产生不同结果
└── 应对：鲁棒规划、条件计划、动态重规划

目标冲突
├── 多目标优化：速度 vs 质量 vs 成本
├── 资源竞争：多个任务争夺有限资源
└── 应对：效用函数、优先级排序、协商机制

知识不完备
├── 不知道所有可用工具
├── 不了解环境完整状态
└── 应对：开放世界假设、学习式规划
```

---

## 二、任务分解策略

### 2.1 分解方法

```python
"""
任务分解策略实现

将复杂任务分解为可管理的子任务
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import json

class DecompositionStrategy(Enum):
    """分解策略"""
    SEQUENTIAL = "sequential"      # 顺序分解
    HIERARCHICAL = "hierarchical"  # 层次分解
    PARALLEL = "parallel"          # 并行分解
    ITERATIVE = "iterative"        # 迭代分解

@dataclass
class SubTask:
    """子任务定义"""
    id: str
    description: str
    dependencies: List[str] = field(default_factory=list)
    estimated_effort: int = 1  # 预估工作量
    required_tools: List[str] = field(default_factory=list)
    acceptance_criteria: List[str] = field(default_factory=list)
    status: str = "pending"  # pending, in_progress, completed, failed
    result: Any = None

class TaskDecomposer:
    """任务分解器"""
    
    def __init__(self, llm_client):
        """
        初始化任务分解器
        
        Args:
            llm_client: 大模型客户端
        """
        self.llm = llm_client
    
    def decompose(
        self,
        goal: str,
        strategy: DecompositionStrategy = DecompositionStrategy.HIERARCHICAL,
        context: Dict = None
    ) -> List[SubTask]:
        """
        分解任务
        
        Args:
            goal: 目标描述
            strategy: 分解策略
            context: 上下文信息
        
        Returns:
            子任务列表
        """
        if strategy == DecompositionStrategy.SEQUENTIAL:
            return self._sequential_decompose(goal, context)
        elif strategy == DecompositionStrategy.HIERARCHICAL:
            return self._hierarchical_decompose(goal, context)
        elif strategy == DecompositionStrategy.PARALLEL:
            return self._parallel_decompose(goal, context)
        else:
            return self._iterative_decompose(goal, context)
    
    def _sequential_decompose(self, goal: str, context: Dict) -> List[SubTask]:
        """
        顺序分解
        
        将任务分解为线性执行的步骤
        """
        prompt = f"""
        请将以下目标分解为顺序执行的步骤：
        
        目标：{goal}
        上下文：{json.dumps(context, ensure_ascii=False) if context else '无'}
        
        要求：
        1. 每个步骤应该是原子操作（不可再分）
        2. 步骤之间有明确的先后顺序
        3. 每个步骤包含：描述、所需工具、验收标准
        
        返回 JSON 格式：
        [
            {{
                "id": "step_1",
                "description": "步骤描述",
                "required_tools": ["工具1"],
                "acceptance_criteria": ["标准1"]
            }}
        ]
        """
        
        response = self.llm.generate(prompt)
        
        try:
            steps_data = json.loads(response)
            subtasks = []
            
            for i, step in enumerate(steps_data):
                dependencies = [f"step_{i}"] if i > 0 else []
                
                subtasks.append(SubTask(
                    id=step.get("id", f"step_{i+1}"),
                    description=step["description"],
                    dependencies=dependencies,
                    required_tools=step.get("required_tools", []),
                    acceptance_criteria=step.get("acceptance_criteria", [])
                ))
            
            return subtasks
            
        except json.JSONDecodeError:
            # 解析失败，返回单步任务
            return [SubTask(id="step_1", description=goal)]
    
    def _hierarchical_decompose(self, goal: str, context: Dict) -> List[SubTask]:
        """
        层次分解
        
        将任务分解为层级结构，高层任务包含子任务
        """
        prompt = f"""
        请将以下目标进行层次化分解：
        
        目标：{goal}
        
        分解为 2-3 个主要阶段，每个阶段包含 2-4 个具体步骤。
        
        返回 JSON 格式：
        [
            {{
                "id": "phase_1",
                "description": "阶段描述",
                "subtasks": [
                    {{
                        "id": "phase_1_step_1",
                        "description": "步骤描述",
                        "dependencies": []
                    }}
                ]
            }}
        ]
        """
        
        response = self.llm.generate(prompt)
        
        try:
            phases = json.loads(response)
            subtasks = []
            
            for phase in phases:
                for step in phase.get("subtasks", []):
                    subtasks.append(SubTask(
                        id=step["id"],
                        description=f"[{phase['description']}] {step['description']}",
                        dependencies=step.get("dependencies", [])
                    ))
            
            return subtasks
            
        except json.JSONDecodeError:
            return [SubTask(id="step_1", description=goal)]
    
    def _parallel_decompose(self, goal: str, context: Dict) -> List[SubTask]:
        """
        并行分解
        
        识别可并行执行的子任务
        """
        prompt = f"""
        请将以下目标分解，识别可并行执行的子任务：
        
        目标：{goal}
        
        要求：
        1. 识别相互独立的子任务
        2. 识别需要串行的依赖关系
        3. 最大化并行度
        
        返回 JSON 格式：
        {{
            "parallel_groups": [
                {{
                    "group_id": "group_1",
                    "tasks": [
                        {{"id": "task_1", "description": "..."}}
                    ]
                }}
            ],
            "dependencies": [
                {{"from": "task_1", "to": "task_3"}}
            ]
        }}
        """
        
        response = self.llm.generate(prompt)
        
        try:
            data = json.loads(response)
            subtasks = []
            
            for group in data.get("parallel_groups", []):
                for task in group.get("tasks", []):
                    # 查找依赖
                    deps = [
                        d["from"] for d in data.get("dependencies", [])
                        if d["to"] == task["id"]
                    ]
                    
                    subtasks.append(SubTask(
                        id=task["id"],
                        description=task["description"],
                        dependencies=deps
                    ))
            
            return subtasks
            
        except json.JSONDecodeError:
            return [SubTask(id="step_1", description=goal)]
    
    def _iterative_decompose(self, goal: str, context: Dict) -> List[SubTask]:
        """
        迭代分解
        
        先粗粒度分解，执行过程中再细化
        """
        # 初始粗粒度分解
        initial_tasks = [
            SubTask(id="iteration_1", description=f"初步探索: {goal}"),
            SubTask(id="iteration_2", description="基于初步结果细化执行"),
            SubTask(id="iteration_3", description="完善和验证结果")
        ]
        
        return initial_tasks

# 使用示例
"""
decomposer = TaskDecomposer(llm_client)

# 顺序分解（适合明确流程的任务）
tasks = decomposer.decompose(
    goal="撰写一份关于新能源汽车市场的分析报告",
    strategy=DecompositionStrategy.SEQUENTIAL
)

# 层次分解（适合复杂项目）
tasks = decomposer.decompose(
    goal="开发一个电商推荐系统",
    strategy=DecompositionStrategy.HIERARCHICAL
)

# 并行分解（适合可并行处理的任务）
tasks = decomposer.decompose(
    goal="收集竞品数据并分析市场趋势",
    strategy=DecompositionStrategy.PARALLEL
)
"""
```

### 2.2 依赖管理

```python
"""
任务依赖管理

管理子任务之间的依赖关系，确保正确执行顺序
"""

from typing import List, Dict, Set
from collections import defaultdict, deque

class DependencyManager:
    """依赖管理器"""
    
    def __init__(self):
        """初始化依赖管理器"""
        self.dependencies: Dict[str, Set[str]] = defaultdict(set)
        self.dependents: Dict[str, Set[str]] = defaultdict(set)
    
    def add_dependency(self, task_id: str, depends_on: str):
        """
        添加依赖关系
        
        task_id 依赖于 depends_on（depends_on 必须先完成）
        """
        self.dependencies[task_id].add(depends_on)
        self.dependents[depends_on].add(task_id)
    
    def get_ready_tasks(self, completed_tasks: Set[str]) -> List[str]:
        """
        获取可执行的任务
        
        所有依赖都已完成的任务
        """
        ready = []
        
        for task_id, deps in self.dependencies.items():
            if task_id not in completed_tasks and deps.issubset(completed_tasks):
                ready.append(task_id)
        
        # 也包含没有依赖的任务
        all_tasks = set(self.dependencies.keys()) | set(self.dependents.keys())
        for task_id in all_tasks:
            if task_id not in completed_tasks and task_id not in self.dependencies:
                ready.append(task_id)
        
        return list(set(ready))
    
    def topological_sort(self) -> List[str]:
        """
        拓扑排序
        
        返回满足依赖顺序的任务列表
        """
        # 计算入度
        in_degree = defaultdict(int)
        all_tasks = set(self.dependencies.keys()) | set(self.dependents.keys())
        
        for task in all_tasks:
            in_degree[task] = len(self.dependencies.get(task, set()))
        
        # Kahn 算法
        queue = deque([t for t in all_tasks if in_degree[t] == 0])
        result = []
        
        while queue:
            task = queue.popleft()
            result.append(task)
            
            for dependent in self.dependents.get(task, set()):
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)
        
        if len(result) != len(all_tasks):
            raise ValueError("存在循环依赖")
        
        return result
    
    def detect_cycles(self) -> List[List[str]]:
        """检测循环依赖"""
        cycles = []
        visited = set()
        rec_stack = set()
        
        def dfs(node, path):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            for dependent in self.dependents.get(node, set()):
                if dependent not in visited:
                    dfs(dependent, path)
                elif dependent in rec_stack:
                    # 发现循环
                    cycle_start = path.index(dependent)
                    cycles.append(path[cycle_start:] + [dependent])
            
            path.pop()
            rec_stack.remove(node)
        
        all_tasks = set(self.dependencies.keys()) | set(self.dependents.keys())
        for task in all_tasks:
            if task not in visited:
                dfs(task, [])
        
        return cycles
    
    def get_critical_path(self, task_durations: Dict[str, int]) -> List[str]:
        """
        获取关键路径
        
        影响总工期的最长路径
        """
        sorted_tasks = self.topological_sort()
        
        # 计算最早开始时间
        earliest_start = {t: 0 for t in sorted_tasks}
        for task in sorted_tasks:
            for dependent in self.dependents.get(task, set()):
                earliest_start[dependent] = max(
                    earliest_start[dependent],
                    earliest_start[task] + task_durations.get(task, 0)
                )
        
        # 计算最晚开始时间
        total_duration = max(
            earliest_start[t] + task_durations.get(t, 0)
            for t in sorted_tasks
        )
        
        latest_start = {t: total_duration for t in sorted_tasks}
        for task in reversed(sorted_tasks):
            for dep in self.dependencies.get(task, set()):
                latest_start[dep] = min(
                    latest_start[dep],
                    latest_start[task] - task_durations.get(dep, 0)
                )
        
        # 关键路径：最早开始时间 = 最晚开始时间
        critical_path = [
            t for t in sorted_tasks
            if earliest_start[t] == latest_start[t]
        ]
        
        return critical_path

# 使用示例
"""
dep_manager = DependencyManager()

# 添加依赖
dep_manager.add_dependency("analyze", "collect_data")
dep_manager.add_dependency("write_report", "analyze")
dep_manager.add_dependency("review", "write_report")
dep_manager.add_dependency("publish", "review")

# 拓扑排序
order = dep_manager.topological_sort()
print(f"执行顺序: {order}")

# 检测循环
cycles = dep_manager.detect_cycles()
if cycles:
    print(f"发现循环依赖: {cycles}")

# 关键路径
durations = {"collect_data": 2, "analyze": 3, "write_report": 2, "review": 1, "publish": 1}
critical = dep_manager.get_critical_path(durations)
print(f"关键路径: {critical}")
"""
```

---

## 三、规划策略

### 3.1 经典规划方法

```python
"""
经典规划策略实现

包括 ReAct、Plan-and-Solve、Tree of Thoughts 等
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from abc import ABC, abstractmethod
import json

@dataclass
class Plan:
    """计划定义"""
    steps: List[Dict]
    estimated_cost: float = 0.0
    estimated_time: int = 0
    confidence: float = 1.0

class PlanningStrategy(ABC):
    """规划策略抽象基类"""
    
    def __init__(self, llm_client):
        """
        初始化规划策略
        
        Args:
            llm_client: 大模型客户端
        """
        self.llm = llm_client
    
    @abstractmethod
    def plan(self, goal: str, context: Dict) -> Plan:
        """生成计划"""
        pass

class ReActPlanning(PlanningStrategy):
    """
    ReAct 规划策略
    
    交替进行推理和行动，边执行边规划
    """
    
    def plan(self, goal: str, context: Dict) -> Plan:
        """
        ReAct 规划
        
        不生成完整计划，而是生成第一步
        """
        prompt = f"""
        目标：{goal}
        
        请思考第一步应该做什么：
        1. 分析当前状态
        2. 确定下一步行动
        
        返回 JSON：
        {{
            "thought": "推理过程",
            "action": "行动描述",
            "tool": "使用的工具（如有）"
        }}
        """
        
        response = self.llm.generate(prompt)
        
        try:
            data = json.loads(response)
            return Plan(steps=[data])
        except:
            return Plan(steps=[{"action": goal}])

class PlanAndSolvePlanning(PlanningStrategy):
    """
    Plan-and-Solve 规划策略
    
    先制定完整计划，再执行
    """
    
    def plan(self, goal: str, context: Dict) -> Plan:
        """
        制定完整计划
        """
        prompt = f"""
        目标：{goal}
        上下文：{json.dumps(context, ensure_ascii=False) if context else '无'}
        
        请制定详细的执行计划：
        1. 将目标分解为具体步骤
        2. 每个步骤包含：描述、输入、预期输出
        3. 识别步骤间的依赖关系
        4. 预估每个步骤的难度和风险
        
        返回 JSON：
        {{
            "steps": [
                {{
                    "step_number": 1,
                    "description": "步骤描述",
                    "input": "输入",
                    "expected_output": "预期输出",
                    "dependencies": [],
                    "risk": "low/medium/high"
                }}
            ],
            "estimated_cost": 10.0,
            "estimated_time": 30
        }}
        """
        
        response = self.llm.generate(prompt)
        
        try:
            data = json.loads(response)
            return Plan(
                steps=data.get("steps", []),
                estimated_cost=data.get("estimated_cost", 0),
                estimated_time=data.get("estimated_time", 0)
            )
        except:
            return Plan(steps=[{"description": goal}])

class TreeOfThoughtsPlanning(PlanningStrategy):
    """
    Tree of Thoughts 规划策略
    
    维护多个候选计划，评估后选择最优
    """
    
    def __init__(self, llm_client, num_candidates: int = 3):
        """
        初始化 ToT 规划器
        
        Args:
            llm_client: 大模型客户端
            num_candidates: 候选计划数量
        """
        super().__init__(llm_client)
        self.num_candidates = num_candidates
    
    def plan(self, goal: str, context: Dict) -> Plan:
        """
        生成多个候选计划并选择最优
        """
        # 生成候选计划
        candidates = []
        
        for i in range(self.num_candidates):
            prompt = f"""
            目标：{goal}
            
            请生成一个执行计划（方案 {i+1}）：
            尝试不同的思路和方法。
            
            返回 JSON：
            {{
                "steps": [...],
                "approach": "方法描述",
                "pros": ["优点"],
                "cons": ["缺点"]
            }}
            """
            
            response = self.llm.generate(prompt)
            
            try:
                plan_data = json.loads(response)
                candidates.append(plan_data)
            except:
                continue
        
        # 评估候选计划
        best_plan = self._evaluate_candidates(candidates, goal)
        
        return Plan(
            steps=best_plan.get("steps", []),
            confidence=best_plan.get("confidence", 0.8)
        )
    
    def _evaluate_candidates(self, candidates: List[Dict], goal: str) -> Dict:
        """评估并选择最优计划"""
        if not candidates:
            return {"steps": []}
        
        # 使用 LLM 评估
        prompt = f"""
        目标：{goal}
        
        候选方案：
        {json.dumps(candidates, ensure_ascii=False, indent=2)}
        
        请评估每个方案的：
        1. 可行性（1-10）
        2. 效率（1-10）
        3. 风险（1-10）
        4. 综合得分
        
        返回最优方案的编号和理由。
        """
        
        response = self.llm.generate(prompt)
        
        # 简化：返回第一个候选
        return candidates[0]

class LeastToMostPlanning(PlanningStrategy):
    """
    Least-to-Most 规划策略
    
    从简单子问题开始，逐步解决复杂问题
    """
    
    def plan(self, goal: str, context: Dict) -> Plan:
        """
        从简单到复杂规划
        """
        prompt = f"""
        目标：{goal}
        
        请按从简单到复杂的顺序规划：
        1. 识别最简单的子问题
        2. 逐步增加复杂度
        3. 每个步骤建立在前一步的基础上
        
        返回 JSON：
        {{
            "steps": [
                {{
                    "step_number": 1,
                    "description": "简单子问题",
                    "complexity": "low",
                    "builds_on": null
                }}
            ]
        }}
        """
        
        response = self.llm.generate(prompt)
        
        try:
            data = json.loads(response)
            return Plan(steps=data.get("steps", []))
        except:
            return Plan(steps=[{"description": goal}])

# 使用示例
"""
# 选择规划策略
strategies = {
    "react": ReActPlanning(llm),
    "plan_and_solve": PlanAndSolvePlanning(llm),
    "tot": TreeOfThoughtsPlanning(llm, num_candidates=3),
    "least_to_most": LeastToMostPlanning(llm)
}

# 根据任务特征选择策略
if task_complexity == "high" and uncertainty == "high":
    strategy = strategies["tot"]
elif task_complexity == "high" and uncertainty == "low":
    strategy = strategies["plan_and_solve"]
else:
    strategy = strategies["react"]

plan = strategy.plan(goal="开发一个用户认证系统", context={})
"""
```

### 3.2 动态重规划

```python
"""
动态重规划

在执行过程中根据反馈调整计划
"""

from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class ExecutionResult:
    """执行结果"""
    step_id: str
    success: bool
    output: Any
    error: str = None
    execution_time: float = 0.0

class DynamicReplanner:
    """动态重规划器"""
    
    def __init__(self, llm_client, original_plan: Plan):
        """
        初始化重规划器
        
        Args:
            llm_client: 大模型客户端
            original_plan: 原始计划
        """
        self.llm = llm_client
        self.original_plan = original_plan
        self.current_plan = original_plan
        self.execution_history: List[ExecutionResult] = []
    
    def should_replan(self, last_result: ExecutionResult) -> bool:
        """
        判断是否需要重规划
        
        触发条件：
        1. 步骤执行失败
        2. 执行结果与预期不符
        3. 环境发生变化
        4. 发现更优路径
        """
        # 失败触发
        if not last_result.success:
            return True
        
        # 执行时间过长
        if last_result.execution_time > 60:  # 超过 60 秒
            return True
        
        # 结果异常
        if last_result.error:
            return True
        
        return False
    
    def replan(self, goal: str, remaining_steps: List[Dict]) -> Plan:
        """
        重新规划
        
        基于执行历史和剩余目标生成新计划
        """
        # 构建重规划提示
        history_summary = self._summarize_history()
        
        prompt = f"""
        原始目标：{goal}
        
        执行历史：
        {history_summary}
        
        剩余步骤：
        {json.dumps(remaining_steps, ensure_ascii=False, indent=2)}
        
        问题：上一步执行失败/结果异常，需要调整计划。
        
        请：
        1. 分析失败原因
        2. 提出替代方案
        3. 生成新的执行计划
        
        返回 JSON：
        {{
            "failure_analysis": "失败原因分析",
            "alternative_approach": "替代方案",
            "new_plan": {{
                "steps": [...]
            }}
        }}
        """
        
        response = self.llm.generate(prompt)
        
        try:
            data = json.loads(response)
            new_plan = Plan(steps=data["new_plan"]["steps"])
            self.current_plan = new_plan
            return new_plan
        except:
            # 重规划失败，返回剩余步骤
            return Plan(steps=remaining_steps)
    
    def _summarize_history(self) -> str:
        """总结执行历史"""
        summaries = []
        
        for result in self.execution_history:
            status = "成功" if result.success else "失败"
            summary = f"- 步骤 {result.step_id}: {status}"
            
            if result.error:
                summary += f"，错误: {result.error}"
            
            summaries.append(summary)
        
        return "\n".join(summaries)
    
    def add_execution_result(self, result: ExecutionResult):
        """添加执行结果"""
        self.execution_history.append(result)

# 使用示例
"""
# 初始化重规划器
replanner = DynamicReplanner(llm, original_plan)

# 执行循环
for step in plan.steps:
    result = execute_step(step)
    replanner.add_execution_result(result)
    
    if replanner.should_replan(result):
        print("触发重规划...")
        new_plan = replanner.replan(goal, plan.steps[plan.steps.index(step)+1:])
        plan = new_plan
"""
```

---

## 四、计划执行与监控

### 4.1 执行引擎

```python
"""
计划执行引擎

负责任务的调度、执行和监控
"""

from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor

@dataclass
class ExecutionContext:
    """执行上下文"""
    task_id: str
    start_time: datetime
    timeout: int = 300
    max_retries: int = 3
    retry_delay: int = 5

class PlanExecutor:
    """计划执行器"""
    
    def __init__(self, tool_registry: Dict[str, Callable]):
        """
        初始化执行器
        
        Args:
            tool_registry: 工具注册表
        """
        self.tools = tool_registry
        self.executor = ThreadPoolExecutor(max_workers=5)
        self.execution_log: List[Dict] = []
    
    async def execute_plan(
        self,
        plan: Plan,
        context: ExecutionContext
    ) -> Dict:
        """
        执行计划
        
        支持串行和并行执行
        """
        results = {}
        completed = set()
        
        # 构建依赖图
        dep_manager = DependencyManager()
        for step in plan.steps:
            step_id = step.get("id", f"step_{plan.steps.index(step)}")
            for dep in step.get("dependencies", []):
                dep_manager.add_dependency(step_id, dep)
        
        # 执行循环
        while len(completed) < len(plan.steps):
            # 获取可执行的任务
            ready_tasks = dep_manager.get_ready_tasks(completed)
            
            if not ready_tasks:
                break
            
            # 并行执行就绪任务
            tasks = []
            for task_id in ready_tasks:
                step = next(
                    (s for s in plan.steps if s.get("id") == task_id),
                    None
                )
                if step:
                    tasks.append(self._execute_step(step, context))
            
            # 等待所有任务完成
            step_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 处理结果
            for task_id, result in zip(ready_tasks, step_results):
                if isinstance(result, Exception):
                    results[task_id] = {
                        "success": False,
                        "error": str(result)
                    }
                else:
                    results[task_id] = result
                    completed.add(task_id)
        
        return {
            "status": "completed" if len(completed) == len(plan.steps) else "partial",
            "completed_steps": len(completed),
            "total_steps": len(plan.steps),
            "results": results
        }
    
    async def _execute_step(
        self,
        step: Dict,
        context: ExecutionContext
    ) -> Dict:
        """
        执行单步
        
        包含重试逻辑
        """
        step_id = step.get("id", "unknown")
        tool_name = step.get("tool")
        parameters = step.get("parameters", {})
        
        # 重试循环
        for attempt in range(context.max_retries):
            try:
                # 查找工具
                tool = self.tools.get(tool_name)
                
                if not tool:
                    return {
                        "success": False,
                        "error": f"工具 {tool_name} 不存在"
                    }
                
                # 执行工具
                if asyncio.iscoroutinefunction(tool):
                    result = await tool(**parameters)
                else:
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(
                        self.executor,
                        lambda: tool(**parameters)
                    )
                
                # 记录日志
                self.execution_log.append({
                    "step_id": step_id,
                    "timestamp": datetime.now().isoformat(),
                    "status": "success",
                    "result": result
                })
                
                return {
                    "success": True,
                    "result": result
                }
                
            except Exception as e:
                if attempt < context.max_retries - 1:
                    await asyncio.sleep(context.retry_delay)
                else:
                    # 记录失败日志
                    self.execution_log.append({
                        "step_id": step_id,
                        "timestamp": datetime.now().isoformat(),
                        "status": "failed",
                        "error": str(e)
                    })
                    
                    return {
                        "success": False,
                        "error": str(e),
                        "retries": attempt + 1
                    }
    
    def get_execution_log(self) -> List[Dict]:
        """获取执行日志"""
        return self.execution_log

# 使用示例
"""
# 注册工具
tools = {
    "search": search_function,
    "calculate": calculate_function,
    "write_file": write_file_function
}

# 创建执行器
executor = PlanExecutor(tools)

# 执行计划
context = ExecutionContext(
    task_id="task_001",
    start_time=datetime.now(),
    timeout=300,
    max_retries=3
)

result = await executor.execute_plan(plan, context)
print(f"执行结果: {result}")
"""
```

---

## 五、AI 产品经理关注点

```
Planning 产品化要点：

规划策略选择
├── 简单任务（1-3 步）
│   └── ReAct：边想边做，无需预规划
├── 中等任务（3-10 步）
│   └── Plan-and-Solve：先规划后执行
├── 复杂任务（10+ 步）
│   └── Tree of Thoughts：多方案评估
└── 探索性任务
    └── Least-to-Most：从简单开始

用户体验设计
├── 规划透明度
│   ├── 展示计划：让用户知道 Agent 要做什么
│   ├── 进度反馈：显示当前步骤和剩余步骤
│   └── 时间预估：预估完成时间
├── 用户控制
│   ├── 计划确认：执行前让用户确认计划
│   ├── 步骤干预：允许用户修改或跳过步骤
│   └── 暂停/恢复：支持中断和继续
└── 错误处理
    ├── 失败说明：清晰解释为什么失败
    ├── 替代方案：提供备选计划
    └── 人工接管：复杂情况转人工

关键指标
├── 计划成功率
│   ├── 首次成功率 > 70%
│   └── 重规划后成功率 > 90%
├── 计划质量
│   ├── 步骤完整性（无遗漏）
│   ├── 依赖正确性
│   └── 可执行性
├── 效率指标
│   ├── 规划时间 < 5s
│   ├── 重规划次数 < 2 次/任务
│   └── 总执行时间
└── 用户满意度
    ├── 计划合理性评分
    └── 结果满意度

风险控制
├── 计划失控
│   ├── 设置最大步骤数（如 50 步）
│   ├── 设置最大规划深度
│   └── 循环检测
├── 资源耗尽
│   ├── Token 预算控制
│   ├── API 调用次数限制
│   └── 执行时间上限
└── 错误传播
    ├── 步骤隔离（失败不影响其他步骤）
    ├── 回滚机制
    └── 补偿操作

优化方向
├── 学习优化
│   ├── 从成功/失败案例中学习
│   ├── 用户反馈驱动优化
│   └── 计划模板积累
├── 缓存优化
│   ├── 相似任务计划复用
│   ├── 工具结果缓存
│   └── 中间结果复用
└── 并行优化
    ├── 识别可并行步骤
    ├── 异步执行
    └── 结果合并
```

---

## 六、参考资源

- [ReAct Paper](https://arxiv.org/abs/2210.03629) - ReAct: Synergizing Reasoning and Acting
- [Plan-and-Solve](https://arxiv.org/abs/2305.04091) - Plan-and-Solve Prompting
- [Tree of Thoughts](https://arxiv.org/abs/2305.10601) - Tree of Thoughts: Deliberate Problem Solving
- [Least-to-Most](https://arxiv.org/abs/2205.10625) - Least-to-Most Prompting
- [Reflexion](https://arxiv.org/abs/2303.11366) - Reflexion: Self-Reflective Agents
- [LLM+P](https://arxiv.org/abs/2304.11477) - LLM+P: Empowering Large Language Models with Optimal Planning Proficiency

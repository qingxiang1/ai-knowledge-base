<!--
  创建时间: 2026-06-03
  文件名: Reflection.md
  文件描述: Agent反思模块详解，补充反思机制、自我修正、效果评估、产品化治理与验收清单
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# Reflection（反思）

> 反思是 Agent 实现自我改进的核心能力。通过审视自身的思考过程和执行结果，Agent 能够发现错误、总结经验、优化策略，从而不断提升任务完成质量。

---

## 零、前置知识

阅读本节前，建议先掌握以下内容：

| 前置章节                        | 关联点                                       |
| ------------------------------- | -------------------------------------------- |
| [Agent概念](./Agent概念.md)     | 理解 Agent 的自主性与错误不可避免性          |
| [Agent架构](./Agent架构.md)     | 理解 Reflection 在 Agent 闭环架构中的位置    |
| [Planning](./Planning.md)       | 反思结果常用于修正计划或触发重规划           |
| [Memory](./Memory.md)           | 反思结论需要沉淀为经验记忆，避免重复犯错     |
| [ToolCalling](./ToolCalling.md) | 工具失败、参数错误和结果异常是反思常见触发点 |
| [Agent评测](./Agent评测.md)     | 反思质量需要通过指标和测试集持续评估         |

**能力对标**：Reflection 对应 [能力模型](../00-Roadmap/能力模型.md) 中「AI应用构建力 → Agent 可靠性设计」和「产品判断力 → 质量治理能力」。掌握 Reflection，意味着你能设计 Agent 的自我检查、错误修正和持续优化闭环。

---

## 本章学习目标

完成本节后，你应该能够：

- 区分行动层反思、策略层反思和元认知层反思的适用场景
- 设计反思触发条件，包括失败、低质量、超时、用户反馈和周期性检查
- 将反思结论转化为可执行动作，例如重试、重规划、改写 Prompt、更新记忆或转人工
- 控制反思频率、深度和成本，避免过度反思导致效率下降
- 定义 Reflection 的质量指标，包括反思触发率、有效率、质量改进率和重复问题减少率

---

## 一、反思的本质与价值

### 1.1 为什么 Agent 需要反思

```
Agent 反思的必要性：

无反思的问题
├── 重复犯错：同样的错误反复出现
│   └── 每次都用错误的方法计算
├── 无法适应：不能从失败中学习
│   └── 环境变化后仍用旧策略
├── 低效执行：不优化执行路径
│   └── 每次都走弯路
├── 质量停滞：输出质量无法提升
│   └── 始终停留在同一水平
└── 缺乏深度：只做表面执行
    └── 不思考更好的解决方案

反思带来的价值
├── 错误修正：发现并修复问题
├── 策略优化：改进执行方法
├── 知识积累：总结经验教训
├── 质量提升：持续改进输出
└── 自适应：适应环境和需求变化

反思的层次
├── 行动层反思（Action Reflection）
│   ├── 执行结果是否正确？
│   ├── 输出是否符合预期？
│   └── 直接结果的评估
├── 策略层反思（Strategy Reflection）
│   ├── 方法是否最优？
│   ├── 是否有更好的方案？
│   └── 执行路径的优化
└── 元认知层反思（Meta-cognitive Reflection）
    ├── 思考过程是否合理？
    ├── 认知偏差是否存在？
    └── 思维框架的改进
```

### 1.2 反思的核心挑战

```
反思系统面临的挑战：

自我评估偏差
├── 难以客观评价自身输出
├── 可能过度自信或过度悲观
└── 应对：多维度评估、外部反馈

反思时机
├── 何时进行反思？
├── 反思频率如何控制？
└── 应对：关键节点触发、自适应频率

反思深度
├── 表面问题 vs 根本原因
├── 过度反思导致效率低下
└── 应对：分层反思、深度控制

学习效果
├── 反思结论如何转化为行动？
├── 如何避免重复反思相同问题？
└── 应对：经验库、模式识别
```

---

## 二、反思机制设计

### 2.1 反思触发条件

```python
"""
Agent 反思系统实现

反思触发、执行和学习机制
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import json

class ReflectionTrigger(Enum):
    """反思触发条件"""
    ON_ERROR = "on_error"           # 执行出错时
    ON_FAILURE = "on_failure"       # 任务失败时
    ON_LOW_QUALITY = "on_low_quality"  # 质量评分低时
    ON_COMPLETION = "on_completion"    # 任务完成时
    PERIODIC = "periodic"           # 周期性反思
    USER_REQUEST = "user_request"   # 用户请求时

@dataclass
class ExecutionResult:
    """执行结果"""
    task_id: str
    status: str  # success, failure, partial
    output: Any
    expected_output: Any = None
    quality_score: float = 0.0
    execution_time: float = 0.0
    error_message: Optional[str] = None
    metadata: Dict = field(default_factory=dict)

@dataclass
class ReflectionRecord:
    """反思记录"""
    id: str
    trigger: ReflectionTrigger
    timestamp: datetime
    observation: str
    analysis: str
    conclusion: str
    action_items: List[str]
    effectiveness: float = 0.0

class ReflectionTriggerDetector:
    """反思触发检测器"""

    def __init__(self):
        """初始化触发检测器"""
        self.quality_threshold = 0.7
        self.periodic_interval = 10  # 每 10 次交互反思一次
        self.interaction_count = 0

    def should_reflect(
        self,
        result: ExecutionResult,
        context: Dict = None
    ) -> tuple[bool, ReflectionTrigger]:
        """
        判断是否需要反思

        Args:
            result: 执行结果
            context: 上下文信息

        Returns:
            (是否需要反思, 触发条件)
        """
        # 1. 执行失败
        if result.status == "failure":
            return True, ReflectionTrigger.ON_FAILURE

        # 2. 执行出错
        if result.status == "partial" or result.error_message:
            return True, ReflectionTrigger.ON_ERROR

        # 3. 质量评分低
        if result.quality_score < self.quality_threshold:
            return True, ReflectionTrigger.ON_LOW_QUALITY

        # 4. 周期性反思
        self.interaction_count += 1
        if self.interaction_count >= self.periodic_interval:
            self.interaction_count = 0
            return True, ReflectionTrigger.PERIODIC

        # 5. 用户请求
        if context and context.get("user_requested_reflection"):
            return True, ReflectionTrigger.USER_REQUEST

        return False, None

# 使用示例
"""
detector = ReflectionTriggerDetector()

# 执行失败触发反思
result = ExecutionResult(
    task_id="task_001",
    status="failure",
    output=None,
    error_message="API 调用超时"
)

should_reflect, trigger = detector.should_reflect(result)
print(f"需要反思: {should_reflect}, 触发条件: {trigger}")
"""
```

### 2.2 反思执行引擎

```python
"""
反思执行引擎

执行反思过程，生成改进建议
"""

class ReflectionEngine:
    """反思引擎"""

    def __init__(self, llm_client):
        """
        初始化反思引擎

        Args:
            llm_client: 大模型客户端
        """
        self.llm = llm_client
        self.reflection_history: List[ReflectionRecord] = []

    def reflect(
        self,
        result: ExecutionResult,
        trigger: ReflectionTrigger,
        context: Dict = None
    ) -> ReflectionRecord:
        """
        执行反思

        Args:
            result: 执行结果
            trigger: 触发条件
            context: 上下文信息

        Returns:
            反思记录
        """
        # 1. 观察（Observation）
        observation = self._observe(result, context)

        # 2. 分析（Analysis）
        analysis = self._analyze(observation, result)

        # 3. 结论（Conclusion）
        conclusion = self._conclude(analysis, result)

        # 4. 行动项（Action Items）
        action_items = self._generate_actions(conclusion)

        # 创建反思记录
        record = ReflectionRecord(
            id=f"reflect_{result.task_id}_{datetime.now().timestamp()}",
            trigger=trigger,
            timestamp=datetime.now(),
            observation=observation,
            analysis=analysis,
            conclusion=conclusion,
            action_items=action_items
        )

        # 保存历史
        self.reflection_history.append(record)

        return record

    def _observe(self, result: ExecutionResult, context: Dict) -> str:
        """观察：描述发生了什么"""
        prompt = f"""
        请客观描述以下执行结果：

        任务 ID：{result.task_id}
        执行状态：{result.status}
        预期输出：{result.expected_output}
        实际输出：{result.output}
        质量评分：{result.quality_score}
        执行时间：{result.execution_time} 秒
        错误信息：{result.error_message}
        上下文：{json.dumps(context or {}, ensure_ascii=False)}

        请用 2-3 句话客观描述发生了什么，不做判断。
        """

        return self.llm.generate(prompt)

    def _analyze(self, observation: str, result: ExecutionResult) -> str:
        """分析：找出原因"""
        prompt = f"""
        基于以下观察，分析执行结果的原因：

        观察：{observation}
        执行状态：{result.status}
        错误信息：{result.error_message}

        请分析：
        1. 根本原因是什么？
        2. 有哪些影响因素？
        3. 是否存在可改进的地方？

        分析：
        """

        return self.llm.generate(prompt)

    def _conclude(self, analysis: str, result: ExecutionResult) -> str:
        """结论：总结经验"""
        prompt = f"""
        基于以下分析，总结反思结论：

        分析：{analysis}
        执行状态：{result.status}

        请总结：
        1. 核心问题是什么？
        2. 应该采取什么策略？
        3. 如何避免类似问题？

        结论：
        """

        return self.llm.generate(prompt)

    def _generate_actions(self, conclusion: str) -> List[str]:
        """生成行动项"""
        prompt = f"""
        基于以下结论，生成具体的改进行动项：

        结论：{conclusion}

        请生成 3-5 个具体、可执行的行动项，格式为列表。

        行动项：
        """

        response = self.llm.generate(prompt)

        # 解析行动项
        actions = [line.strip("- ") for line in response.split("\n") if line.strip().startswith("-")]

        return actions[:5]

    def get_reflection_history(
        self,
        task_id: str = None,
        limit: int = 10
    ) -> List[ReflectionRecord]:
        """
        获取反思历史

        Args:
            task_id: 任务 ID 过滤
            limit: 数量限制

        Returns:
            反思记录列表
        """
        records = self.reflection_history

        if task_id:
            records = [r for r in records if r.id.startswith(f"reflect_{task_id}")]

        return records[-limit:]

# 使用示例
"""
engine = ReflectionEngine(llm)

# 执行反思
result = ExecutionResult(
    task_id="task_001",
    status="failure",
    output=None,
    expected_output="成功获取数据",
    error_message="API 调用超时",
    quality_score=0.0
)

record = engine.reflect(result, ReflectionTrigger.ON_FAILURE)
print(f"观察: {record.observation}")
print(f"分析: {record.analysis}")
print(f"结论: {record.conclusion}")
print(f"行动项: {record.action_items}")
"""
```

---

## 三、自我修正机制

### 3.1 错误检测与修正

```python
"""
自我修正机制

基于反思结果自动修正执行策略
"""

from typing import Dict, List, Optional, Callable
from dataclasses import dataclass

@dataclass
class CorrectionStrategy:
    """修正策略"""
    name: str
    description: str
    condition: Callable[[ExecutionResult], bool]
    action: Callable[[ExecutionResult, ReflectionRecord], Dict]

class SelfCorrection:
    """自我修正系统"""

    def __init__(self, reflection_engine: ReflectionEngine):
        """
        初始化自我修正系统

        Args:
            reflection_engine: 反思引擎
        """
        self.reflection = reflection_engine
        self.strategies: List[CorrectionStrategy] = []
        self._register_default_strategies()

    def _register_default_strategies(self):
        """注册默认修正策略"""
        # 策略 1：超时重试
        self.strategies.append(CorrectionStrategy(
            name="timeout_retry",
            description="超时错误时增加超时时间并重试",
            condition=lambda r: "timeout" in (r.error_message or "").lower(),
            action=self._timeout_retry
        ))

        # 策略 2：参数修正
        self.strategies.append(CorrectionStrategy(
            name="parameter_fix",
            description="参数错误时修正参数",
            condition=lambda r: "parameter" in (r.error_message or "").lower() or
                              "invalid" in (r.error_message or "").lower(),
            action=self._parameter_fix
        ))

        # 策略 3：质量优化
        self.strategies.append(CorrectionStrategy(
            name="quality_improvement",
            description="质量评分低时优化输出",
            condition=lambda r: r.quality_score < 0.7 and r.status == "success",
            action=self._quality_improvement
        ))

    def correct(
        self,
        result: ExecutionResult,
        reflection: ReflectionRecord
    ) -> Dict:
        """
        执行修正

        Args:
            result: 执行结果
            reflection: 反思记录

        Returns:
            修正方案
        """
        # 查找匹配的策略
        for strategy in self.strategies:
            if strategy.condition(result):
                return {
                    "strategy": strategy.name,
                    "description": strategy.description,
                    "correction": strategy.action(result, reflection),
                    "confidence": 0.8
                }

        # 无匹配策略，返回通用修正建议
        return {
            "strategy": "generic",
            "description": "通用修正策略",
            "correction": {
                "action": "review_and_retry",
                "notes": reflection.conclusion
            },
            "confidence": 0.5
        }

    def _timeout_retry(self, result: ExecutionResult, reflection: ReflectionRecord) -> Dict:
        """超时重试策略"""
        return {
            "action": "retry_with_increased_timeout",
            "parameters": {
                "timeout_multiplier": 2.0,
                "max_retries": 3
            },
            "reason": "API 调用超时，增加超时时间"
        }

    def _parameter_fix(self, result: ExecutionResult, reflection: ReflectionRecord) -> Dict:
        """参数修正策略"""
        return {
            "action": "fix_parameters",
            "parameters": {
                "review_required": True,
                "validation_strict": True
            },
            "reason": "参数错误，需要修正"
        }

    def _quality_improvement(self, result: ExecutionResult, reflection: ReflectionRecord) -> Dict:
        """质量优化策略"""
        return {
            "action": "optimize_output",
            "parameters": {
                "quality_target": 0.9,
                "optimization_focus": reflection.action_items
            },
            "reason": "质量评分低，需要优化"
        }

# 使用示例
"""
correction = SelfCorrection(engine)

# 执行修正
result = ExecutionResult(
    task_id="task_001",
    status="failure",
    output=None,
    error_message="API 调用超时",
    quality_score=0.0
)

record = engine.reflect(result, ReflectionTrigger.ON_FAILURE)
correction_plan = correction.correct(result, record)

print(f"修正策略: {correction_plan['strategy']}")
print(f"修正方案: {correction_plan['correction']}")
"""
```

### 3.2 经验学习与积累

```python
"""
经验学习系统

将反思结果转化为可复用的经验
"""

class ExperienceLibrary:
    """经验库"""

    def __init__(self):
        """初始化经验库"""
        self.experiences: List[Dict] = []
        self.patterns: Dict[str, List[str]] = {}

    def add_experience(self, reflection: ReflectionRecord, result: ExecutionResult):
        """
        添加经验

        Args:
            reflection: 反思记录
            result: 执行结果
        """
        experience = {
            "id": f"exp_{len(self.experiences)}",
            "timestamp": datetime.now().isoformat(),
            "trigger": reflection.trigger.value,
            "status": result.status,
            "error_pattern": result.error_message,
            "conclusion": reflection.conclusion,
            "action_items": reflection.action_items,
            "effectiveness": reflection.effectiveness
        }

        self.experiences.append(experience)

        # 提取错误模式
        if result.error_message:
            pattern = self._extract_pattern(result.error_message)
            if pattern not in self.patterns:
                self.patterns[pattern] = []
            self.patterns[pattern].append(experience["id"])

    def find_similar_experiences(
        self,
        error_message: str,
        limit: int = 5
    ) -> List[Dict]:
        """
        查找相似经验

        Args:
            error_message: 错误信息
            limit: 数量限制

        Returns:
            相似经验列表
        """
        pattern = self._extract_pattern(error_message)

        # 查找相同模式的经验
        exp_ids = self.patterns.get(pattern, [])

        experiences = [
            exp for exp in self.experiences
            if exp["id"] in exp_ids
        ]

        # 按有效性排序
        experiences.sort(key=lambda x: x["effectiveness"], reverse=True)

        return experiences[:limit]

    def get_best_practices(self, task_type: str = None) -> List[str]:
        """
        获取最佳实践

        Args:
            task_type: 任务类型过滤

        Returns:
            最佳实践列表
        """
        # 筛选高有效性经验
        best = [
            exp for exp in self.experiences
            if exp["effectiveness"] > 0.8
        ]

        # 提取行动项
        practices = []
        for exp in best:
            practices.extend(exp["action_items"])

        # 去重
        return list(set(practices))

    def _extract_pattern(self, error_message: str) -> str:
        """提取错误模式"""
        # 简化实现：提取关键词
        keywords = ["timeout", "error", "invalid", "failed", "exception"]

        error_lower = error_message.lower()
        for keyword in keywords:
            if keyword in error_lower:
                return keyword

        return "unknown"

# 使用示例
"""
library = ExperienceLibrary()

# 添加经验
library.add_experience(record, result)

# 查找相似经验
similar = library.find_similar_experiences("API 调用超时")
for exp in similar:
    print(f"经验: {exp['conclusion']}")

# 获取最佳实践
practices = library.get_best_practices()
print(f"最佳实践: {practices}")
"""
```

---

## 四、反思质量评估

### 4.1 反思效果评估

```python
"""
反思质量评估

评估反思的有效性和改进效果
"""

class ReflectionEvaluator:
    """反思评估器"""

    def __init__(self):
        """初始化评估器"""
        self.metrics_history: List[Dict] = []

    def evaluate_reflection(
        self,
        reflection: ReflectionRecord,
        before_result: ExecutionResult,
        after_result: ExecutionResult
    ) -> Dict:
        """
        评估反思效果

        Args:
            reflection: 反思记录
            before_result: 反思前结果
            after_result: 反思后结果

        Returns:
            评估指标
        """
        # 1. 质量改进
        quality_improvement = (
            after_result.quality_score - before_result.quality_score
        )

        # 2. 状态改进
        status_improved = self._status_rank(after_result.status) > \
                         self._status_rank(before_result.status)

        # 3. 效率评估
        time_increase = after_result.execution_time - before_result.execution_time

        # 4. 综合有效性
        effectiveness = self._calculate_effectiveness(
            quality_improvement,
            status_improved,
            time_increase
        )

        # 更新反思记录的有效性
        reflection.effectiveness = effectiveness

        metrics = {
            "reflection_id": reflection.id,
            "quality_improvement": quality_improvement,
            "status_improved": status_improved,
            "time_increase": time_increase,
            "effectiveness": effectiveness,
            "is_valuable": effectiveness > 0.5
        }

        self.metrics_history.append(metrics)

        return metrics

    def _status_rank(self, status: str) -> int:
        """状态等级"""
        ranks = {
            "failure": 0,
            "partial": 1,
            "success": 2
        }
        return ranks.get(status, 0)

    def _calculate_effectiveness(
        self,
        quality_improvement: float,
        status_improved: bool,
        time_increase: float
    ) -> float:
        """计算有效性"""
        # 质量改进权重 50%
        quality_score = max(0, quality_improvement) * 0.5

        # 状态改进权重 30%
        status_score = 0.3 if status_improved else 0

        # 时间效率权重 20%（时间增加越少越好）
        time_score = max(0, 0.2 - time_increase * 0.01)

        return min(1.0, quality_score + status_score + time_score)

    def get_statistics(self) -> Dict:
        """获取反思统计"""
        if not self.metrics_history:
            return {}

        total = len(self.metrics_history)
        valuable = sum(1 for m in self.metrics_history if m["is_valuable"])

        return {
            "total_reflections": total,
            "valuable_reflections": valuable,
            "valuable_rate": valuable / total if total > 0 else 0,
            "avg_quality_improvement": sum(
                m["quality_improvement"] for m in self.metrics_history
            ) / total,
            "avg_effectiveness": sum(
                m["effectiveness"] for m in self.metrics_history
            ) / total
        }

# 使用示例
"""
evaluator = ReflectionEvaluator()

# 评估反思效果
before = ExecutionResult(
    task_id="task_001",
    status="failure",
    output=None,
    quality_score=0.0
)

after = ExecutionResult(
    task_id="task_001",
    status="success",
    output="修正后的结果",
    quality_score=0.9
)

metrics = evaluator.evaluate_reflection(record, before, after)
print(f"质量改进: {metrics['quality_improvement']}")
print(f"有效性: {metrics['effectiveness']}")
print(f"是否有价值: {metrics['is_valuable']}")

# 获取统计
stats = evaluator.get_statistics()
print(f"反思统计: {stats}")
"""
```

---

## 五、AI 产品经理关注点

```
Reflection 产品化要点：

反思策略选择
├── 被动反思
│   ├── 出错后自动反思
│   ├── 质量低时触发
│   └── 用户投诉后反思
├── 主动反思
│   ├── 周期性自我检查
│   ├── 任务完成后总结
│   └── 达到里程碑时反思
└── 混合策略
    ├── 关键节点被动触发
    ├── 日常主动检查
    └── 用户可手动触发

用户体验设计
├── 透明度
│   ├── 展示反思过程
│   ├── 显示改进行动
│   └── 提供反思日志
├── 可控性
│   ├── 用户可关闭自动反思
│   ├── 手动触发反思
│   └── 查看和编辑反思结论
└── 反馈
    ├── 反思结果通知
    ├── 改进效果展示
    └── 用户确认机制

反思质量保障
├── 避免过度反思
│   ├── 设置反思频率上限
│   ├── 相似问题合并反思
│   └── 无效反思过滤
├── 确保反思深度
│   ├── 分层反思机制
│   ├── 根本原因分析
│   └── 行动项可执行
└── 持续优化
    ├── 反思效果评估
    ├── 策略迭代优化
    └── 经验库更新

关键指标
├── 反思触发率
│   ├── 目标：10-20% 的任务触发
│   └── 过高说明系统不稳定
├── 反思有效率
│   ├── 目标 > 70%
│   └── 衡量反思是否有价值
├── 质量改进率
│   ├── 目标：平均改进 > 0.3
│   └── 衡量反思的实际效果
└── 用户满意度
    ├── 反思后满意度提升
    └── 重复问题减少率

优化方向
├── 智能触发
│   ├── 基于模式识别的触发
│   ├── 预测性反思
│   └── 个性化触发阈值
├── 深度分析
│   ├── 多维度分析
│   ├── 根因分析
│   └── 关联分析
└── 知识沉淀
    ├── 经验库自动构建
    ├── 最佳实践提取
    └── 团队知识共享
```

---

## 六、产品设计模板

### 6.1 反思机制 PRD 检查表

| 设计项   | 关键问题                                     | 输出物         |
| -------- | -------------------------------------------- | -------------- |
| 触发条件 | 哪些失败、低质量、超时或用户反馈会触发反思？ | 触发规则表     |
| 反思层级 | 是行动层、策略层还是元认知层反思？           | 分层反思策略   |
| 行动转化 | 反思后执行重试、重规划、更新记忆还是转人工？ | Action Mapping |
| 成本控制 | 最大反思次数、频率、Token 和耗时如何限制？   | 成本约束配置   |
| 经验沉淀 | 哪些反思结论进入长期记忆或经验库？           | 经验写入规则   |
| 用户可见 | 用户是否能看到反思原因、过程和修正动作？     | 反思交互方案   |
| 效果评估 | 如何判断反思是否真的改善了结果？             | 效果评估指标   |

### 6.2 反思记录字段建议

```json
{
  "reflection_id": "reflect_001",
  "task_id": "task_001",
  "trigger": "on_failure",
  "level": "strategy",
  "observation": "工具调用连续两次超时",
  "root_cause": "外部 API 响应不稳定，缺少备用数据源",
  "action_items": ["切换备用工具", "降低请求结果数量", "记录工具稳定性"],
  "follow_up_action": "replan",
  "effectiveness_score": 0.82,
  "created_at": "2026-06-05T10:00:00Z"
}
```

---

## 七、常见误区

| 误区               | 问题                       | 正确做法                           |
| ------------------ | -------------------------- | ---------------------------------- |
| 每一步都反思       | 成本高、延迟长、用户体验差 | 只在关键节点、失败或低质量时触发   |
| 反思只生成文字总结 | 无法改善后续执行           | 将反思结论映射为具体动作和规则更新 |
| 只让 Agent 自评    | 容易自我合理化             | 引入外部评测、用户反馈和规则校验   |
| 反思结论不沉淀     | 同类错误反复出现           | 将有效经验写入记忆或策略库         |
| 反思无限重试       | 任务失控、成本失控         | 设置最大反思次数和人工接管条件     |

---

## 八、阶段验收标准

- [ ] 能设计反思触发条件，并区分错误、失败、低质量和用户反馈触发
- [ ] 能说明行动层、策略层、元认知层反思的差异和适用场景
- [ ] 能把反思结论转化为重试、重规划、工具替换、Prompt 调整或转人工动作
- [ ] 能设计反思经验沉淀机制，避免重复犯错
- [ ] 能定义反思有效率、质量改进率、重复问题减少率和反思成本指标

---

## 九、版本记录

- **2026-06-05** 补充前置知识、能力对标、学习目标、产品设计模板、常见误区和阶段验收标准
- **2026-06-03** 初版完成，涵盖反思机制、自我修正、错误分析、学习优化与产品关注点

---

## 十、参考资源

- [Self-Refine](https://arxiv.org/abs/2303.17651) - 迭代自我完善
- [Reflexion](https://arxiv.org/abs/2303.11366) - 语言 Agent 的强化自我反思
- [Chain of Thought](https://arxiv.org/abs/2201.11903) - 思维链提示
- [Tree of Thoughts](https://arxiv.org/abs/2305.10601) - 思维树推理
- [Learning from Mistakes](https://arxiv.org/abs/2303.16563) - 从错误中学习
- [Meta-Cognitive Reflection](https://arxiv.org/abs/2311.09601) - 元认知反思研究

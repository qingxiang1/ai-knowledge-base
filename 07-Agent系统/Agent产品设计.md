<!--
  创建时间: 2026-06-03
  文件名: Agent产品设计.md
  文件描述: Agent产品设计方法论，补充场景判断、交互设计、能力边界、商业闭环与验收清单
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# Agent 产品设计

> Agent 产品设计是将 Agent 技术转化为用户价值的关键环节。优秀的产品设计需要在技术可行性和用户体验之间找到最佳平衡点。

---

## 零、前置知识

阅读本节前，建议先掌握以下内容：

| 前置章节                        | 关联点                                   |
| ------------------------------- | ---------------------------------------- |
| [Agent概念](./Agent概念.md)     | 判断场景是否真的需要 Agent               |
| [Agent架构](./Agent架构.md)     | 产品方案需要映射到可实现的系统架构       |
| [Planning](./Planning.md)       | Agent 产品的自主性来自任务规划能力       |
| [Memory](./Memory.md)           | 个性化、连续性和用户信任依赖记忆设计     |
| [ToolCalling](./ToolCalling.md) | Agent 产品能否产生真实价值取决于工具边界 |
| [Agent评测](./Agent评测.md)     | 产品上线和迭代必须依赖评测指标           |

**能力对标**：Agent 产品设计对应 [能力模型](../00-Roadmap/能力模型.md) 中「AI产品设计力 → Agent 产品化能力」和「商业判断力 → 场景价值判断」。掌握本章，意味着你能把 Agent 技术能力转化为可落地、可运营、可评测、可商业化的产品方案。

---

## 本章学习目标

完成本节后，你应该能够：

- 判断一个业务场景是否适合 Agent，而不是普通 Chatbot、RAG 或工作流
- 定义 Agent 产品的用户、目标、能力边界、自主等级和风险等级
- 设计 Agent 的交互体验，包括计划展示、过程透明、用户干预、结果确认和失败兜底
- 建立 Agent 产品的指标体系，包括任务成功率、用户满意度、留存、成本和安全指标
- 输出一份完整的 Agent 产品方案，包括场景、价值、架构、交互、评测和上线策略

---

## 一、产品设计的本质与价值

### 1.1 Agent 产品 vs 传统产品

```
Agent 产品与传统产品的核心差异：

传统软件产品
├── 确定性：输入输出可预期
├── 被动响应：用户操作后才响应
├── 功能固定：能力边界清晰
├── 错误明确：要么成功，要么失败
└── 测试充分：可覆盖大部分场景

Agent 产品
├── 不确定性：输出有一定随机性
├── 主动推理：自主规划并执行
├── 能力弹性：边界模糊，持续进化
├── 错误多样：部分正确、幻觉、偏见
└── 测试困难：场景无限，难以穷尽

设计思维转变
├── 从"功能设计"到"能力设计"
│   └── 不是设计按钮和流程，而是设计能力和边界
├── 从"确定性"到"概率性"
│   └── 接受不确定性，设计容错机制
├── 从"即时响应"到"持续交互"
│   └── 设计多轮对话和长期协作
├── 从"结果导向"到"过程透明"
│   └── 让用户了解 Agent 的思考过程
└── 从"用户操作"到"人机协作"
    └── 设计合适的介入点和控制机制
```

### 1.2 产品设计的核心挑战

```
Agent 产品设计面临的挑战：

能力边界模糊
├── 用户不知道 Agent 能做什么
├── Agent 不知道自己不能做什么
└── 设计：明确的能力声明、渐进式引导

输出质量波动
├── 同样的输入，输出可能不同
├── 有时很好，有时很差
└── 设计：质量监控、兜底策略、用户反馈

信任建立困难
├── 用户不确定 Agent 是否可靠
├── 关键决策不敢交给 Agent
└── 设计：过程透明、可解释性、人机确认

责任归属不清
├── Agent 犯错，谁负责
├── 用户误用，如何界定
└── 设计：免责声明、人工兜底、审计日志

体验一致性
├── 不同场景体验差异大
├── 多轮对话上下文丢失
└── 设计：统一交互范式、状态持久化
```

---

## 二、产品设计方法论

### 2.1 需求分析与场景定义

```python
"""
Agent 产品需求分析框架

系统化分析 Agent 产品的需求、场景和价值
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

class UserType(Enum):
    """用户类型"""
    EXPERT = "expert"           # 专家用户
    REGULAR = "regular"         # 普通用户
    BEGINNER = "beginner"       # 新手用户

class TaskComplexity(Enum):
    """任务复杂度"""
    SIMPLE = "simple"           # 简单任务（单步完成）
    MODERATE = "moderate"       # 中等任务（多步完成）
    COMPLEX = "complex"         # 复杂任务（需要规划）

@dataclass
class UserScenario:
    """用户场景"""
    id: str
    name: str
    description: str
    user_type: UserType
    task_complexity: TaskComplexity
    frequency: str  # daily, weekly, monthly
    pain_points: List[str]
    expected_outcome: str
    success_criteria: List[str]

class RequirementAnalyzer:
    """需求分析器"""

    def __init__(self):
        """初始化分析器"""
        self.scenarios: List[UserScenario] = []
        self.priorities: Dict[str, int] = {}

    def add_scenario(self, scenario: UserScenario):
        """
        添加用户场景

        Args:
            scenario: 用户场景
        """
        self.scenarios.append(scenario)

    def analyze_fit(self) -> Dict[str, Any]:
        """
        分析 Agent 适配度

        评估哪些场景适合用 Agent 解决

        Returns:
            适配度分析结果
        """
        analysis = {
            "high_fit": [],
            "medium_fit": [],
            "low_fit": []
        }

        for scenario in self.scenarios:
            fit_score = self._calculate_fit(scenario)

            if fit_score >= 0.7:
                analysis["high_fit"].append({
                    "scenario": scenario,
                    "score": fit_score,
                    "reason": "适合 Agent 解决"
                })
            elif fit_score >= 0.4:
                analysis["medium_fit"].append({
                    "scenario": scenario,
                    "score": fit_score,
                    "reason": "需要权衡"
                })
            else:
                analysis["low_fit"].append({
                    "scenario": scenario,
                    "score": fit_score,
                    "reason": "不适合 Agent"
                })

        return analysis

    def _calculate_fit(self, scenario: UserScenario) -> float:
        """
        计算场景适配度

        评估标准：
        - 任务复杂度（越高越适合）
        - 频率（越高越适合）
        - 痛点明确度
        """
        score = 0.0

        # 复杂度加分
        if scenario.task_complexity == TaskComplexity.COMPLEX:
            score += 0.4
        elif scenario.task_complexity == TaskComplexity.MODERATE:
            score += 0.3
        else:
            score += 0.1

        # 频率加分
        if scenario.frequency == "daily":
            score += 0.3
        elif scenario.frequency == "weekly":
            score += 0.2
        else:
            score += 0.1

        # 痛点数量加分
        score += min(len(scenario.pain_points) * 0.1, 0.3)

        return min(score, 1.0)

    def generate_prd(self, scenario: UserScenario) -> Dict:
        """
        生成产品需求文档（PRD）框架

        Args:
            scenario: 用户场景

        Returns:
            PRD 框架
        """
        return {
            "产品概述": {
                "场景": scenario.name,
                "目标用户": scenario.user_type.value,
                "核心价值": scenario.expected_outcome
            },
            "功能需求": {
                "核心能力": self._extract_capabilities(scenario),
                "输入输出": self._define_io(scenario),
                "边界条件": self._define_boundaries(scenario)
            },
            "非功能需求": {
                "性能": "响应时间 < 3s",
                "可用性": "可用性 > 99.9%",
                "安全": "数据加密、权限控制"
            },
            "成功指标": scenario.success_criteria
        }

    def _extract_capabilities(self, scenario: UserScenario) -> List[str]:
        """提取所需能力"""
        capabilities = []

        if scenario.task_complexity == TaskComplexity.COMPLEX:
            capabilities.extend(["任务规划", "多步推理", "错误恢复"])

        if len(scenario.pain_points) > 2:
            capabilities.append("多维度分析")

        return capabilities

    def _define_io(self, scenario: UserScenario) -> Dict:
        """定义输入输出"""
        return {
            "输入": "用户自然语言描述 + 上下文",
            "输出": "结构化结果 + 执行过程说明"
        }

    def _define_boundaries(self, scenario: UserScenario) -> List[str]:
        """定义边界条件"""
        return [
            "不支持实时数据处理",
            "单次任务不超过 10 步",
            "涉及敏感操作需人工确认"
        ]

# 使用示例
"""
analyzer = RequirementAnalyzer()

# 添加场景
analyzer.add_scenario(UserScenario(
    id="scenario_001",
    name="智能客服",
    description="用户咨询产品问题",
    user_type=UserType.REGULAR,
    task_complexity=TaskComplexity.MODERATE,
    frequency="daily",
    pain_points=["等待时间长", "回答不准确", "无法解决复杂问题"],
    expected_outcome="快速准确解答用户问题",
    success_criteria=["首次解决率 > 80%", "满意度 > 4.0"]
))

# 分析适配度
fit_analysis = analyzer.analyze_fit()
print(f"高适配场景: {len(fit_analysis['high_fit'])}")

# 生成 PRD
for item in fit_analysis['high_fit']:
    prd = analyzer.generate_prd(item['scenario'])
    print(json.dumps(prd, ensure_ascii=False, indent=2))
"""
```

### 2.2 交互设计

```python
"""
Agent 交互设计框架

设计 Agent 与用户的交互模式
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

class InteractionMode(Enum):
    """交互模式"""
    CONVERSATIONAL = "conversational"   # 对话式
    TASK_ORIENTED = "task_oriented"     # 任务式
    COLLABORATIVE = "collaborative"     # 协作式
    AUTONOMOUS = "autonomous"           # 自主式

@dataclass
class InteractionDesign:
    """交互设计"""
    mode: InteractionMode
    steps_visible: bool  # 是否展示执行步骤
    confirmation_points: List[str]  # 确认点
    fallback_strategy: str  # 兜底策略
    error_handling: str  # 错误处理

class InteractionDesigner:
    """交互设计师"""

    def __init__(self):
        """初始化设计师"""
        self.patterns: Dict[str, InteractionDesign] = {}

    def design_interaction(
        self,
        scenario: str,
        user_type: str,
        risk_level: str
    ) -> InteractionDesign:
        """
        设计交互模式

        Args:
            scenario: 场景描述
            user_type: 用户类型
            risk_level: 风险等级（low/medium/high）

        Returns:
            交互设计
        """
        # 根据风险等级选择模式
        if risk_level == "high":
            mode = InteractionMode.COLLABORATIVE
            steps_visible = True
            confirmation_points = ["关键决策点", "执行前"]
            fallback_strategy = "人工接管"
        elif risk_level == "medium":
            mode = InteractionMode.TASK_ORIENTED
            steps_visible = True
            confirmation_points = ["执行前"]
            fallback_strategy = "请求澄清"
        else:
            mode = InteractionMode.CONVERSATIONAL
            steps_visible = False
            confirmation_points = []
            fallback_strategy = "默认处理"

        # 根据用户类型调整
        if user_type == "expert":
            steps_visible = True  # 专家用户希望看到细节
        elif user_type == "beginner":
            confirmation_points.append("每一步")  # 新手需要更多引导

        return InteractionDesign(
            mode=mode,
            steps_visible=steps_visible,
            confirmation_points=confirmation_points,
            fallback_strategy=fallback_strategy,
            error_handling="友好提示 + 替代方案"
        )

    def generate_dialogue_flow(
        self,
        design: InteractionDesign,
        task: str
    ) -> List[Dict]:
        """
        生成对话流程

        Args:
            design: 交互设计
            task: 任务描述

        Returns:
            对话流程
        """
        flow = []

        # 开场
        flow.append({
            "role": "agent",
            "type": "greeting",
            "content": f"我来帮您 {task}。",
            "options": ["开始", "了解更多"]
        })

        # 信息收集
        flow.append({
            "role": "agent",
            "type": "inquiry",
            "content": "请告诉我更多细节...",
            "input_type": "text"
        })

        # 确认（如果有确认点）
        if design.confirmation_points:
            flow.append({
                "role": "agent",
                "type": "confirmation",
                "content": "我计划这样做，您确认吗？",
                "show_plan": design.steps_visible,
                "options": ["确认", "修改", "取消"]
            })

        # 执行
        flow.append({
            "role": "agent",
            "type": "execution",
            "content": "正在执行...",
            "show_progress": design.steps_visible
        })

        # 结果
        flow.append({
            "role": "agent",
            "type": "result",
            "content": "执行完成，结果如下...",
            "follow_up": ["还有其他需要吗？", "保存结果"]
        })

        return flow

# 使用示例
"""
designer = InteractionDesigner()

# 为高风险场景设计交互
design = designer.design_interaction(
    scenario="自动审批贷款",
    user_type="expert",
    risk_level="high"
)

print(f"交互模式: {design.mode.value}")
print(f"展示步骤: {design.steps_visible}")
print(f"确认点: {design.confirmation_points}")
print(f"兜底策略: {design.fallback_strategy}")

# 生成对话流程
flow = designer.generate_dialogue_flow(design, "审批贷款申请")
for step in flow:
    print(f"{step['type']}: {step['content']}")
"""
```

---

## 三、产品能力边界设计

### 3.1 能力声明与引导

```python
"""
Agent 能力边界管理

明确 Agent 能做什么、不能做什么，并引导用户
"""

from typing import Dict, List, Any
from dataclasses import dataclass

@dataclass
class Capability:
    """能力定义"""
    name: str
    description: str
    examples: List[str]
    limitations: List[str]
    confidence: float  # 能力置信度

class CapabilityManager:
    """能力管理器"""

    def __init__(self):
        """初始化能力管理器"""
        self.capabilities: Dict[str, Capability] = {}
        self.unsupported: List[str] = []

    def register_capability(self, capability: Capability):
        """
        注册能力

        Args:
            capability: 能力定义
        """
        self.capabilities[capability.name] = capability

    def get_capability_statement(self) -> str:
        """
        获取能力声明

        Returns:
            能力声明文本
        """
        lines = ["我可以帮您："]

        for name, cap in self.capabilities.items():
            lines.append(f"\n**{name}**")
            lines.append(f"  {cap.description}")
            lines.append(f"  例如：{', '.join(cap.examples[:2])}")

        lines.append("\n**暂不支持：**")
        for item in self.unsupported:
            lines.append(f"  - {item}")

        return "\n".join(lines)

    def check_request(self, request: str) -> Dict:
        """
        检查请求是否在能力范围内

        Args:
            request: 用户请求

        Returns:
            检查结果
        """
        # 简化实现：关键词匹配
        matched_capabilities = []

        for name, cap in self.capabilities.items():
            # 检查名称匹配
            if name in request:
                matched_capabilities.append(cap)
                continue

            # 检查示例匹配
            for example in cap.examples:
                if any(word in request for word in example.split()):
                    matched_capabilities.append(cap)
                    break

        if matched_capabilities:
            best_match = max(matched_capabilities, key=lambda c: c.confidence)
            return {
                "in_scope": True,
                "capability": best_match.name,
                "confidence": best_match.confidence,
                "suggestion": None
            }
        else:
            return {
                "in_scope": False,
                "capability": None,
                "confidence": 0,
                "suggestion": self._suggest_alternative(request)
            }

    def _suggest_alternative(self, request: str) -> str:
        """建议替代方案"""
        # 简化实现
        return "这个问题我可能无法很好解决。您可以尝试：\n1. 更具体地描述您的需求\n2. 分步骤提问\n3. 联系人工客服"

# 使用示例
"""
manager = CapabilityManager()

# 注册能力
manager.register_capability(Capability(
    name="数据分析",
    description="分析数据并生成洞察",
    examples=["分析销售数据", "生成数据报表"],
    limitations=["不支持实时数据", "数据量不超过 10万条"],
    confidence=0.9
))

manager.register_capability(Capability(
    name="文档处理",
    description="阅读和总结文档",
    examples=["总结 PDF", "提取关键信息"],
    limitations=["不支持扫描件", "单文件不超过 50MB"],
    confidence=0.85
))

manager.unsupported = ["实时视频处理", "物理世界操作", "医疗诊断"]

# 输出能力声明
print(manager.get_capability_statement())

# 检查请求
check = manager.check_request("帮我分析这份销售数据")
print(f"在能力范围内: {check['in_scope']}")
if not check['in_scope']:
    print(check['suggestion'])
"""
```

---

## 四、商业模式与变现

```
Agent 产品商业模式：

订阅模式
├── 按功能分级
│   ├── 免费版：基础能力，有限次数
│   ├── 专业版：全部能力，无限次数
│   └── 企业版：定制能力，API 访问
├── 按使用量计费
│   ├── 按调用次数
│   ├── 按处理数据量
│   └── 按计算资源
└── 按效果付费
    ├── 任务完成才收费
    └── 按创造的价值分成

平台模式
├── 应用市场
│   ├── 开发者上传 Agent
│   ├── 用户按需购买
│   └── 平台抽成
├── 能力市场
│   ├── 工具/插件市场
│   ├── 记忆/知识库市场
│   └── 工作流模板市场
└── 数据服务
    ├── 行业数据包
    ├── 标注服务
    └── 评测服务

解决方案模式
├── 行业解决方案
│   ├── 金融 Agent
│   ├── 医疗 Agent
│   └── 法律 Agent
├── 企业定制
│   ├── 私有化部署
│   ├── 定制开发
│   └── 运维服务
└── 咨询服务
    ├── 架构设计
    ├── 效果优化
    └── 培训服务

关键成功因素
├── 技术壁垒
│   ├── 核心算法优势
│   ├── 数据积累
│   └── 工程能力
├── 用户体验
│   ├── 易用性
│   ├── 可靠性
│   └── 性价比
└── 生态建设
    ├── 开发者社区
    ├── 应用生态
    └── 合作伙伴
```

---

## 五、AI 产品经理实践指南

```
Agent 产品经理核心能力：

技术理解
├── 理解 Agent 工作原理
│   ├── 规划、记忆、工具、反思
│   └── 知道技术边界和可能性
├── 了解模型能力
│   ├── 不同模型的优劣
│   └── 适用场景
└── 掌握工程实现
    ├── 了解开发流程
    └── 能评估技术方案

产品设计
├── 场景挖掘
│   ├── 发现高价值场景
│   └── 评估技术可行性
├── 体验设计
│   ├── 交互流程
│   ├── 容错机制
│   └── 信任建立
└── 指标定义
    ├── 业务指标
    ├── 技术指标
    └── 体验指标

项目管理
├── 迭代规划
│   ├── MVP 定义
│   ├── 版本节奏
│   └── 优先级管理
├── 风险管理
│   ├── 技术风险
│   ├── 安全风险
│   └── 合规风险
└── 团队协作
    ├── 与算法团队
    ├── 与工程团队
    └── 与运营团队

数据驱动
├── 埋点设计
│   ├── 用户行为
│   ├── Agent 行为
│   └── 结果数据
├── 分析能力
│   ├── 漏斗分析
│   ├── 留存分析
│   └── A/B 测试
└── 决策能力
    ├── 数据解读
    └── 方案选择

关键工作流
├── 需求阶段
│   ├── 场景调研
│   ├── 竞品分析
│   └── 需求文档
├── 设计阶段
│   ├── 交互设计
│   ├── 能力边界定义
│   └── 测试用例设计
├── 开发阶段
│   ├── 技术方案评审
│   ├── 进度跟踪
│   └── 问题协调
├── 测试阶段
│   ├── 功能测试
│   ├── 效果评测
│   └── 用户体验测试
└── 上线阶段
    ├── 灰度发布
    ├── 监控告警
    └── 迭代优化

常见陷阱
├── 过度承诺
│   ├── 问题：夸大 Agent 能力
│   └── 应对：诚实声明能力边界
├── 忽视兜底
│   ├── 问题：未设计失败场景
│   └── 应对：完善错误处理
├── 体验不一致
│   ├── 问题：不同场景体验差异大
│   └── 应对：统一设计规范
├── 安全疏忽
│   ├── 问题：未考虑安全风险
│   └── 应对：安全评审机制
└── 数据隐私
    ├── 问题：用户数据保护不足
    └── 应对：隐私设计、合规审查
```

---

## 六、产品设计模板

### 6.1 Agent 产品方案检查表

| 设计项   | 关键问题                                           | 输出物           |
| -------- | -------------------------------------------------- | ---------------- |
| 场景判断 | 为什么必须用 Agent，而不是 Chatbot、RAG 或工作流？ | Agent 适配度分析 |
| 用户目标 | 用户真正想完成的任务是什么？成功标准是什么？       | 用户任务定义     |
| 自主等级 | Agent 能自主规划、调用工具、执行动作到什么程度？   | 自主性等级表     |
| 能力边界 | Agent 明确能做什么、不能做什么、需要人工确认什么？ | 能力边界说明     |
| 交互设计 | 用户如何发起、确认、干预、暂停、恢复和评价任务？   | 核心交互流程     |
| 风险控制 | 失败、幻觉、越权、隐私和高成本调用如何兜底？       | 风险控制矩阵     |
| 评测上线 | 达到什么指标才能灰度、全量或回滚？                 | 上线门禁标准     |

### 6.2 Agent 产品方案字段建议

```json
{
  "product_name": "企业经营分析 Agent",
  "target_users": ["业务负责人", "数据分析师", "部门主管"],
  "core_scenario": "自动分析经营数据并生成可执行建议",
  "agent_fit_reason": "任务多步骤、需调用数据工具、需结合历史上下文并产出决策建议",
  "autonomy_level": "human_confirmed_execution",
  "capabilities": ["数据查询", "指标分析", "异常识别", "报告生成", "行动建议"],
  "boundaries": [
    "不直接修改生产数据",
    "不替代最终业务决策",
    "高风险建议需人工确认"
  ],
  "tools": ["database_query", "chart_generator", "report_writer"],
  "memory_strategy": "保存用户关注指标和历史分析偏好",
  "success_metrics": {
    "task_success_rate": ">= 85%",
    "user_satisfaction": ">= 4.2/5",
    "manual_takeover_rate": "<= 15%",
    "p95_latency": "<= 30s"
  }
}
```

---

## 七、常见误区

| 误区                     | 问题                                   | 正确做法                                      |
| ------------------------ | -------------------------------------- | --------------------------------------------- |
| 把聊天机器人包装成 Agent | 没有规划、工具和行动能力，用户预期落空 | 明确 Agent 必须具备目标、状态、工具和执行闭环 |
| 一开始就做高自主 Agent   | 风险、成本和不可控性过高               | 从建议型、确认型 Agent 开始，逐步提升自主性   |
| 只强调智能，不设计边界   | 用户不知道何时可信、何时需人工判断     | 明确能力范围、失败场景和人工接管机制          |
| 忽略过程透明             | 用户无法信任 Agent 的行动路径          | 展示计划、工具调用、关键依据和结果来源        |
| 没有上线门禁             | 质量波动直接影响真实用户               | 用评测指标、灰度监控和回滚条件控制上线风险    |

---

## 八、阶段验收标准

- [ ] 能判断一个场景是否适合 Agent，并说明与 Chatbot、RAG、工作流的区别
- [ ] 能定义 Agent 产品的用户、任务目标、能力边界、自主等级和风险等级
- [ ] 能设计核心交互流程，包括计划确认、过程展示、用户干预、结果确认和失败兜底
- [ ] 能设计 Agent 产品指标，包括任务成功率、满意度、留存、成本、安全和人工接管率
- [ ] 能输出完整 Agent 产品方案，覆盖场景价值、系统架构、交互体验、评测上线和运营迭代

---

## 九、版本记录

- **2026-06-05** 补充前置知识、能力对标、学习目标、产品设计模板、常见误区和阶段验收标准
- **2026-06-03** 初版完成，涵盖需求分析、交互设计、能力边界、商业模式和产品经理实践指南

---

## 十、参考资源

- [The Rise of Agentic AI](https://www.anthropic.com/research) - Anthropic 的 Agent 研究
- [AI Agent Design Patterns](https://www.patterns.dev/posts/ai-agent/) - Agent 设计模式
- [Human-AI Interaction Guidelines](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/) - 微软人机交互指南
- [Designing Agentic AI](https://www.nngroup.com/articles/ai-agents/) - Nielsen Norman Group 的 Agent 设计
- [AI Product Management](https://www.oreilly.com/library/view/ai-product-management/9781098155594/) - AI 产品管理书籍

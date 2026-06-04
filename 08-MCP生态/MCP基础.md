<!--
  文件描述: MCP基础概念详解，涵盖MCP定义、核心价值、与Function Calling对比及架构概览
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# MCP 基础

> 模型上下文协议（Model Context Protocol，MCP）是 Anthropic 推出的开放协议，旨在标准化大语言模型与外部数据源、工具之间的集成方式。

---

## 一、MCP 的本质与价值

### 1.1 什么是 MCP

```
MCP 定义：

模型上下文协议（Model Context Protocol）
├── 发起方：Anthropic（2024年11月开源）
├── 协议类型：开放标准协议
├── 核心目标：统一 LLM 与外部世界的连接方式
└── 类比理解：
    ├── USB 协议：统一硬件连接
    ├── HTTP 协议：统一网页访问
    └── MCP 协议：统一 AI 与工具的连接

MCP 解决的问题：

Before MCP（混乱状态）
├── 每个工具需要定制集成
│   ├── OpenAI 的 Function Calling
│   ├── LangChain 的 Tool 封装
│   ├── 各平台私有 API
│   └── N 个工具 = N 种集成方式
├── 重复开发成本高
│   └── 每个项目都要重新对接
├── 生态碎片化
│   └── 工具开发者需要适配多个平台
└── 可移植性差
    └── 换一个模型就要重新集成

After MCP（标准化）
├── 一次开发，到处运行
│   └── 工具开发者只需实现 MCP 协议
├── 模型无关
│   └── 任何支持 MCP 的模型都能使用
├── 生态互通
│   └── 所有 MCP 工具可以互相组合
└── 降低集成成本
    └── 产品经理关注业务，而非技术对接
```

### 1.2 MCP 的核心价值

```python
"""
MCP 核心价值分析

从 AI 产品经理视角理解 MCP 的价值
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class IntegrationCost:
    """集成成本对比"""
    approach: str
    development_days: int
    maintenance_cost: int  # 每月人天
    flexibility: float  # 0-1

class MCPValueAnalysis:
    """MCP 价值分析器"""
    
    def __init__(self):
        """初始化分析器"""
        self.scenarios = [
            IntegrationCost(
                approach="传统定制集成",
                development_days=15,
                maintenance_cost=5,
                flexibility=0.3
            ),
            IntegrationCost(
                approach="Function Calling",
                development_days=10,
                maintenance_cost=3,
                flexibility=0.5
            ),
            IntegrationCost(
                approach="MCP 协议",
                development_days=3,
                maintenance_cost=1,
                flexibility=0.9
            )
        ]
    
    def compare(self) -> Dict:
        """
        对比不同集成方式
        
        Returns:
            对比结果
        """
        return {
            scenario.approach: {
                "开发成本": f"{scenario.development_days} 天",
                "维护成本": f"{scenario.maintenance_cost} 人天/月",
                "灵活性": f"{scenario.flexibility:.0%}",
                "综合评分": self._calculate_score(scenario)
            }
            for scenario in self.scenarios
        }
    
    def _calculate_score(self, cost: IntegrationCost) -> float:
        """计算综合评分"""
        # 开发成本权重 30%，维护成本 30%，灵活性 40%
        dev_score = max(0, 1 - cost.development_days / 20)
        maint_score = max(0, 1 - cost.maintenance_cost / 10)
        
        return dev_score * 0.3 + maint_score * 0.3 + cost.flexibility * 0.4

# 使用示例
"""
analysis = MCPValueAnalysis()
result = analysis.compare()

for approach, metrics in result.items():
    print(f"\n{approach}:")
    for key, value in metrics.items():
        print(f"  {key}: {value}")
"""
```

### 1.3 MCP vs Function Calling

```
MCP 与 Function Calling 对比：

维度对比
├── 定位
│   ├── Function Calling：模型能力（模型原生支持）
│   └── MCP：开放协议（跨模型、跨平台）
├── 标准化程度
│   ├── Function Calling：各厂商实现不同
│   │   ├── OpenAI 的 tools 格式
│   │   ├── Anthropic 的 tools 格式
│   │   └── Google 的 function_declarations
│   └── MCP：统一标准
│       ├── 统一的工具描述格式
│       ├── 统一的调用协议
│       └── 统一的返回规范
├── 生态开放性
│   ├── Function Calling：封闭生态
│   │   └── 工具与模型绑定
│   └── MCP：开放生态
│       └── 工具开发者独立发布
├── 可移植性
│   ├── Function Calling：低
│   │   └── 换模型需重新适配
│   └── MCP：高
│       └── 工具一次开发，多模型使用
└── 适用场景
    ├── Function Calling：单一模型应用
    └── MCP：多模型、多工具复杂应用

关系理解
├── MCP 不是替代 Function Calling
├── MCP 建立在 Function Calling 之上
│   └── 底层仍使用模型的 Function Calling 能力
├── MCP 是标准化层
│   └── 统一不同模型的 Function Calling 差异
└── 类比
    ├── Function Calling = 各品牌的充电口
    └── MCP = USB-C 标准
```

---

## 二、MCP 架构概览

### 2.1 核心组件

```python
"""
MCP 核心组件

MCP 架构中的三个核心角色
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

class ComponentType(Enum):
    """组件类型"""
    HOST = "host"           # 宿主应用
    CLIENT = "client"       # 客户端
    SERVER = "server"       # 服务端

@dataclass
class MCPComponent:
    """MCP 组件"""
    type: ComponentType
    name: str
    description: str
    responsibilities: List[str]

class MCPArchitecture:
    """MCP 架构说明"""
    
    def __init__(self):
        """初始化架构组件"""
        self.components = {
            ComponentType.HOST: MCPComponent(
                type=ComponentType.HOST,
                name="Host（宿主）",
                description="运行 LLM 的应用程序",
                responsibilities=[
                    "提供用户交互界面",
                    "管理 LLM 连接",
                    "协调 Client 生命周期",
                    "处理用户请求和响应"
                ]
            ),
            ComponentType.CLIENT: MCPComponent(
                type=ComponentType.CLIENT,
                name="Client（客户端）",
                description="Host 内的 MCP 客户端实例",
                responsibilities=[
                    "与 Server 建立连接",
                    "发送工具调用请求",
                    "接收和处理响应",
                    "管理会话状态"
                ]
            ),
            ComponentType.SERVER: MCPComponent(
                type=ComponentType.SERVER,
                name="Server（服务端）",
                description="提供工具能力的外部服务",
                responsibilities=[
                    "暴露工具列表",
                    "执行工具调用",
                    "返回结构化结果",
                    "管理资源访问"
                ]
            )
        }
    
    def describe_flow(self) -> str:
        """
        描述数据流
        
        Returns:
            数据流说明
        """
        return """
MCP 标准数据流：

1. 用户 → Host
   用户输入自然语言请求

2. Host → LLM
   Host 将请求发送给大模型

3. LLM → Host（需要工具）
   LLM 判断需要调用工具，返回工具调用意图

4. Host → Client
   Host 通过 Client 发起工具调用

5. Client → Server
   Client 按照 MCP 协议调用 Server

6. Server → Client
   Server 执行工具，返回结果

7. Client → Host
   Client 将结果返回给 Host

8. Host → LLM
   Host 将工具结果提供给 LLM

9. LLM → Host
   LLM 基于工具结果生成最终回复

10. Host → 用户
    用户收到最终回复
"""

# 使用示例
"""
arch = MCPArchitecture()

# 查看各组件职责
for comp_type, component in arch.components.items():
    print(f"\n{component.name}")
    print(f"  描述: {component.description}")
    print(f"  职责:")
    for resp in component.responsibilities:
        print(f"    - {resp}")

# 查看数据流
print(arch.describe_flow())
"""
```

### 2.2 连接方式

```python
"""
MCP 连接方式

MCP 支持多种传输协议
"""

from typing import Dict, List
from dataclasses import dataclass
from enum import Enum

class TransportType(Enum):
    """传输类型"""
    STDIO = "stdio"                 # 标准输入输出
    SSE = "sse"                     # Server-Sent Events
    HTTP = "http"                   # HTTP 请求

@dataclass
class TransportConfig:
    """传输配置"""
    type: TransportType
    description: str
    use_case: str
    pros: List[str]
    cons: List[str]

class MCPTransport:
    """MCP 传输方式"""
    
    def __init__(self):
        """初始化传输方式"""
        self.transports = {
            TransportType.STDIO: TransportConfig(
                type=TransportType.STDIO,
                description="通过标准输入输出流通信",
                use_case="本地进程间通信",
                pros=[
                    "简单直接，无需网络",
                    "适合本地工具集成",
                    "安全性高"
                ],
                cons=[
                    "仅支持本地",
                    "无法远程访问",
                    "单用户限制"
                ]
            ),
            TransportType.SSE: TransportConfig(
                type=TransportType.SSE,
                description="Server-Sent Events 长连接",
                use_case="实时推送场景",
                pros=[
                    "支持实时数据推送",
                    "HTTP 兼容性好",
                    "适合流式响应"
                ],
                cons=[
                    "单向通信（Server→Client）",
                    "需要额外处理请求发送"
                ]
            ),
            TransportType.HTTP: TransportConfig(
                type=TransportType.HTTP,
                description="标准 HTTP REST API",
                use_case="远程服务调用",
                pros=[
                    "通用性强",
                    "支持远程访问",
                    "易于负载均衡"
                ],
                cons=[
                    "无状态，需额外管理会话",
                    "实时性较差"
                ]
            )
        }
    
    def recommend(self, scenario: str) -> str:
        """
        推荐传输方式
        
        Args:
            scenario: 使用场景
        
        Returns:
            推荐方案
        """
        recommendations = {
            "本地工具": TransportType.STDIO,
            "实时通知": TransportType.SSE,
            "远程服务": TransportType.HTTP,
            "Web 应用": TransportType.HTTP,
            "桌面应用": TransportType.STDIO
        }
        
        for key, transport in recommendations.items():
            if key in scenario:
                config = self.transports[transport]
                return f"推荐: {config.type.value}\n原因: {config.description}\n适用: {config.use_case}"
        
        return "推荐: stdio（默认）\n原因: 简单可靠，适合大多数场景"

# 使用示例
"""
transport = MCPTransport()

# 查看所有传输方式
for t_type, config in transport.transports.items():
    print(f"\n{config.type.value}")
    print(f"  {config.description}")
    print(f"  适用: {config.use_case}")

# 获取推荐
print(transport.recommend("本地文件处理工具"))
"""
```

---

## 三、AI 产品经理关注点

```
MCP 产品化要点：

技术选型决策
├── 何时使用 MCP
│   ├── 需要集成多个外部工具
│   ├── 希望工具可复用、可共享
│   ├── 计划支持多种 LLM 模型
│   └── 需要构建工具生态
├── 何时不使用 MCP
│   ├── 单一工具简单集成
│   ├── 对延迟要求极高（增加一跳）
│   └── 已有成熟的 Function Calling 方案

产品价值
├── 对用户
│   ├── 更丰富的工具能力
│   ├── 更灵活的扩展方式
│   └── 跨平台一致性体验
├── 对开发者
│   ├── 降低工具集成成本
│   ├── 一次开发多平台使用
│   └── 参与开放生态
└── 对企业
    ├── 避免 vendor lock-in
    ├── 灵活切换模型供应商
    └── 构建内部工具市场

关键指标
├── 生态指标
│   ├── MCP Server 数量
│   ├── 工具使用频次
│   └── 开发者活跃度
├── 体验指标
│   ├── 工具调用成功率
│   ├── 平均响应时间
│   └── 用户满意度
└── 业务指标
    ├── 集成效率提升
    ├── 开发成本降低
    └── 功能迭代速度

落地建议
├── 阶段一：评估
│   ├── 梳理现有工具集成方式
│   ├── 评估迁移成本
│   └── 选择试点场景
├── 阶段二：试点
│   ├── 开发 1-2 个 MCP Server
│   ├── 在内部项目试用
│   └── 收集反馈优化
└── 阶段三：推广
    ├── 建立 MCP 开发规范
    ├── 搭建内部工具市场
    └── 推动生态建设
```

---

## 四、参考资源

- [MCP 官方文档](https://modelcontextprotocol.io/) - Anthropic 官方 MCP 文档
- [MCP GitHub](https://github.com/modelcontextprotocol) - MCP 开源仓库
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) - Python 开发工具包
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) - MCP 调试工具

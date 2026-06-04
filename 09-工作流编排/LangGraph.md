<!--
  文件描述: LangGraph工作流编排详解，涵盖状态机模型、节点边定义、循环工作流、多Agent协作及持久化
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# LangGraph

> LangGraph 是 LangChain 生态中的状态机工作流框架，用于构建具有循环、条件分支和持久化能力的复杂 Agent 工作流。

---

## 一、LangGraph 概述

### 1.1 什么是 LangGraph

```
LangGraph 定义：

LangGraph 框架
├── 本质：基于状态机（State Machine）的工作流编排框架
├── 发起方：LangChain 团队（2024年1月发布）
├── 构建基础：LangChain 核心组件
├── 核心定位：解决复杂 Agent 工作流的编排问题
└── 与 LangChain 关系：
    ├── LangChain：组件库 + 链式调用
    ├── LCEL：声明式链式语法
    └── LangGraph：状态机工作流引擎

核心能力
├── 循环支持
│   └── 工作流可以循环执行，直到满足条件
├── 条件分支
│   └── 基于状态的条件路由
├── 持久化
│   └── 状态持久化，支持断点续传
├── 人机协作
│   └── 支持人工审核和干预
└── 多 Agent 协作
    └── 多个 Agent 之间的消息传递

适用场景
├── 复杂多步骤任务
├── 需要循环迭代的流程
├── 人机协作工作流
├── 多 Agent 协作系统
└── 需要状态持久化的长流程
```

### 1.2 核心概念：状态机

```python
"""
LangGraph 状态机模型

工作流 = 状态 + 节点 + 边
"""

from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
import operator

class AgentState(TypedDict):
    """
    定义工作流状态
    
    状态是工作流中所有数据的容器
    """
    messages: Annotated[Sequence[BaseMessage], operator.add]
    """消息历史，使用 operator.add 实现追加"""
    
    next_step: str
    """下一步要执行的节点"""
    
    iteration_count: int
    """迭代计数器"""
    
    is_complete: bool
    """是否完成"""

# 状态机执行流程
"""
状态机执行流程：

1. 初始化状态
   State = {messages: [], next_step: "start", iteration_count: 0, is_complete: False}

2. 执行节点
   node_start(state) → 更新状态 → 返回新状态

3. 路由判断
   conditional_edge(state) → 决定下一个节点

4. 循环或结束
   ├── 满足条件 → 继续执行
   └── 满足结束条件 → 返回结果

可视化表示：

    ┌─────────┐
    │  Start  │
    └────┬────┘
         │
         ▼
    ┌─────────┐     ┌─────────┐
    │ Node A  │────▶│ Node B  │
    └────┬────┘     └────┬────┘
         │               │
         │         ┌─────┘
         │         │
         ▼         ▼
    ┌─────────┐     ┌─────────┐
    │  End    │◀────│ Node C  │
    └─────────┘     └─────────┘
"""
```

---

## 二、环境搭建

### 2.1 安装 LangGraph

```bash
# 安装 LangGraph
pip install langgraph

# 安装 LangChain 依赖
pip install langchain langchain-openai

# 完整开发环境
pip install langgraph langchain langchain-openai langchain-chroma
```

### 2.2 快速验证

```python
"""
LangGraph 快速验证

验证安装是否成功
"""

import langgraph
from langgraph.graph import StateGraph, END

def verify_installation():
    """
    验证 LangGraph 安装
    
    Returns:
        验证结果
    """
    print(f"LangGraph 版本: {langgraph.__version__}")
    
    # 验证核心组件
    try:
        # 创建简单图
        workflow = StateGraph(dict)
        workflow.add_node("test", lambda x: x)
        workflow.set_entry_point("test")
        workflow.add_edge("test", END)
        app = workflow.compile()
        
        print("LangGraph 核心组件验证通过")
        return True
    except Exception as e:
        print(f"验证失败: {e}")
        return False

# 运行验证
# verify_installation()
```

---

## 三、基础工作流

### 3.1 简单线性工作流

```python
"""
LangGraph 简单线性工作流

无分支、无循环的基础工作流
"""

from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage

class SimpleState(TypedDict):
    """简单状态定义"""
    input: str
    output: str
    step: str

class LinearWorkflow:
    """线性工作流示例"""
    
    def __init__(self):
        """初始化工作流"""
        self.llm = ChatOpenAI(model="gpt-3.5-turbo")
        self.workflow = self._build_graph()
    
    def _step1_process(self, state: SimpleState) -> SimpleState:
        """
        第一步：处理输入
        
        Args:
            state: 当前状态
        
        Returns:
            更新后的状态
        """
        print(f"执行步骤1：处理输入 - {state['input'][:50]}...")
        
        response = self.llm.invoke([
            HumanMessage(content=f"请分析以下内容：{state['input']}")
        ])
        
        return {
            **state,
            "output": response.content,
            "step": "step1"
        }
    
    def _step2_enhance(self, state: SimpleState) -> SimpleState:
        """
        第二步：增强输出
        
        Args:
            state: 当前状态
        
        Returns:
            更新后的状态
        """
        print(f"执行步骤2：增强输出")
        
        response = self.llm.invoke([
            HumanMessage(content=f"请基于以下分析给出建议：{state['output']}")
        ])
        
        return {
            **state,
            "output": response.content,
            "step": "step2"
        }
    
    def _build_graph(self) -> StateGraph:
        """
        构建工作流图
        
        Returns:
            编译后的工作流
        """
        # 创建状态图
        workflow = StateGraph(SimpleState)
        
        # 添加节点
        workflow.add_node("step1", self._step1_process)
        workflow.add_node("step2", self._step2_enhance)
        
        # 设置入口点
        workflow.set_entry_point("step1")
        
        # 添加边
        workflow.add_edge("step1", "step2")
        workflow.add_edge("step2", END)
        
        # 编译
        return workflow.compile()
    
    def run(self, user_input: str) -> SimpleState:
        """
        运行工作流
        
        Args:
            user_input: 用户输入
        
        Returns:
            最终状态
        """
        initial_state = {
            "input": user_input,
            "output": "",
            "step": "start"
        }
        
        return self.workflow.invoke(initial_state)

# 使用示例
"""
workflow = LinearWorkflow()
result = workflow.run("如何提高团队效率？")
print(result["output"])
"""
```

### 3.2 条件分支工作流

```python
"""
LangGraph 条件分支工作流

根据状态条件选择不同执行路径
"""

from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END

class BranchState(TypedDict):
    """分支状态定义"""
    query: str
    query_type: str
    result: str

class BranchingWorkflow:
    """条件分支工作流"""
    
    def __init__(self):
        """初始化工作流"""
        self.workflow = self._build_graph()
    
    def _classify_query(self, state: BranchState) -> BranchState:
        """
        查询分类节点
        
        Args:
            state: 当前状态
        
        Returns:
            更新后的状态
        """
        query = state["query"].lower()
        
        # 简单分类逻辑
        if any(word in query for word in ["天气", "温度", "下雨"]):
            query_type = "weather"
        elif any(word in query for word in ["计算", "多少", "等于"]):
            query_type = "math"
        elif any(word in query for word in ["搜索", "查找", "什么是"]):
            query_type = "search"
        else:
            query_type = "chat"
        
        return {
            **state,
            "query_type": query_type
        }
    
    def _handle_weather(self, state: BranchState) -> BranchState:
        """处理天气查询"""
        return {
            **state,
            "result": f"天气查询结果：{state['query']}"
        }
    
    def _handle_math(self, state: BranchState) -> BranchState:
        """处理数学查询"""
        return {
            **state,
            "result": f"数学计算结果：{state['query']}"
        }
    
    def _handle_search(self, state: BranchState) -> BranchState:
        """处理搜索查询"""
        return {
            **state,
            "result": f"搜索结果：{state['query']}"
        }
    
    def _handle_chat(self, state: BranchState) -> BranchState:
        """处理聊天"""
        return {
            **state,
            "result": f"聊天回复：{state['query']}"
        }
    
    def _route_query(self, state: BranchState) -> Literal["weather", "math", "search", "chat"]:
        """
        路由函数
        
        Args:
            state: 当前状态
        
        Returns:
            下一个节点名称
        """
        return state["query_type"]
    
    def _build_graph(self) -> StateGraph:
        """
        构建条件分支工作流
        
        Returns:
            编译后的工作流
        """
        workflow = StateGraph(BranchState)
        
        # 添加节点
        workflow.add_node("classify", self._classify_query)
        workflow.add_node("weather", self._handle_weather)
        workflow.add_node("math", self._handle_math)
        workflow.add_node("search", self._handle_search)
        workflow.add_node("chat", self._handle_chat)
        
        # 设置入口
        workflow.set_entry_point("classify")
        
        # 添加条件边
        workflow.add_conditional_edges(
            "classify",
            self._route_query,
            {
                "weather": "weather",
                "math": "math",
                "search": "search",
                "chat": "chat"
            }
        )
        
        # 所有处理节点都连接到结束
        for node in ["weather", "math", "search", "chat"]:
            workflow.add_edge(node, END)
        
        return workflow.compile()
    
    def run(self, query: str) -> BranchState:
        """
        运行工作流
        
        Args:
            query: 用户查询
        
        Returns:
            最终状态
        """
        return self.workflow.invoke({
            "query": query,
            "query_type": "",
            "result": ""
        })

# 条件分支可视化
"""
          ┌───────────┐
          │  classify │
          └─────┬─────┘
                │
      ┌────────┼────────┬────────┐
      │        │        │        │
      ▼        ▼        ▼        ▼
 ┌────────┐┌────────┐┌────────┐┌────────┐
 │ weather││  math  ││ search ││  chat  │
 └────┬───┘└────┬───┘└────┬───┘└────┬───┘
      │         │         │         │
      └─────────┴────┬────┴─────────┘
                     │
                     ▼
                   ┌────┐
                   │END │
                   └────┘
"""
```

---

## 四、循环工作流

### 4.1 迭代优化工作流

```python
"""
LangGraph 循环工作流

支持迭代直到满足条件
"""

from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

class IterationState(TypedDict):
    """迭代状态定义"""
    topic: str
    content: str
    iteration: int
    max_iterations: int
    quality_score: float
    is_satisfactory: bool

class IterativeWorkflow:
    """迭代优化工作流"""
    
    def __init__(self, max_iterations: int = 5):
        """
        初始化工作流
        
        Args:
            max_iterations: 最大迭代次数
        """
        self.max_iterations = max_iterations
        self.llm = ChatOpenAI(model="gpt-4")
        self.workflow = self._build_graph()
    
    def _generate_content(self, state: IterationState) -> IterationState:
        """
        生成内容
        
        Args:
            state: 当前状态
        
        Returns:
            更新后的状态
        """
        iteration = state["iteration"]
        topic = state["topic"]
        
        if iteration == 0:
            prompt = f"请为'{topic}'生成一段内容。"
        else:
            prompt = f"请改进以下内容（第{iteration}轮优化）：\n\n{state['content']}"
        
        response = self.llm.invoke([HumanMessage(content=prompt)])
        
        return {
            **state,
            "content": response.content,
            "iteration": iteration + 1
        }
    
    def _evaluate_quality(self, state: IterationState) -> IterationState:
        """
        评估内容质量
        
        Args:
            state: 当前状态
        
        Returns:
            更新后的状态
        """
        content = state["content"]
        
        # 使用 LLM 评估质量
        eval_prompt = f"""请评估以下内容的 quality（0-10分）：

{content}

只返回分数数字。"""
        
        response = self.llm.invoke([HumanMessage(content=eval_prompt)])
        
        try:
            score = float(response.content.strip()) / 10
        except:
            score = 0.5
        
        is_satisfactory = score >= 0.8 or state["iteration"] >= state["max_iterations"]
        
        return {
            **state,
            "quality_score": score,
            "is_satisfactory": is_satisfactory
        }
    
    def _should_continue(self, state: IterationState) -> str:
        """
        判断是否继续迭代
        
        Args:
            state: 当前状态
        
        Returns:
            下一个节点
        """
        if state["is_satisfactory"]:
            return "end"
        return "generate"
    
    def _build_graph(self) -> StateGraph:
        """
        构建循环工作流
        
        Returns:
            编译后的工作流
        """
        workflow = StateGraph(IterationState)
        
        # 添加节点
        workflow.add_node("generate", self._generate_content)
        workflow.add_node("evaluate", self._evaluate_quality)
        
        # 设置入口
        workflow.set_entry_point("generate")
        
        # 生成 → 评估
        workflow.add_edge("generate", "evaluate")
        
        # 评估 → 条件判断
        workflow.add_conditional_edges(
            "evaluate",
            self._should_continue,
            {
                "generate": "generate",  # 继续迭代
                "end": END  # 结束
            }
        )
        
        return workflow.compile()
    
    def run(self, topic: str) -> IterationState:
        """
        运行迭代工作流
        
        Args:
            topic: 主题
        
        Returns:
            最终状态
        """
        return self.workflow.invoke({
            "topic": topic,
            "content": "",
            "iteration": 0,
            "max_iterations": self.max_iterations,
            "quality_score": 0.0,
            "is_satisfactory": False
        })

# 循环工作流可视化
"""
        ┌─────────────┐
        │   START     │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │  generate   │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │  evaluate   │
        └──────┬──────┘
               │
         ┌─────┴─────┐
         │           │
    score<0.8   score>=0.8
         │           │
         ▼           ▼
   ┌──────────┐  ┌──────┐
   │ generate │  │ END  │
   └────┬─────┘  └──────┘
        │
        └──────────────┘
"""
```

---

## 五、多 Agent 协作

### 5.1 Multi-Agent 系统

```python
"""
LangGraph 多 Agent 协作

多个 Agent 通过消息传递协作完成任务
"""

from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
import operator

class MultiAgentState(TypedDict):
    """多 Agent 状态定义"""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next_agent: str
    task_status: str

class MultiAgentSystem:
    """多 Agent 协作系统"""
    
    def __init__(self):
        """初始化多 Agent 系统"""
        self.llm = ChatOpenAI(model="gpt-4")
        self.workflow = self._build_graph()
    
    def _researcher_agent(self, state: MultiAgentState) -> MultiAgentState:
        """
        研究员 Agent
        
        负责信息收集和研究
        """
        messages = state["messages"]
        
        response = self.llm.invoke([
            HumanMessage(content="""你是研究员 Agent。请基于以下对话进行研究：

""" + "\n".join([m.content for m in messages[-3:]]))
        ])
        
        return {
            **state,
            "messages": [AIMessage(content=f"[研究员] {response.content}")],
            "next_agent": "writer"
        }
    
    def _writer_agent(self, state: MultiAgentState) -> MultiAgentState:
        """
        写手 Agent
        
        负责内容撰写
        """
        messages = state["messages"]
        
        response = self.llm.invoke([
            HumanMessage(content="""你是写手 Agent。请基于研究内容撰写报告：

""" + "\n".join([m.content for m in messages[-3:]]))
        ])
        
        return {
            **state,
            "messages": [AIMessage(content=f"[写手] {response.content}")],
            "next_agent": "reviewer"
        }
    
    def _reviewer_agent(self, state: MultiAgentState) -> MultiAgentState:
        """
        审核员 Agent
        
        负责质量审核
        """
        messages = state["messages"]
        
        response = self.llm.invoke([
            HumanMessage(content="""你是审核员 Agent。请审核以下内容是否合格：

""" + "\n".join([m.content for m in messages[-3:]]) + """

如果合格，回复 "APPROVED"。
如果不合格，回复 "REVISION_NEEDED" 并说明原因。""")
        ])
        
        content = response.content
        if "APPROVED" in content:
            next_agent = "end"
            status = "completed"
        else:
            next_agent = "researcher"
            status = "revision_needed"
        
        return {
            **state,
            "messages": [AIMessage(content=f"[审核员] {content}")],
            "next_agent": next_agent,
            "task_status": status
        }
    
    def _route_agent(self, state: MultiAgentState) -> str:
        """
        Agent 路由
        
        Args:
            state: 当前状态
        
        Returns:
            下一个 Agent
        """
        return state["next_agent"]
    
    def _build_graph(self) -> StateGraph:
        """
        构建多 Agent 工作流
        
        Returns:
            编译后的工作流
        """
        workflow = StateGraph(MultiAgentState)
        
        # 添加 Agent 节点
        workflow.add_node("researcher", self._researcher_agent)
        workflow.add_node("writer", self._writer_agent)
        workflow.add_node("reviewer", self._reviewer_agent)
        
        # 设置入口
        workflow.set_entry_point("researcher")
        
        # 研究员 → 写手
        workflow.add_edge("researcher", "writer")
        
        # 写手 → 审核员
        workflow.add_edge("writer", "reviewer")
        
        # 审核员 → 条件路由
        workflow.add_conditional_edges(
            "reviewer",
            self._route_agent,
            {
                "researcher": "researcher",  # 需要修改
                "end": END  # 完成
            }
        )
        
        return workflow.compile()
    
    def run(self, task: str) -> MultiAgentState:
        """
        运行多 Agent 系统
        
        Args:
            task: 任务描述
        
        Returns:
            最终状态
        """
        return self.workflow.invoke({
            "messages": [HumanMessage(content=task)],
            "next_agent": "researcher",
            "task_status": "in_progress"
        })

# 多 Agent 协作可视化
"""
    ┌─────────────┐
    │   START     │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  researcher │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   writer    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  reviewer   │
    └──────┬──────┘
           │
     ┌─────┴─────┐
     │           │
  REVISION    APPROVED
     │           │
     ▼           ▼
┌──────────┐  ┌──────┐
│researcher│  │ END  │
└──────────┘  └──────┘
"""
```

---

## 六、持久化与人机协作

### 6.1 状态持久化

```python
"""
LangGraph 状态持久化

支持断点续传和人工干预
"""

from typing import TypedDict
from langgraph.graph import StateGraph, END
from langgraph.checkpoint import MemorySaver

class PersistentState(TypedDict):
    """持久化状态定义"""
    input: str
    output: str
    human_feedback: str
    status: str

class PersistentWorkflow:
    """持久化工作流"""
    
    def __init__(self):
        """初始化持久化工作流"""
        self.workflow = self._build_graph()
    
    def _process(self, state: PersistentState) -> PersistentState:
        """
        处理节点
        
        Args:
            state: 当前状态
        
        Returns:
            更新后的状态
        """
        return {
            **state,
            "output": f"处理结果：{state['input']}",
            "status": "waiting_for_feedback"
        }
    
    def _human_review(self, state: PersistentState) -> PersistentState:
        """
        人工审核节点
        
        等待人工输入
        """
        # 这里会暂停，等待人工输入
        # 实际使用时通过 checkpoint 恢复
        return state
    
    def _finalize(self, state: PersistentState) -> PersistentState:
        """
        最终处理
        
        Args:
            state: 当前状态
        
        Returns:
            更新后的状态
        """
        return {
            **state,
            "output": f"最终结果：{state['output']}（反馈：{state['human_feedback']}）",
            "status": "completed"
        }
    
    def _build_graph(self) -> StateGraph:
        """
        构建持久化工作流
        
        Returns:
            编译后的工作流
        """
        workflow = StateGraph(PersistentState)
        
        # 添加节点
        workflow.add_node("process", self._process)
        workflow.add_node("human_review", self._human_review)
        workflow.add_node("finalize", self._finalize)
        
        # 设置入口
        workflow.set_entry_point("process")
        
        # 处理 → 人工审核
        workflow.add_edge("process", "human_review")
        
        # 人工审核 → 最终处理
        workflow.add_edge("human_review", "finalize")
        
        # 最终处理 → 结束
        workflow.add_edge("finalize", END)
        
        # 添加持久化
        checkpointer = MemorySaver()
        
        return workflow.compile(checkpointer=checkpointer)
    
    def run(self, user_input: str, thread_id: str = "default"):
        """
        运行工作流
        
        Args:
            user_input: 用户输入
            thread_id: 线程 ID
        
        Returns:
            运行结果
        """
        config = {"configurable": {"thread_id": thread_id}}
        
        return self.workflow.invoke({
            "input": user_input,
            "output": "",
            "human_feedback": "",
            "status": "started"
        }, config=config)

# 持久化使用示例
"""
# 第一次运行
workflow = PersistentWorkflow()
result = workflow.run("任务1", thread_id="task_001")

# 如果工作流在 human_review 节点暂停
# 可以通过相同的 thread_id 恢复
# 并提供人工反馈

# 恢复工作流
config = {"configurable": {"thread_id": "task_001"}}
# workflow.workflow.invoke({...human_feedback...}, config=config)
"""
```

---

## 七、AI 产品经理关注点

```
LangGraph 产品化要点：

适用场景分析
├── 强烈推荐
│   ├── 复杂审批流程
│   ├── 迭代优化任务
│   ├── 多角色协作流程
│   └── 需要人工介入的流程
├── 可以考虑
│   ├── 简单线性流程（LangChain 即可）
│   ├── 纯自动化的流程
│   └── 实时性要求极高的流程
└── 不推荐
    ├── 简单问答
    ├── 单次生成任务
    └── 无状态流程

技术架构建议
├── 状态设计
│   ├── 保持状态精简
│   ├── 明确状态变更规则
│   └── 考虑状态序列化
├── 节点设计
│   ├── 单一职责原则
│   ├── 幂等性设计
│   └── 错误处理机制
└── 路由设计
    ├── 条件清晰明确
    ├── 避免死循环
    └── 设置最大迭代次数

人机协作设计
├── 介入点选择
│   ├── 关键决策点
│   ├── 质量审核点
│   └── 异常处理点
├── 交互设计
│   ├── 清晰的上下文展示
│   ├── 便捷的操作方式
│   └── 实时的状态反馈
└── 权限控制
    ├── 角色权限划分
    ├── 操作日志记录
    └── 审批流程设计

性能优化
├── 状态管理
│   ├── 避免状态膨胀
│   ├── 定期清理历史
│   └── 状态压缩存储
├── 并发处理
│   ├── 支持多线程执行
│   ├── 状态隔离
│   └── 资源竞争处理
└── 监控告警
    ├── 节点执行时间
    ├── 循环次数监控
    └── 异常状态告警

关键指标
├── 技术指标
│   ├── 节点执行成功率 > 99%
│   ├── 平均执行时间 < 10s/节点
│   └── 状态恢复成功率 100%
├── 业务指标
│   ├── 任务完成率 > 95%
│   ├── 人工介入率 < 20%
│   └── 用户满意度 > 4.2/5
└── 成本指标
    ├── 平均 Token 消耗
    ├── 存储成本
    └── 计算资源利用率

落地建议
├── 阶段一：学习
│   ├── 理解状态机模型
│   ├── 完成官方示例
│   └── 设计简单工作流
├── 阶段二：试点
│   ├── 选择 1 个复杂场景
│   ├── 实现 MVP
│   └── 测试人机协作
├── 阶段三：扩展
│   ├── 增加工作流复杂度
│   ├── 优化状态管理
│   └── 完善监控体系
└── 阶段四：规模化
    ├── 多工作流管理
    ├── 团队协作
    └── 自动化运维
```

---

## 八、参考资源

- [LangGraph 官方文档](https://langchain-ai.github.io/langgraph/) - LangGraph 官方文档
- [LangGraph GitHub](https://github.com/langchain-ai/langgraph) - 开源仓库
- [LangGraph 教程](https://langchain-ai.github.io/langgraph/tutorials/) - 官方教程
- [LangChain 文档](https://python.langchain.com/) - LangChain 官方文档
- [状态机模式](https://refactoringguru.cn/design-patterns/state) - 设计模式参考

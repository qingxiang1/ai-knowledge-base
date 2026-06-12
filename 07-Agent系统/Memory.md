<!--
  创建时间: 2026-06-03
  文件名: Memory.md
  文件描述: Agent记忆模块详解，补充记忆类型、存储策略、检索机制、记忆治理与产品化验收清单
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# Memory（记忆）

> 记忆是 Agent 维持上下文连续性、积累经验和实现个性化服务的核心能力。没有记忆的 Agent 每次交互都是独立的，无法形成连贯的对话和深度的用户理解。

---

## 零、前置知识

阅读本节前，建议先掌握以下内容：

| 前置章节                                            | 关联点                                          |
| --------------------------------------------------- | ----------------------------------------------- |
| [Agent概念](./Agent概念.md)                         | 理解 Agent 为什么需要跨轮次、跨任务保持状态     |
| [Agent架构](./Agent架构.md)                         | 理解 Memory 在 Agent Runtime 与状态管理中的位置 |
| [Token机制](../02-AI基础知识/Token机制.md)          | 记忆压缩、上下文裁剪和成本控制依赖 Token 管理   |
| [Embedding原理](../02-AI基础知识/Embedding原理.md)  | 长期记忆常通过向量化实现语义检索                |
| [企业知识库设计](../06-RAG知识库/企业知识库设计.md) | 外部记忆与企业知识库、权限、数据治理高度相关    |
| [Recall](../06-RAG知识库/Recall.md)                 | 记忆检索需要召回、重排和相关性评估              |

**能力对标**：Memory 对应 [能力模型](../00-Roadmap/能力模型.md) 中「AI应用构建力 → RAG/Agent 数据能力」和「产品判断力 → 用户体验连续性」。掌握 Memory，意味着你能设计既有上下文连续性，又满足隐私、安全和成本约束的 Agent 记忆系统。

---

## 本章学习目标

完成本节后，你应该能够：

- 区分工作记忆、短期记忆、长期记忆和外部记忆的边界
- 设计记忆写入、检索、压缩、遗忘、删除和审计机制
- 判断哪些信息应该被长期保存，哪些只应存在于当前会话
- 设计用户可见、可编辑、可删除的记忆交互体验
- 定义 Memory 的质量指标，包括检索准确率、上下文连贯性、重复询问率和隐私合规风险

---

## 一、记忆的本质与价值

### 1.1 为什么 Agent 需要记忆

```
Agent 记忆的必要性：

无记忆的问题
├── 上下文断裂：每次对话独立，无法引用之前的内容
│   └── 用户："刚才说的方案再详细讲讲" → Agent："什么方案？"
├── 重复劳动：重复询问已提供的信息
│   └── 用户："我是做电商的"（第 5 次）
├── 无法学习：不能从交互中积累经验
│   └── 每次都犯同样的错误
└── 缺乏个性化：无法适应用户偏好
    └── 用户喜欢简洁回答，Agent 却总是长篇大论

记忆带来的价值
├── 连贯性：多轮对话保持上下文
├── 效率：减少重复沟通
├── 个性化：适应用户习惯和偏好
├── 知识积累：从交互中学习
└── 情感连接：记住用户的重要信息

记忆类型对比
├── 短期记忆（Short-term）
│   ├── 当前对话上下文
│   ├── 最近几次交互
│   └── 作用：保持当前任务连贯
├── 长期记忆（Long-term）
│   ├── 用户画像和偏好
│   ├── 历史交互记录
│   └── 作用：实现个性化服务
└── 外部记忆（External）
    ├── 知识库、文档
    ├── 数据库查询结果
    └── 作用：扩展 Agent 知识边界
```

### 1.2 记忆的核心挑战

```
记忆系统面临的挑战：

容量限制
├── 模型上下文窗口有限（4K-128K tokens）
├── 无法存储无限历史
└── 应对：选择性保留、摘要压缩

检索效率
├── 历史记录量大时检索慢
├── 相关记忆召回不准确
└── 应对：向量索引、分层检索

遗忘与更新
├── 旧信息可能过时
├── 新知识需要整合
└── 应对：时间衰减、增量更新

隐私安全
├── 敏感信息存储风险
├── 数据合规要求
└── 应对：加密存储、访问控制、数据脱敏
```

---

## 二、记忆类型与架构

### 2.1 分层记忆架构

```
Agent 记忆分层架构：

┌─────────────────────────────────────────┐
│           工作记忆（Working Memory）       │
│  当前对话 / 活跃上下文 / 临时变量           │
│  容量：~4K-8K tokens                     │
│  生命周期：单次会话                        │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│           短期记忆（Short-term Memory）    │
│  近期对话历史 / 会话摘要 / 任务状态         │
│  容量：~10-50 轮对话                      │
│  生命周期：数小时-数天                     │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│           长期记忆（Long-term Memory）     │
│  用户画像 / 偏好设置 / 重要事件             │
│  容量：理论上无限                         │
│  生命周期：永久（或用户删除）               │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│           外部记忆（External Memory）      │
│  知识库 / 文档 / 数据库 / 搜索引擎          │
│  容量：无限                               │
│  生命周期：独立管理                        │
└─────────────────────────────────────────┘

记忆流动：
工作记忆 → 摘要 → 短期记忆 → 提炼 → 长期记忆
              ↓
         遗忘/归档
```

### 2.2 记忆架构实现

```python
"""
Agent 记忆系统实现

分层记忆架构，支持多种存储后端
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from abc import ABC, abstractmethod
import json
import hashlib

@dataclass
class MemoryItem:
    """记忆条目"""
    id: str
    content: str
    memory_type: str  # working, short_term, long_term
    timestamp: datetime
    importance: float = 1.0  # 0-1，重要性评分
    access_count: int = 0
    last_accessed: datetime = None
    metadata: Dict = field(default_factory=dict)

    def __post_init__(self):
        if self.last_accessed is None:
            self.last_accessed = self.timestamp

class BaseMemoryStore(ABC):
    """记忆存储抽象基类"""

    @abstractmethod
    def add(self, item: MemoryItem):
        """添加记忆"""
        pass

    @abstractmethod
    def get(self, item_id: str) -> Optional[MemoryItem]:
        """获取记忆"""
        pass

    @abstractmethod
    def search(self, query: str, limit: int = 10) -> List[MemoryItem]:
        """搜索记忆"""
        pass

    @abstractmethod
    def delete(self, item_id: str):
        """删除记忆"""
        pass

class WorkingMemory:
    """工作记忆"""

    def __init__(self, max_tokens: int = 4000):
        """
        初始化工作记忆

        Args:
            max_tokens: 最大 token 容量
        """
        self.max_tokens = max_tokens
        self.items: List[MemoryItem] = []
        self.current_tokens = 0

    def add(self, content: str, metadata: Dict = None) -> MemoryItem:
        """
        添加工作记忆

        如果超出容量，移除最旧的条目
        """
        item = MemoryItem(
            id=self._generate_id(content),
            content=content,
            memory_type="working",
            timestamp=datetime.now(),
            metadata=metadata or {}
        )

        # 估算 token 数（简化：1 token ≈ 4 字符）
        content_tokens = len(content) // 4

        # 清理旧记忆以腾出空间
        while self.current_tokens + content_tokens > self.max_tokens and self.items:
            removed = self.items.pop(0)
            self.current_tokens -= len(removed.content) // 4

        self.items.append(item)
        self.current_tokens += content_tokens

        return item

    def get_context(self) -> str:
        """获取当前上下文"""
        return "\n".join([item.content for item in self.items])

    def clear(self):
        """清空工作记忆"""
        self.items.clear()
        self.current_tokens = 0

    def _generate_id(self, content: str) -> str:
        """生成记忆 ID"""
        return hashlib.md5(content.encode()).hexdigest()[:8]

class ShortTermMemory(BaseMemoryStore):
    """短期记忆"""

    def __init__(self, max_items: int = 100, ttl_hours: int = 24):
        """
        初始化短期记忆

        Args:
            max_items: 最大条目数
            ttl_hours: 生存时间（小时）
        """
        self.max_items = max_items
        self.ttl = timedelta(hours=ttl_hours)
        self.items: Dict[str, MemoryItem] = {}

    def add(self, item: MemoryItem):
        """添加短期记忆"""
        # 清理过期条目
        self._cleanup()

        # 如果超出容量，移除最久未访问的
        while len(self.items) >= self.max_items:
            oldest = min(self.items.values(), key=lambda x: x.last_accessed)
            del self.items[oldest.id]

        self.items[item.id] = item

    def get(self, item_id: str) -> Optional[MemoryItem]:
        """获取短期记忆"""
        item = self.items.get(item_id)

        if item:
            # 更新访问记录
            item.access_count += 1
            item.last_accessed = datetime.now()

        return item

    def search(self, query: str, limit: int = 10) -> List[MemoryItem]:
        """搜索短期记忆"""
        # 简化实现：关键词匹配
        results = []

        for item in self.items.values():
            if query.lower() in item.content.lower():
                results.append(item)

        # 按时间倒序
        results.sort(key=lambda x: x.timestamp, reverse=True)

        return results[:limit]

    def delete(self, item_id: str):
        """删除短期记忆"""
        self.items.pop(item_id, None)

    def _cleanup(self):
        """清理过期条目"""
        now = datetime.now()
        expired = [
            item_id for item_id, item in self.items.items()
            if now - item.timestamp > self.ttl
        ]

        for item_id in expired:
            del self.items[item_id]

class LongTermMemory(BaseMemoryStore):
    """长期记忆"""

    def __init__(self, vector_store=None):
        """
        初始化长期记忆

        Args:
            vector_store: 向量存储后端（用于语义检索）
        """
        self.items: Dict[str, MemoryItem] = {}
        self.vector_store = vector_store

    def add(self, item: MemoryItem):
        """添加长期记忆"""
        self.items[item.id] = item

        # 如果有向量存储，同时存入向量索引
        if self.vector_store:
            self.vector_store.add_texts(
                texts=[item.content],
                metadatas=[{
                    "id": item.id,
                    "timestamp": item.timestamp.isoformat(),
                    **item.metadata
                }]
            )

    def get(self, item_id: str) -> Optional[MemoryItem]:
        """获取长期记忆"""
        return self.items.get(item_id)

    def search(self, query: str, limit: int = 10) -> List[MemoryItem]:
        """搜索长期记忆"""
        if self.vector_store:
            # 使用向量检索
            results = self.vector_store.similarity_search(query, k=limit)

            memory_items = []
            for doc in results:
                item_id = doc.metadata.get("id")
                if item_id in self.items:
                    memory_items.append(self.items[item_id])

            return memory_items
        else:
            # 回退到关键词匹配
            results = []

            for item in self.items.values():
                if query.lower() in item.content.lower():
                    results.append(item)

            results.sort(key=lambda x: x.importance, reverse=True)

            return results[:limit]

    def delete(self, item_id: str):
        """删除长期记忆"""
        self.items.pop(item_id, None)

class MemoryManager:
    """记忆管理器"""

    def __init__(
        self,
        working_memory: WorkingMemory = None,
        short_term_memory: ShortTermMemory = None,
        long_term_memory: LongTermMemory = None
    ):
        """
        初始化记忆管理器

        Args:
            working_memory: 工作记忆
            short_term_memory: 短期记忆
            long_term_memory: 长期记忆
        """
        self.working = working_memory or WorkingMemory()
        self.short_term = short_term_memory or ShortTermMemory()
        self.long_term = long_term_memory or LongTermMemory()

    def add_interaction(self, role: str, content: str, importance: float = 1.0):
        """
        记录交互

        同时更新三层记忆
        """
        timestamp = datetime.now()

        # 1. 添加到工作记忆
        working_item = self.working.add(
            content=f"{role}: {content}",
            metadata={"role": role, "timestamp": timestamp.isoformat()}
        )

        # 2. 添加到短期记忆
        short_term_item = MemoryItem(
            id=working_item.id,
            content=content,
            memory_type="short_term",
            timestamp=timestamp,
            importance=importance,
            metadata={"role": role}
        )
        self.short_term.add(short_term_item)

        # 3. 如果重要性高，添加到长期记忆
        if importance > 0.7:
            long_term_item = MemoryItem(
                id=working_item.id,
                content=content,
                memory_type="long_term",
                timestamp=timestamp,
                importance=importance,
                metadata={"role": role}
            )
            self.long_term.add(long_term_item)

    def retrieve_relevant(
        self,
        query: str,
        memory_types: List[str] = None,
        limit: int = 10
    ) -> List[MemoryItem]:
        """
        检索相关记忆

        支持跨层检索
        """
        memory_types = memory_types or ["working", "short_term", "long_term"]
        results = []

        if "working" in memory_types:
            # 工作记忆：直接返回全部
            results.extend(self.working.items)

        if "short_term" in memory_types:
            # 短期记忆：关键词搜索
            results.extend(self.short_term.search(query, limit=limit))

        if "long_term" in memory_types:
            # 长期记忆：语义搜索
            results.extend(self.long_term.search(query, limit=limit))

        # 去重并排序
        seen = set()
        unique_results = []

        for item in results:
            if item.id not in seen:
                seen.add(item.id)
                unique_results.append(item)

        # 按相关性和重要性排序
        unique_results.sort(
            key=lambda x: (x.importance, x.last_accessed),
            reverse=True
        )

        return unique_results[:limit]

    def consolidate(self):
        """
        记忆巩固

        将短期记忆中的重要信息转移到长期记忆
        """
        for item in list(self.short_term.items.values()):
            # 如果访问频繁或重要性高，升级到长期记忆
            if item.access_count > 3 or item.importance > 0.8:
                long_term_item = MemoryItem(
                    id=item.id,
                    content=item.content,
                    memory_type="long_term",
                    timestamp=item.timestamp,
                    importance=item.importance,
                    access_count=item.access_count,
                    last_accessed=item.last_accessed,
                    metadata=item.metadata
                )
                self.long_term.add(long_term_item)

    def get_conversation_context(self, max_tokens: int = 2000) -> str:
        """获取对话上下文（用于 LLM 提示）"""
        # 优先使用工作记忆
        context = self.working.get_context()

        # 如果工作记忆不足，补充短期记忆
        if len(context) < max_tokens // 4:
            recent_items = sorted(
                self.short_term.items.values(),
                key=lambda x: x.timestamp,
                reverse=True
            )[:10]

            additional = "\n".join([item.content for item in recent_items])
            context = additional + "\n" + context

        return context

# 使用示例
"""
# 初始化记忆系统
memory = MemoryManager()

# 记录交互
memory.add_interaction("user", "我是做电商的，主要卖服装", importance=0.9)
memory.add_interaction("assistant", "了解了，您需要哪方面的帮助？", importance=0.3)
memory.add_interaction("user", "我想优化我的推荐系统", importance=0.8)

# 检索相关记忆
relevant = memory.retrieve_relevant("推荐系统优化")
for item in relevant:
    print(f"[{item.memory_type}] {item.content}")

# 获取对话上下文
context = memory.get_conversation_context()
"""
```

---

## 三、记忆压缩与摘要

### 3.1 对话摘要

```python
"""
对话摘要实现

将长对话压缩为简洁摘要，节省上下文空间
"""

from typing import List, Dict
from dataclasses import dataclass

@dataclass
class ConversationSummary:
    """对话摘要"""
    summary: str
    key_points: List[str]
    user_intents: List[str]
    action_items: List[str]
    timestamp: str

class ConversationSummarizer:
    """对话摘要器"""

    def __init__(self, llm_client):
        """
        初始化摘要器

        Args:
            llm_client: 大模型客户端
        """
        self.llm = llm_client

    def summarize(self, messages: List[Dict]) -> ConversationSummary:
        """
        生成对话摘要

        Args:
            messages: 消息列表，每项包含 role 和 content

        Returns:
            对话摘要
        """
        # 构建对话文本
        conversation_text = "\n".join([
            f"{msg['role']}: {msg['content']}"
            for msg in messages
        ])

        prompt = f"""
        请将以下对话总结为结构化摘要：

        {conversation_text}

        请输出 JSON 格式：
        {{
            "summary": "整体摘要（100字以内）",
            "key_points": ["关键信息1", "关键信息2"],
            "user_intents": ["用户意图1", "用户意图2"],
            "action_items": ["待办事项1", "待办事项2"]
        }}
        """

        response = self.llm.generate(prompt)

        try:
            import json
            data = json.loads(response)

            return ConversationSummary(
                summary=data.get("summary", ""),
                key_points=data.get("key_points", []),
                user_intents=data.get("user_intents", []),
                action_items=data.get("action_items", []),
                timestamp=datetime.now().isoformat()
            )
        except:
            # 解析失败，返回简单摘要
            return ConversationSummary(
                summary=conversation_text[:200] + "...",
                key_points=[],
                user_intents=[],
                action_items=[],
                timestamp=datetime.now().isoformat()
            )

    def incremental_summarize(
        self,
        previous_summary: ConversationSummary,
        new_messages: List[Dict]
    ) -> ConversationSummary:
        """
        增量摘要

        基于已有摘要，添加新消息的内容
        """
        new_text = "\n".join([
            f"{msg['role']}: {msg['content']}"
            for msg in new_messages
        ])

        prompt = f"""
        已有摘要：
        {previous_summary.summary}

        关键信息：
        {chr(10).join(previous_summary.key_points)}

        新对话：
        {new_text}

        请更新摘要，合并新旧信息，输出 JSON 格式。
        """

        response = self.llm.generate(prompt)

        try:
            import json
            data = json.loads(response)

            return ConversationSummary(
                summary=data.get("summary", previous_summary.summary),
                key_points=data.get("key_points", previous_summary.key_points),
                user_intents=data.get("user_intents", previous_summary.user_intents),
                action_items=data.get("action_items", previous_summary.action_items),
                timestamp=datetime.now().isoformat()
            )
        except:
            return previous_summary

# 使用示例
"""
summarizer = ConversationSummarizer(llm)

# 完整摘要
messages = [
    {"role": "user", "content": "我想做一个电商网站"},
    {"role": "assistant", "content": "好的，您需要什么功能？"},
    {"role": "user", "content": "需要商品展示、购物车和支付"}
]

summary = summarizer.summarize(messages)
print(f"摘要: {summary.summary}")
print(f"关键点: {summary.key_points}")

# 增量摘要
new_messages = [
    {"role": "user", "content": "还要加上用户评价功能"}
]
updated_summary = summarizer.incremental_summarize(summary, new_messages)
"""
```

### 3.2 记忆重要性评估

```python
"""
记忆重要性评估

自动判断记忆的重要程度，决定存储层级
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class ImportanceScore:
    """重要性评分"""
    semantic_importance: float  # 语义重要性
    emotional_weight: float     # 情感权重
    action_relevance: float     # 行动相关性
    recency_boost: float        # 时效性加成
    final_score: float          # 最终得分

class ImportanceEvaluator:
    """重要性评估器"""

    def __init__(self, llm_client):
        """
        初始化评估器

        Args:
            llm_client: 大模型客户端
        """
        self.llm = llm_client

    def evaluate(self, content: str, context: Dict = None) -> ImportanceScore:
        """
        评估记忆重要性

        多维度评分
        """
        # 1. 语义重要性（使用 LLM 评估）
        semantic = self._evaluate_semantic(content)

        # 2. 情感权重
        emotional = self._evaluate_emotional(content)

        # 3. 行动相关性
        action = self._evaluate_action_relevance(content)

        # 4. 时效性加成
        recency = context.get("recency_boost", 1.0) if context else 1.0

        # 计算最终得分
        final = (
            semantic * 0.4 +
            emotional * 0.2 +
            action * 0.3 +
            recency * 0.1
        )

        return ImportanceScore(
            semantic_importance=semantic,
            emotional_weight=emotional,
            action_relevance=action,
            recency_boost=recency,
            final_score=min(final, 1.0)
        )

    def _evaluate_semantic(self, content: str) -> float:
        """评估语义重要性"""
        prompt = f"""
        请评估以下信息的重要性（0-1）：

        信息：{content}

        评分标准：
        - 0.0-0.3：闲聊、无关紧要的问候
        - 0.3-0.6：一般信息、常规询问
        - 0.6-0.8：重要偏好、关键需求
        - 0.8-1.0：核心身份信息、重要决策

        只返回数字。
        """

        try:
            response = self.llm.generate(prompt)
            score = float(response.strip())
            return max(0.0, min(1.0, score))
        except:
            return 0.5

    def _evaluate_emotional(self, content: str) -> float:
        """评估情感权重"""
        # 情感关键词
        high_emotion = ["喜欢", "讨厌", "必须", "绝不", "重要", "紧急"]
        medium_emotion = ["希望", "想要", "觉得", "认为"]

        content_lower = content.lower()

        for word in high_emotion:
            if word in content_lower:
                return 0.8

        for word in medium_emotion:
            if word in content_lower:
                return 0.5

        return 0.3

    def _evaluate_action_relevance(self, content: str) -> float:
        """评估行动相关性"""
        # 行动关键词
        action_keywords = ["需要", "要", "做", "完成", "处理", "解决", "优化"]

        content_lower = content.lower()

        for word in action_keywords:
            if word in content_lower:
                return 0.7

        return 0.4

# 使用示例
"""
evaluator = ImportanceEvaluator(llm)

# 评估不同内容的重要性
contents = [
    "你好",
    "我是做电商的",
    "我的推荐系统转化率很低，需要优化",
    "我喜欢简洁的界面设计"
]

for content in contents:
    score = evaluator.evaluate(content)
    print(f"内容: {content}")
    print(f"重要性: {score.final_score:.2f}")
    print()
"""
```

---

## 四、记忆检索优化

### 4.1 分层检索策略

```python
"""
记忆检索优化

多层级、多策略的记忆检索
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class RetrievalResult:
    """检索结果"""
    item: MemoryItem
    relevance_score: float
    retrieval_method: str

class HierarchicalRetriever:
    """分层检索器"""

    def __init__(self, memory_manager: MemoryManager):
        """
        初始化分层检索器

        Args:
            memory_manager: 记忆管理器
        """
        self.memory = memory_manager

    def retrieve(
        self,
        query: str,
        context: Dict = None,
        max_results: int = 10
    ) -> List[RetrievalResult]:
        """
        分层检索

        按优先级逐层检索
        """
        results = []

        # 第一层：工作记忆（精确匹配）
        working_results = self._search_working_memory(query)
        results.extend(working_results)

        # 第二层：短期记忆（关键词匹配）
        if len(results) < max_results:
            short_term_results = self._search_short_term(query, max_results - len(results))
            results.extend(short_term_results)

        # 第三层：长期记忆（语义匹配）
        if len(results) < max_results:
            long_term_results = self._search_long_term(query, max_results - len(results))
            results.extend(long_term_results)

        # 排序和去重
        return self._rank_results(results)[:max_results]

    def _search_working_memory(self, query: str) -> List[RetrievalResult]:
        """搜索工作记忆"""
        results = []

        for item in self.memory.working.items:
            # 精确匹配或高相似度
            if query.lower() in item.content.lower():
                results.append(RetrievalResult(
                    item=item,
                    relevance_score=1.0,
                    retrieval_method="working_exact"
                ))

        return results

    def _search_short_term(self, query: str, limit: int) -> List[RetrievalResult]:
        """搜索短期记忆"""
        items = self.memory.short_term.search(query, limit=limit)

        results = []
        for item in items:
            # 计算相关性分数
            score = self._calculate_relevance(query, item.content)

            results.append(RetrievalResult(
                item=item,
                relevance_score=score,
                retrieval_method="short_term_keyword"
            ))

        return results

    def _search_long_term(self, query: str, limit: int) -> List[RetrievalResult]:
        """搜索长期记忆"""
        items = self.memory.long_term.search(query, limit=limit)

        results = []
        for item in items:
            score = self._calculate_relevance(query, item.content)

            # 长期记忆重要性加成
            score *= (0.5 + 0.5 * item.importance)

            results.append(RetrievalResult(
                item=item,
                relevance_score=score,
                retrieval_method="long_term_semantic"
            ))

        return results

    def _calculate_relevance(self, query: str, content: str) -> float:
        """计算相关性分数"""
        query_words = set(query.lower().split())
        content_words = set(content.lower().split())

        if not query_words:
            return 0.0

        # Jaccard 相似度
        intersection = query_words & content_words
        union = query_words | content_words

        return len(intersection) / len(union) if union else 0.0

    def _rank_results(self, results: List[RetrievalResult]) -> List[RetrievalResult]:
        """排序结果"""
        # 综合分数 = 相关性 * 重要性 * 时效性
        def score(result: RetrievalResult) -> float:
            item = result.item

            # 时效性衰减
            age = datetime.now() - item.timestamp
            recency_factor = max(0.5, 1.0 - age.days / 30)

            return result.relevance_score * item.importance * recency_factor

        results.sort(key=score, reverse=True)

        # 去重
        seen = set()
        unique = []

        for result in results:
            if result.item.id not in seen:
                seen.add(result.item.id)
                unique.append(result)

        return unique

# 使用示例
"""
retriever = HierarchicalRetriever(memory)

# 检索相关记忆
results = retriever.retrieve("推荐系统优化", max_results=5)

for result in results:
    print(f"[{result.retrieval_method}] 相关度: {result.relevance_score:.2f}")
    print(f"内容: {result.item.content}")
    print()
"""
```

---

## 五、AI 产品经理关注点

```
Memory 产品化要点：

记忆策略选择
├── 对话型产品
│   ├── 短期记忆为主（当前会话）
│   ├── 关键信息长期存储（用户偏好）
│   └── 上下文窗口管理（滑动窗口）
├── 任务型产品
│   ├── 任务状态记忆
│   ├── 中间结果缓存
│   └── 执行历史记录
├── 个性化产品
│   ├── 用户画像长期存储
│   ├── 行为模式学习
│   └── 兴趣偏好积累
└── 知识型产品
    ├── 外部知识库集成
    ├── 检索增强生成（RAG）
    └── 实时信息更新

隐私与合规
├── 数据收集 consent
│   ├── 明确告知用户记忆内容
│   ├── 提供关闭记忆选项
│   └── 敏感信息过滤
├── 数据存储安全
│   ├── 加密存储
│   ├── 访问控制
│   └── 定期审计
├── 数据删除权
│   ├── 用户可删除历史
│   ├── 自动过期机制
│   └── 彻底删除确认
└── 合规要求
    ├── GDPR（欧盟）
    ├── CCPA（加州）
    └── 中国个人信息保护法

用户体验设计
├── 记忆透明度
│   ├── 展示 Agent 记住了什么
│   ├── 允许用户查看和编辑
│   └── 记忆使用说明
├── 记忆控制
│   ├── 一键清除记忆
│   ├── 选择性删除
│   └── 记忆导出
└── 记忆反馈
    ├── "我记得您之前说过..."
    ├── "根据您的偏好..."
    └── 记忆使用提示

关键指标
├── 检索准确率
│   ├── Top-1 准确率 > 80%
│   └── Top-5 准确率 > 95%
├── 上下文保持
│   ├── 多轮对话连贯性评分
│   └── 指代消解准确率
├── 个性化效果
│   ├── 用户满意度提升
│   └── 重复询问率降低
└── 系统性能
    ├── 检索延迟 < 100ms
    ├── 存储成本增长可控
    └── 内存占用合理

优化方向
├── 记忆压缩
│   ├── 自动摘要
│   ├── 去重合并
│   └── 分层存储
├── 检索优化
│   ├── 向量索引优化
│   ├── 缓存策略
│   └── 预加载热点数据
└── 学习优化
    ├── 从用户反馈学习重要性
    ├── 自动更新用户画像
    └── 遗忘过时信息
```

---

## 六、产品设计模板

### 6.1 记忆策略 PRD 检查表

| 设计项   | 关键问题                                               | 输出物       |
| -------- | ------------------------------------------------------ | ------------ |
| 记忆范围 | Agent 需要记住用户、任务、偏好、历史结果中的哪些信息？ | 记忆类型清单 |
| 写入规则 | 什么信息自动写入，什么信息需要用户确认后写入？         | 写入策略表   |
| 检索策略 | 当前任务需要检索哪些层级的记忆？                       | 检索链路图   |
| 压缩策略 | 对话过长时如何摘要、裁剪和保留重点？                   | 摘要规则     |
| 遗忘机制 | 旧记忆何时过期、降权或删除？                           | 生命周期规则 |
| 用户控制 | 用户能否查看、编辑、删除、关闭记忆？                   | 记忆管理交互 |
| 合规安全 | 敏感信息如何识别、脱敏、加密和审计？                   | 合规控制清单 |

### 6.2 记忆条目字段建议

```json
{
  "memory_id": "mem_001",
  "user_id": "user_123",
  "scope": "user_profile",
  "type": "long_term",
  "content": "用户偏好简洁的周报摘要",
  "source": "conversation",
  "importance": 0.86,
  "confidence": 0.92,
  "created_at": "2026-06-05T10:00:00Z",
  "last_accessed_at": "2026-06-05T12:00:00Z",
  "expires_at": null,
  "permissions": ["owner_read", "owner_delete"],
  "metadata": {
    "topic": "输出偏好",
    "sensitivity": "low"
  }
}
```

---

## 七、常见误区

| 误区             | 问题                               | 正确做法                                        |
| ---------------- | ---------------------------------- | ----------------------------------------------- |
| 什么都记         | 存储成本高、隐私风险大、检索噪声多 | 只保存对后续任务有价值的信息                    |
| 只依赖上下文窗口 | 长对话容易丢失关键信息             | 使用摘要、短期记忆和长期记忆分层管理            |
| 长期记忆不更新   | 用户偏好变化后仍使用旧信息         | 引入时间衰减、冲突检测和用户确认                |
| 用户不可见记忆   | 容易造成不信任和合规风险           | 提供“Agent 记住了什么”的可视化管理入口          |
| 检索到就直接使用 | 旧记忆可能过期或不准确             | 使用 relevance、importance、confidence 综合判断 |

---

## 八、阶段验收标准

- [ ] 能画出工作记忆、短期记忆、长期记忆、外部记忆的分层架构
- [ ] 能为一个 Agent 产品定义记忆写入、检索、压缩、遗忘和删除规则
- [ ] 能设计用户可查看、可编辑、可删除的记忆管理体验
- [ ] 能识别敏感信息并设计脱敏、加密、授权和审计机制
- [ ] 能定义记忆系统指标，包括检索准确率、上下文连贯性、存储成本和隐私风险

---

## 九、版本记录

- **2026-06-05** 补充前置知识、能力对标、学习目标、产品设计模板、常见误区和阶段验收标准
- **2026-06-03** 初版完成，涵盖记忆类型、分层架构、记忆压缩、重要性评估、检索优化与产品关注点

---

## 十、参考资源

- [MemGPT](https://github.com/cpacker/MemGPT) - LLM 记忆管理系统
- [LangChain Memory](https://python.langchain.com/docs/modules/memory/) - LangChain 记忆模块
- [Vector Memory](https://www.pinecone.io/learn/vector-memory/) - 向量记忆实现
- [Conversational Memory](https://www.deeplearning.ai/the-batch/conversational-memory/) - 对话记忆设计
- [Long-term Memory for LLMs](https://arxiv.org/abs/2310.08560) - LLM 长期记忆研究
- [Memory in AI Agents](https://www.anthropic.com/research/memory) - Anthropic 记忆研究

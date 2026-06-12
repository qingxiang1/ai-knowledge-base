<!--
  创建时间: 2026-06-03
  文件名: Recall.md
  文件描述: RAG召回策略详解，补充企业级召回判断框架、查询治理与验收标准
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# 召回策略

> 召回（Recall）是 RAG 系统的核心环节，决定了系统能从知识库中找到多少相关信息。本章详解各类召回策略的原理、实现与优化方法。

---

## 零、前置知识

阅读本节前，建议先了解以下内容：

| 前置章节                                           | 关联点                                  |
| -------------------------------------------------- | --------------------------------------- |
| [RAG基础](./RAG基础.md)                            | 理解召回在 RAG 全链路中的位置——检索阶段 |
| [Embedding](./Embedding.md)                        | 向量召回依赖 Embedding 模型的质量       |
| [向量数据库](./向量数据库.md)                      | 召回的底层实现依赖向量数据库的检索能力  |
| [Embedding原理](../02-AI基础知识/Embedding原理.md) | 理解向量相似度计算的数学基础            |
| [Chunk策略](./Chunk策略.md)                        | 分块质量直接影响召回效果                |

**能力对标**：本章对应 [能力模型](../00-Roadmap/能力模型.md) 中「AI应用构建力 → 知识库构建能力」核心能力。掌握召回策略，意味着你不只会“搜一下文档”，而是能从覆盖率、延迟、成本和风险角度设计企业级检索入口。

---

## 一、召回概述

### 1.1 召回在 RAG 中的位置

```
RAG 系统架构中的召回环节：

用户查询
    ↓
查询理解（Query Understanding）
    ├── 意图识别
    ├── 实体提取
    └── 查询改写
    ↓
【召回阶段】（本章重点）
    ├── 向量召回（语义匹配）
    ├── 关键词召回（精确匹配）
    ├── 结构化召回（条件过滤）
    └── 多路召回融合
    ↓
重排序（Rerank）
    ↓
上下文组装（Context Assembly）
    ↓
大模型生成（Generation）
```

### 1.2 召回评估指标

```python
"""
召回阶段核心评估指标

注意：召回阶段的评估与最终 RAG 评估不同
"""

class RecallMetrics:
    """召回评估指标"""

    @staticmethod
    def recall_at_k(retrieved: list, relevant: list, k: int) -> float:
        """
        Recall@K：前 K 个结果中召回的相关文档比例

        Args:
            retrieved: 召回的文档 ID 列表（已按相关性排序）
            relevant: 所有相关文档 ID 集合
            k: 评估位置

        Returns:
            Recall@K 值
        """
        retrieved_k = set(retrieved[:k])
        relevant_set = set(relevant)

        if not relevant_set:
            return 0.0

        return len(retrieved_k & relevant_set) / len(relevant_set)

    @staticmethod
    def precision_at_k(retrieved: list, relevant: list, k: int) -> float:
        """
        Precision@K：前 K 个结果中相关文档的比例
        """
        retrieved_k = set(retrieved[:k])
        relevant_set = set(relevant)

        if not retrieved_k:
            return 0.0

        return len(retrieved_k & relevant_set) / len(retrieved_k)

    @staticmethod
    def mrr(retrieved: list, relevant: list) -> float:
        """
        MRR（Mean Reciprocal Rank）：第一个相关文档排名的倒数均值
        """
        relevant_set = set(relevant)

        for i, doc_id in enumerate(retrieved):
            if doc_id in relevant_set:
                return 1.0 / (i + 1)

        return 0.0

    @staticmethod
    def ndcg_at_k(retrieved: list, relevance_scores: dict, k: int) -> float:
        """
        NDCG@K：归一化折损累计增益

        考虑文档的相关性程度（不仅仅是二值相关）
        """
        import math

        def dcg(scores):
            return sum(
                (2 ** score - 1) / math.log2(i + 2)
                for i, score in enumerate(scores)
            )

        # 实际 DCG
        actual_scores = [relevance_scores.get(doc_id, 0) for doc_id in retrieved[:k]]
        actual_dcg = dcg(actual_scores)

        # 理想 DCG
        ideal_scores = sorted(relevance_scores.values(), reverse=True)[:k]
        ideal_dcg = dcg(ideal_scores)

        if ideal_dcg == 0:
            return 0.0

        return actual_dcg / ideal_dcg

# 使用示例
"""
metrics = RecallMetrics()

# 假设相关文档
true_relevant = ["doc_1", "doc_3", "doc_5", "doc_7"]

# 召回结果
retrieved_results = ["doc_1", "doc_2", "doc_3", "doc_4", "doc_5"]

# 计算指标
recall_5 = metrics.recall_at_k(retrieved_results, true_relevant, k=5)
precision_5 = metrics.precision_at_k(retrieved_results, true_relevant, k=5)
mrr_score = metrics.mrr(retrieved_results, true_relevant)

print(f"Recall@5: {recall_5:.2f}")      # 0.75 (3/4)
print(f"Precision@5: {precision_5:.2f}")  # 0.60 (3/5)
print(f"MRR: {mrr_score:.2f}")           # 1.0 (第一个相关文档在位置1)
"""
```

### 1.3 企业级召回的核心目标

企业级召回不是单纯追求“找得多”，而是同时追求以下 4 件事：

1. **把真正相关的内容尽量找出来**
2. **把明显不相关的噪声控制在可接受范围**
3. **在延迟预算内完成召回**
4. **为后续 Rerank 和生成留下足够好的候选集**

---

## 二、向量召回

### 2.1 稠密向量召回

```python
"""
稠密向量召回（Dense Retrieval）

基于 Embedding 的语义相似度搜索
"""

import numpy as np
from typing import List, Dict, Tuple

class DenseRetriever:
    """稠密向量召回器"""

    def __init__(
        self,
        embedding_model,
        vector_db_client,
        collection_name: str,
        top_k: int = 10
    ):
        """
        初始化稠密向量召回器

        Args:
            embedding_model: 向量化模型
            vector_db_client: 向量数据库客户端
            collection_name: 集合名称
            top_k: 默认召回数量
        """
        self.embedding_model = embedding_model
        self.vector_db = vector_db_client
        self.collection_name = collection_name
        self.top_k = top_k

    def embed_query(self, query: str) -> np.ndarray:
        """
        将查询文本转为向量

        Args:
            query: 查询文本

        Returns:
            查询向量
        """
        # 使用 Embedding 模型编码
        query_vector = self.embedding_model.encode(query)

        # 归一化（如果使用余弦相似度）
        query_vector = query_vector / np.linalg.norm(query_vector)

        return query_vector

    def retrieve(
        self,
        query: str,
        top_k: int = None,
        filters: Dict = None
    ) -> List[Dict]:
        """
        执行向量召回

        Args:
            query: 查询文本
            top_k: 召回数量
            filters: 过滤条件

        Returns:
            召回结果列表，每项包含 id、score、content
        """
        k = top_k or self.top_k

        # 1. 查询向量化
        query_vector = self.embed_query(query)

        # 2. 向量搜索
        results = self.vector_db.search(
            collection=self.collection_name,
            query_vector=query_vector,
            top_k=k,
            filters=filters
        )

        # 3. 格式化结果
        formatted_results = []
        for item in results:
            formatted_results.append({
                "id": item.get("id"),
                "score": item.get("distance"),  # 或 similarity
                "content": item.get("content"),
                "metadata": item.get("metadata", {})
            })

        return formatted_results

    def batch_retrieve(
        self,
        queries: List[str],
        top_k: int = None
    ) -> List[List[Dict]]:
        """
        批量召回

        适用于批量评估或批量处理
        """
        # 批量编码
        query_vectors = self.embedding_model.encode(queries)

        # 批量搜索
        all_results = []
        for query_vector in query_vectors:
            results = self.vector_db.search(
                collection=self.collection_name,
                query_vector=query_vector,
                top_k=top_k or self.top_k
            )
            all_results.append(results)

        return all_results

# 使用示例
"""
from sentence_transformers import SentenceTransformer

# 初始化组件
model = SentenceTransformer('BAAI/bge-large-zh-v1.5')
# vector_db = ...  # 已初始化的向量数据库客户端

retriever = DenseRetriever(
    embedding_model=model,
    vector_db_client=vector_db,
    collection_name="documents",
    top_k=10
)

# 单条召回
results = retriever.retrieve("人工智能的发展趋势", top_k=5)

# 批量召回
batch_results = retriever.batch_retrieve([
    "什么是机器学习",
    "深度学习框架对比",
    "自然语言处理应用"
])
"""
```

### 2.2 稀疏向量召回

```python
"""
稀疏向量召回（Sparse Retrieval）

基于词频的召回方法，如 BM25、TF-IDF
优势：精确匹配、可解释性强、无需训练
"""

from rank_bm25 import BM25Okapi
import jieba
from typing import List, Dict

class SparseRetriever:
    """稀疏向量召回器（BM25）"""

    def __init__(self, documents: List[Dict] = None):
        """
        初始化稀疏召回器

        Args:
            documents: 文档列表，每项包含 id 和 content
        """
        self.documents = documents or []
        self.bm25 = None
        self.tokenized_corpus = []

        if documents:
            self._build_index()

    def _tokenize(self, text: str) -> List[str]:
        """
        中文分词

        可根据需要替换为其他分词器
        """
        return list(jieba.cut(text))

    def _build_index(self):
        """构建 BM25 索引"""
        # 对文档进行分词
        self.tokenized_corpus = [
            self._tokenize(doc["content"])
            for doc in self.documents
        ]

        # 构建 BM25 索引
        self.bm25 = BM25Okapi(self.tokenized_corpus)

        print(f"BM25 索引构建完成，文档数: {len(self.documents)}")

    def add_documents(self, documents: List[Dict]):
        """
        增量添加文档

        注意：BM25 不支持增量更新，需要重建索引
        """
        self.documents.extend(documents)
        self._build_index()

    def retrieve(
        self,
        query: str,
        top_k: int = 10
    ) -> List[Dict]:
        """
        执行 BM25 召回

        Args:
            query: 查询文本
            top_k: 召回数量

        Returns:
            召回结果列表
        """
        if not self.bm25:
            raise ValueError("索引未构建，请先添加文档")

        # 查询分词
        tokenized_query = self._tokenize(query)

        # 计算 BM25 分数
        scores = self.bm25.get_scores(tokenized_query)

        # 获取 top_k 索引
        top_indices = scores.argsort()[-top_k:][::-1]

        # 格式化结果
        results = []
        for idx in top_indices:
            if scores[idx] > 0:  # 只返回有分数的
                results.append({
                    "id": self.documents[idx]["id"],
                    "score": float(scores[idx]),
                    "content": self.documents[idx]["content"],
                    "metadata": self.documents[idx].get("metadata", {})
                })

        return results

# 使用示例
"""
documents = [
    {"id": "doc_1", "content": "机器学习是人工智能的一个分支"},
    {"id": "doc_2", "content": "深度学习使用神经网络进行学习"},
    {"id": "doc_3", "content": "自然语言处理让计算机理解人类语言"}
]

# 初始化
sparse_retriever = SparseRetriever(documents)

# 召回
results = sparse_retriever.retrieve("什么是机器学习", top_k=3)

for result in results:
    print(f"ID: {result['id']}, Score: {result['score']:.2f}")
    print(f"Content: {result['content']}\n")
"""
```

---

## 三、多路召回

### 3.1 多路召回架构

```python
"""
多路召回（Multi-Channel Retrieval）

结合多种召回策略，提升覆盖率和准确率
"""

from typing import List, Dict, Callable
from dataclasses import dataclass
import numpy as np

@dataclass
class RecallResult:
    """召回结果"""
    id: str
    score: float
    channel: str  # 召回渠道
    content: str
    metadata: Dict

class MultiChannelRetriever:
    """多路召回器"""

    def __init__(self):
        """初始化多路召回器"""
        self.channels: Dict[str, Callable] = {}
        self.weights: Dict[str, float] = {}

    def add_channel(
        self,
        name: str,
        retriever: Callable,
        weight: float = 1.0
    ):
        """
        添加召回渠道

        Args:
            name: 渠道名称
            retriever: 召回函数，接收 query 和 top_k，返回结果列表
            weight: 渠道权重（用于融合）
        """
        self.channels[name] = retriever
        self.weights[name] = weight
        print(f"已添加召回渠道: {name} (weight={weight})")

    def retrieve(
        self,
        query: str,
        top_k: int = 10,
        channel_names: List[str] = None
    ) -> List[RecallResult]:
        """
        执行多路召回

        Args:
            query: 查询文本
            top_k: 每路召回数量
            channel_names: 指定使用的渠道（None=全部）

        Returns:
            合并后的召回结果
        """
        channels_to_use = channel_names or list(self.channels.keys())

        all_results = []
        for name in channels_to_use:
            if name not in self.channels:
                continue

            # 执行单路召回
            channel_results = self.channels[name](query, top_k)

            # 标记渠道
            for result in channel_results:
                all_results.append(RecallResult(
                    id=result["id"],
                    score=result["score"],
                    channel=name,
                    content=result.get("content", ""),
                    metadata=result.get("metadata", {})
                ))

        return all_results

    def retrieve_and_fuse(
        self,
        query: str,
        top_k: int = 10,
        fusion_method: str = "rrf"
    ) -> List[Dict]:
        """
        召回并融合结果

        Args:
            query: 查询文本
            top_k: 最终返回数量
            fusion_method: 融合方法（rrf/weighted/linear）

        Returns:
            融合后的结果
        """
        # 执行多路召回
        all_results = self.retrieve(query, top_k=top_k * 2)

        # 融合
        if fusion_method == "rrf":
            return self._rrf_fusion(all_results, top_k)
        elif fusion_method == "weighted":
            return self._weighted_fusion(all_results, top_k)
        else:
            return self._linear_fusion(all_results, top_k)

    def _rrf_fusion(
        self,
        results: List[RecallResult],
        top_k: int,
        k: int = 60
    ) -> List[Dict]:
        """
        RRF（Reciprocal Rank Fusion）融合

        无需调参，效果稳定
        """
        from collections import defaultdict

        # 按文档 ID 聚合排名
        doc_ranks = defaultdict(list)

        # 按渠道分组，计算排名
        channel_results = defaultdict(list)
        for r in results:
            channel_results[r.channel].append(r)

        for channel, channel_res in channel_results.items():
            # 按分数排序
            sorted_res = sorted(channel_res, key=lambda x: x.score, reverse=True)
            for rank, res in enumerate(sorted_res, 1):
                doc_ranks[res.id].append(rank)

        # 计算 RRF 分数
        rrf_scores = {}
        for doc_id, ranks in doc_ranks.items():
            rrf_scores[doc_id] = sum(1.0 / (k + rank) for rank in ranks)

        # 排序并返回
        sorted_docs = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

        # 获取文档详情
        doc_map = {r.id: r for r in results}

        final_results = []
        for doc_id, score in sorted_docs[:top_k]:
            r = doc_map[doc_id]
            final_results.append({
                "id": doc_id,
                "score": score,
                "content": r.content,
                "metadata": r.metadata,
                "sources": [r.channel for r in results if r.id == doc_id]
            })

        return final_results

    def _weighted_fusion(
        self,
        results: List[RecallResult],
        top_k: int
    ) -> List[Dict]:
        """加权分数融合"""
        from collections import defaultdict

        doc_scores = defaultdict(float)
        doc_map = {}

        for r in results:
            weight = self.weights.get(r.channel, 1.0)
            doc_scores[r.id] += r.score * weight
            doc_map[r.id] = r

        # 排序
        sorted_docs = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)

        final_results = []
        for doc_id, score in sorted_docs[:top_k]:
            r = doc_map[doc_id]
            final_results.append({
                "id": doc_id,
                "score": score,
                "content": r.content,
                "metadata": r.metadata
            })

        return final_results

    def _linear_fusion(
        self,
        results: List[RecallResult],
        top_k: int
    ) -> List[Dict]:
        """线性插值融合（需要归一化分数）"""
        # 按渠道归一化分数
        channel_scores = defaultdict(list)
        for r in results:
            channel_scores[r.channel].append(r)

        # 归一化
        normalized_results = []
        for channel, channel_res in channel_scores.items():
            scores = [r.score for r in channel_res]
            min_score, max_score = min(scores), max(scores)

            for r in channel_res:
                normalized_score = (r.score - min_score) / (max_score - min_score) if max_score > min_score else 0
                normalized_results.append(RecallResult(
                    id=r.id,
                    score=normalized_score,
                    channel=r.channel,
                    content=r.content,
                    metadata=r.metadata
                ))

        # 使用加权融合
        return self._weighted_fusion(normalized_results, top_k)

# 使用示例
"""
multi_retriever = MultiChannelRetriever()

# 添加稠密向量召回渠道
multi_retriever.add_channel(
    name="dense",
    retriever=lambda q, k: dense_retriever.retrieve(q, k),
    weight=1.0
)

# 添加稀疏向量召回渠道
multi_retriever.add_channel(
    name="sparse",
    retriever=lambda q, k: sparse_retriever.retrieve(q, k),
    weight=0.8
)

# 添加关键词匹配渠道
multi_retriever.add_channel(
    name="keyword",
    retriever=lambda q, k: keyword_retriever.retrieve(q, k),
    weight=0.6
)

# 多路召回并融合
results = multi_retriever.retrieve_and_fuse(
    query="人工智能应用",
    top_k=10,
    fusion_method="rrf"
)

for r in results:
    print(f"ID: {r['id']}, Score: {r['score']:.4f}")
    print(f"Sources: {r['sources']}")
    print(f"Content: {r['content'][:100]}...\n")
"""
```

### 3.2 查询改写与扩展

```python
"""
查询改写（Query Rewriting）

通过改写查询提升召回效果
"""

from typing import List
import openai

class QueryRewriter:
    """查询改写器"""

    def __init__(self, llm_client=None):
        """
        初始化查询改写器

        Args:
            llm_client: LLM 客户端，用于生成改写
        """
        self.llm = llm_client

    def expand_with_synonyms(
        self,
        query: str,
        synonym_dict: Dict[str, List[str]] = None
    ) -> List[str]:
        """
        同义词扩展

        将查询中的关键词替换为同义词，生成多个查询
        """
        if synonym_dict is None:
            # 默认同义词表
            synonym_dict = {
                "AI": ["人工智能", "Artificial Intelligence"],
                "ML": ["机器学习", "Machine Learning"],
                "NLP": ["自然语言处理"],
                "大模型": ["LLM", "大型语言模型", "Foundation Model"]
            }

        expanded_queries = [query]

        for term, synonyms in synonym_dict.items():
            if term in query:
                for synonym in synonyms:
                    new_query = query.replace(term, synonym)
                    if new_query not in expanded_queries:
                        expanded_queries.append(new_query)

        return expanded_queries

    def generate_hyde_query(
        self,
        query: str,
        num_hypothetical: int = 3
    ) -> List[str]:
        """
        HyDE（Hypothetical Document Embedding）

        生成假设文档，用假设文档的向量进行搜索
        """
        if not self.llm:
            raise ValueError("需要 LLM 客户端才能使用 HyDE")

        prompt = f"""
        基于以下查询，生成 {num_hypothetical} 个可能包含答案的文档片段。
        每个片段应简洁且信息丰富。

        查询：{query}

        文档片段：
        """

        response = self.llm.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )

        # 解析生成的文档
        hypothetical_docs = response.choices[0].message.content.strip().split("\n")
        hypothetical_docs = [doc.strip() for doc in hypothetical_docs if doc.strip()]

        return hypothetical_docs

    def decompose_query(
        self,
        query: str
    ) -> List[str]:
        """
        查询分解

        将复杂查询分解为多个子查询
        """
        if not self.llm:
            return [query]

        prompt = f"""
        将以下复杂查询分解为 2-4 个简单的子查询。
        每个子查询应独立且可回答。

        查询：{query}

        子查询（每行一个）：
        """

        response = self.llm.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )

        sub_queries = response.choices[0].message.content.strip().split("\n")
        sub_queries = [q.strip("- ").strip() for q in sub_queries if q.strip()]

        return sub_queries if sub_queries else [query]

    def rewrite_for_retrieval(
        self,
        query: str,
        strategy: str = "expansion"
    ) -> List[str]:
        """
        查询改写主入口

        Args:
            query: 原始查询
            strategy: 改写策略
                - expansion: 同义词扩展
                - hyde: 假设文档
                - decompose: 查询分解
        """
        if strategy == "expansion":
            return self.expand_with_synonyms(query)
        elif strategy == "hyde":
            return self.generate_hyde_query(query)
        elif strategy == "decompose":
            return self.decompose_query(query)
        else:
            return [query]

# 使用示例
"""
rewriter = QueryRewriter(llm_client=openai)

# 同义词扩展
expanded = rewriter.expand_with_synonyms("AI 大模型应用")
# 结果：["AI 大模型应用", "人工智能 大模型应用", "AI LLM应用", ...]

# HyDE
hypothetical_docs = rewriter.generate_hyde_query("什么是RAG？")
# 结果：["RAG是一种结合检索和生成的技术...", "检索增强生成（RAG）通过...", ...]

# 查询分解
sub_queries = rewriter.decompose_query("比较 Transformer 和 RNN 的优缺点")
# 结果：["Transformer 的优点是什么", "RNN 的优点是什么", ...]
"""
```

---

## 四、高级召回策略

### 4.1 上下文感知召回

```python
"""
上下文感知召回（Context-Aware Retrieval）

利用对话历史提升召回效果
"""

from typing import List, Dict

class ContextAwareRetriever:
    """上下文感知召回器"""

    def __init__(
        self,
        base_retriever,
        llm_client,
        max_history: int = 3
    ):
        """
        初始化上下文感知召回器

        Args:
            base_retriever: 基础召回器
            llm_client: LLM 客户端
            max_history: 最大历史轮数
        """
        self.retriever = base_retriever
        self.llm = llm_client
        self.max_history = max_history
        self.conversation_history: List[Dict] = []

    def add_to_history(self, role: str, content: str):
        """添加对话历史"""
        self.conversation_history.append({
            "role": role,
            "content": content
        })

        # 保持历史长度
        if len(self.conversation_history) > self.max_history * 2:
            self.conversation_history = self.conversation_history[-self.max_history * 2:]

    def rewrite_with_context(self, query: str) -> str:
        """
        基于对话历史改写查询
        """
        if not self.conversation_history:
            return query

        # 构建历史上下文
        history_text = "\n".join([
            f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['content']}"
            for msg in self.conversation_history[-self.max_history * 2:]
        ])

        prompt = f"""
        基于以下对话历史，理解用户的最新查询意图。
        如果查询包含指代或省略，请将其补充完整。
        只返回改写后的查询，不要解释。

        对话历史：
        {history_text}

        最新查询：{query}

        改写后的查询：
        """

        response = self.llm.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )

        rewritten = response.choices[0].message.content.strip()
        return rewritten if rewritten else query

    def retrieve(
        self,
        query: str,
        top_k: int = 10,
        use_context: bool = True
    ) -> List[Dict]:
        """
        上下文感知召回
        """
        # 改写查询
        if use_context and self.conversation_history:
            rewritten_query = self.rewrite_with_context(query)
            print(f"查询改写: '{query}' -> '{rewritten_query}'")
        else:
            rewritten_query = query

        # 执行召回
        results = self.retriever.retrieve(rewritten_query, top_k)

        # 添加到历史
        self.add_to_history("user", query)

        return results

# 使用示例
"""
context_retriever = ContextAwareRetriever(
    base_retriever=dense_retriever,
    llm_client=openai
)

# 第一轮
results = context_retriever.retrieve("什么是机器学习？", top_k=5)
context_retriever.add_to_history("assistant", "机器学习是...")

# 第二轮（包含指代）
results = context_retriever.retrieve("它有哪些应用场景？", top_k=5)
# 查询会被改写为："机器学习有哪些应用场景？"
"""
```

### 4.2 迭代召回

```python
"""
迭代召回（Iterative Retrieval）

多轮召回，逐步缩小搜索范围
"""

class IterativeRetriever:
    """迭代召回器"""

    def __init__(self, retriever, llm_client):
        """
        初始化迭代召回器

        Args:
            retriever: 基础召回器
            llm_client: LLM 客户端
        """
        self.retriever = retriever
        self.llm = llm_client

    def iterative_search(
        self,
        query: str,
        max_iterations: int = 3,
        initial_top_k: int = 20,
        refinement_top_k: int = 10
    ) -> List[Dict]:
        """
        迭代召回

        1. 初始召回大量结果
        2. 分析结果，提取关键信息
        3. 生成更精确的查询
        4. 重复直到满足条件

        Args:
            query: 初始查询
            max_iterations: 最大迭代次数
            initial_top_k: 初始召回数量
            refinement_top_k: 精化召回数量

        Returns:
            最终结果
        """
        current_query = query
        all_results = []

        for i in range(max_iterations):
            print(f"\n迭代 {i + 1}/{max_iterations}")
            print(f"当前查询: {current_query}")

            # 召回
            top_k = initial_top_k if i == 0 else refinement_top_k
            results = self.retriever.retrieve(current_query, top_k)

            if not results:
                break

            all_results.extend(results)

            # 检查是否足够相关
            if i < max_iterations - 1:
                # 生成下一步查询
                current_query = self._generate_next_query(
                    original_query=query,
                    current_results=results,
                    iteration=i
                )

        # 去重并排序
        final_results = self._deduplicate_and_rank(all_results)

        return final_results[:refinement_top_k]

    def _generate_next_query(
        self,
        original_query: str,
        current_results: List[Dict],
        iteration: int
    ) -> str:
        """
        生成下一步查询
        """
        # 提取当前结果的摘要
        contents = [r["content"][:200] for r in current_results[:5]]
        context = "\n".join([f"{i+1}. {c}" for i, c in enumerate(contents)])

        prompt = f"""
        原始查询：{original_query}

        已检索到的相关信息：
        {context}

        基于以上信息，生成一个更精确的查询，以找到更多相关内容。
        查询应简洁，不超过 20 个字。

        新查询：
        """

        response = self.llm.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )

        return response.choices[0].message.content.strip()

    def _deduplicate_and_rank(
        self,
        results: List[Dict]
    ) -> List[Dict]:
        """
        去重并排序
        """
        seen_ids = set()
        unique_results = []

        for r in results:
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                unique_results.append(r)

        # 按分数排序
        unique_results.sort(key=lambda x: x["score"], reverse=True)

        return unique_results

# 使用示例
"""
iterative = IterativeRetriever(
    retriever=multi_retriever,
    llm_client=openai
)

results = iterative.iterative_search(
    query="Transformer 架构详解",
    max_iterations=3,
    initial_top_k=20,
    refinement_top_k=10
)
"""
```

---

## 五、召回优化实践

### 5.1 性能优化

```
召回性能优化指南：

索引优化
├── 向量索引
│   ├── 选择合适的索引类型（HNSW/IVF）
│   ├── 调整索引参数（ef/M/nlist）
│   └── 定期重建索引（数据变化大时）
├── 关键词索引
│   ├── 使用倒排索引
│   ├── 分词器优化（领域词典）
│   └── 停用词过滤
└── 混合索引
    ├── 向量 + 关键词联合索引
    └── 分层索引（粗排 + 精排）

查询优化
├── 查询预处理
│   ├── 去除停用词
│   ├── 拼写纠错
│   └── 实体识别
├── 查询缓存
│   ├── 热门查询缓存
│   └── 向量缓存
└── 批量查询
    ├── 合并相似查询
    └── 并行处理

系统优化
├── 负载均衡
│   ├── 多副本部署
│   └── 请求分发
├── 预热机制
│   ├── 索引预热
│   └── 缓存预热
└── 监控告警
    ├── 召回延迟监控
    ├── 召回率监控
    └── 异常检测
```

### 5.2 效果优化

```python
"""
召回效果优化策略
"""

class RecallOptimizer:
    """召回优化器"""

    def __init__(self, retriever):
        self.retriever = retriever
        self.query_cache = {}

    def optimize_with_feedback(
        self,
        query: str,
        positive_ids: List[str],
        negative_ids: List[str]
    ):
        """
        基于反馈优化召回

        利用用户点击/标注数据优化
        """
        # 1. 获取正例向量
        positive_vectors = [
            self.retriever.get_vector(doc_id)
            for doc_id in positive_ids
        ]

        # 2. 计算正例中心
        centroid = np.mean(positive_vectors, axis=0)

        # 3. 调整查询向量（Rocchio 算法）
        original_vector = self.retriever.embed_query(query)

        alpha, beta, gamma = 1.0, 0.75, 0.15

        adjusted_vector = (
            alpha * original_vector +
            beta * centroid -
            gamma * np.mean([
                self.retriever.get_vector(doc_id)
                for doc_id in negative_ids
            ], axis=0)
        )

        # 4. 使用调整后的向量搜索
        return self.retriever.search_by_vector(adjusted_vector)

    def hard_negative_mining(
        self,
        query: str,
        positive_id: str,
        num_negatives: int = 5
    ) -> List[str]:
        """
        困难负样本挖掘

        找到与查询相似但不相关的文档，用于训练
        """
        # 1. 召回 top_k 结果
        results = self.retriever.retrieve(query, top_k=50)

        # 2. 排除正例，选择排名靠前但非正例的
        negatives = []
        for r in results:
            if r["id"] != positive_id and r["id"] not in negatives:
                negatives.append(r["id"])
            if len(negatives) >= num_negatives:
                break

        return negatives

# 使用示例
"""
optimizer = RecallOptimizer(dense_retriever)

# 基于反馈优化
results = optimizer.optimize_with_feedback(
    query="机器学习算法",
    positive_ids=["doc_1", "doc_3"],  # 用户认为相关的
    negative_ids=["doc_2"]            # 用户认为不相关的
)

# 困难负样本挖掘
hard_negatives = optimizer.hard_negative_mining(
    query="深度学习",
    positive_id="doc_1",
    num_negatives=5
)
"""
```

---

## 六、AI产品经理关注点

### 6.1 企业级召回判断框架

#### 6.1.1 设计召回策略前至少要回答 5 个问题

| 问题                   | 说明                                 |
| ---------------------- | ------------------------------------ |
| 知识规模有多大         | 不同规模对应不同召回架构             |
| 查询表达是否稳定       | 表达越多样，越需要查询改写和多路召回 |
| 业务更重命中率还是延迟 | 决定是否采用复杂融合                 |
| 是否存在权限与过滤条件 | 召回必须支持 metadata 过滤           |
| 下游是否有 Rerank      | 有精排时可适当放大召回候选集         |

#### 6.1.2 常见企业级召回策略组合

| 场景                 | 推荐策略                                |
| -------------------- | --------------------------------------- |
| **小规模知识库**     | 稠密召回为主，必要时补 BM25             |
| **中规模知识库**     | 稠密 + 稀疏多路召回 + 融合              |
| **大规模复杂知识库** | 多路召回 + 查询改写 + 分层检索 + Rerank |
| **高权限隔离场景**   | 先过滤再召回，确保结果天然合规          |

### 6.2 核心指标

| 指标           | 关注点                             |
| -------------- | ---------------------------------- |
| **Recall@K**   | 关键相关文档是否被找回             |
| **P99 延迟**   | 是否满足产品响应要求               |
| **覆盖率**     | 用户问题是否大多有候选结果         |
| **结果多样性** | 是否避免 Top 结果过度同质化        |
| **过滤命中率** | 权限、时间、部门等过滤是否正确生效 |

### 6.3 查询治理与召回治理重点

1. **查询治理**：意图识别、实体抽取、改写、扩展、去歧义
2. **索引治理**：分块质量、Embedding 质量、metadata 完整性
3. **融合治理**：RRF、加权融合、渠道权重的定期校准
4. **Bad Case治理**：维护“明明有答案却没召回”的失败样本集

### 6.4 常见失败模式

| 失败模式           | 典型表现              | 优先排查方向                      |
| ------------------ | --------------------- | --------------------------------- |
| 召回不到答案       | 有答案但 Top-K 没命中 | Chunk、Embedding、top_k、查询改写 |
| 召回太多噪声       | 候选很多但不相关      | 融合方式、过滤条件、索引质量      |
| 查询歧义导致误召回 | 同词不同义、简称混淆  | 查询理解、实体链接、词典治理      |
| 权限过滤失效       | 命中不该看的内容      | metadata、访问控制、过滤顺序      |

---

## 七、企业级验收标准

### 7.1 学完本章后至少应做到

- [ ] 能解释稠密召回、稀疏召回、多路召回各自的作用和边界
- [ ] 能根据知识规模、延迟要求和精度要求初步选择召回策略
- [ ] 能理解 Recall@K、P99 延迟、覆盖率等核心指标的业务意义
- [ ] 能识别查询改写、索引质量、过滤条件对召回结果的影响

### 7.2 进阶标准

- [ ] 能为一个真实业务场景设计多路召回与融合策略
- [ ] 能建立查询治理、召回评测和 Bad Case 复盘闭环
- [ ] 能把权限过滤、召回候选集和下游 Rerank 联动起来做整体优化

---

## 八、延伸阅读与参考资源

### 相关章节

| 章节                                               | 关联说明                         |
| -------------------------------------------------- | -------------------------------- |
| [Rerank](./Rerank.md)                              | 召回后的精排环节，提升检索精度   |
| [HybridSearch](./HybridSearch.md)                  | 多路召回的融合策略和混合检索实现 |
| [Embedding](./Embedding.md)                        | 向量召回依赖 Embedding 模型质量  |
| [向量数据库](./向量数据库.md)                      | 召回的底层实现依赖向量数据库     |
| [企业知识库设计](./企业知识库设计.md)              | 企业级召回策略和性能优化         |
| [RAG基础](./RAG基础.md)                            | 召回在 RAG 全链路中的位置        |
| [Embedding原理](../02-AI基础知识/Embedding原理.md) | 向量相似度计算的数学基础         |

### 外部资源

- [Dense Passage Retrieval](https://arxiv.org/abs/2004.04906) - Facebook 稠密检索论文
- [Reciprocal Rank Fusion](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf) - RRF 论文
- [HyDE: Hypothetical Document Embeddings](https://arxiv.org/abs/2212.10496) - HyDE 论文
- [LangChain Retrievers](https://python.langchain.com/docs/modules/data_connection/retrievers/) - LangChain 召回器实现
- [LlamaIndex Retrievers](https://docs.llamaindex.ai/en/stable/module_guides/querying/retriever/) - LlamaIndex 召回器实现

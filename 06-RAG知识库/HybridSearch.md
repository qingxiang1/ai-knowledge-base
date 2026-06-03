<!--
  文件描述: RAG混合搜索详解，涵盖稠密+稀疏向量融合、多路召回融合、查询改写与重排序的完整链路
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# 混合搜索（Hybrid Search）

> 混合搜索是 RAG 系统的核心检索范式，通过融合多种检索策略（稠密向量、稀疏向量、关键词、知识图谱等），在召回率和精确率之间取得最佳平衡。

---

## 一、混合搜索概述

### 1.1 为什么需要混合搜索

```
单一检索方法的局限：

稠密向量检索（Dense Retrieval）
├── 优势：语义理解强，能处理同义词、近义词
│   └── "苹果"（水果）和 "apple" 语义相近
├── 劣势：对罕见词、专有名词、ID 不敏感
│   └── "GPT-4" 的精确匹配能力弱
└── 典型问题：丢失关键词精确匹配能力

稀疏向量检索（Sparse Retrieval）
├── 优势：关键词匹配精确，可解释性强
│   └── "GPT-4" 能精确匹配包含该词的文档
├── 劣势：无法理解语义相似性
│   └── "怎么学 Python" 和 "Python 入门指南" 匹配度低
└── 典型问题：语义鸿沟

关键词检索（Keyword Search）
├── 优势：简单高效，精确匹配
├── 劣势：无语义理解能力
└── 典型问题：同义词、多义词处理差

混合搜索的价值
├── 互补性：各种方法互相补充弱点
├── 鲁棒性：单一方法失效时仍有保底
├── 全面性：覆盖更多相关文档
└── 精确性：通过融合提升排序质量
```

### 1.2 混合搜索架构

```
混合搜索典型架构：

用户查询
    ↓
查询理解 & 改写
    ├── 查询扩展（同义词、相关词）
    ├── 查询分解（复杂查询拆分子查询）
    └── HyDE（假设文档生成）
    ↓
多路并行召回
    ├── 稠密向量召回 → Top K1
    ├── 稀疏向量召回 → Top K2
    ├── 关键词/BM25 召回 → Top K3
    └── 知识图谱召回 → Top K4（可选）
    ↓
结果融合（Fusion）
    ├── RRF（Reciprocal Rank Fusion）
    ├── 加权分数融合
    └── 机器学习排序（LTR）
    ↓
重排序（Rerank）
    ├── 交叉编码器重排序
    └── LLM 重排序（可选）
    ↓
Top K 结果 → 大模型生成
```

---

## 二、稠密 + 稀疏混合搜索

### 2.1 原理与实现

```python
"""
稠密 + 稀疏混合搜索实现

结合稠密向量（语义匹配）和稀疏向量（关键词匹配）的优势
"""

import numpy as np
from typing import List, Dict, Tuple
from dataclasses import dataclass

@dataclass
class SearchResult:
    """搜索结果"""
    doc_id: str
    content: str
    dense_score: float = 0.0
    sparse_score: float = 0.0
    hybrid_score: float = 0.0
    metadata: Dict = None

class HybridSearcher:
    """混合搜索器"""
    
    def __init__(
        self,
        dense_index,
        sparse_index,
        alpha: float = 0.7
    ):
        """
        初始化混合搜索器
        
        Args:
            dense_index: 稠密向量索引（如 FAISS、Milvus）
            sparse_index: 稀疏向量索引（如 BM25、SPLADE）
            alpha: 稠密向量权重（0-1），默认 0.7
        """
        self.dense_index = dense_index
        self.sparse_index = sparse_index
        self.alpha = alpha
    
    def search(
        self,
        query: str,
        query_embedding: np.ndarray,
        top_k: int = 10
    ) -> List[SearchResult]:
        """
        执行混合搜索
        
        Args:
            query: 查询文本
            query_embedding: 查询的稠密向量
            top_k: 返回结果数量
        
        Returns:
            混合搜索结果列表
        """
        # 1. 稠密向量搜索
        dense_results = self._dense_search(query_embedding, top_k * 2)
        
        # 2. 稀疏向量搜索
        sparse_results = self._sparse_search(query, top_k * 2)
        
        # 3. 融合结果
        fused_results = self._fuse_results(
            dense_results,
            sparse_results,
            top_k
        )
        
        return fused_results
    
    def _dense_search(
        self,
        query_embedding: np.ndarray,
        top_k: int
    ) -> Dict[str, float]:
        """
        稠密向量搜索
        
        Returns:
            {doc_id: score} 映射
        """
        # 使用向量索引搜索
        distances, indices = self.dense_index.search(
            query_embedding.reshape(1, -1),
            top_k
        )
        
        results = {}
        for idx, dist in zip(indices[0], distances[0]):
            # 距离转相似度（假设使用余弦相似度）
            score = 1.0 / (1.0 + dist)
            doc_id = self._get_doc_id_by_index(int(idx))
            results[doc_id] = score
        
        return results
    
    def _sparse_search(
        self,
        query: str,
        top_k: int
    ) -> Dict[str, float]:
        """
        稀疏向量搜索（BM25 或 SPLADE）
        
        Returns:
            {doc_id: score} 映射
        """
        # 使用稀疏索引搜索
        results = self.sparse_index.search(query, top_k=top_k)
        
        return {r["id"]: r["score"] for r in results}
    
    def _fuse_results(
        self,
        dense_results: Dict[str, float],
        sparse_results: Dict[str, float],
        top_k: int
    ) -> List[SearchResult]:
        """
        融合稠密和稀疏搜索结果
        
        使用加权分数融合
        """
        # 归一化分数
        dense_norm = self._normalize_scores(dense_results)
        sparse_norm = self._normalize_scores(sparse_results)
        
        # 获取所有文档 ID
        all_doc_ids = set(dense_norm.keys()) | set(sparse_norm.keys())
        
        # 计算混合分数
        fused = []
        for doc_id in all_doc_ids:
            d_score = dense_norm.get(doc_id, 0.0)
            s_score = sparse_norm.get(doc_id, 0.0)
            
            # 加权融合
            hybrid_score = self.alpha * d_score + (1 - self.alpha) * s_score
            
            fused.append(SearchResult(
                doc_id=doc_id,
                content=self._get_doc_content(doc_id),
                dense_score=d_score,
                sparse_score=s_score,
                hybrid_score=hybrid_score,
                metadata=self._get_doc_metadata(doc_id)
            ))
        
        # 按混合分数排序
        fused.sort(key=lambda x: x.hybrid_score, reverse=True)
        
        return fused[:top_k]
    
    def _normalize_scores(
        self,
        scores: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Min-Max 归一化分数到 [0, 1]
        """
        if not scores:
            return {}
        
        min_score = min(scores.values())
        max_score = max(scores.values())
        
        if max_score == min_score:
            return {k: 1.0 for k in scores}
        
        return {
            k: (v - min_score) / (max_score - min_score)
            for k, v in scores.items()
        }
    
    def _get_doc_id_by_index(self, index: int) -> str:
        """通过索引获取文档 ID"""
        # 实际实现中需要维护 id 映射
        return f"doc_{index}"
    
    def _get_doc_content(self, doc_id: str) -> str:
        """获取文档内容"""
        # 实际实现中从数据库获取
        return ""
    
    def _get_doc_metadata(self, doc_id: str) -> Dict:
        """获取文档元数据"""
        return {}

# 使用示例
"""
# 初始化索引（示例）
dense_index = faiss.IndexFlatIP(768)  # 内积索引
sparse_index = BM25Index(corpus)

# 创建混合搜索器
hybrid = HybridSearcher(
    dense_index=dense_index,
    sparse_index=sparse_index,
    alpha=0.7  # 70% 稠密，30% 稀疏
)

# 执行搜索
results = hybrid.search(
    query="Python 异步编程最佳实践",
    query_embedding=embedding_model.encode("Python 异步编程最佳实践"),
    top_k=10
)

for r in results:
    print(f"ID: {r.doc_id}")
    print(f"Dense: {r.dense_score:.4f}, Sparse: {r.sparse_score:.4f}")
    print(f"Hybrid: {r.hybrid_score:.4f}")
    print(f"Content: {r.content[:100]}...\n")
"""
```

### 2.2 RRF 融合方法

```python
"""
RRF（Reciprocal Rank Fusion）融合

无需调参的融合方法，对排名进行融合而非分数
"""

from collections import defaultdict

class RRFHybridSearcher(HybridSearcher):
    """基于 RRF 的混合搜索器"""
    
    def __init__(
        self,
        dense_index,
        sparse_index,
        k: int = 60
    ):
        """
        初始化 RRF 混合搜索器
        
        Args:
            k: RRF 常数，通常取 60
        """
        super().__init__(dense_index, sparse_index, alpha=0.5)
        self.k = k
    
    def search(
        self,
        query: str,
        query_embedding: np.ndarray,
        top_k: int = 10
    ) -> List[SearchResult]:
        """
        使用 RRF 进行混合搜索
        """
        # 1. 获取排名列表（而非分数）
        dense_ranking = self._dense_ranking(query_embedding, top_k * 3)
        sparse_ranking = self._sparse_ranking(query, top_k * 3)
        
        # 2. RRF 融合
        rrf_scores = self._rrf_fuse(dense_ranking, sparse_ranking)
        
        # 3. 组装结果
        results = []
        for doc_id, score in sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]:
            results.append(SearchResult(
                doc_id=doc_id,
                content=self._get_doc_content(doc_id),
                hybrid_score=score,
                metadata=self._get_doc_metadata(doc_id)
            ))
        
        return results
    
    def _dense_ranking(
        self,
        query_embedding: np.ndarray,
        top_k: int
    ) -> List[str]:
        """
        获取稠密向量搜索的排名列表
        
        Returns:
            按相关性排序的 doc_id 列表
        """
        distances, indices = self.dense_index.search(
            query_embedding.reshape(1, -1),
            top_k
        )
        
        return [self._get_doc_id_by_index(int(idx)) for idx in indices[0]]
    
    def _sparse_ranking(
        self,
        query: str,
        top_k: int
    ) -> List[str]:
        """
        获取稀疏向量搜索的排名列表
        
        Returns:
            按相关性排序的 doc_id 列表
        """
        results = self.sparse_index.search(query, top_k=top_k)
        return [r["id"] for r in results]
    
    def _rrf_fuse(
        self,
        *rankings: List[str]
    ) -> Dict[str, float]:
        """
        RRF 融合多个排名列表
        
        score = Σ(1 / (k + rank))
        """
        doc_scores = defaultdict(float)
        
        for ranking in rankings:
            for rank, doc_id in enumerate(ranking, start=1):
                doc_scores[doc_id] += 1.0 / (self.k + rank)
        
        return dict(doc_scores)

# 使用示例
"""
rrf_searcher = RRFHybridSearcher(
    dense_index=dense_index,
    sparse_index=sparse_index,
    k=60
)

results = rrf_searcher.search(
    query="Python 异步编程",
    query_embedding=embedding,
    top_k=10
)
"""
```

---

## 三、多路召回融合

### 3.1 多路召回架构

```python
"""
多路召回融合实现

支持任意数量的召回渠道，灵活配置权重和融合策略
"""

from typing import Callable, Any
from enum import Enum

class FusionMethod(Enum):
    """融合方法枚举"""
    RRF = "rrf"
    WEIGHTED = "weighted"
    LINEAR = "linear"
    MAX = "max"

class MultiChannelHybridSearcher:
    """多路混合搜索器"""
    
    def __init__(self):
        """初始化多路混合搜索器"""
        self.channels: Dict[str, Dict] = {}
    
    def add_channel(
        self,
        name: str,
        retriever: Callable[[str], List[Dict]],
        weight: float = 1.0,
        channel_type: str = "dense"
    ):
        """
        添加召回渠道
        
        Args:
            name: 渠道名称
            retriever: 召回函数，接收 query 返回结果列表
            weight: 渠道权重
            channel_type: 渠道类型（dense/sparse/keyword/kg）
        """
        self.channels[name] = {
            "retriever": retriever,
            "weight": weight,
            "type": channel_type
        }
        
        print(f"已添加召回渠道: {name} (类型: {channel_type}, 权重: {weight})")
    
    def search(
        self,
        query: str,
        top_k: int = 10,
        fusion_method: FusionMethod = FusionMethod.RRF,
        return_channel_details: bool = False
    ) -> List[Dict]:
        """
        执行多路混合搜索
        
        Args:
            query: 查询文本
            top_k: 返回结果数量
            fusion_method: 融合方法
            return_channel_details: 是否返回各渠道得分详情
        
        Returns:
            融合后的搜索结果
        """
        # 1. 多路并行召回
        channel_results = {}
        for name, config in self.channels.items():
            try:
                results = config["retriever"](query)
                channel_results[name] = results
                print(f"渠道 {name} 召回 {len(results)} 条结果")
            except Exception as e:
                print(f"渠道 {name} 召回失败: {e}")
                channel_results[name] = []
        
        # 2. 融合结果
        if fusion_method == FusionMethod.RRF:
            fused = self._fuse_rrf(channel_results, top_k)
        elif fusion_method == FusionMethod.WEIGHTED:
            fused = self._fuse_weighted(channel_results, top_k)
        elif fusion_method == FusionMethod.MAX:
            fused = self._fuse_max(channel_results, top_k)
        else:
            fused = self._fuse_linear(channel_results, top_k)
        
        # 3. 添加渠道详情（可选）
        if return_channel_details:
            for item in fused:
                item["channel_scores"] = {
                    name: self._get_doc_score(name, item["id"], channel_results)
                    for name in self.channels.keys()
                }
        
        return fused
    
    def _fuse_rrf(
        self,
        channel_results: Dict[str, List[Dict]],
        top_k: int,
        k: int = 60
    ) -> List[Dict]:
        """
        RRF 融合
        """
        doc_ranks = defaultdict(list)
        doc_data = {}
        
        for channel_name, results in channel_results.items():
            for rank, result in enumerate(results, start=1):
                doc_id = result["id"]
                doc_ranks[doc_id].append(rank)
                if doc_id not in doc_data:
                    doc_data[doc_id] = result
        
        # 计算 RRF 分数
        rrf_scores = {}
        for doc_id, ranks in doc_ranks.items():
            score = sum(1.0 / (k + rank) for rank in ranks)
            rrf_scores[doc_id] = score
        
        # 排序
        sorted_docs = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {
                "id": doc_id,
                "score": score,
                "content": doc_data[doc_id].get("content", ""),
                "metadata": doc_data[doc_id].get("metadata", {}),
                "sources": [
                    name for name, results in channel_results.items()
                    if any(r["id"] == doc_id for r in results)
                ]
            }
            for doc_id, score in sorted_docs[:top_k]
        ]
    
    def _fuse_weighted(
        self,
        channel_results: Dict[str, List[Dict]],
        top_k: int
    ) -> List[Dict]:
        """
        加权分数融合
        """
        doc_scores = defaultdict(float)
        doc_data = {}
        
        for channel_name, results in channel_results.items():
            weight = self.channels[channel_name]["weight"]
            
            # 归一化该渠道的分数
            scores = [r.get("score", 0) for r in results]
            if scores:
                min_s, max_s = min(scores), max(scores)
                score_range = max_s - min_s if max_s != min_s else 1
            else:
                score_range = 1
            
            for result in results:
                doc_id = result["id"]
                normalized_score = (result.get("score", 0) - min_s) / score_range if score_range else 0
                doc_scores[doc_id] += weight * normalized_score
                
                if doc_id not in doc_data:
                    doc_data[doc_id] = result
        
        sorted_docs = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {
                "id": doc_id,
                "score": score,
                "content": doc_data[doc_id].get("content", ""),
                "metadata": doc_data[doc_id].get("metadata", {})
            }
            for doc_id, score in sorted_docs[:top_k]
        ]
    
    def _fuse_max(
        self,
        channel_results: Dict[str, List[Dict]],
        top_k: int
    ) -> List[Dict]:
        """
        取最大分数融合
        """
        doc_max_scores = {}
        doc_data = {}
        
        for channel_name, results in channel_results.items():
            for result in results:
                doc_id = result["id"]
                score = result.get("score", 0)
                
                if doc_id not in doc_max_scores or score > doc_max_scores[doc_id]:
                    doc_max_scores[doc_id] = score
                    doc_data[doc_id] = result
        
        sorted_docs = sorted(doc_max_scores.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {
                "id": doc_id,
                "score": score,
                "content": doc_data[doc_id].get("content", ""),
                "metadata": doc_data[doc_id].get("metadata", {})
            }
            for doc_id, score in sorted_docs[:top_k]
        ]
    
    def _fuse_linear(
        self,
        channel_results: Dict[str, List[Dict]],
        top_k: int
    ) -> List[Dict]:
        """
        线性融合（简单求和）
        """
        return self._fuse_weighted(channel_results, top_k)
    
    def _get_doc_score(
        self,
        channel_name: str,
        doc_id: str,
        channel_results: Dict[str, List[Dict]]
    ) -> float:
        """获取文档在指定渠道的分数"""
        for result in channel_results.get(channel_name, []):
            if result["id"] == doc_id:
                return result.get("score", 0)
        return 0.0

# 使用示例
"""
# 创建多路搜索器
searcher = MultiChannelHybridSearcher()

# 添加稠密向量召回渠道
def dense_retriever(query: str) -> List[Dict]:
    embedding = dense_model.encode(query)
    return dense_vector_search(embedding, top_k=50)

searcher.add_channel(
    name="dense_vector",
    retriever=dense_retriever,
    weight=1.0,
    channel_type="dense"
)

# 添加稀疏向量召回渠道
def sparse_retriever(query: str) -> List[Dict]:
    return bm25_search(query, top_k=50)

searcher.add_channel(
    name="sparse_bm25",
    retriever=sparse_retriever,
    weight=0.8,
    channel_type="sparse"
)

# 添加关键词召回渠道
def keyword_retriever(query: str) -> List[Dict]:
    return keyword_search(query, top_k=30)

searcher.add_channel(
    name="keyword",
    retriever=keyword_retriever,
    weight=0.5,
    channel_type="keyword"
)

# 执行混合搜索
results = searcher.search(
    query="Python 异步编程",
    top_k=10,
    fusion_method=FusionMethod.RRF,
    return_channel_details=True
)

for r in results:
    print(f"ID: {r['id']}, Score: {r['score']:.4f}")
    print(f"Sources: {r['sources']}")
    print(f"Channel Scores: {r.get('channel_scores', {})}")
"""
```

---

## 四、查询改写增强

### 4.1 查询扩展与分解

```python
"""
查询改写增强模块

通过查询扩展、分解、HyDE 等方法提升召回质量
"""

import openai
from typing import List

class QueryEnhancer:
    """查询增强器"""
    
    def __init__(self, llm_client=None):
        """
        初始化查询增强器
        
        Args:
            llm_client: LLM 客户端（用于生成改写）
        """
        self.llm = llm_client or openai.OpenAI()
    
    def expand_query(
        self,
        query: str,
        method: str = "synonym"
    ) -> List[str]:
        """
        查询扩展
        
        Args:
            query: 原始查询
            method: 扩展方法（synonym/llm/hyde）
        
        Returns:
            扩展后的查询列表
        """
        if method == "synonym":
            return self._synonym_expansion(query)
        elif method == "llm":
            return self._llm_expansion(query)
        elif method == "hyde":
            return self._hyde_expansion(query)
        else:
            return [query]
    
    def _synonym_expansion(self, query: str) -> List[str]:
        """
        基于同义词的查询扩展
        
        使用预定义的同义词词典
        """
        # 简化的同义词映射
        synonyms = {
            "Python": ["Python", "Py", "python编程"],
            "学习": ["学习", "入门", "教程", "掌握"],
            "异步": ["异步", "async", "并发", "非阻塞"],
            "编程": ["编程", "开发", "写代码", "程序设计"]
        }
        
        expanded = [query]
        
        # 为查询中的关键词添加同义词变体
        for word, syns in synonyms.items():
            if word in query:
                for syn in syns:
                    if syn != word:
                        variant = query.replace(word, syn)
                        if variant not in expanded:
                            expanded.append(variant)
        
        return expanded
    
    def _llm_expansion(self, query: str, num_variants: int = 3) -> List[str]:
        """
        使用 LLM 生成查询变体
        """
        prompt = f"""
        请为以下查询生成 {num_variants} 个语义等价但表达方式不同的变体。
        保持查询意图不变，使用不同的词汇和句式。
        
        原始查询：{query}
        
        请直接返回变体列表，每行一个，不要编号。
        """
        
        response = self.llm.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        variants = response.choices[0].message.content.strip().split("\n")
        variants = [v.strip() for v in variants if v.strip()]
        
        return [query] + variants[:num_variants]
    
    def _hyde_expansion(self, query: str) -> List[str]:
        """
        HyDE（Hypothetical Document Embedding）
        
        生成假设文档，用假设文档的向量进行搜索
        """
        prompt = f"""
        请根据以下查询，生成一段可能包含答案的文档段落。
        这段文档应该看起来像真实知识库中的内容。
        
        查询：{query}
        
        请直接生成文档段落，不要添加额外说明。
        """
        
        response = self.llm.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        hypothetical_doc = response.choices[0].message.content.strip()
        
        return [query, hypothetical_doc]
    
    def decompose_query(self, query: str) -> List[str]:
        """
        查询分解
        
        将复杂查询分解为多个子查询
        """
        prompt = f"""
        请将以下复杂查询分解为 2-4 个简单的子查询。
        每个子查询应该独立可回答，且合起来能回答原始查询。
        
        查询：{query}
        
        请直接返回子查询列表，每行一个，不要编号。
        """
        
        response = self.llm.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        
        sub_queries = response.choices[0].message.content.strip().split("\n")
        sub_queries = [q.strip() for q in sub_queries if q.strip()]
        
        return sub_queries if sub_queries else [query]

# 使用示例
"""
enhancer = QueryEnhancer()

# 同义词扩展
expanded = enhancer.expand_query("Python 异步编程", method="synonym")
# 结果：["Python 异步编程", "Py 异步编程", "Python 并发编程", ...]

# LLM 扩展
expanded = enhancer.expand_query("Python 异步编程", method="llm")

# HyDE 扩展
expanded = enhancer.expand_query("Python 异步编程", method="hyde")

# 查询分解
sub_queries = enhancer.decompose_query(
    "对比 Python 和 JavaScript 的异步编程模型，并说明各自的适用场景"
)
# 结果：["Python 的异步编程模型是什么？", "JavaScript 的异步编程模型是什么？", ...]
"""
```

---

## 五、完整混合搜索流水线

```python
"""
完整的混合搜索流水线

整合查询增强、多路召回、融合、重排序的端到端实现
"""

class HybridSearchPipeline:
    """混合搜索流水线"""
    
    def __init__(
        self,
        query_enhancer: QueryEnhancer = None,
        multi_channel_searcher: MultiChannelHybridSearcher = None,
        reranker = None
    ):
        """
        初始化混合搜索流水线
        
        Args:
            query_enhancer: 查询增强器
            multi_channel_searcher: 多路搜索器
            reranker: 重排序器
        """
        self.query_enhancer = query_enhancer or QueryEnhancer()
        self.searcher = multi_channel_searcher or MultiChannelHybridSearcher()
        self.reranker = reranker
    
    def search(
        self,
        query: str,
        top_k: int = 10,
        enable_expansion: bool = True,
        enable_decomposition: bool = False,
        enable_rerank: bool = True
    ) -> Dict[str, Any]:
        """
        执行完整的混合搜索
        
        Args:
            query: 用户查询
            top_k: 返回结果数量
            enable_expansion: 是否启用查询扩展
            enable_decomposition: 是否启用查询分解
            enable_rerank: 是否启用重排序
        
        Returns:
            包含搜索结果和元数据的字典
        """
        result = {
            "original_query": query,
            "enhanced_queries": [],
            "results": [],
            "metadata": {}
        }
        
        # 1. 查询增强
        queries = [query]
        
        if enable_decomposition and self._is_complex_query(query):
            # 复杂查询分解
            sub_queries = self.query_enhancer.decompose_query(query)
            queries = sub_queries
            result["enhanced_queries"] = sub_queries
            result["metadata"]["decomposed"] = True
        elif enable_expansion:
            # 查询扩展
            expanded = self.query_enhancer.expand_query(query, method="synonym")
            queries = expanded[:3]  # 限制扩展数量
            result["enhanced_queries"] = expanded
            result["metadata"]["expanded"] = True
        
        # 2. 多路召回
        all_results = []
        for q in queries:
            search_results = self.searcher.search(
                query=q,
                top_k=top_k * 2,
                fusion_method=FusionMethod.RRF
            )
            all_results.extend(search_results)
        
        # 去重
        seen_ids = set()
        unique_results = []
        for r in all_results:
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                unique_results.append(r)
        
        # 3. 重排序
        if enable_rerank and self.reranker:
            final_results = self.reranker.rerank(
                query=query,
                documents=unique_results,
                top_k=top_k
            )
        else:
            # 按融合分数排序
            unique_results.sort(key=lambda x: x["score"], reverse=True)
            final_results = unique_results[:top_k]
        
        result["results"] = final_results
        result["metadata"]["total_candidates"] = len(all_results)
        result["metadata"]["unique_candidates"] = len(unique_results)
        
        return result
    
    def _is_complex_query(self, query: str) -> bool:
        """
        判断是否为复杂查询
        
        简单启发式：长度、包含的疑问词数量等
        """
        # 长度判断
        if len(query) > 50:
            return True
        
        # 包含对比、多个问题等
        complex_indicators = ["对比", "区别", "和", "与", "以及", "分别"]
        if any(indicator in query for indicator in complex_indicators):
            return True
        
        return False

# 使用示例
"""
# 构建流水线
pipeline = HybridSearchPipeline(
    query_enhancer=QueryEnhancer(),
    multi_channel_searcher=searcher,
    reranker=CrossEncoderReranker()
)

# 执行搜索
result = pipeline.search(
    query="Python 异步编程最佳实践",
    top_k=10,
    enable_expansion=True,
    enable_decomposition=False,
    enable_rerank=True
)

print(f"原始查询: {result['original_query']}")
print(f"增强查询: {result['enhanced_queries']}")
print(f"候选数量: {result['metadata']['total_candidates']}")
print(f"去重后: {result['metadata']['unique_candidates']}")

for i, r in enumerate(result['results'], 1):
    print(f"\n{i}. [{r['id']}] Score: {r.get('rerank_score', r['score']):.4f}")
    print(f"   {r['content'][:150]}...")
"""
```

---

## 六、混合搜索优化实践

### 6.1 权重调优

```python
"""
混合搜索权重调优

通过离线评估确定最佳权重配置
"""

from sklearn.model_selection import ParameterGrid
import json

class HybridSearchTuner:
    """混合搜索调优器"""
    
    def __init__(self, searcher: MultiChannelHybridSearcher):
        self.searcher = searcher
    
    def tune_weights(
        self,
        eval_queries: List[Dict],
        param_grid: Dict[str, List[float]] = None
    ) -> Dict[str, float]:
        """
        调优各渠道权重
        
        Args:
            eval_queries: 评估查询列表，每项包含 query 和 relevant_docs
            param_grid: 参数网格，如 {"dense_vector": [0.5, 0.7, 1.0], ...}
        
        Returns:
            最佳权重配置
        """
        if param_grid is None:
            # 默认参数网格
            param_grid = {
                "dense_vector": [0.5, 0.7, 1.0, 1.2],
                "sparse_bm25": [0.3, 0.5, 0.7, 1.0],
                "keyword": [0.2, 0.3, 0.5]
            }
        
        best_score = 0
        best_weights = {}
        
        # 遍历参数组合
        for weights in ParameterGrid(param_grid):
            # 设置权重
            for channel, weight in weights.items():
                if channel in self.searcher.channels:
                    self.searcher.channels[channel]["weight"] = weight
            
            # 评估
            score = self._evaluate(eval_queries)
            
            print(f"Weights: {weights}, Score: {score:.4f}")
            
            if score > best_score:
                best_score = score
                best_weights = weights.copy()
        
        print(f"\n最佳权重: {best_weights}, 分数: {best_score:.4f}")
        
        # 应用最佳权重
        for channel, weight in best_weights.items():
            if channel in self.searcher.channels:
                self.searcher.channels[channel]["weight"] = weight
        
        return best_weights
    
    def _evaluate(self, eval_queries: List[Dict]) -> float:
        """
        评估当前配置
        
        使用 Recall@K 或 NDCG@K 作为指标
        """
        total_score = 0
        
        for item in eval_queries:
            query = item["query"]
            relevant_docs = set(item["relevant_docs"])
            
            # 执行搜索
            results = self.searcher.search(query, top_k=10)
            retrieved_docs = [r["id"] for r in results]
            
            # 计算 Recall@10
            hits = len(set(retrieved_docs) & relevant_docs)
            recall = hits / len(relevant_docs) if relevant_docs else 0
            
            total_score += recall
        
        return total_score / len(eval_queries)

# 使用示例
"""
tuner = HybridSearchTuner(searcher)

eval_data = [
    {
        "query": "Python 异步编程",
        "relevant_docs": ["doc_1", "doc_5", "doc_10"]
    },
    {
        "query": "机器学习入门",
        "relevant_docs": ["doc_2", "doc_7"]
    }
]

best_weights = tuner.tune_weights(eval_data)
"""
```

### 6.2 性能优化

```
混合搜索性能优化策略：

索引优化
├── 向量索引选择
│   ├── 小规模（< 100万）：Flat（精确搜索）
│   ├── 中规模（100万-1000万）：IVF 或 HNSW
│   └── 大规模（> 1000万）：HNSW + 量化
├── 稀疏索引优化
│   ├── 倒排索引压缩
│   ├── 跳表（Skip List）加速
│   └── 布隆过滤器预过滤
└── 混合索引
    ├── 共享文档 ID 空间
    └── 预过滤减少候选集

查询优化
├── 缓存策略
│   ├── 查询结果缓存（热门查询）
│   ├── 向量缓存（重复查询编码）
│   └── 倒排列表缓存
├── 并行化
│   ├── 多路召回并行执行
│   ├── 批量查询处理
│   └── GPU 加速向量搜索
└── 近似算法
    ├── 近似最近邻（ANN）
    ├── 局部敏感哈希（LSH）
    └── 乘积量化（PQ）

系统优化
├── 负载均衡
│   ├── 查询分发
│   └── 索引分片
├── 预热策略
│   ├── 索引预热
│   └── 缓存预热
└── 降级策略
    ├── 超时回退（单路搜索）
    └── 熔断机制
```

---

## 七、AI产品经理关注点

```
混合搜索产品化要点：

核心决策
├── 是否需要混合搜索
│   ├── 简单场景：单一稠密向量搜索足够
│   ├── 中等复杂度：稠密 + 稀疏混合
│   └── 高要求场景：多路召回 + 重排序
├── 渠道选择
│   ├── 必选：稠密向量（语义理解）
│   ├── 必选：稀疏向量（关键词匹配）
│   ├── 可选：知识图谱（结构化知识）
│   └── 可选：实体链接（专有名词）
└── 融合策略
    ├── 默认：RRF（无需调参）
    ├── 进阶：加权融合（需调优）
    └── 高级：机器学习排序（需训练数据）

关键指标
├── 召回率
│   ├── Recall@10 > 80%
│   └── Recall@100 > 95%
├── 精确率
│   ├── Precision@5 > 60%
│   └── NDCG@10 > 0.5
├── 延迟
│   ├── P50 < 50ms
│   ├── P99 < 200ms
│   └── 超时率 < 0.1%
└── 成本
    ├── 单次查询成本
    └── 基础设施成本

优化方向
├── 效果优化
│   ├── 查询改写质量
│   ├── 渠道权重调优
│   └── 重排序模型选择
├── 性能优化
│   ├── 索引结构优化
│   ├── 缓存命中率
│   └── 并行度调优
└── 成本优化
    ├── 模型蒸馏
    ├── 量化压缩
    └── 动态渠道选择（简单查询减少渠道）

成本模型
├── 基础混合搜索（稠密 + 稀疏）
│   ├── 向量索引：~$200/月（100万文档）
│   └── 稀疏索引：~$100/月
├── 多路召回（3-4 路）
│   ├── 基础设施：~$500/月
│   └── 计算成本：翻倍
└── 完整流水线（+ 重排序）
    ├── 重排序模型：~$300/月
    └── LLM 增强：按调用量计费
```

---

## 八、参考资源

- [Reciprocal Rank Fusion](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf) - RRF 论文
- [SPLADE](https://arxiv.org/abs/2109.10086) - 学习型稀疏检索模型
- [ColBERTv2](https://arxiv.org/abs/2112.01488) - 延迟交互模型
- [HyDE Paper](https://arxiv.org/abs/2212.10496) - 假设文档嵌入
- [LangChain Hybrid Search](https://python.langchain.com/docs/modules/data_connection/retrievers/ensemble) - LangChain 混合搜索实现

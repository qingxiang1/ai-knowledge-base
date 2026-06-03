<!--
  文件描述: RAG重排序策略详解，涵盖重排序原理、主流模型、实现方法与性能优化
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# 重排序（Rerank）

> 重排序是 RAG 系统的精排环节，通过更精细的语义理解对召回结果进行二次排序，显著提升最终答案的相关性和准确性。

---

## 一、重排序概述

### 1.1 为什么需要重排序

```
召回 vs 重排序：

召回阶段的问题
├── 粗粒度匹配：向量相似度 ≠ 语义相关
│   └── "苹果"（水果）和 "苹果"（公司）向量可能很接近
├── 语义鸿沟：查询和文档的表达方式差异
│   └── 查询："怎么学 Python" vs 文档："Python 入门指南"
├── 上下文缺失：无法利用查询的完整上下文
│   └── 多轮对话中的指代、省略
└── 噪声干扰：召回结果包含不相关内容
    └── 长文档中只有部分段落相关

重排序的价值
├── 精排：更精确的查询-文档相关性判断
├── 理解：利用深层语义理解能力
├── 过滤：去除低质量、不相关结果
└── 排序：将最相关的结果排在前面

典型架构
用户查询 → 召回（Top 100）→ 重排序（Top 10）→ 大模型生成
              ↑ 粗排              ↑ 精排
```

### 1.2 重排序在 RAG 中的位置

```
RAG 系统完整流程：

用户查询
    ↓
查询理解
    ↓
召回阶段（Recall）
    ├── 稠密向量召回 → Top 50
    ├── 稀疏向量召回 → Top 50
    └── 多路融合 → Top 100
    ↓
【重排序阶段】（本章重点）
    ├── 相关性评分
    ├── 结果过滤
    └── Top K 选择
    ↓
上下文组装
    ↓
大模型生成
```

---

## 二、重排序方法

### 2.1 基于交叉编码器的重排序

```python
"""
交叉编码器（Cross-Encoder）重排序

将查询和文档拼接后输入模型，直接输出相关性分数
优势：精度高，能捕捉查询和文档的交互
劣势：计算量大，无法预计算
"""

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Dict
import numpy as np

class CrossEncoderReranker:
    """交叉编码器重排序器"""
    
    def __init__(
        self,
        model_name: str = "BAAI/bge-reranker-large",
        device: str = None,
        max_length: int = 512
    ):
        """
        初始化交叉编码器重排序器
        
        Args:
            model_name: 重排序模型名称
            device: 计算设备（cuda/cpu）
            max_length: 最大序列长度
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.max_length = max_length
        
        # 加载模型和分词器
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        
        print(f"已加载重排序模型: {model_name}")
        print(f"使用设备: {self.device}")
    
    def rerank(
        self,
        query: str,
        documents: List[Dict],
        top_k: int = 10,
        batch_size: int = 8
    ) -> List[Dict]:
        """
        对召回结果进行重排序
        
        Args:
            query: 查询文本
            documents: 召回的文档列表，每项包含 id 和 content
            top_k: 返回前 K 个结果
            batch_size: 批处理大小
        
        Returns:
            重排序后的结果列表
        """
        # 提取文档内容
        doc_texts = [doc["content"] for doc in documents]
        
        # 批量计算分数
        scores = self._compute_scores(query, doc_texts, batch_size)
        
        # 组装结果
        reranked_results = []
        for i, doc in enumerate(documents):
            reranked_results.append({
                "id": doc["id"],
                "content": doc["content"],
                "metadata": doc.get("metadata", {}),
                "recall_score": doc.get("score", 0),
                "rerank_score": float(scores[i])
            })
        
        # 按重排序分数排序
        reranked_results.sort(key=lambda x: x["rerank_score"], reverse=True)
        
        return reranked_results[:top_k]
    
    def _compute_scores(
        self,
        query: str,
        doc_texts: List[str],
        batch_size: int
    ) -> np.ndarray:
        """
        批量计算查询-文档相关性分数
        """
        scores = []
        
        with torch.no_grad():
            for i in range(0, len(doc_texts), batch_size):
                batch_docs = doc_texts[i:i + batch_size]
                
                # 编码
                inputs = self.tokenizer(
                    [query] * len(batch_docs),
                    batch_docs,
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors="pt"
                )
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                
                # 推理
                outputs = self.model(**inputs)
                batch_scores = outputs.logits.squeeze(-1)
                
                # 处理不同模型的输出格式
                if batch_scores.dim() == 0:
                    batch_scores = batch_scores.unsqueeze(0)
                
                scores.extend(batch_scores.cpu().numpy())
        
        return np.array(scores)
    
    def rerank_with_threshold(
        self,
        query: str,
        documents: List[Dict],
        threshold: float = 0.5,
        top_k: int = 10
    ) -> List[Dict]:
        """
        带阈值的重排序
        
        过滤掉低相关性的结果
        """
        reranked = self.rerank(query, documents, top_k=len(documents))
        
        # 过滤低分结果
        filtered = [r for r in reranked if r["rerank_score"] >= threshold]
        
        return filtered[:top_k]

# 使用示例
"""
reranker = CrossEncoderReranker(
    model_name="BAAI/bge-reranker-large"
)

# 召回结果（示例）
recalled_docs = [
    {"id": "doc_1", "content": "Python 是一种高级编程语言...", "score": 0.85},
    {"id": "doc_2", "content": "Java 是企业级开发语言...", "score": 0.82},
    {"id": "doc_3", "content": "Python 入门教程，适合初学者...", "score": 0.78}
]

# 重排序
results = reranker.rerank(
    query="如何学习 Python 编程",
    documents=recalled_docs,
    top_k=5
)

for r in results:
    print(f"ID: {r['id']}, Rerank Score: {r['rerank_score']:.4f}")
    print(f"Content: {r['content'][:100]}...\n")
"""
```

### 2.2 基于 LLM 的重排序

```python
"""
基于大语言模型的重排序

利用 LLM 的推理能力判断查询-文档相关性
优势：理解能力强，可处理复杂语义
劣势：成本高，延迟大
"""

import openai
from typing import List, Dict
import json

class LLMReranker:
    """LLM 重排序器"""
    
    def __init__(
        self,
        model: str = "gpt-4",
        api_key: str = None
    ):
        """
        初始化 LLM 重排序器
        
        Args:
            model: LLM 模型名称
            api_key: OpenAI API Key
        """
        self.model = model
        self.client = openai.OpenAI(api_key=api_key)
    
    def rerank(
        self,
        query: str,
        documents: List[Dict],
        top_k: int = 5
    ) -> List[Dict]:
        """
        使用 LLM 进行重排序
        
        让 LLM 对每个文档进行相关性评分
        """
        scored_results = []
        
        for doc in documents:
            score = self._score_document(query, doc["content"])
            scored_results.append({
                "id": doc["id"],
                "content": doc["content"],
                "metadata": doc.get("metadata", {}),
                "rerank_score": score
            })
        
        # 排序
        scored_results.sort(key=lambda x: x["rerank_score"], reverse=True)
        
        return scored_results[:top_k]
    
    def _score_document(
        self,
        query: str,
        document: str
    ) -> float:
        """
        对单个文档进行相关性评分
        """
        prompt = f"""
        请评估以下文档与查询的相关性。
        
        查询：{query}
        
        文档：{document[:500]}
        
        请只返回一个 0-10 的整数分数，10 表示完全相关，0 表示完全不相关。
        只返回数字，不要其他内容。
        """
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        
        try:
            score = float(response.choices[0].message.content.strip())
            return score / 10.0  # 归一化到 0-1
        except:
            return 0.0
    
    def batch_rerank(
        self,
        query: str,
        documents: List[Dict],
        top_k: int = 5
    ) -> List[Dict]:
        """
        批量重排序（更高效）
        
        一次性让 LLM 对所有文档评分
        """
        # 构建提示
        docs_text = "\n\n".join([
            f"[{i}] {doc['content'][:300]}"
            for i, doc in enumerate(documents)
        ])
        
        prompt = f"""
        请评估以下文档与查询的相关性。
        
        查询：{query}
        
        文档列表：
        {docs_text}
        
        请返回每个文档的相关性分数（0-10），格式如下：
        {{
            "scores": [
                {{"index": 0, "score": 8}},
                {{"index": 1, "score": 3}},
                ...
            ]
        }}
        """
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        
        try:
            result = json.loads(response.choices[0].message.content)
            scores = {item["index"]: item["score"] / 10.0 for item in result["scores"]}
        except:
            # 如果解析失败，返回默认分数
            scores = {i: 0.5 for i in range(len(documents))}
        
        # 组装结果
        reranked = []
        for i, doc in enumerate(documents):
            reranked.append({
                "id": doc["id"],
                "content": doc["content"],
                "metadata": doc.get("metadata", {}),
                "rerank_score": scores.get(i, 0)
            })
        
        reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
        
        return reranked[:top_k]

# 使用示例
"""
llm_reranker = LLMReranker(model="gpt-4")

results = llm_reranker.batch_rerank(
    query="Python 异步编程",
    documents=recalled_docs,
    top_k=5
)
"""
```

---

## 三、主流重排序模型

### 3.1 模型对比

```
主流重排序模型对比：

中文模型
├── BGE-Reranker
│   ├── 模型：BAAI/bge-reranker-large
│   ├── 特点：中文优化，效果优秀
│   ├── 维度：1024
│   └── 适用：中文 RAG 场景
├── Cohere Rerank
│   ├── 模型：rerank-multilingual-v3.0
│   ├── 特点：多语言支持，云端 API
│   ├── 成本：$0.002/文档
│   └── 适用：多语言场景，快速接入
└── BCEmbedding
    ├── 模型：maidalun1020/bce-reranker-base_v1
    ├── 特点：中英双语，轻量级
    └── 适用：资源受限场景

英文模型
├── MonoT5
│   ├── 模型：castorini/monot5-base-msmarco
│   ├── 特点：基于 T5，经典方法
│   └── 适用：英文检索
├── MiniLM
│   ├── 模型：cross-encoder/ms-marco-MiniLM-L-6-v2
│   ├── 特点：轻量快速
│   └── 适用：延迟敏感场景
└── ColBERT
    ├── 模型：colbert-ir/colbertv2.0
    ├── 特点：延迟交互，平衡效率
    └── 适用：大规模检索

选型建议
├── 中文场景：BGE-Reranker
├── 多语言：Cohere Rerank / BGE-M3
├── 资源受限：MiniLM / BCEmbedding
└── 极致效果：LLM-based Rerank
```

### 3.2 模型使用示例

```python
"""
主流重排序模型使用示例
"""

class RerankerFactory:
    """重排序模型工厂"""
    
    @staticmethod
    def create_bge_reranker(model_size: str = "large"):
        """
        创建 BGE 重排序器
        
        Args:
            model_size: large / base
        """
        model_name = f"BAAI/bge-reranker-{model_size}"
        return CrossEncoderReranker(model_name=model_name)
    
    @staticmethod
    def create_cohere_reranker(api_key: str):
        """
        创建 Cohere 重排序器
        """
        return CohereReranker(api_key=api_key)
    
    @staticmethod
    def create_minilm_reranker():
        """
        创建 MiniLM 重排序器（轻量级）
        """
        return CrossEncoderReranker(
            model_name="cross-encoder/ms-marco-MiniLM-L-6-v2"
        )

class CohereReranker:
    """Cohere Rerank API 封装"""
    
    def __init__(self, api_key: str):
        import cohere
        self.client = cohere.Client(api_key)
    
    def rerank(
        self,
        query: str,
        documents: List[Dict],
        top_k: int = 10,
        model: str = "rerank-multilingual-v3.0"
    ) -> List[Dict]:
        """
        使用 Cohere Rerank API
        """
        docs = [doc["content"] for doc in documents]
        
        response = self.client.rerank(
            model=model,
            query=query,
            documents=docs,
            top_n=top_k,
            return_documents=True
        )
        
        # 格式化结果
        results = []
        for result in response.results:
            original_doc = documents[result.index]
            results.append({
                "id": original_doc["id"],
                "content": result.document.text,
                "metadata": original_doc.get("metadata", {}),
                "rerank_score": result.relevance_score
            })
        
        return results

# 使用示例
"""
# BGE 重排序
bge_reranker = RerankerFactory.create_bge_reranker("large")

# Cohere 重排序
cohere_reranker = RerankerFactory.create_cohere_reranker("your-api-key")

# MiniLM 重排序（轻量）
minilm_reranker = RerankerFactory.create_minilm_reranker()

# 使用
results = bge_reranker.rerank(query, docs, top_k=5)
"""
```

---

## 四、高级重排序策略

### 4.1 多阶段重排序

```python
"""
多阶段重排序（Cascade Reranking）

使用多个模型逐步精排，平衡效率和效果
"""

class CascadeReranker:
    """多阶段重排序器"""
    
    def __init__(self):
        """初始化多阶段重排序器"""
        self.stages = []
    
    def add_stage(
        self,
        reranker,
        top_k: int,
        threshold: float = None
    ):
        """
        添加重排序阶段
        
        Args:
            reranker: 重排序器
            top_k: 该阶段保留的 top_k
            threshold: 分数阈值（可选）
        """
        self.stages.append({
            "reranker": reranker,
            "top_k": top_k,
            "threshold": threshold
        })
    
    def rerank(
        self,
        query: str,
        documents: List[Dict]
    ) -> List[Dict]:
        """
        执行多阶段重排序
        
        每阶段减少候选数量，逐步精排
        """
        current_docs = documents
        
        for i, stage in enumerate(self.stages):
            print(f"阶段 {i + 1}: {len(current_docs)} 个文档 → Top {stage['top_k']}")
            
            # 执行重排序
            reranked = stage["reranker"].rerank(
                query,
                current_docs,
                top_k=stage["top_k"]
            )
            
            # 应用阈值过滤
            if stage["threshold"]:
                reranked = [
                    r for r in reranked
                    if r["rerank_score"] >= stage["threshold"]
                ]
            
            current_docs = reranked
        
        return current_docs

# 使用示例
"""
# 构建三阶段重排序流水线
cascade = CascadeReranker()

# 阶段1：轻量级模型快速粗排（100 → 20）
cascade.add_stage(
    reranker=RerankerFactory.create_minilm_reranker(),
    top_k=20
)

# 阶段2：中等模型精排（20 → 10）
cascade.add_stage(
    reranker=RerankerFactory.create_bge_reranker("base"),
    top_k=10
)

# 阶段3：大模型最终精排（10 → 5）
cascade.add_stage(
    reranker=RerankerFactory.create_bge_reranker("large"),
    top_k=5,
    threshold=0.7
)

# 执行
results = cascade.rerank(query, recalled_docs)
"""
```

### 4.2 个性化重排序

```python
"""
个性化重排序（Personalized Reranking）

根据用户画像和历史行为调整排序
"""

class PersonalizedReranker:
    """个性化重排序器"""
    
    def __init__(
        self,
        base_reranker,
        user_profile_db
    ):
        """
        初始化个性化重排序器
        
        Args:
            base_reranker: 基础重排序器
            user_profile_db: 用户画像数据库
        """
        self.base_reranker = base_reranker
        self.user_db = user_profile_db
    
    def rerank(
        self,
        query: str,
        documents: List[Dict],
        user_id: str,
        top_k: int = 10
    ) -> List[Dict]:
        """
        个性化重排序
        """
        # 1. 基础重排序
        base_results = self.base_reranker.rerank(
            query, documents, top_k=len(documents)
        )
        
        # 2. 获取用户画像
        user_profile = self.user_db.get_profile(user_id)
        
        # 3. 计算个性化分数
        personalized_results = []
        for result in base_results:
            # 基础相关性分数
            relevance_score = result["rerank_score"]
            
            # 个性化分数
            personalization_score = self._compute_personalization_score(
                result, user_profile
            )
            
            # 融合分数
            final_score = (
                0.7 * relevance_score +
                0.3 * personalization_score
            )
            
            personalized_results.append({
                **result,
                "personalization_score": personalization_score,
                "final_score": final_score
            })
        
        # 4. 按最终分数排序
        personalized_results.sort(
            key=lambda x: x["final_score"],
            reverse=True
        )
        
        return personalized_results[:top_k]
    
    def _compute_personalization_score(
        self,
        document: Dict,
        user_profile: Dict
    ) -> float:
        """
        计算个性化分数
        
        基于用户兴趣和历史行为
        """
        score = 0.0
        
        # 兴趣标签匹配
        doc_tags = document.get("metadata", {}).get("tags", [])
        user_interests = user_profile.get("interests", [])
        
        if doc_tags and user_interests:
            matched = len(set(doc_tags) & set(user_interests))
            score += matched / max(len(doc_tags), len(user_interests))
        
        # 历史点击相似度
        user_history = user_profile.get("click_history", [])
        if user_history:
            # 简化的相似度计算
            score += 0.1  # 基础分
        
        return min(score, 1.0)

# 使用示例
"""
personalized = PersonalizedReranker(
    base_reranker=bge_reranker,
    user_profile_db=user_db
)

results = personalized.rerank(
    query="推荐系统算法",
    documents=recalled_docs,
    user_id="user_123",
    top_k=5
)
"""
```

---

## 五、重排序优化实践

### 5.1 性能优化

```python
"""
重排序性能优化策略
"""

class RerankOptimizer:
    """重排序优化器"""
    
    def __init__(self, reranker):
        self.reranker = reranker
        self.cache = {}
    
    def cached_rerank(
        self,
        query: str,
        documents: List[Dict],
        top_k: int = 10
    ) -> List[Dict]:
        """
        带缓存的重排序
        
        缓存常见查询的结果
        """
        cache_key = f"{query}:{','.join(sorted([d['id'] for d in documents]))}"
        
        if cache_key in self.cache:
            print("命中缓存")
            return self.cache[cache_key][:top_k]
        
        results = self.reranker.rerank(query, documents, top_k)
        self.cache[cache_key] = results
        
        return results
    
    def dynamic_batch_size(
        self,
        documents: List[Dict],
        target_latency_ms: float = 100
    ) -> int:
        """
        动态调整批处理大小
        
        根据目标延迟调整批次
        """
        # 简化的启发式规则
        doc_lengths = [len(d["content"]) for d in documents]
        avg_length = sum(doc_lengths) / len(doc_lengths)
        
        if avg_length > 1000:
            return 4
        elif avg_length > 500:
            return 8
        else:
            return 16
    
    def early_stopping_rerank(
        self,
        query: str,
        documents: List[Dict],
        top_k: int = 10,
        confidence_threshold: float = 0.9
    ) -> List[Dict]:
        """
        早停重排序
        
        当找到足够高置信度的结果时提前停止
        """
        results = []
        
        for doc in documents:
            score = self.reranker._compute_scores(query, [doc["content"]], 1)[0]
            
            results.append({
                "id": doc["id"],
                "content": doc["content"],
                "rerank_score": float(score)
            })
            
            # 如果已找到 top_k 个高置信度结果，提前停止
            if len(results) >= top_k:
                high_confidence = sum(
                    1 for r in results
                    if r["rerank_score"] >= confidence_threshold
                )
                if high_confidence >= top_k:
                    break
        
        results.sort(key=lambda x: x["rerank_score"], reverse=True)
        return results[:top_k]

# 使用示例
"""
optimizer = RerankOptimizer(bge_reranker)

# 带缓存的重排序
results = optimizer.cached_rerank(query, docs, top_k=5)

# 动态批次
batch_size = optimizer.dynamic_batch_size(docs, target_latency_ms=100)

# 早停
results = optimizer.early_stopping_rerank(
    query, docs, top_k=5, confidence_threshold=0.9
)
"""
```

### 5.2 效果优化

```
重排序效果优化指南：

模型优化
├── 模型选择
│   ├── 中文场景：BGE-Reranker > Cohere > MiniLM
│   ├── 英文场景：MonoT5 > ColBERT > MiniLM
│   └── 多语言：Cohere Multilingual > BGE-M3
├── 微调策略
│   ├── 领域数据微调（医疗、法律等）
│   ├── 困难负样本训练
│   └── 对比学习增强
└── 集成方法
    ├── 多模型投票
    ├── 堆叠（Stacking）
    └── 加权融合

数据优化
├── 负样本挖掘
│   ├── 困难负样本（相似但不相关）
│   ├── 随机负样本
│   └── 批内负样本
├── 数据增强
│   ├── 查询改写
│   ├── 同义词替换
│   └── 回译（Back-translation）
└── 清洗策略
    ├── 去除低质量文档
    ├── 去重
    └── 长度过滤

策略优化
├── 阈值调优
│   ├── 根据业务需求设定阈值
│   └── 动态阈值（根据查询难度）
├── 多样性控制
│   ├── MMR（最大边际相关性）
│   └── 主题聚类去重
└── 时效性加权
    ├── 新文档加分
    └── 时间衰减
```

---

## 六、AI产品经理关注点

```
重排序产品化要点：

核心决策
├── 是否需要重排序
│   ├── 简单场景：召回直接用于生成
│   ├── 中等复杂度：轻量级重排序（MiniLM）
│   └── 高要求场景：大模型重排序
├── 延迟预算
│   ├── < 50ms：不使用重排序或缓存
│   ├── < 200ms：轻量级模型（MiniLM/BGE-base）
│   └── < 500ms：大模型（BGE-large/LLM）
└── 成本预算
    ├── 低成本：本地部署开源模型
    ├── 中等成本：API 调用（Cohere）
    └── 高成本：LLM-based 重排序

关键指标
├── 相关性提升
│   ├── NDCG@5 提升 > 15%
│   └── 用户满意度提升
├── 延迟影响
│   ├── P99 延迟增加 < 100ms
│   └── 吞吐量下降 < 30%
└── 成本影响
    ├── 单次查询成本增加
    └── 基础设施成本

优化方向
├── 模型层面
│   ├── 选择适合场景的模型
│   ├── 领域微调
│   └── 模型量化/蒸馏
├── 系统层面
│   ├── 缓存策略
│   ├── 异步处理
│   └── 批量优化
└── 产品层面
    ├── 阈值可调
    ├── 结果可解释
    └── A/B 测试框架

成本模型
├── 开源模型（本地部署）
│   ├── GPU 成本：~$500/月
│   └── 人力成本：模型维护
├── API 服务
│   ├── Cohere：$0.002/文档
│   └── 月调用量 100万：$2000/月
└── LLM 重排序
    ├── GPT-4：$0.03/1K tokens
    └── 成本较高，仅用于关键场景
```

---

## 七、参考资源

- [BGE Reranker](https://github.com/FlagOpen/FlagEmbedding) - BGE 重排序模型
- [Cohere Rerank](https://cohere.com/rerank) - Cohere 重排序 API
- [Sentence Transformers Cross-Encoders](https://www.sbert.net/examples/applications/cross-encoder/README.html) - 交叉编码器实现
- [MonoT5 Paper](https://arxiv.org/abs/2010.02666) - MonoT5 重排序论文
- [ColBERT Paper](https://arxiv.org/abs/2004.12832) - ColBERT 延迟交互模型

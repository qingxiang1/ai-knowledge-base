<!--
  创建时间: 2026-06-03
  文件名: Embedding.md
  文件描述: Embedding模型详解，补充企业级模型选型框架、治理重点与验收标准
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# Embedding 模型

> Embedding（嵌入）是将文本映射到高维稠密向量的技术，是 RAG 系统的核心组件，直接决定检索质量

---

## 零、前置知识

阅读本节前，建议先了解以下内容：

| 前置章节 | 关联点 |
|---------|-------|
| [Embedding原理](../02-AI基础知识/Embedding原理.md) | 理解向量空间、余弦相似度等数学基础 |
| [RAG基础](./RAG基础.md) | 理解 Embedding 在 RAG 全链路中的位置——检索阶段 |
| [Chunk策略](./Chunk策略.md) | 分块后的文本需要 Embedding 向量化 |
| [OpenAI_API](../05-AI应用开发/OpenAI_API.md) | OpenAI Embeddings API 的调用方式 |
| [成本优化](../05-AI应用开发/成本优化.md) | Embedding 调用的成本计算和优化策略 |

**能力对标**：本章对应 [能力模型](../00-Roadmap/能力模型.md) 中「AI应用构建力 → 知识库构建能力」和「技术理解力 → 模型能力判断」。掌握 Embedding，不只是知道“文本转向量”，更重要的是能判断模型质量、部署方式、成本结构和适配边界。

---

## 一、Embedding 基础原理

### 1.1 什么是 Embedding

```
Embedding 定义：

├── 本质：将离散的文本符号映射到连续的向量空间
├── 输入：文本（词/句/段落/文档）
├── 输出：固定维度的稠密向量（如 768维、1024维、3072维）
└── 核心特性：语义相似的文本，向量空间距离近

数学表示：
f(text) → R^d
其中 d 为向量维度（通常 384/768/1024/3072）

相似度度量：
├── 余弦相似度（Cosine Similarity）：最常用，忽略向量长度
│   similarity = (A·B) / (||A|| × ||B||)
├── 欧氏距离（Euclidean Distance）：考虑向量长度
│   distance = ||A - B||
└── 点积（Dot Product）：用于归一化向量
│   dot = A·B

可视化理解：
"国王" - "男人" + "女人" ≈ "女王"
这是因为在向量空间中，这些概念的相对位置关系被编码
```

### 1.2 Embedding 模型架构演进

```
Embedding 模型发展历程：

Word2Vec / GloVe（2013-2014）
├── 词级别嵌入
├── 静态向量（一词一义）
├── 无法处理多义词
└── 已淘汰，仅作历史了解

ELMo / GPT-1（2018）
├── 上下文相关嵌入
├── 动态向量（一词多义）
├── 基于语言模型
└── 计算成本高

BERT 系列（2018-至今）
├── 双向编码器
├── 句向量通过 [CLS] 或 mean pooling 获得
├── 需要微调才能用于语义检索
└── 代表：BERT、RoBERTa、DistilBERT

Sentence-BERT（2019）
├── 专为句子相似度设计
├── 使用 Siamese 网络结构
├── 直接输出可用句向量
└── 开启句子嵌入新时代

现代 Embedding 模型（2020-至今）
├── 对比学习训练
├── 大规模语料预训练
├── 多语言支持
├── 长文本支持
└── 代表：OpenAI、BGE、E5、GTE、Cohere
```

### 1.3 企业级场景中为什么 Embedding 是关键底座

在企业级 RAG 中，Embedding 决定的不是一个局部算法参数，而是整条检索链路的上限，原因主要有 4 个：

1. **它直接影响召回质量**：向量质量差，后面的召回、融合、重排都很难补救
2. **它决定了知识表达边界**：是否支持中文术语、跨语言语义、长文档内容，都会影响实际命中率
3. **它影响系统成本与延迟**：模型维度、上下文长度、部署方式会直接影响计算与存储成本
4. **它影响后续架构选择**：向量数据库、混合检索、索引压缩、缓存策略都与 Embedding 方案强相关

---

## 二、主流 Embedding 模型对比

### 2.1 模型选型矩阵

```
主流 Embedding 模型对比：

模型                    维度    上下文长度    语言      特点                      MTEB排名
────────────────────────────────────────────────────────────────────────────────────
OpenAI text-embedding-3-large   3072    8192        多语言    质量最高，按token计费      Top 5
OpenAI text-embedding-3-small   1536    8192        多语言    性价比高                  Top 10
BGE-M3                  1024    8192        多语言    支持稀疏/稠密/多向量        Top 3
BGE-large-zh-v1.5       1024    512         中文      中文SOTA                  Top 10
E5-Mistral              4096    32768       多语言    长文本支持好              Top 3
GTE-large               1024    512         多语言    阿里出品，效果稳定        Top 10
Cohere embed-english    1024    512         英文      商业模型，质量高          Top 5
Cohere embed-multilingual 768   512         多语言    多语言支持好              Top 10

选择建议：
├── 中文场景优先：BGE-M3、BGE-large-zh-v1.5
├── 英文场景优先：OpenAI text-embedding-3-large、Cohere
├── 长文档场景：E5-Mistral（32K上下文）
├── 预算敏感：BGE系列（开源免费）
└── 企业级：OpenAI API（稳定、易用）
```

### 2.2 模型性能详解

```python
"""
Embedding 模型使用示例
"""

from sentence_transformers import SentenceTransformer
import numpy as np

class EmbeddingEngine:
    """Embedding 引擎"""
    
    # 推荐模型配置
    MODELS = {
        "bge-large-zh": {
            "model_name": "BAAI/bge-large-zh-v1.5",
            "dim": 1024,
            "max_length": 512,
            "language": "zh",
            "normalize": True
        },
        "bge-m3": {
            "model_name": "BAAI/bge-m3",
            "dim": 1024,
            "max_length": 8192,
            "language": " multilingual",
            "normalize": True
        },
        "e5-large": {
            "model_name": "intfloat/e5-large-v2",
            "dim": 1024,
            "max_length": 512,
            "language": "en",
            "normalize": True
        },
        "gte-large": {
            "model_name": "thenlper/gte-large",
            "dim": 1024,
            "max_length": 512,
            "language": " multilingual",
            "normalize": True
        }
    }
    
    def __init__(self, model_key: str = "bge-large-zh"):
        """
        初始化 Embedding 引擎
        
        Args:
            model_key: 模型标识
        """
        config = self.MODELS.get(model_key, self.MODELS["bge-large-zh"])
        self.model = SentenceTransformer(config["model_name"])
        self.config = config
    
    def encode(
        self,
        texts: list,
        batch_size: int = 32,
        show_progress: bool = False
    ) -> np.ndarray:
        """
        编码文本为向量
        
        Args:
            texts: 文本列表
            batch_size: 批处理大小
            show_progress: 是否显示进度
        
        Returns:
            向量矩阵 (n_texts, dim)
        """
        # BGE 模型需要添加指令前缀
        if "bge" in self.config["model_name"].lower():
            texts = [f"Represent this sentence for searching relevant passages: {t}" 
                     for t in texts]
        
        # E5 模型需要添加前缀
        if "e5" in self.config["model_name"].lower():
            texts = [f"passage: {t}" for t in texts]
        
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=show_progress,
            normalize_embeddings=self.config["normalize"]
        )
        
        return embeddings
    
    def encode_query(self, query: str) -> np.ndarray:
        """
        编码查询（添加查询指令）
        
        注意：查询和文档的编码方式可能不同
        """
        # BGE 查询指令
        if "bge" in self.config["model_name"].lower():
            query = f"Represent this query for searching relevant passages: {query}"
        
        # E5 查询前缀
        if "e5" in self.config["model_name"].lower():
            query = f"query: {query}"
        
        return self.model.encode([query], normalize_embeddings=True)[0]
    
    def similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """计算余弦相似度"""
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
    
    def get_model_info(self) -> dict:
        """获取模型信息"""
        return {
            "model_name": self.config["model_name"],
            "vector_dimension": self.config["dim"],
            "max_sequence_length": self.config["max_length"],
            "parameters": sum(p.numel() for p in self.model.parameters())
        }

# 使用示例
engine = EmbeddingEngine("bge-large-zh")

# 编码文档
docs = [
    "RAG是一种检索增强生成技术",
    "向量数据库用于存储高维向量",
    "Embedding模型将文本转为向量"
]
doc_embeddings = engine.encode(docs)

# 编码查询
query = "什么是RAG？"
query_embedding = engine.encode_query(query)

# 计算相似度
similarities = [engine.similarity(query_embedding, doc_emb) for doc_emb in doc_embeddings]
print(f"相似度: {similarities}")
```

### 2.3 OpenAI Embedding API

```python
"""
OpenAI Embedding API 使用
"""

from openai import OpenAI
import numpy as np

class OpenAIEmbedding:
    """OpenAI Embedding 封装"""
    
    MODELS = {
        "text-embedding-3-large": {
            "dim": 3072,
            "max_tokens": 8192,
            "price_per_1k": 0.00013
        },
        "text-embedding-3-small": {
            "dim": 1536,
            "max_tokens": 8192,
            "price_per_1k": 0.00002
        },
        "text-embedding-ada-002": {
            "dim": 1536,
            "max_tokens": 8192,
            "price_per_1k": 0.00010
        }
    }
    
    def __init__(self, model: str = "text-embedding-3-small", api_key: str = None):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.config = self.MODELS[model]
    
    def encode(self, texts: list) -> np.ndarray:
        """
        批量编码文本
        
        注意：
        1. 单批次最多 2048 个文本
        2. 单个文本最多 8192 tokens
        3. 推荐批处理以提高效率
        """
        # 确保是列表
        if isinstance(texts, str):
            texts = [texts]
        
        # 调用 API
        response = self.client.embeddings.create(
            model=self.model,
            input=texts,
            encoding_format="float"
        )
        
        # 提取向量
        embeddings = [item.embedding for item in response.data]
        return np.array(embeddings)
    
    def estimate_cost(self, total_tokens: int) -> float:
        """估算成本"""
        return (total_tokens / 1000) * self.config["price_per_1k"]

# 使用示例
# embedder = OpenAIEmbedding("text-embedding-3-small")
# embeddings = embedder.encode(["Hello world", "RAG技术"])
# print(embeddings.shape)  # (2, 1536)
```

---

## 三、多语言与跨语言检索

### 3.1 多语言 Embedding

```python
"""
多语言 Embedding 与跨语言检索
"""

class MultilingualEmbedding:
    """多语言 Embedding 处理"""
    
    # 推荐的多语言模型
    MULTILINGUAL_MODELS = {
        "bge-m3": {
            "name": "BAAI/bge-m3",
            "languages": 100,
            "features": ["dense", "sparse", "multi-vector"]
        },
        "e5-mistral": {
            "name": "intfloat/e5-mistral-7b-instruct",
            "languages": 100,
            "context_length": 32768
        },
        "paraphrase-multilingual": {
            "name": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            "languages": 50,
            "lightweight": True
        }
    }
    
    def __init__(self, model_key: str = "bge-m3"):
        from sentence_transformers import SentenceTransformer
        config = self.MULTILINGUAL_MODELS[model_key]
        self.model = SentenceTransformer(config["name"])
        self.config = config
    
    def cross_lingual_search(
        self,
        query: str,
        documents: list,
        query_lang: str = "zh",
        doc_lang: str = "en"
    ) -> list:
        """
        跨语言检索
        
        示例：中文查询匹配英文文档
        
        Args:
            query: 查询文本（如中文）
            documents: 文档列表（如英文）
            query_lang: 查询语言
            doc_lang: 文档语言
        
        Returns:
            按相似度排序的文档索引
        """
        # 编码查询
        query_emb = self.model.encode([query], normalize_embeddings=True)
        
        # 编码文档
        doc_embs = self.model.encode(documents, normalize_embeddings=True)
        
        # 计算相似度
        similarities = np.dot(query_emb, doc_embs.T)[0]
        
        # 排序返回
        ranked_indices = np.argsort(similarities)[::-1]
        return [
            {"index": int(idx), "score": float(similarities[idx])}
            for idx in ranked_indices
        ]

# 跨语言检索示例
"""
ml_engine = MultilingualEmbedding("bge-m3")

# 中文查询
query_zh = "机器学习是什么"

# 英文文档
docs_en = [
    "Machine learning is a subset of artificial intelligence...",
    "Deep learning uses neural networks with multiple layers...",
    "Python is a popular programming language..."
]

results = ml_engine.cross_lingual_search(query_zh, docs_en)
print(results)
# 输出: [{'index': 0, 'score': 0.89}, {'index': 1, 'score': 0.76}, ...]
"""
```

### 3.2 BGE-M3 详解

```python
"""
BGE-M3：当前最强大的开源多语言 Embedding 模型

特点：
1. 多语言（100+ 语言）
2. 多粒度（句子/段落/长文档，最长 8192 tokens）
3. 多向量（稠密向量 + 稀疏向量 + 多向量表示）
"""

from FlagEmbedding import BGEM3FlagModel

class BGEM3Embedding:
    """BGE-M3 封装"""
    
    def __init__(self, model_path: str = "BAAI/bge-m3"):
        self.model = BGEM3FlagModel(model_path, use_fp16=True)
    
    def encode_dense(self, texts: list) -> np.ndarray:
        """获取稠密向量（用于语义匹配）"""
        embeddings = self.model.encode(
            texts,
            batch_size=12,
            max_length=8192
        )["dense_vecs"]
        return embeddings
    
    def encode_sparse(self, texts: list) -> list:
        """获取稀疏向量（用于关键词匹配）"""
        output = self.model.encode(
            texts,
            return_sparse=True,
            batch_size=12
        )
        return output["lexical_weights"]
    
    def encode_multi_vector(self, texts: list) -> list:
        """获取多向量（ColBERT 风格，用于细粒度匹配）"""
        output = self.model.encode(
            texts,
            return_colbert_vecs=True,
            batch_size=12
        )
        return output["colbert_vecs"]
    
    def hybrid_search(
        self,
        query: str,
        documents: list,
        weights: dict = None
    ) -> list:
        """
        混合检索（稠密 + 稀疏 + 多向量）
        
        Args:
            query: 查询
            documents: 文档列表
            weights: 各类型权重，如 {"dense": 0.4, "sparse": 0.3, "multi": 0.3}
        """
        weights = weights or {"dense": 0.5, "sparse": 0.5}
        
        # 编码查询
        query_emb = self.model.encode([query])
        query_dense = query_emb["dense_vecs"][0]
        query_sparse = query_emb["lexical_weights"][0]
        
        # 编码文档
        doc_emb = self.model.encode(documents)
        doc_dense = doc_emb["dense_vecs"]
        doc_sparse = doc_emb["lexical_weights"]
        
        # 计算相似度
        dense_scores = np.dot(doc_dense, query_dense)
        
        # 稀疏向量相似度（简化计算）
        sparse_scores = []
        for doc_s in doc_sparse:
            score = sum(query_sparse.get(k, 0) * v for k, v in doc_s.items())
            sparse_scores.append(score)
        
        # 加权融合
        final_scores = (
            weights.get("dense", 0.5) * np.array(dense_scores) +
            weights.get("sparse", 0.5) * np.array(sparse_scores)
        )
        
        # 排序
        ranked = np.argsort(final_scores)[::-1]
        return [
            {"index": int(idx), "score": float(final_scores[idx])}
            for idx in ranked
        ]

# 使用示例
"""
bge_m3 = BGEM3Embedding()

# 稠密向量
dense_emb = bge_m3.encode_dense(["RAG技术介绍"])
print(dense_emb.shape)  # (1, 1024)

# 稀疏向量
sparse_emb = bge_m3.encode_sparse(["RAG技术介绍"])
print(sparse_emb)  # [{'rag': 0.5, '技术': 0.8, ...}]

# 混合检索
results = bge_m3.hybrid_search(
    "什么是检索增强生成",
    ["RAG是一种技术", "Embedding是向量", "LLM是大模型"]
)
"""
```

---

## 四、Embedding 微调

```python
"""
Embedding 模型微调

场景：
1. 领域适配（医学、法律、金融等专业领域）
2. 任务适配（特定检索任务）
3. 语言适配（低资源语言）
"""

from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

class EmbeddingFineTuner:
    """Embedding 微调器"""
    
    def __init__(self, base_model: str = "BAAI/bge-large-zh-v1.5"):
        self.model = SentenceTransformer(base_model)
    
    def prepare_contrastive_data(
        self,
        anchor_texts: list,
        positive_texts: list,
        negative_texts: list = None
    ) -> list:
        """
        准备对比学习数据
        
        格式：(锚点, 正例, 负例)
        """
        examples = []
        for i, (anchor, positive) in enumerate(zip(anchor_texts, positive_texts)):
            if negative_texts:
                negative = negative_texts[i]
                examples.append(InputExample(
                    texts=[anchor, positive, negative]
                ))
            else:
                examples.append(InputExample(
                    texts=[anchor, positive]
                ))
        return examples
    
    def finetune(
        self,
        train_examples: list,
        output_path: str,
        epochs: int = 3,
        batch_size: int = 16,
        warmup_steps: int = 100
    ):
        """
        微调模型
        
        Args:
            train_examples: 训练样本
            output_path: 输出路径
            epochs: 训练轮数
            batch_size: 批次大小
            warmup_steps: 预热步数
        """
        # 创建数据加载器
        train_dataloader = DataLoader(
            train_examples,
            shuffle=True,
            batch_size=batch_size
        )
        
        # 定义损失函数
        # MultipleNegativesRankingLoss 适用于 (anchor, positive) 对
        train_loss = losses.MultipleNegativesRankingLoss(self.model)
        
        # 训练
        self.model.fit(
            train_objectives=[(train_dataloader, train_loss)],
            epochs=epochs,
            warmup_steps=warmup_steps,
            output_path=output_path,
            show_progress_bar=True
        )
        
        print(f"模型已保存到: {output_path}")

# 微调示例
"""
# 准备领域数据（以医疗为例）
anchors = [
    "糖尿病的症状有哪些",
    "高血压的治疗方法",
    "心脏病的预防措施"
]
positives = [
    "糖尿病患者常出现多饮、多尿、多食和体重下降等症状",
    "高血压治疗包括药物治疗和生活方式干预",
    "预防心脏病需要健康饮食、规律运动和戒烟限酒"
]

# 创建微调器
finetuner = EmbeddingFineTuner("BAAI/bge-large-zh-v1.5")

# 准备数据
train_examples = finetuner.prepare_contrastive_data(anchors, positives)

# 微调
finetuner.finetune(
    train_examples,
    output_path="./medical-embedding-model",
    epochs=5
)
"""
```

---

## 五、企业级产品化关注点

```
Embedding 模型产品化要点：

选型决策：
├── 精度 vs 成本
│   ├── 高精度场景：OpenAI text-embedding-3-large
│   ├── 平衡场景：BGE-M3、text-embedding-3-small
│   └── 成本敏感：BGE-small、GTE-small
├── 延迟 vs 质量
│   ├── 实时检索：轻量模型（384维）
│   ├── 离线处理：重型模型（3072维）
│   └── 边缘部署：量化模型（INT8）
└── 语言支持
    ├── 纯中文：BGE-large-zh
    ├── 纯英文：E5-large
    └── 多语言：BGE-M3、Cohere multilingual

部署策略：
├── 云端 API
│   ├── 优点：免运维、自动更新
│   ├── 缺点：按量计费、网络延迟
│   └── 适用：快速启动、流量波动大
├── 私有化部署
│   ├── 优点：数据安全、固定成本
│   ├── 缺点：需要GPU、运维成本
│   └── 适用：数据敏感、高频调用
└── 混合部署
    ├── 热数据：本地缓存
    ├── 冷数据：云端API
    └── 动态切换

性能优化：
├── 批处理
│   ├── 合并请求减少 overhead
│   └── 推荐批次：32-128
├── 缓存
│   ├── 文本哈希 → 向量缓存
│   └── TTL 设置（如 24h）
└── 量化
    ├── FP16：节省 50% 显存
    ├── INT8：节省 75% 显存
    └── 精度损失：< 1%

监控指标：
├── 检索质量
│   ├── Hit Rate@K
│   └── MRR
├── 服务性能
│   ├── P99 延迟
│   └── 吞吐量 (QPS)
└── 成本
    ├── 单次编码成本
    └── 日均总成本
```

### 5.1 企业级 Embedding 选型框架

#### 5.1.1 选模型前至少要判断 6 件事

| 判断问题 | 说明 |
|----------|------|
| 主要语种是什么 | 中文、多语言、跨语言场景的最佳模型并不相同 |
| 知识文本平均长度多长 | 长文档场景要重点看上下文长度和分块策略 |
| 更关注效果还是成本 | 高质量模型通常意味着更高推理与存储成本 |
| 是否允许数据出域 | 这会直接影响选择 API 还是私有化部署 |
| 查询量和入库量有多大 | 决定批处理、缓存、离线编码能力是否足够 |
| 是否需要与稀疏检索协同 | 会影响是否优先选择支持混合检索能力的模型 |

#### 5.1.2 常见选型建议

| 场景 | 建议 |
|------|------|
| 中文知识库起步阶段 | 优先选中文效果稳定、生态成熟的模型 |
| 多语言企业知识库 | 优先选多语言能力一致性较好的模型 |
| 数据敏感或强合规场景 | 优先评估私有化或专有云部署方案 |
| 高吞吐离线入库场景 | 优先关注编码速度、批量吞吐与成本 |

### 5.2 核心指标

企业级 Embedding 通常至少同时看以下指标：

1. **效果指标**：Recall@K、MRR、NDCG、相似问命中率、跨语言命中率
2. **性能指标**：单条编码延迟、批量吞吐、P99、索引构建时长
3. **成本指标**：单次编码成本、向量存储成本、索引资源成本
4. **治理指标**：模型版本覆盖率、重建索引时长、回滚耗时、失败任务率

### 5.3 Embedding 治理重点

1. **模型版本治理**：模型切换后要识别是否需要全量重建向量与索引
2. **数据治理**：脏文本、重复文本、低质量分块会直接污染向量质量
3. **指令治理**：像 BGE、E5 这类模型的 query/passsage 前缀要保持一致
4. **缓存治理**：高频重复文本与查询需要设计稳定的向量缓存策略
5. **上线治理**：新模型应先做离线评测、小流量灰度，再逐步全量切换
6. **回滚治理**：模型升级失败时，要能快速退回上一版向量与索引

### 5.4 常见失败模式

1. **只看排行榜不看业务语料**：公开榜单好，不代表企业场景一定好
2. **忽视 query 与 passage 编码差异**：会直接导致检索效果明显下降
3. **换模型不重建索引**：向量空间已经变化，旧索引不可直接复用
4. **分块策略与模型上下文不匹配**：不是块越大越好，也不是越小越好
5. **只关注单次调用价格**：忽略了重建索引、存储维度和推理资源成本

## 六、企业级验收标准

### 6.1 学完本章后至少应做到

- [ ] 能解释 Embedding 为什么决定 RAG 检索链路的基础质量
- [ ] 能根据语言、长度、合规和成本要求初步选择 Embedding 方案
- [ ] 能理解模型维度、上下文长度、部署方式对成本和性能的影响
- [ ] 能识别模型版本切换、索引重建、query/passage 指令不一致等风险点
- [ ] 能把 Embedding 选型和召回、混合搜索、向量数据库联动起来思考

---

## 七、延伸阅读与参考资源

### 相关章节

| 章节 | 关联说明 |
|------|---------|
| [RAG基础](./RAG基础.md) | Embedding 是 RAG 检索的核心组件 |
| [Chunk策略](./Chunk策略.md) | 分块大小影响 Embedding 的语义完整性 |
| [向量数据库](./向量数据库.md) | Embedding 向量的存储和索引 |
| [Recall](./Recall.md) | Embedding 质量直接影响向量召回效果 |
| [HybridSearch](./HybridSearch.md) | 稠密向量（Embedding）与稀疏向量的融合检索 |
| [Embedding原理](../02-AI基础知识/Embedding原理.md) | 向量化和相似度计算的数学基础 |
| [OpenAI_API](../05-AI应用开发/OpenAI_API.md) | OpenAI Embeddings API 的调用方式 |
| [成本优化](../05-AI应用开发/成本优化.md) | Embedding 调用的成本优化策略 |

### 外部资源

- [MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard) - Embedding 模型排行榜
- [BGE GitHub](https://github.com/FlagOpen/FlagEmbedding) - BGE 模型官方仓库
- [Sentence Transformers](https://www.sbert.net/) - 主流 Embedding 框架
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Cohere Embeddings](https://docs.cohere.com/docs/embeddings)

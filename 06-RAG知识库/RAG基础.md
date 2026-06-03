<!--
  文件描述: RAG基础概念与架构详解，涵盖RAG原理、流程、类型及与Fine-tuning的对比
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# RAG 基础

> RAG（Retrieval-Augmented Generation，检索增强生成）是当前大模型落地企业场景的核心技术，通过外挂知识库让模型具备实时、准确、可溯源的专业能力

---

## 一、为什么需要 RAG

### 1.1 大模型的原生局限

```
大模型（LLM）的固有缺陷：

├── 知识时效性
│   ├── 训练数据有截止日期
│   ├── 无法获取实时信息（股价、天气、新闻）
│   └── 企业私有知识完全缺失
├── 幻觉问题（Hallucination）
│   ├── 对不确定的问题"一本正经地胡说"
│   ├── 编造不存在的论文、法规、数据
│   └── 用户难以辨别真伪
├── 领域专业性不足
│   ├── 通用训练数据覆盖浅
│   ├── 企业内部术语、流程不理解
│   └── 行业规范、标准无法准确引用
└── 不可溯源
    ├── 无法告知答案来源
    ├── 无法验证信息准确性
    └── 企业合规审计困难

RAG 的解决思路：
用户提问 → 从知识库检索相关文档 → 将检索结果作为上下文 → LLM基于事实生成回答
├── 知识实时更新：只需更新知识库，无需重新训练模型
├── 减少幻觉：回答基于检索到的真实文档
├── 领域适配：注入企业私有知识
└── 可溯源：明确标注信息来源
```

### 1.2 RAG vs Fine-tuning

```
RAG 与 Fine-tuning 对比：

维度              RAG                        Fine-tuning
─────────────────────────────────────────────────────────────
原理              检索外部知识+生成            调整模型参数
知识更新          实时（更新文档即可）          需重新训练
成本              低（向量检索）               高（GPU训练）
技术门槛          中                         高
适用场景          问答、客服、文档助手          风格迁移、特定任务
 hallucination   显著降低                   中等降低
可溯源性          强（有来源文档）             弱
数据需求          原始文档即可                 需标注数据

选择建议：
├── 优先 RAG：
│   ├── 知识频繁更新的场景（法规、产品文档）
│   ├── 需要明确溯源的企业应用
│   ├── 快速POC验证
│   └── 预算有限的项目
├── 考虑 Fine-tuning：
│   ├── 需要特定输出风格（品牌调性）
│   ├── 复杂推理任务需固化思维链
│   ├── 已有大量高质量标注数据
│   └── 对延迟极度敏感（省去检索时间）
└── 组合使用：RAG + Fine-tuned Model（最佳实践）
```

---

## 二、RAG 核心架构

### 2.1 标准 RAG 流程

```
标准 RAG 流程（离线 + 在线）：

离线阶段（索引构建）：
┌─────────────────────────────────────────────────────────┐
│  原始文档                                                │
│    ├── PDF / Word / Markdown / HTML / 数据库             │
│    ↓                                                     │
│  文档加载（Document Loader）                             │
│    ├── 解析格式、提取文本、保留元数据                     │
│    ↓                                                     │
│  文本分块（Chunking）                                    │
│    ├── 按语义/长度/结构切分                              │
│    ├── 设置重叠区域（Overlap）保证上下文连贯              │
│    ↓                                                     │
│  向量化（Embedding）                                     │
│    ├── 将文本块转为高维向量                              │
│    ├── 捕捉语义信息                                      │
│    ↓                                                     │
│  存储（Vector Store）                                    │
│    ├── 向量数据库索引                                    │
│    └── 支持高效相似度检索                                │
└─────────────────────────────────────────────────────────┘

在线阶段（查询响应）：
┌─────────────────────────────────────────────────────────┐
│  用户提问                                                │
│    ↓                                                     │
│  查询向量化（Query Embedding）                           │
│    ├── 使用同一 Embedding 模型编码问题                   │
│    ↓                                                     │
│  向量检索（Vector Search）                               │
│    ├── Top-K 相似度搜索                                  │
│    ├── 返回最相关的文本块                                │
│    ↓                                                     │
│  重排序（Rerank，可选）                                  │
│    ├── 精排模型优化检索结果顺序                          │
│    ↓                                                     │
│  上下文构建（Context Building）                          │
│    ├── 将检索结果组装为 Prompt 上下文                    │
│    ├── 添加系统提示、引用格式                            │
│    ↓                                                     │
│  LLM 生成（Generation）                                  │
│    ├── 模型基于检索上下文生成回答                        │
│    ├── 要求模型标注引用来源                              │
│    ↓                                                     │
│  返回用户                                                │
│    ├── 答案 + 引用来源                                   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 RAG 演进类型

```
RAG 架构演进：

Naive RAG（基础版）
├── 流程：索引 → 检索 → 生成
├── 特点：简单直接，易实现
├── 问题：
│   ├── 检索质量依赖 Embedding
│   ├── 上下文长度限制
│   └── 多文档融合困难
└── 适用：简单问答、文档量小

Advanced RAG（进阶版）
├── 检索前优化
│   ├── 查询重写（Query Rewriting）
│   ├── 查询扩展（Query Expansion）
│   └── 假设性文档嵌入（HyDE）
├── 检索后优化
│   ├── 重排序（Rerank）
│   ├── 上下文压缩（Context Compression）
│   └── 多路召回融合
├── 索引优化
│   ├── 细粒度分块策略
│   ├── 元数据增强
│   └── 摘要索引
└── 适用：生产环境、复杂查询

Modular RAG（模块化）
├── 检索模块可插拔
│   ├── 向量检索
│   ├── 关键词检索（BM25）
│   ├── 图检索（Knowledge Graph）
│   └── 混合检索
├── 生成模块可配置
│   ├── 不同 LLM 后端
│   ├── 流式/非流式
│   └── 多轮对话支持
├── 路由模块
│   ├── 问题分类 → 选择检索策略
│   └── 意图识别 → 直连/检索
└── 适用：企业级平台、多场景

Agentic RAG（Agent 化）
├── 自主决策
│   ├── 判断是否需要检索
│   ├── 选择检索工具
│   └── 评估回答充分性
├── 多步推理
│   ├── 子问题分解
│   ├── 多轮检索
│   └── 信息整合
├── 工具调用
│   ├── API 查询实时数据
│   ├── 计算器验证
│   └── 数据库查询
└── 适用：复杂分析、研究助手
```

---

## 三、RAG 核心组件详解

### 3.1 文档处理管道

```python
"""
RAG 文档处理管道示例
"""

from typing import List, Dict
import hashlib

class Document:
    """文档对象"""
    def __init__(self, content: str, metadata: Dict = None):
        self.content = content
        self.metadata = metadata or {}
        self.doc_id = hashlib.md5(content.encode()).hexdigest()

class DocumentProcessor:
    """文档处理器"""
    
    def __init__(self):
        self.loaders = {
            "pdf": self._load_pdf,
            "txt": self._load_text,
            "md": self._load_markdown,
            "html": self._load_html,
        }
    
    def load(self, file_path: str, file_type: str = None) -> List[Document]:
        """
        加载文档
        
        Args:
            file_path: 文件路径
            file_type: 文件类型，自动检测
        
        Returns:
            Document 列表
        """
        if not file_type:
            file_type = file_path.split(".")[-1].lower()
        
        loader = self.loaders.get(file_type, self._load_text)
        return loader(file_path)
    
    def _load_pdf(self, path: str) -> List[Document]:
        """加载 PDF"""
        # 使用 PyPDF2 或 pdfplumber
        # 保留页码、章节等元数据
        pass
    
    def _load_text(self, path: str) -> List[Document]:
        """加载纯文本"""
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        return [Document(content, {"source": path, "type": "text"})]
    
    def _load_markdown(self, path: str) -> List[Document]:
        """加载 Markdown，保留标题层级"""
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # 解析标题作为元数据
        import re
        headers = re.findall(r'^(#{1,6})\s+(.+)$', content, re.MULTILINE)
        
        return [Document(content, {
            "source": path,
            "type": "markdown",
            "headers": [h[1] for h in headers]
        })]
    
    def _load_html(self, path: str) -> List[Document]:
        """加载 HTML，提取正文"""
        from bs4 import BeautifulSoup
        
        with open(path, "r", encoding="utf-8") as f:
            soup = BeautifulSoup(f.read(), "html.parser")
        
        # 移除脚本和样式
        for tag in soup(["script", "style"]):
            tag.decompose()
        
        content = soup.get_text(separator="\n", strip=True)
        return [Document(content, {"source": path, "type": "html"})]
    
    def clean(self, doc: Document) -> Document:
        """
        清洗文档
        
        策略：
        1. 去除多余空白
        2. 统一编码
        3. 去除页眉页脚
        4. 保留段落结构
        """
        content = doc.content
        
        # 去除多余空行
        content = "\n".join(line.strip() for line in content.split("\n") if line.strip())
        
        # 统一空格
        content = " ".join(content.split())
        
        doc.content = content
        return doc
```

### 3.2 完整 RAG 流程实现

```python
"""
完整 RAG 系统实现
"""

from typing import List, Dict, Optional
import numpy as np

class RAGSystem:
    """
    RAG 系统
    
    整合文档处理、向量检索、LLM 生成的完整流程
    """
    
    def __init__(
        self,
        embedding_model,
        vector_store,
        llm_client,
        reranker=None,
        top_k: int = 5,
        max_context_tokens: int = 4000
    ):
        """
        初始化 RAG 系统
        
        Args:
            embedding_model: 嵌入模型
            vector_store: 向量数据库
            llm_client: LLM 客户端
            reranker: 重排序模型（可选）
            top_k: 检索数量
            max_context_tokens: 最大上下文token数
        """
        self.embedding_model = embedding_model
        self.vector_store = vector_store
        self.llm_client = llm_client
        self.reranker = reranker
        self.top_k = top_k
        self.max_context_tokens = max_context_tokens
    
    def index_documents(self, documents: List[Document]):
        """
        索引文档到向量库
        
        流程：分块 → 向量化 → 存储
        """
        from chunking import TextChunker
        
        chunker = TextChunker(chunk_size=500, overlap=50)
        
        all_chunks = []
        for doc in documents:
            chunks = chunker.split(doc.content)
            for i, chunk_text in enumerate(chunks):
                all_chunks.append({
                    "text": chunk_text,
                    "doc_id": doc.doc_id,
                    "chunk_index": i,
                    "metadata": doc.metadata
                })
        
        # 批量向量化
        texts = [c["text"] for c in all_chunks]
        embeddings = self.embedding_model.encode(texts)
        
        # 存入向量库
        self.vector_store.add(
            embeddings=embeddings,
            documents=all_chunks
        )
    
    def retrieve(
        self,
        query: str,
        filters: Optional[Dict] = None
    ) -> List[Dict]:
        """
        检索相关文档
        
        Args:
            query: 查询文本
            filters: 元数据过滤条件
        
        Returns:
            检索结果列表
        """
        # 查询向量化
        query_embedding = self.embedding_model.encode([query])[0]
        
        # 向量检索
        results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=self.top_k * 2 if self.reranker else self.top_k,
            filters=filters
        )
        
        # 重排序（如果配置）
        if self.reranker:
            results = self.reranker.rerank(query, results, top_k=self.top_k)
        
        return results
    
    def generate(
        self,
        query: str,
        retrieved_docs: List[Dict]
    ) -> Dict:
        """
        基于检索结果生成回答
        
        Args:
            query: 用户问题
            retrieved_docs: 检索到的文档
        
        Returns:
            {"answer": 回答, "sources": 来源}
        """
        # 构建上下文
        context = self._build_context(retrieved_docs)
        
        # 构建 Prompt
        prompt = self._build_prompt(query, context)
        
        # 调用 LLM
        response = self.llm_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "你是一个基于文档回答问题的助手。请基于提供的上下文回答问题，并标注引用来源。如果上下文不足以回答，请明确说明。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        answer = response.choices[0].message.content
        
        # 提取来源
        sources = [
            {
                "doc_id": doc["doc_id"],
                "chunk_index": doc["chunk_index"],
                "text_preview": doc["text"][:200] + "...",
                "metadata": doc["metadata"]
            }
            for doc in retrieved_docs
        ]
        
        return {
            "answer": answer,
            "sources": sources,
            "retrieved_count": len(retrieved_docs)
        }
    
    def query(self, question: str, filters: Optional[Dict] = None) -> Dict:
        """
        完整 RAG 查询流程
        
        Args:
            question: 用户问题
            filters: 过滤条件
        
        Returns:
            包含回答和来源的结果
        """
        # 1. 检索
        docs = self.retrieve(question, filters)
        
        # 2. 生成
        result = self.generate(question, docs)
        
        return result
    
    def _build_context(self, docs: List[Dict]) -> str:
        """构建上下文字符串"""
        context_parts = []
        for i, doc in enumerate(docs, 1):
            context_parts.append(f"[文档 {i}]\n{doc['text']}\n")
        
        return "\n".join(context_parts)
    
    def _build_prompt(self, query: str, context: str) -> str:
        """构建完整 Prompt"""
        return f"""请基于以下上下文回答问题。

上下文：
{context}

问题：{query}

要求：
1. 基于上下文回答，不要编造信息
2. 标注引用来源（如[文档1]、[文档2]）
3. 如果上下文不足，请明确说明""

# 使用示例
"""
# 初始化组件
embedding_model = SentenceTransformer("BAAI/bge-large-zh-v1.5")
vector_store = ChromaVectorStore()
llm_client = OpenAI()

# 创建 RAG 系统
rag = RAGSystem(
    embedding_model=embedding_model,
    vector_store=vector_store,
    llm_client=llm_client,
    top_k=5
)

# 索引文档
docs = [Document("RAG是一种检索增强生成技术...")]
rag.index_documents(docs)

# 查询
result = rag.query("什么是RAG？")
print(result["answer"])
print("来源:", result["sources"])
"""
```

---

## 四、RAG 评估体系

```python
"""
RAG 系统评估指标
"""

class RAGEvaluator:
    """RAG 评估器"""
    
    def __init__(self):
        self.metrics = {}
    
    def evaluate_retrieval(
        self,
        queries: List[str],
        ground_truth: List[List[str]],
        retrieved_results: List[List[str]]
    ) -> Dict:
        """
        评估检索质量
        
        指标：
        - Hit Rate@K：正确答案是否在 Top-K 中
        - MRR（Mean Reciprocal Rank）：正确答案排名的倒数均值
        - NDCG：考虑排序质量的折扣累积增益
        """
        hit_count = 0
        mrr_sum = 0
        
        for query, truth_docs, retrieved in zip(queries, ground_truth, retrieved_results):
            # Hit Rate
            if any(doc in retrieved[:self.k] for doc in truth_docs):
                hit_count += 1
            
            # MRR
            for rank, doc in enumerate(retrieved, 1):
                if doc in truth_docs:
                    mrr_sum += 1.0 / rank
                    break
        
        total = len(queries)
        return {
            "hit_rate@k": hit_count / total,
            "mrr": mrr_sum / total
        }
    
    def evaluate_generation(
        self,
        predictions: List[str],
        references: List[str]
    ) -> Dict:
        """
        评估生成质量
        
        指标：
        - Faithfulness：回答是否忠实于检索内容
        - Answer Relevance：回答与问题的相关性
        - Context Precision：检索内容的精确度
        """
        # 简化实现，实际可使用 ragas 库
        from ragas.metrics import faithfulness, answer_relevancy
        
        # faithfulness_score = faithfulness.score(predictions, contexts)
        # relevance_score = answer_relevancy.score(predictions, questions)
        
        return {
            "faithfulness": 0.0,  # 需实际计算
            "answer_relevance": 0.0
        }
    
    def evaluate_end_to_end(
        self,
        test_cases: List[Dict]
    ) -> Dict:
        """
        端到端评估
        
        test_case 格式：
        {
            "question": "问题",
            "ground_truth": "标准答案",
            "expected_sources": ["doc1", "doc2"]
        }
        """
        results = []
        
        for case in test_cases:
            # 执行 RAG
            rag_result = self.rag.query(case["question"])
            
            # 评估
            result = {
                "question": case["question"],
                "predicted_answer": rag_result["answer"],
                "ground_truth": case["ground_truth"],
                "retrieved_sources": [s["doc_id"] for s in rag_result["sources"]],
                "expected_sources": case["expected_sources"]
            }
            results.append(result)
        
        return {
            "total_cases": len(test_cases),
            "results": results
        }

"""
评估数据集构建建议：

├── 问题类型覆盖
│   ├── 事实性问题（What/Who/When）
│   ├── 解释性问题（Why/How）
│   ├── 比较性问题（Compare A and B）
│   ├── 多跳问题（需要多个文档推理）
│   └── 否定问题（确认某事未发生）
├── 难度分级
│   ├── 简单：答案在单文档中直接出现
│   ├── 中等：需要跨段落整合
│   └── 困难：需要推理或计算
└── 负面案例
    ├── 知识库中无答案的问题
    ├── 模糊/歧义问题
    └── 需要实时信息的问题
"""
```

---

## 五、AI产品经理关注点

```
RAG 产品化要点：

需求分析：
├── 知识库范围
│   ├── 文档类型（PDF/Word/网页/数据库）
│   ├── 数据规模（百/千/万/百万级）
│   ├── 更新频率（实时/日/周/月）
│   └── 多语言支持
├── 查询场景
│   ├── 问答精度要求
│   ├── 响应时间要求（<2s/<5s/可异步）
│   ├── 多轮对话支持
│   └── 多模态查询（图文混合）
└── 合规要求
    ├── 数据隐私（敏感信息过滤）
    ├── 回答溯源（审计要求）
    └── 权限控制（不同用户可见不同内容）

技术选型决策：
├── Embedding 模型
│   ├── 中文场景：BGE-M3、text-embedding-v3
│   ├── 英文场景：text-embedding-3-large
│   └── 多语言：E5-Mistral、BGE-M3
├── 向量数据库
│   ├── 小规模（<10万）：Chroma、FAISS
│   ├── 中规模（10万-1000万）：Milvus、Weaviate
│   └── 大规模（>1000万）：Milvus、Elasticsearch
├── 分块策略
│   ├── 固定长度：简单通用
│   ├── 语义分块：质量更好
│   └── 结构感知：适合结构化文档
└── 重排序
    ├── 轻量：Cross-Encoder（BGE-Reranker）
    └── 重型：LLM-based Rerank

用户体验设计：
├── 回答展示
│   ├── 高亮引用来源
│   ├── 展开查看原文
│   └── 置信度指示
├── 交互优化
│   ├── 追问建议
│   ├── 相关文档推荐
│   └── 反馈机制（点赞/点踩/纠正）
└── 异常处理
    ├── 无结果提示
    ├── 低置信度警告
    └── 人工介入入口

关键指标：
├── 检索指标
│   ├── Hit Rate@5/10
│   └── MRR
├── 生成指标
│   ├── Faithfulness
│   ├── Answer Relevance
│   └── 人工评分
├── 业务指标
│   ├── 回答采纳率
│   ├── 用户满意度
│   └── 问题解决率
└── 成本指标
    ├── 单次查询成本
    └── 索引构建成本
```

---

## 六、参考资源

- [LangChain RAG Documentation](https://python.langchain.com/docs/use_cases/question_answering/)
- [LlamaIndex RAG Guide](https://docs.llamaindex.ai/en/stable/getting_started/concepts/)
- [RAG Survey Paper](https://arxiv.org/abs/2312.10997)
- [RAGAS Evaluation Framework](https://docs.ragas.io/)
- [BGE Embedding Models](https://github.com/FlagOpen/FlagEmbedding)

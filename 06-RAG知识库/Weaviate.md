<!--
  文件描述: Weaviate向量数据库详解，涵盖产品特性、核心功能、云部署与性能优化
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-05
-->

# Weaviate

> Weaviate 是一款开源的语义向量搜索引擎，支持多种索引类型、原生多模态数据处理和 GraphQL/API 混合查询

---

## 前置知识

阅读本节前，建议先了解以下内容：

| 前置章节 | 关联点 |
|---------|-------|
| [向量数据库](./向量数据库.md) | 理解向量数据库的基本概念和索引算法 |
| [Embedding](./Embedding.md) | Weaviate 支持多种 Embedding 模型的集成 |
| [RAG基础](./RAG基础.md) | Weaviate 是 RAG 系统的生产级存储方案 |
| [HybridSearch](./HybridSearch.md) | Weaviate 原生支持混合搜索，是混合检索的理想选择 |

---

## 一、Weaviate 概述

### 1.1 产品定位

```
Weaviate 定位：

核心特点
├── 原生向量搜索：专注语义匹配，无需外部向量库
├── 多模态支持：文本、图像、视频、音频向量
├── 多种索引：HNSW、BM25、Hybrid（向量+关键词）
├── 实时索引：写入即索引，无需手动触发
├── GraphQL API：灵活的查询接口
├── 内置模块化：支持 OpenAI、Transformers、HuggingFace 等
├── 多租户：Namespace 隔离
└── 云原生：Kubernetes 原生支持

适用场景
├── 语义搜索（智能问答、内容推荐）
├── 多模态检索（图片搜图片、图文联合检索）
├── 推荐系统（用户兴趣向量匹配）
├── 文档去重（语义相似度检测）
└── 知识图谱（实体关系向量化）

版本类型
├── Weaviate Community：开源免费，单节点
├── Weaviate Enterprise：企业版，分布式集群
└── Weaviate Cloud Services (WCS)：全托管云服务
```

### 1.2 架构特点

```
Weaviate 架构特点：

模块化设计
├── 数据存储：Segments → 持久化存储
├── 索引层：HNSW 索引 + 倒排索引
├── 查询层：矢量 + 标量混合查询
└── API 层：RESTful + GraphQL

核心优势
├── 写入时索引：无需后台任务
├── 自动分片：数据自动分布
├── 向量压缩：PQ/SQ 量化支持
├── 混合搜索：向量 + BM25 原生融合
└── 多租户：Namespace 逻辑隔离

数据类型
├── 原始数据：文本、JSON、PDF
├── 向量数据：Text2Vec、Img2Vec
└── 引用关系：Cross-References（图关系）
```

---

## 二、快速开始

### 2.1 部署方式

```python
"""
Weaviate 部署方式

方式1：Docker Compose（开发测试）
方式2：Kubernetes（生产环境）
方式3：Weaviate Cloud Services（云托管）
"""

# Docker Compose 部署
"""
# 1. 创建 docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.4'
services:
  weaviate:
    image: semitechnologies/weaviate:latest
    ports:
      - "8080:8080"
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
      PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
      ENABLE_MODULES: 'text2vec-openai'
      CLUSTER_HOSTNAME: 'node1'
EOF

# 2. 启动服务
docker-compose up -d

# 3. 验证
curl http://localhost:8080/v1/.well-known/ready
"""

# Python 客户端安装
# pip install weaviate-client

import weaviate

class WeaviateSetup:
    """Weaviate 初始化设置"""
    
    def __init__(
        self,
        url: str = "http://localhost:8080",
        api_key: str = None
    ):
        """
        连接 Weaviate
        
        Args:
            url: Weaviate 服务地址
            api_key: API Key（使用云服务时需要）
        """
        auth_config = None
        if api_key:
            auth_config = weaviate.AuthApiKey(api_key=api_key)
        
        self.client = weaviate.Client(
            url=url,
            auth_client_secret=auth_config
        )
        
        print(f"已连接到 Weaviate: {url}")
    
    def is_ready(self) -> bool:
        """检查服务状态"""
        return self.client.is_ready()
    
    def create_schema(self, class_obj: dict):
        """
        创建数据类（Collection）
        
        Args:
            class_obj: 类的定义字典
        """
        self.client.schema.create_class(class_obj)
        print(f"类 '{class_obj['class']}' 创建成功")

# 使用示例
"""
setup = WeaviateSetup()

# 定义文档类
document_class = {
    "class": "Document",
    "description": "知识库文档",
    "vectorizer": "text2vec-openai",  # 自动向量化
    "moduleConfig": {
        "text2vec-openai": {
            "vectorizeClassName": False
        }
    },
    "properties": [
        {"name": "title", "dataType": ["text"]},
        {"name": "content", "dataType": ["text"]},
        {"name": "category", "dataType": ["text"]}
    ],
    "vectorIndexConfig": {
        "distance": "cosine"
    }
}

setup.create_schema(document_class)
"""
```

### 2.2 数据操作

```python
"""
Weaviate 数据 CRUD 操作
"""

import weaviate

class WeaviateCRUD:
    """Weaviate CRUD 操作"""
    
    def __init__(self, class_name: str):
        self.client = weaviate.Client("http://localhost:8080")
        self.class_name = class_name
    
    def insert(
        self,
        data_objects: list,
        vectors: list = None
    ):
        """
        插入数据
        
        Args:
            data_objects: 数据对象列表，每个对象包含 properties
            vectors: 向量列表（可选，不提供则自动生成）
        """
        self.client.data_object.create_many(
            class_name=self.class_name,
            data_object_list=data_objects,
            vector_list=vectors
        )
        print(f"成功插入 {len(data_objects)} 条记录")
    
    def insert_single(
        self,
        properties: dict,
        vector: list = None,
        uuid: str = None
    ):
        """
        插入单条数据
        
        Returns:
            生成的 UUID
        """
        uuid = self.client.data_object.create(
            class_name=self.class_name,
            data_object=properties,
            vector=vector
        )
        return uuid
    
    def search(
        self,
        query: str,
        limit: int = 10,
        properties: list = None,
        filters: dict = None
    ) -> list:
        """
        向量语义搜索
        
        Args:
            query: 查询文本
            limit: 返回数量
            properties: 返回属性
            filters: 过滤条件
        
        Returns:
            搜索结果列表
        """
        response = (
            self.client.query
            .get(self.class_name, properties or ["title", "content", "category"])
            .with_near_text({"concepts": [query]})
            .with_limit(limit)
        )
        
        if filters:
            response = response.with_where(filters)
        
        result = response.do()
        
        return result.get("data", {}).get("Get", {}).get(self.class_name, [])
    
    def bm25_search(
        self,
        query: str,
        limit: int = 10,
        properties: list = None
    ) -> list:
        """
        BM25 关键词搜索
        
        基于传统 TF-IDF 的相关性排序
        """
        response = (
            self.client.query
            .get(self.class_name, properties or ["title", "content"])
            .with_bm25(
                query=query,
                properties=["title", "content"]
            )
            .with_limit(limit)
            .do()
        )
        
        return response.get("data", {}).get("Get", {}).get(self.class_name, [])
    
    def hybrid_search(
        self,
        query: str,
        limit: int = 10,
        properties: list = None,
        alpha: float = 0.7
    ) -> list:
        """
        混合搜索（向量 + BM25）
        
        Args:
            query: 查询文本
            alpha: 权重，1.0=纯向量，0.0=纯BM25
        """
        response = (
            self.client.query
            .get(self.class_name, properties or ["title", "content", "_score"])
            .with_hybrid(
                query=query,
                alpha=alpha,  # 0.7 = 70% 向量, 30% BM25
                properties=["title", "content"]
            )
            .with_limit(limit)
            .do()
        )
        
        return response.get("data", {}).get("Get", {}).get(self.class_name, [])
    
    def near_vector_search(
        self,
        vector: list,
        limit: int = 10
    ) -> list:
        """
        使用向量进行搜索
        """
        response = (
            self.client.query
            .get(self.class_name, ["title", "content", "_distance"])
            .with_near_vector({"vector": vector})
            .with_limit(limit)
            .do()
        )
        
        return response.get("data", {}).get("Get", {}).get(self.class_name, [])
    
    def update(self, uuid: str, properties: dict):
        """
        更新数据
        """
        self.client.data_object.update(
            class_name=self.class_name,
            uuid=uuid,
            data_object=properties
        )
        print(f"已更新 {uuid}")
    
    def delete(self, uuid: str):
        """
        删除数据
        """
        self.client.data_object.delete(
            class_name=self.class_name,
            uuid=uuid
        )
        print(f"已删除 {uuid}")

# 使用示例
"""
crud = WeaviateCRUD("Document")

# 插入数据
crud.insert([
    {"title": "AI 技术发展", "content": "人工智能技术的快速发展...", "category": "AI"},
    {"title": "云计算架构", "content": "云计算的分布式架构设计...", "category": "Infra"}
])

# 语义搜索
results = crud.search("人工智能相关", limit=5)

# BM25 搜索
results = crud.bm25_search("AI 技术", limit=5)

# 混合搜索
results = crud.hybrid_search("深度学习框架", alpha=0.7)

# 使用已有向量搜索
results = crud.near_vector_search(some_vector, limit=5)
"""
```

---

## 三、高级功能

### 3.1 GraphQL 查询

```python
"""
Weaviate GraphQL 高级查询

Weaviate 提供强大的 GraphQL 接口，支持复杂查询
"""

class WeaviateGraphQL:
    """Weaviate GraphQL 高级查询"""
    
    def __init__(self):
        self.client = weaviate.Client("http://localhost:8080")
    
    def grouped_query(self, queries: list, limit_per_group: int = 3):
        """
        分组查询（Grouped Query）
        
        对多个查询词进行语义聚合
        """
        response = (
            self.client.query
            .get("Article", ["title", "summary"])
            .with_group(
                {
                    "type": "closest",
                    "resultsPerGroup": limit_per_group
                }
            )
            .with_limit(10)
            .do()
        )
        
        return response
    
    def aggregate_query(
        self,
        group_by: str = None,
        filters: dict = None
    ):
        """
        聚合查询
        
        类似于 SQL 的 GROUP BY + COUNT
        """
        response = (
            self.client.query
            .aggregate(self.class_name)
            .with_fields("category count")
            .with_group_by_filter([group_by])
        )
        
        if filters:
            response = response.with_where(filters)
        
        result = response.do()
        return result
    
    def cross_reference_query(self, source_uuid: str, ref_name: str):
        """
        交叉引用查询
        
        查询引用其他类的对象
        """
        response = (
            self.client.query
            .get("Article", ["title", "hasAuthor { ... on Author { name } }"])
            .with_get(ref_name, {"id": source_uuid})
            .do()
        )
        
        return response
    
    def near_object_query(self, source_uuid: str, limit: int = 5):
        """
        NearObject 查询
        
        查找与指定对象最相似的其他对象
        """
        response = (
            self.client.query
            .get(self.class_name, ["title", "_distance"])
            .with_near_object({"id": source_uuid})
            .with_limit(limit)
            .do()
        )
        
        return response
    
    def near_image_query(self, image_path: str, limit: int = 5):
        """
        NearImage 查询（多模态）
        
        使用图像进行相似搜索
        """
        # 读取图像文件并转为 base64
        import base64
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")
        
        response = (
            self.client.query
            .get("Image", ["image_url", "_distance"])
            .with_near_image({"image": image_b64})
            .with_limit(limit)
            .do()
        )
        
        return response

# 使用示例
"""
gql = WeaviateGraphQL()

# 聚合查询
category_stats = gql.aggregate_query(group_by="category")

# NearObject 查询
similar = gql.near_object_query(source_uuid="uuid-xxx", limit=5)

# NearImage 查询
image_results = gql.near_image_query("/path/to/image.jpg")
"""
```

### 3.2 多租户与命名空间

```python
"""
Weaviate 多租户支持

通过租户隔离实现数据分离
"""

class WeaviateMultiTenant:
    """Weaviate 多租户管理"""
    
    def __init__(self):
        self.client = weaviate.Client("http://localhost:8080")
    
    def create_tenant_collection(
        self,
        class_name: str,
        tenant_names: list
    ):
        """
        创建支持多租户的集合
        
        启用 multi-tenancy 后，数据自动隔离
        """
        class_obj = {
            "class": class_name,
            "multiTenancyConfig": {
                "enabled": True
            },
            "properties": [
                {"name": "title", "dataType": ["text"]},
                {"name": "content", "dataType": ["text"]}
            ]
        }
        
        self.client.schema.create_class(class_obj)
        
        # 创建租户
        tenants = [{"name": name} for name in tenant_names]
        self.client.schema.create_tenants(class_name, tenants)
        
        print(f"已创建 {len(tenant_names)} 个租户")
    
    def insert_for_tenant(
        self,
        class_name: str,
        tenant_name: str,
        properties: dict,
        vector: list = None
    ):
        """
        向指定租户插入数据
        """
        self.client.data_object.create(
            class_name=class_name,
            data_object=properties,
            vector=vector,
            tenant=tenant_name
        )
    
    def search_in_tenant(
        self,
        class_name: str,
        tenant_name: str,
        query: str,
        limit: int = 10
    ):
        """
        在指定租户中搜索
        """
        response = (
            self.client.query
            .get(class_name, ["title", "content"])
            .with_near_text({"concepts": [query]})
            .with_limit(limit)
            .with_tenant(tenant_name)
            .do()
        )
        
        return response

# 使用示例
"""
multi_tenant = WeaviateMultiTenant()

# 创建支持多租户的集合
multi_tenant.create_tenant_collection(
    class_name="TenantDocument",
    tenant_names=["company_a", "company_b", "company_c"]
)

# 各租户独立操作
multi_tenant.insert_for_tenant(
    "TenantDocument",
    "company_a",
    {"title": "A公司文档", "content": "..."}
)

results = multi_tenant.search_in_tenant(
    "TenantDocument",
    "company_a",
    "相关查询",
    limit=5
)
"""
```

### 3.3 向量化模块

```python
"""
Weaviate 向量化模块

支持多种向量化后端
"""

VECTORIZER_MODULES = {
    # OpenAI 系列
    "text2vec-openai": {
        "model": "ada",
        "modelVersion": "002",
        "type": "OpenAI"
    },
    
    # Cohere
    "text2vec-cohere": {
        "model": "embed-multilingual-v3.0",
        "truncate": "RIGHT"
    },
    
    # HuggingFace 本地模型
    "text2vec-transformers": {
        "model": "sentence-transformers/all-MiniLM-L6-v2",
        "poolingStrategy": "masked_mean"
    },
    
    # 图像向量化
    "img2vec-neural": {
        "model": "ResNet50"
    }
}

class WeaviateVectorizer:
    """Weaviate 向量化配置"""
    
    def __init__(self):
        self.client = weaviate.Client("http://localhost:8080")
    
    def create_with_openai_vectorizer(
        self,
        class_name: str,
        dimension: int = 1536
    ):
        """
        使用 OpenAI 向量化器创建类
        """
        class_obj = {
            "class": class_name,
            "description": "使用 OpenAI 向量化",
            "vectorizer": "text2vec-openai",
            "moduleConfig": {
                "text2vec-openai": {
                    "vectorizeClassName": False,
                    "model": "text-embedding-3-small",
                    "dimensions": dimension
                }
            },
            "properties": [
                {"name": "text", "dataType": ["text"]}
            ],
            "vectorIndexConfig": {
                "distance": "cosine"
            }
        }
        
        self.client.schema.create_class(class_obj)
        print(f"已创建类 '{class_name}'，使用 OpenAI 向量化")
    
    def create_with_local_vectorizer(
        self,
        class_name: str,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    ):
        """
        使用本地 HuggingFace 模型向量化
        """
        class_obj = {
            "class": class_name,
            "description": "使用本地 Transformer 模型",
            "vectorizer": "text2vec-transformers",
            "moduleConfig": {
                "text2vec-transformers": {
                    "vectorizeClassName": False,
                    "model": model_name
                }
            },
            "properties": [
                {"name": "text", "dataType": ["text"]}
            ]
        }
        
        self.client.schema.create_class(class_obj)
        print(f"已创建类 '{class_name}'，使用本地模型: {model_name}")
    
    def batch_vectorize(
        self,
        class_name: str,
        texts: list
    ) -> list:
        """
        批量向量化文本（手动触发）
        """
        # 构造批量请求
        batch_data = []
        for text in texts:
            batch_data.append({
                "class": class_name,
                "properties": {"text": text}
            })
        
        # 批量导入（自动向量化）
        self.client.batch.configure_batch_size(
            batch_size=100,
            dynamic=True
        )
        
        with self.client.batch as batch:
            for item in batch_data:
                batch.add_data_object(item)
        
        return [f"uuid-{i}" for i in range(len(texts))]

# 使用示例
"""
vectorizer = WeaviateVectorizer()

# 使用 OpenAI 向量化
vectorizer.create_with_openai_vectorizer(
    class_name="OpenAIDocument",
    dimension=1536
)

# 使用本地模型
vectorizer.create_with_local_vectorizer(
    class_name="LocalDocument",
    model_name="BAAI/bge-small-zh-v1.5"
)
"""
```

---

## 四、部署与运维

### 4.1 Kubernetes 部署

```yaml
# Weaviate Helm 部署配置
# helm repo add weaviate https://weaviate.github.io/weaviate-helm/
# helm install my-weaviate weaviate/weaviate

image:
  repository: semitechnologies/weaviate
  tag: latest
  
replicaCount: 3

env:
  # 认证
  AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'false'
  AUTHENTICATION_APIKEY_ENABLED: 'true'
  
  # 限制
  QUERY_DEFAULTS_LIMIT: 25
  AUTHENTICATION_APIKEY_ALLOWED_KEYS: 'your-api-key'
  
  # 向量化模块
  ENABLE_MODULES: 'text2vec-openai,text2vec-transformers'
  
  # 集群配置
  CLUSTER_HOSTNAME: 'node1'
  PERSISTENCE_DATA_PATH: '/var/lib/weaviate'

# 资源配额
resources:
  requests:
    cpu: "2"
    memory: "4Gi"
  limits:
    cpu: "4"
    memory: "8Gi"

# 持久化存储
persistence:
  enabled: true
  size: 100Gi
  storageClass: "ssd"

# Service 配置
service:
  type: ClusterIP
  port: 8080

# Ingress 配置
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: weaviate.example.com
      paths:
        - path: /
  tls:
    - secretName: weaviate-tls
      hosts:
        - weaviate.example.com
```

### 4.2 性能调优

```
Weaviate 性能优化指南：

索引配置优化
├── vectorIndexConfig
│   ├── HNSW 参数
│   │   ├── efConstruction：构建时精度（默认 128）
│   │   ├── ef：搜索时精度（默认 128）
│   │   └── maxConnections：边数（默认 32）
│   └── 压缩
│       ├── quantization：PQ/SQ 量化
│       └── vectorCacheMaxObjects：缓存大小
│
└── invertedIndexConfig
    ├── BM25 参数
    │   ├── b：词频归一化（默认 0.75）
    │   └── k1：词频权重（默认 1.2）
    └── 索引优化
        ├── indexTimestamps：时间戳索引
        └── indexPropertyLength：长度索引

内存优化
├── 向量缓存
│   └── vectorCacheMaxObjects：根据可用内存调整
├── 查询并发
│   └── GOMAXPROCS：CPU 核心数
└── 批量写入
    └── 批量大小：100-1000 条/批

模块选择
├── OpenAI/Cohere：云服务，简单但有成本
├── Transformers：本地部署，零成本但占用资源
└── Contextionary：Weaviate 原生词向量
```

---

## 五、AI产品经理关注点

```
Weaviate 产品化要点：

核心优势
├── 开源可控：无供应商锁定风险
├── 混合搜索：向量 + BM25 原生融合
├── 多模态：文本、图像、视频统一处理
├── 实时索引：写入即搜索，无需等待
└── 模块丰富：多种向量化后端可选

选型决策
├── 场景匹配
│   ├── 语义 + 关键词混合：Weaviate（原生混合）
│   ├── 纯语义搜索：Weaviate / Milvus
│   └── 多模态需求：Weaviate（原生支持）
├── 团队能力
│   ├── 有 ML 团队：本地 Transformers
│   └── 快速上线：OpenAI/Cohere 模块
└── 成本考量
    ├── 向量生成成本（OpenAI API）
    └── 基础设施成本（自建 vs WCS）

成本模型
├── API 调用成本
│   └── OpenAI text-embedding-3-small: $0.02/1M tokens
├── 基础设施成本
│   ├── 3节点集群：~$300/月（云服务）
│   └── 自建：服务器 + 运维
└── 优化方向
    ├── 使用更小的向量维度
    └── 缓存热点查询结果

竞品对比
├── vs Milvus
│   ├── Milvus：大规模数据（亿级）、分布式
│   └── Weaviate：易用性、混合搜索、多模态
├── vs Chroma
│   ├── Chroma：轻量级、快速原型
│   └── Weaviate：生产级、功能丰富
└── vs Elasticsearch
    ├── ES：全文检索为主
    └── Weaviate：向量检索为主
```

---

## 六、延伸阅读与参考资源

### 相关章节

| 章节 | 关联说明 |
|------|---------|
| [向量数据库](./向量数据库.md) | 向量数据库的通用原理和选型对比 |
| [Chroma](./Chroma.md) | 对比轻量级向量库，适合快速原型 |
| [Milvus](./Milvus.md) | 对比分布式向量库，适合超大规模场景 |
| [HybridSearch](./HybridSearch.md) | Weaviate 原生混合搜索的实现细节 |
| [Recall](./Recall.md) | Weaviate 的检索接口是召回策略的实现 |
| [企业知识库设计](./企业知识库设计.md) | Weaviate 的多租户和企业级部署 |
| [RAG基础](./RAG基础.md) | Weaviate 在 RAG 全链路中的位置 |

### 外部资源

- [Weaviate 官方文档](https://weaviate.io/developers/weaviate)
- [Weaviate GitHub](https://github.com/weaviate/weaviate)
- [Weaviate Academy](https://weaviate.io/developers/academy) - 官方教程
- [Weaviate Cloud Services](https://console.weaviate.cloud/) - 云托管平台
- [Weaviate Examples](https://github.com/weaviate/recipes) - 示例代码

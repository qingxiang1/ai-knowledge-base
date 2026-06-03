<!--
  文件描述: Milvus向量数据库详解，涵盖架构设计、核心功能、部署运维与性能优化
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Milvus

> Milvus 是一款开源的分布式向量数据库，专为 AI 应用和大规模向量检索设计，支持十亿级向量的高性能搜索

---

## 一、Milvus 概述

### 1.1 产品定位

```
Milvus 定位：

核心特点
├── 云原生架构：存储计算分离，支持水平扩展
├── 十亿级规模：支持超大规模向量数据
├── 高性能：GPU 加速，毫秒级查询延迟
├── 多索引类型：FLAT、IVF、HNSW、DiskANN 等
├── 混合搜索：向量相似度 + 标量过滤
├── 多租户：RBAC 权限控制、资源组隔离
└── 生态丰富：支持多种语言和框架

适用场景
├── 大规模推荐系统（十亿级商品向量）
├── 企业知识库（百万-千万级文档）
├── 图像/视频检索（海量多媒体内容）
├── 生物信息学（基因序列匹配）
└── 自动驾驶（高精地图检索）

版本演进
├── Milvus 1.x：基于 GPU 的单机版本
├── Milvus 2.x：云原生分布式架构（当前主流）
└── Zilliz Cloud：Milvus 的商业托管版本
```

### 1.2 系统架构

```
Milvus 2.x 分布式架构：

接入层（Access Layer）
├── Proxy：请求入口，负载均衡
├── 处理：请求校验、路由分发
└── 协议：gRPC / RESTful API

协调服务（Coordinator Service）
├── Root Coord：全局元数据管理
├── Data Coord：数据管理、分配
├── Query Coord：查询调度、负载均衡
└── Index Coord：索引任务调度

执行节点（Worker Node）
├── Query Node：查询执行、向量搜索
├── Data Node：数据插入、持久化
└── Index Node：索引构建（可独立扩展）

存储层（Storage）
├── 对象存储：MinIO / S3（原始数据）
├── 消息队列：Pulsar / Kafka（增量数据）
└── 元数据：etcd（集群状态）

数据流：
写入：Client → Proxy → Pulsar → Data Node → MinIO
查询：Client → Proxy → Query Coord → Query Node → 返回结果
索引：Data Coord → Index Node → 构建索引 → MinIO
```

---

## 二、快速开始

### 2.1 部署安装

```python
"""
Milvus 部署方式

方式1：Docker Compose（推荐开发测试）
方式2：Kubernetes（生产环境）
方式3：Zilliz Cloud（全托管）
"""

# Docker Compose 部署
"""
# 1. 下载配置文件
wget https://github.com/milvus-io/milvus/releases/download/v2.3.3/milvus-standalone-docker-compose.yml -O docker-compose.yml

# 2. 启动服务
docker-compose up -d

# 3. 验证状态
docker-compose ps

# 4. 连接信息
# - Host: localhost
# - Port: 19530 (gRPC) / 9091 (REST)
"""

# Python 客户端安装
# pip install pymilvus

from pymilvus import connections, FieldSchema, CollectionSchema, DataType, Collection

class MilvusSetup:
    """Milvus 初始化设置"""
    
    def __init__(self, host: str = "localhost", port: str = "19530"):
        """建立连接"""
        connections.connect(
            alias="default",
            host=host,
            port=port
        )
        print(f"已连接到 Milvus: {host}:{port}")
    
    def create_collection(
        self,
        name: str,
        dim: int = 768,
        metric_type: str = "COSINE",
        description: str = ""
    ) -> Collection:
        """
        创建集合
        
        Args:
            name: 集合名称
            dim: 向量维度
            metric_type: 距离度量（L2/IP/COSINE）
            description: 描述
        """
        # 定义字段
        fields = [
            FieldSchema(name="id", dtype=DataType.VARCHAR, is_primary=True, max_length=100),
            FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=dim),
            FieldSchema(name="title", dtype=DataType.VARCHAR, max_length=500),
            FieldSchema(name="category", dtype=DataType.VARCHAR, max_length=100),
            FieldSchema(name="timestamp", dtype=DataType.INT64)
        ]
        
        schema = CollectionSchema(fields, description)
        collection = Collection(name=name, schema=schema)
        
        print(f"集合 '{name}' 创建成功")
        return collection
    
    def create_index(
        self,
        collection: Collection,
        index_type: str = "HNSW",
        params: dict = None
    ):
        """
        创建索引
        
        Args:
            collection: 集合对象
            index_type: 索引类型（HNSW/IVF_FLAT/FLAT）
            params: 索引参数
        """
        default_params = {
            "HNSW": {"M": 16, "efConstruction": 200},
            "IVF_FLAT": {"nlist": 128},
            "FLAT": {}
        }
        
        index_params = params or default_params.get(index_type, {})
        
        collection.create_index(
            field_name="vector",
            index_params={
                "index_type": index_type,
                "metric_type": collection.schema.fields[1].params.get("metric_type", "COSINE"),
                "params": index_params
            }
        )
        
        print(f"索引 '{index_type}' 创建成功")
    
    def load_collection(self, collection: Collection):
        """加载集合到内存（查询前必须加载）"""
        collection.load()
        print(f"集合已加载到内存")

# 使用示例
"""
setup = MilvusSetup()

# 创建集合
collection = setup.create_collection(
    name="documents",
    dim=768,
    metric_type="COSINE"
)

# 创建索引
setup.create_index(collection, index_type="HNSW")

# 加载集合
setup.load_collection(collection)
"""
```

### 2.2 基础 CRUD

```python
"""
Milvus 基础数据操作
"""

import numpy as np
from pymilvus import Collection

class MilvusCRUD:
    """Milvus CRUD 操作"""
    
    def __init__(self, collection_name: str):
        self.collection = Collection(collection_name)
    
    def insert(
        self,
        ids: list,
        vectors: np.ndarray,
        titles: list = None,
        categories: list = None,
        timestamps: list = None
    ):
        """
        插入数据
        
        Args:
            ids: 唯一标识列表
            vectors: 向量矩阵 (n, dim)
            titles: 标题列表
            categories: 类别列表
            timestamps: 时间戳列表
        """
        entities = [
            ids,
            vectors.tolist(),
            titles or [""] * len(ids),
            categories or [""] * len(ids),
            timestamps or [0] * len(ids)
        ]
        
        insert_result = self.collection.insert(entities)
        self.collection.flush()  # 确保持久化
        
        print(f"成功插入 {len(ids)} 条记录")
        return insert_result
    
    def search(
        self,
        query_vectors: np.ndarray,
        top_k: int = 10,
        expr: str = None,
        output_fields: list = None
    ) -> list:
        """
        向量搜索
        
        Args:
            query_vectors: 查询向量 (n, dim)
            top_k: 返回结果数
            expr: 标量过滤表达式
            output_fields: 返回的字段列表
        
        Returns:
            搜索结果列表
        """
        search_params = {
            "metric_type": "COSINE",
            "params": {"ef": 64}  # HNSW 搜索参数
        }
        
        results = self.collection.search(
            data=query_vectors.tolist(),
            anns_field="vector",
            param=search_params,
            limit=top_k,
            expr=expr,
            output_fields=output_fields or ["title", "category"]
        )
        
        # 格式化结果
        formatted = []
        for i, result in enumerate(results):
            query_results = []
            for item in result:
                query_results.append({
                    "id": item.id,
                    "distance": item.distance,
                    "title": item.entity.get("title"),
                    "category": item.entity.get("category")
                })
            formatted.append({
                "query_index": i,
                "results": query_results
            })
        
        return formatted
    
    def query(
        self,
        expr: str,
        output_fields: list = None,
        limit: int = 100
    ) -> list:
        """
        标量查询（非向量搜索）
        
        类似 SQL 的 WHERE 查询
        """
        results = self.collection.query(
            expr=expr,
            output_fields=output_fields or ["id", "title", "category"],
            limit=limit
        )
        return results
    
    def delete(self, expr: str):
        """
        删除数据
        
        Args:
            expr: 删除条件表达式
        """
        self.collection.delete(expr)
        print(f"删除条件 '{expr}' 的数据")
    
    def upsert(
        self,
        ids: list,
        vectors: np.ndarray,
        **kwargs
    ):
        """
        更新或插入
        
        Milvus 2.3+ 支持 upsert
        """
        entities = [
            ids,
            vectors.tolist(),
            kwargs.get("titles", [""] * len(ids)),
            kwargs.get("categories", [""] * len(ids)),
            kwargs.get("timestamps", [0] * len(ids))
        ]
        
        self.collection.upsert(entities)
        print(f"成功 upsert {len(ids)} 条记录")

# 使用示例
"""
crud = MilvusCRUD("documents")

# 插入数据
import numpy as np
vectors = np.random.randn(100, 768).astype(np.float32)
vectors = vectors / np.linalg.norm(vectors, axis=1, keepdims=True)

crud.insert(
    ids=[f"doc_{i}" for i in range(100)],
    vectors=vectors,
    titles=[f"Document {i}" for i in range(100)],
    categories=["AI" if i % 2 == 0 else "Infra" for i in range(100)]
)

# 向量搜索
query = np.random.randn(1, 768).astype(np.float32)
query = query / np.linalg.norm(query)

results = crud.search(
    query_vectors=query,
    top_k=5,
    expr='category == "AI"',  # 只搜索 AI 类别
    output_fields=["title", "category"]
)

# 标量查询
ai_docs = crud.query(
    expr='category == "AI" && timestamp > 1000',
    limit=10
)

# 删除
crud.delete('id in ["doc_0", "doc_1"]')
"""
```

---

## 三、高级功能

### 3.1 分区与分片

```python
"""
Milvus 分区与分片

分区（Partition）：逻辑隔离，查询时可指定分区
分片（Shard）：数据水平分片，自动负载均衡
"""

class MilvusPartitioning:
    """Milvus 分区管理"""
    
    def __init__(self, collection: Collection):
        self.collection = collection
    
    def create_partition(self, partition_name: str):
        """创建分区"""
        self.collection.create_partition(partition_name)
        print(f"分区 '{partition_name}' 创建成功")
    
    def insert_into_partition(
        self,
        partition_name: str,
        ids: list,
        vectors: np.ndarray,
        **kwargs
    ):
        """向指定分区插入数据"""
        partition = self.collection.partition(partition_name)
        
        entities = [
            ids,
            vectors.tolist(),
            kwargs.get("titles", [""] * len(ids)),
            kwargs.get("categories", [""] * len(ids)),
            kwargs.get("timestamps", [0] * len(ids))
        ]
        
        partition.insert(entities)
        print(f"成功向分区 '{partition_name}' 插入 {len(ids)} 条记录")
    
    def search_partition(
        self,
        partition_names: list,
        query_vectors: np.ndarray,
        top_k: int = 10
    ):
        """在指定分区中搜索"""
        search_params = {
            "metric_type": "COSINE",
            "params": {"ef": 64}
        }
        
        results = self.collection.search(
            data=query_vectors.tolist(),
            anns_field="vector",
            param=search_params,
            limit=top_k,
            partition_names=partition_names
        )
        
        return results
    
    def drop_partition(self, partition_name: str):
        """删除分区"""
        self.collection.drop_partition(partition_name)
        print(f"分区 '{partition_name}' 已删除")

# 使用示例
"""
partition_mgr = MilvusPartitioning(collection)

# 按时间创建分区
partition_mgr.create_partition("2024_q1")
partition_mgr.create_partition("2024_q2")

# 向分区插入数据
partition_mgr.insert_into_partition(
    "2024_q1",
    ids=["doc_1", "doc_2"],
    vectors=vectors[:2]
)

# 只在特定分区搜索
results = partition_mgr.search_partition(
    partition_names=["2024_q1"],
    query_vectors=query,
    top_k=5
)
"""
```

### 3.2 多向量搜索

```python
"""
Milvus 多向量搜索（Multi-Vector Search）

场景：
1. 同一实体有多个向量表示（文本 + 图像）
2. 多路召回（稠密向量 + 稀疏向量）
3. 多模态检索
"""

from pymilvus import AnnSearchRequest, WeightedRanker, RRFRanker

class MilvusMultiVectorSearch:
    """Milvus 多向量搜索"""
    
    def __init__(self, collection: Collection):
        self.collection = collection
    
    def hybrid_search_dense_sparse(
        self,
        dense_vector: list,
        sparse_vector: dict,
        top_k: int = 10,
        dense_weight: float = 0.7,
        sparse_weight: float = 0.3
    ):
        """
        稠密向量 + 稀疏向量混合搜索
        
        需要集合同时有 dense_vector 和 sparse_vector 字段
        """
        # 稠密向量搜索请求
        dense_search = AnnSearchRequest(
            data=[dense_vector],
            anns_field="dense_vector",
            param={"metric_type": "COSINE", "params": {"ef": 64}},
            limit=top_k
        )
        
        # 稀疏向量搜索请求
        sparse_search = AnnSearchRequest(
            data=[sparse_vector],
            anns_field="sparse_vector",
            param={"metric_type": "IP", "params": {}},
            limit=top_k
        )
        
        # 加权融合
        rerank = WeightedRanker(dense_weight, sparse_weight)
        
        results = self.collection.hybrid_search(
            reqs=[dense_search, sparse_search],
            rerank=rerank,
            limit=top_k
        )
        
        return results
    
    def rrf_fusion_search(
        self,
        search_requests: list,
        top_k: int = 10,
        k: int = 60
    ):
        """
        RRF（Reciprocal Rank Fusion）融合搜索
        
        适用于多路召回的融合，无需调权重
        """
        rerank = RRFRanker(k)
        
        results = self.collection.hybrid_search(
            reqs=search_requests,
            rerank=rerank,
            limit=top_k
        )
        
        return results

# 使用示例
"""
multi_search = MilvusMultiVectorSearch(collection)

# 混合搜索
results = multi_search.hybrid_search_dense_sparse(
    dense_vector=query_dense,
    sparse_vector=query_sparse,
    top_k=10,
    dense_weight=0.6,
    sparse_weight=0.4
)
"""
```

### 3.3 动态 Schema

```python
"""
Milvus 动态 Schema

允许插入未预定义的字段，适合灵活的数据模型
"""

from pymilvus import DataType

class MilvusDynamicSchema:
    """Milvus 动态 Schema 使用"""
    
    def create_dynamic_collection(self, name: str, dim: int = 768):
        """
        创建支持动态字段的集合
        
        只需定义核心字段，其他字段可动态添加
        """
        fields = [
            FieldSchema(name="id", dtype=DataType.VARCHAR, is_primary=True, max_length=100),
            FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=dim)
        ]
        
        schema = CollectionSchema(
            fields,
            description="Dynamic schema collection",
            enable_dynamic_field=True  # 启用动态字段
        )
        
        collection = Collection(name=name, schema=schema)
        return collection
    
    def insert_with_dynamic_fields(
        self,
        collection: Collection,
        ids: list,
        vectors: np.ndarray,
        dynamic_fields: list
    ):
        """
        插入带动态字段的数据
        
        dynamic_fields: 每个文档的动态字段字典列表
        """
        entities = [
            ids,
            vectors.tolist()
        ]
        
        # Milvus 2.3+ 支持在插入时传入动态字段
        insert_result = collection.insert(
            entities,
            dynamic_fields=dynamic_fields
        )
        
        return insert_result

# 使用示例
"""
dynamic = MilvusDynamicSchema()
collection = dynamic.create_dynamic_collection("flexible_docs")

# 插入不同结构的数据
dynamic.insert_with_dynamic_fields(
    collection,
    ids=["doc1", "doc2"],
    vectors=vectors,
    dynamic_fields=[
        {"title": "AI文章", "author": "张三", "tags": ["AI", "ML"]},
        {"name": "产品说明", "version": "1.0", "price": 99.9}
    ]
)
"""
```

---

## 四、部署与运维

### 4.1 Kubernetes 部署

```yaml
# Milvus Helm 部署配置示例
# helm repo add milvus https://zilliztech.github.io/milvus-helm/
# helm install my-milvus milvus/milvus

cluster:
  enabled: true

nodeSelector: {}

tolerations: []

resources:
  proxy:
    requests:
      cpu: "1"
      memory: "2Gi"
    limits:
      cpu: "2"
      memory: "4Gi"
  
  queryNode:
    requests:
      cpu: "4"
      memory: "16Gi"
    limits:
      cpu: "8"
      memory: "32Gi"
  
  dataNode:
    requests:
      cpu: "2"
      memory: "8Gi"
    limits:
      cpu: "4"
      memory: "16Gi"

# 对象存储配置（生产环境使用 S3）
minio:
  enabled: true
  mode: standalone
  persistence:
    enabled: true
    size: 500Gi

# 消息队列
pulsar:
  enabled: true
  
# etcd 配置
etcd:
  enabled: true
  replicaCount: 3
```

### 4.2 监控与告警

```python
"""
Milvus 监控指标

Milvus 暴露 Prometheus 指标，可通过 Grafana 可视化
"""

MILVUS_KEY_METRICS = {
    "proxy": {
        "milvus_proxy_receive_bytes_total": "接收数据量",
        "milvus_proxy_send_bytes_total": "发送数据量",
        "milvus_proxy_req_count": "请求数",
        "milvus_proxy_latency_bucket": "请求延迟分布"
    },
    "query_node": {
        "milvus_query_node_search_latency": "搜索延迟",
        "milvus_query_node_segment_search_latency": "段搜索延迟",
        "milvus_query_node_entity_num": "加载的实体数"
    },
    "data_node": {
        "milvus_data_node_flush_latency": "刷新延迟",
        "milvus_data_node_compaction_latency": "压缩延迟"
    },
    "index_node": {
        "milvus_index_node_build_latency": "索引构建延迟",
        "milvus_index_node_index_task_count": "索引任务数"
    }
}

# 关键告警规则
ALERT_RULES = """
groups:
- name: milvus_alerts
  rules:
  - alert: MilvusHighLatency
    expr: histogram_quantile(0.99, milvus_proxy_latency_bucket) > 0.5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Milvus P99 延迟过高"
      
  - alert: MilvusQueryNodeOOM
    expr: milvus_query_node_memory_usage / milvus_query_node_memory_limit > 0.9
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Query Node 内存即将耗尽"
      
  - alert: MilvusLowRecall
    expr: milvus_query_node_search_recall < 0.95
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "搜索召回率低于阈值"
"""
```

---

## 五、性能优化

```
Milvus 性能优化指南：

索引优化
├── 索引类型选择
│   ├── 小数据量（< 100K）：FLAT
│   ├── 中数据量（100K-10M）：HNSW
│   ├── 大数据量（> 10M）：IVF_SQ8 / HNSW
│   └── 超大数据量（> 100M）：DiskANN
├── HNSW 参数调优
│   ├── M：16-32（召回率 vs 内存权衡）
│   ├── efConstruction：200-500（构建质量）
│   └── ef：top_k * 2-10（搜索精度）
└── 索引预热
    ├── 查询前调用 collection.load()
    └── 避免冷启动延迟

数据优化
├── 批量插入
│   ├── 推荐批次：1000-10000 条
│   └── 避免频繁小批量插入
├── 数据类型
│   ├── 使用 FLOAT_VECTOR 而非 DOUBLE
│   └── 标量字段选择合适类型
└── 分区策略
    ├── 按时间分区（便于清理旧数据）
    └── 按类别分区（减少搜索空间）

查询优化
├── 预过滤
│   ├── 先标量过滤，再向量搜索
│   └── 减少向量搜索空间
├── 输出字段
│   ├── 只返回必要字段
│   └── 减少数据传输
└── 并发控制
    ├── 合理设置查询并发数
    └── 避免 Query Node 过载

资源优化
├── 内存
│   ├── Query Node 内存 = 向量数据 + 索引
│   └── 预留 20% 缓冲
├── CPU
│   ├── 索引构建：CPU 密集型
│   └── 向量搜索：可 GPU 加速
└── 存储
    ├── 热数据：SSD
    └── 冷数据：对象存储
```

---

## 六、AI产品经理关注点

```
Milvus 产品化要点：

选型决策：
├── 数据规模
│   ├── < 100万：Chroma/pgvector（更简单）
│   ├── 100万-1亿：Milvus 单机或小型集群
│   └── > 1亿：Milvus 分布式集群
├── 团队能力
│   ├── 有 K8s 运维团队：自建 Milvus
│   └── 无运维团队：Zilliz Cloud
├── 预算
│   ├── 低预算：开源自建
│   └── 高预算：云托管（节省人力）
└── 延迟要求
    ├── < 10ms：内存优化 + GPU
    └── < 100ms：标准配置即可

成本模型：
├── 基础设施
│   ├── 计算：Query/Index/Data Node
│   ├── 存储：对象存储 + 本地缓存
│   └── 网络：跨可用区流量
├── 人力成本
│   ├── 运维：K8s 集群维护
│   ├── 调优：索引参数优化
│   └── 监控：告警体系搭建
└── 优化方向
    ├── 存储分层：热/温/冷数据
    ├── 资源调度：按需扩缩容
    └── 云原生：Spot 实例降低成本

关键指标：
├── 性能：P99 延迟 < 100ms
├── 召回率：> 95%
├── 可用性：> 99.9%
└── 成本：单查询成本 < $0.001
```

---

## 七、参考资源

- [Milvus 官方文档](https://milvus.io/docs)
- [Milvus GitHub](https://github.com/milvus-io/milvus)
- [Zilliz Cloud](https://zilliz.com/cloud) - Milvus 托管服务
- [Milvus Bootcamp](https://github.com/towhee-io/bootcamp) - 实践教程
- [Attu](https://github.com/zilliztech/attu) - Milvus GUI 管理工具

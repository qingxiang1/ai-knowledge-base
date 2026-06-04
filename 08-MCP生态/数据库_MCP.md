<!--
  文件描述: 数据库MCP集成案例，涵盖SQL数据库、NoSQL数据库及向量数据库的MCP化操作
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# 数据库 MCP

> 通过 MCP 协议与各类数据库集成，实现 SQL 查询、NoSQL 操作、向量检索等功能的 AI 化操作。

---

## 一、数据库 MCP 概述

### 1.1 什么是数据库 MCP

```
数据库 MCP 定义：

数据库 MCP Server
├── 本质：MCP 协议封装的数据库访问服务
├── 功能：将数据库能力暴露为 MCP 工具
├── 价值：让 AI 直接操作数据库
└── 场景：
    ├── 智能 SQL 查询
    ├── 数据自动迁移
    ├── 向量相似度检索
    └── 数据库监控告警

支持的数据库类型
├── 关系型数据库
│   ├── MySQL
│   ├── PostgreSQL
│   ├── SQLite
│   └── SQL Server
├── NoSQL 数据库
│   ├── MongoDB
│   ├── Redis
│   └── Elasticsearch
└── 向量数据库
    ├── ChromaDB
    ├── Pinecone
    ├── Milvus
    └── Qdrant

核心能力映射
├── 查询能力
│   ├── SQL 语句执行
│   ├── 聚合查询
│   ├── 分页查询
│   └── 参数化查询
├── 写入能力
│   ├── 单条插入
│   ├── 批量插入
│   ├── 更新操作
│   └── 删除操作
├── 管理能力
│   ├── 表结构查看
│   ├── 索引管理
│   ├── 权限控制
│   └── 备份恢复
└── 向量能力
    ├── 向量存储
    ├── 相似度检索
    ├── 向量索引
    └── 元数据过滤
```

### 1.2 核心价值

```python
"""
数据库 MCP 核心价值分析

从 AI 产品经理视角理解数据库 MCP 的价值
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class EfficiencyGain:
    """效率提升"""
    task: str
    manual_time: int  # 分钟
    automated_time: int  # 分钟
    accuracy_improvement: float  # 准确率提升百分比

class DatabaseMCPValue:
    """数据库 MCP 价值分析"""
    
    def __init__(self):
        """初始化价值分析"""
        self.gains = [
            EfficiencyGain(
                task="SQL 查询",
                manual_time=60,
                automated_time=5,
                accuracy_improvement=0.40
            ),
            EfficiencyGain(
                task="数据迁移",
                manual_time=180,
                automated_time=15,
                accuracy_improvement=0.35
            ),
            EfficiencyGain(
                task="向量检索",
                manual_time=90,
                automated_time=3,
                accuracy_improvement=0.30
            ),
            EfficiencyGain(
                task="数据监控",
                manual_time=120,
                automated_time=2,
                accuracy_improvement=0.25
            )
        ]
    
    def analyze(self) -> Dict:
        """
        分析效率提升
        
        Returns:
            分析结果
        """
        return {
            gain.task: {
                "手动耗时": f"{gain.manual_time} 分钟",
                "自动化耗时": f"{gain.automated_time} 分钟",
                "效率提升": f"{gain.manual_time / gain.automated_time:.1f}x",
                "准确率提升": f"{gain.accuracy_improvement:.0%}"
            }
            for gain in self.gains
        }

# 使用示例
"""
value = DatabaseMCPValue()
result = value.analyze()

for task, metrics in result.items():
    print(f"\n{task}:")
    for key, value in metrics.items():
        print(f"  {key}: {value}")
"""
```

---

## 二、环境配置

### 2.1 安装数据库 MCP Server

```bash
# 方式一：使用 npx（推荐）
npx -y @anthropic-ai/mcp-sqlite-server

# 方式二：使用 Docker
docker pull mcp/sqlite-server

# 方式三：源码安装
git clone https://github.com/anthropics/mcp-sqlite-server.git
cd mcp-sqlite-server
npm install
npm run build
```

### 2.2 数据库连接配置

```bash
# MySQL 配置
export MYSQL_HOST="localhost"
export MYSQL_PORT="3306"
export MYSQL_USER="root"
export MYSQL_PASSWORD="password"
export MYSQL_DATABASE="test_db"

# PostgreSQL 配置
export PG_HOST="localhost"
export PG_PORT="5432"
export PG_USER="postgres"
export PG_PASSWORD="password"
export PG_DATABASE="test_db"

# MongoDB 配置
export MONGO_URI="mongodb://localhost:27017"
export MONGO_DATABASE="test_db"

# Redis 配置
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export REDIS_PASSWORD=""

# ChromaDB 配置
export CHROMA_HOST="localhost"
export CHROMA_PORT="8000"
```

---

## 三、核心功能实现

### 3.1 SQL 数据库操作

```python
"""
数据库 MCP - SQL 数据库操作

通过 MCP 协议管理 SQL 数据库
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List, Optional, Any
import sqlite3
import os

mcp = FastMCP("sql-database-manager")

# SQLite 数据库路径
DB_PATH = os.getenv("SQLITE_DB_PATH", "database.db")


def get_connection():
    """
    获取数据库连接
    
    Returns:
        数据库连接对象
    """
    return sqlite3.connect(DB_PATH)


@mcp.tool()
def execute_query(sql: str, params: List = None) -> str:
    """
    执行 SQL 查询
    
    Args:
        sql: SQL 查询语句
        params: 查询参数（可选）
    
    Returns:
        查询结果
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        
        # 获取列名
        columns = [description[0] for description in cursor.description] if cursor.description else []
        
        # 获取结果
        rows = cursor.fetchall()
        
        # 格式化输出
        output = f"查询到 {len(rows)} 条记录:\n\n"
        
        # 表头
        if columns:
            output += " | ".join(columns) + "\n"
            output += "-" * (len(" | ".join(columns))) + "\n"
        
        # 数据行
        for row in rows:
            output += " | ".join(str(cell) for cell in row) + "\n"
        
        conn.close()
        return output
    
    except Exception as e:
        return f"查询错误: {str(e)}"


@mcp.tool()
def execute_update(sql: str, params: List = None) -> str:
    """
    执行 SQL 更新（INSERT/UPDATE/DELETE）
    
    Args:
        sql: SQL 更新语句
        params: 更新参数（可选）
    
    Returns:
        执行结果
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        
        conn.commit()
        affected_rows = cursor.rowcount
        conn.close()
        
        return f"执行成功，影响 {affected_rows} 行"
    
    except Exception as e:
        return f"执行错误: {str(e)}"


@mcp.tool()
def get_table_schema(table_name: str) -> str:
    """
    获取表结构
    
    Args:
        table_name: 表名
    
    Returns:
        表结构信息
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # 获取表结构
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        
        output = f"表 {table_name} 的结构:\n\n"
        output += "列名 | 类型 | 是否可空 | 默认值 | 主键\n"
        output += "-" * 60 + "\n"
        
        for col in columns:
            cid, name, type_, notnull, dflt_value, pk = col
            output += f"{name} | {type_} | {'NOT NULL' if notnull else 'NULL'} | {dflt_value or ''} | {'PK' if pk else ''}\n"
        
        # 获取索引信息
        cursor.execute(f"PRAGMA index_list({table_name})")
        indexes = cursor.fetchall()
        
        if indexes:
            output += f"\n索引:\n"
            for idx in indexes:
                seq, name, unique, origin, partial = idx
                output += f"  {name} {'(UNIQUE)' if unique else ''}\n"
        
        conn.close()
        return output
    
    except Exception as e:
        return f"获取表结构错误: {str(e)}"


@mcp.tool()
def list_tables() -> str:
    """
    列出所有表
    
    Returns:
        表列表
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        output = f"数据库中有 {len(tables)} 个表:\n\n"
        
        for table in tables:
            output += f"- {table[0]}\n"
        
        conn.close()
        return output
    
    except Exception as e:
        return f"获取表列表错误: {str(e)}"


@mcp.tool()
def create_table(table_name: str, columns: Dict[str, str]) -> str:
    """
    创建表
    
    Args:
        table_name: 表名
        columns: 列定义 {列名: 类型}
    
    Returns:
        创建结果
    """
    try:
        column_defs = ", ".join([f"{name} {type_}" for name, type_ in columns.items()])
        sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({column_defs})"
        
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        conn.close()
        
        return f"表 {table_name} 创建成功"
    
    except Exception as e:
        return f"创建表错误: {str(e)}"


@mcp.tool()
def batch_insert(table_name: str, columns: List[str], values: List[List]) -> str:
    """
    批量插入数据
    
    Args:
        table_name: 表名
        columns: 列名列表
        values: 数据值列表
    
    Returns:
        插入结果
    """
    try:
        placeholders = ", ".join(["?"] * len(columns))
        column_str = ", ".join(columns)
        sql = f"INSERT INTO {table_name} ({column_str}) VALUES ({placeholders})"
        
        conn = get_connection()
        cursor = conn.cursor()
        cursor.executemany(sql, values)
        conn.commit()
        
        inserted_count = cursor.rowcount
        conn.close()
        
        return f"成功插入 {inserted_count} 条记录"
    
    except Exception as e:
        return f"批量插入错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 3.2 向量数据库操作

```python
"""
数据库 MCP - 向量数据库操作

通过 MCP 协议管理向量数据库（以 ChromaDB 为例）
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List, Optional
import chromadb
import os
import json

mcp = FastMCP("vector-database-manager")

# ChromaDB 配置
CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))

# 初始化 ChromaDB 客户端
chroma_client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)


@mcp.tool()
def create_collection(name: str, metadata: Dict = None) -> str:
    """
    创建向量集合
    
    Args:
        name: 集合名称
        metadata: 集合元数据（可选）
    
    Returns:
        创建结果
    """
    try:
        collection = chroma_client.create_collection(
            name=name,
            metadata=metadata or {}
        )
        
        return f"集合 {name} 创建成功"
    
    except Exception as e:
        return f"创建集合错误: {str(e)}"


@mcp.tool()
def add_vectors(collection_name: str, ids: List[str], embeddings: List[List[float]], 
                documents: List[str] = None, metadatas: List[Dict] = None) -> str:
    """
    添加向量
    
    Args:
        collection_name: 集合名称
        ids: 向量 ID 列表
        embeddings: 向量嵌入列表
        documents: 文档内容列表（可选）
        metadatas: 元数据列表（可选）
    
    Returns:
        添加结果
    """
    try:
        collection = chroma_client.get_collection(name=collection_name)
        
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        
        return f"成功添加 {len(ids)} 个向量"
    
    except Exception as e:
        return f"添加向量错误: {str(e)}"


@mcp.tool()
def search_similar(collection_name: str, query_embedding: List[float], 
                   top_k: int = 5, filter_dict: Dict = None) -> str:
    """
    相似度检索
    
    Args:
        collection_name: 集合名称
        query_embedding: 查询向量
        top_k: 返回结果数量
        filter_dict: 过滤条件（可选）
    
    Returns:
        检索结果
    """
    try:
        collection = chroma_client.get_collection(name=collection_name)
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=filter_dict
        )
        
        output = f"找到 {len(results['ids'][0])} 个相似向量:\n\n"
        
        for i in range(len(results['ids'][0])):
            output += f"结果 {i+1}:\n"
            output += f"  ID: {results['ids'][0][i]}\n"
            output += f"  距离: {results['distances'][0][i]:.4f}\n"
            
            if results['documents'] and results['documents'][0]:
                output += f"  文档: {results['documents'][0][i]}\n"
            
            if results['metadatas'] and results['metadatas'][0]:
                output += f"  元数据: {json.dumps(results['metadatas'][0][i], ensure_ascii=False)}\n"
            
            output += "\n"
        
        return output
    
    except Exception as e:
        return f"检索错误: {str(e)}"


@mcp.tool()
def delete_vectors(collection_name: str, ids: List[str] = None, 
                   filter_dict: Dict = None) -> str:
    """
    删除向量
    
    Args:
        collection_name: 集合名称
        ids: 要删除的向量 ID 列表（可选）
        filter_dict: 过滤条件（可选）
    
    Returns:
        删除结果
    """
    try:
        collection = chroma_client.get_collection(name=collection_name)
        
        if ids:
            collection.delete(ids=ids)
            return f"成功删除 {len(ids)} 个向量"
        elif filter_dict:
            collection.delete(where=filter_dict)
            return f"成功删除符合条件的向量"
        else:
            return "请提供 IDs 或过滤条件"
    
    except Exception as e:
        return f"删除向量错误: {str(e)}"


@mcp.tool()
def get_collection_info(collection_name: str) -> str:
    """
    获取集合信息
    
    Args:
        collection_name: 集合名称
    
    Returns:
        集合信息
    """
    try:
        collection = chroma_client.get_collection(name=collection_name)
        
        count = collection.count()
        
        output = f"集合 {collection_name} 信息:\n\n"
        output += f"向量数量: {count}\n"
        
        # 获取部分数据查看结构
        if count > 0:
            sample = collection.peek(limit=1)
            output += f"\n示例数据:\n"
            output += f"  ID: {sample['ids'][0]}\n"
            if sample['documents']:
                output += f"  文档: {sample['documents'][0]}\n"
            if sample['metadatas']:
                output += f"  元数据: {json.dumps(sample['metadatas'][0], ensure_ascii=False)}\n"
        
        return output
    
    except Exception as e:
        return f"获取集合信息错误: {str(e)}"


@mcp.tool()
def list_collections() -> str:
    """
    列出所有集合
    
    Returns:
        集合列表
    """
    try:
        collections = chroma_client.list_collections()
        
        output = f"共有 {len(collections)} 个集合:\n\n"
        
        for collection in collections:
            output += f"- {collection.name}\n"
        
        return output
    
    except Exception as e:
        return f"获取集合列表错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 四、高级功能

### 4.1 数据库迁移

```python
"""
数据库 MCP - 数据库迁移

通过 MCP 协议实现数据库迁移
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List
import sqlite3
import os

mcp = FastMCP("database-migration-manager")


@mcp.tool()
def export_table_data(source_db: str, table_name: str, output_file: str) -> str:
    """
    导出表数据
    
    Args:
        source_db: 源数据库路径
        table_name: 表名
        output_file: 输出文件路径
    
    Returns:
        导出结果
    """
    try:
        conn = sqlite3.connect(source_db)
        cursor = conn.cursor()
        
        # 获取表数据
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        # 获取列名
        columns = [description[0] for description in cursor.description]
        
        # 写入文件
        with open(output_file, 'w', encoding='utf-8') as f:
            # 写入列名
            f.write(",".join(columns) + "\n")
            
            # 写入数据
            for row in rows:
                f.write(",".join(str(cell) for cell in row) + "\n")
        
        conn.close()
        
        return f"成功导出 {len(rows)} 条记录到 {output_file}"
    
    except Exception as e:
        return f"导出错误: {str(e)}"


@mcp.tool()
def import_table_data(target_db: str, table_name: str, input_file: str) -> str:
    """
    导入表数据
    
    Args:
        target_db: 目标数据库路径
        table_name: 表名
        input_file: 输入文件路径
    
    Returns:
        导入结果
    """
    try:
        conn = sqlite3.connect(target_db)
        cursor = conn.cursor()
        
        with open(input_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # 第一行是列名
        columns = lines[0].strip().split(",")
        
        # 插入数据
        placeholders = ", ".join(["?"] * len(columns))
        column_str = ", ".join(columns)
        sql = f"INSERT INTO {table_name} ({column_str}) VALUES ({placeholders})"
        
        count = 0
        for line in lines[1:]:
            values = line.strip().split(",")
            cursor.execute(sql, values)
            count += 1
        
        conn.commit()
        conn.close()
        
        return f"成功导入 {count} 条记录"
    
    except Exception as e:
        return f"导入错误: {str(e)}"


@mcp.tool()
def compare_schemas(db1: str, db2: str) -> str:
    """
    比较两个数据库的表结构
    
    Args:
        db1: 数据库1路径
        db2: 数据库2路径
    
    Returns:
        比较结果
    """
    try:
        def get_tables(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            conn.close()
            return tables
        
        def get_table_columns(db_path, table_name):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = {row[1]: row[2] for row in cursor.fetchall()}
            conn.close()
            return columns
        
        tables1 = set(get_tables(db1))
        tables2 = set(get_tables(db2))
        
        output = "数据库结构比较结果:\n\n"
        
        # 只在 db1 中的表
        only_in_db1 = tables1 - tables2
        if only_in_db1:
            output += f"只在 {db1} 中的表: {', '.join(only_in_db1)}\n"
        
        # 只在 db2 中的表
        only_in_db2 = tables2 - tables1
        if only_in_db2:
            output += f"只在 {db2} 中的表: {', '.join(only_in_db2)}\n"
        
        # 共同表比较列
        common_tables = tables1 & tables2
        for table in common_tables:
            cols1 = get_table_columns(db1, table)
            cols2 = get_table_columns(db2, table)
            
            if cols1 != cols2:
                output += f"\n表 {table} 的列差异:\n"
                
                only_cols1 = set(cols1.keys()) - set(cols2.keys())
                only_cols2 = set(cols2.keys()) - set(cols1.keys())
                
                if only_cols1:
                    output += f"  只在 {db1} 中的列: {', '.join(only_cols1)}\n"
                if only_cols2:
                    output += f"  只在 {db2} 中的列: {', '.join(only_cols2)}\n"
        
        return output
    
    except Exception as e:
        return f"比较错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 4.2 数据库监控

```python
"""
数据库 MCP - 数据库监控

通过 MCP 协议监控数据库状态
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List
import sqlite3
import os
import time

mcp = FastMCP("database-monitor")

DB_PATH = os.getenv("SQLITE_DB_PATH", "database.db")


@mcp.tool()
def get_database_size() -> str:
    """
    获取数据库大小
    
    Returns:
        数据库大小信息
    """
    try:
        size = os.path.getsize(DB_PATH)
        
        # 转换为可读格式
        if size < 1024:
            size_str = f"{size} B"
        elif size < 1024 * 1024:
            size_str = f"{size / 1024:.2f} KB"
        elif size < 1024 * 1024 * 1024:
            size_str = f"{size / (1024 * 1024):.2f} MB"
        else:
            size_str = f"{size / (1024 * 1024 * 1024):.2f} GB"
        
        return f"数据库大小: {size_str} ({size} 字节)"
    
    except Exception as e:
        return f"获取大小错误: {str(e)}"


@mcp.tool()
def get_table_stats() -> str:
    """
    获取表统计信息
    
    Returns:
        表统计信息
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 获取所有表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        output = "表统计信息:\n\n"
        output += "表名 | 记录数\n"
        output += "-" * 30 + "\n"
        
        total_rows = 0
        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            total_rows += count
            
            output += f"{table_name} | {count}\n"
        
        output += f"\n总计: {len(tables)} 个表, {total_rows} 条记录"
        
        conn.close()
        return output
    
    except Exception as e:
        return f"获取统计信息错误: {str(e)}"


@mcp.tool()
def get_slow_queries(threshold_ms: int = 100) -> str:
    """
    获取慢查询（SQLite 不直接支持，这里模拟）
    
    Args:
        threshold_ms: 慢查询阈值（毫秒）
    
    Returns:
        慢查询列表
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        
        # 启用查询计时
        conn.execute("PRAGMA timer=ON")
        
        # 这里可以记录查询日志并分析
        # 简化示例：返回提示信息
        
        conn.close()
        
        return f"慢查询监控已启用（阈值: {threshold_ms}ms）\n建议在生产环境中使用专门的慢查询日志工具"
    
    except Exception as e:
        return f"监控错误: {str(e)}"


@mcp.tool()
def check_database_integrity() -> str:
    """
    检查数据库完整性
    
    Returns:
        检查结果
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()[0]
        
        conn.close()
        
        if result == "ok":
            return "数据库完整性检查通过 ✓"
        else:
            return f"数据库完整性检查失败: {result}"
    
    except Exception as e:
        return f"检查错误: {str(e)}"


@mcp.tool()
def get_index_usage() -> str:
    """
    获取索引使用情况
    
    Returns:
        索引使用信息
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = cursor.fetchall()
        
        output = f"共有 {len(indexes)} 个索引:\n\n"
        
        for idx in indexes:
            output += f"- {idx[0]}\n"
        
        conn.close()
        return output
    
    except Exception as e:
        return f"获取索引信息错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 五、AI 产品经理关注点

```
数据库 MCP 产品化要点：

场景设计
├── 数据查询
│   ├── 自然语言转 SQL
│   ├── 智能查询优化
│   ├── 查询结果可视化
│   └── 查询历史管理
├── 数据管理
│   ├── 自动数据清洗
│   ├── 数据质量监控
│   ├── 数据血缘追踪
│   └── 数据版本控制
├── 向量应用
│   ├── 语义搜索
│   ├── 推荐系统
│   ├── 知识库检索
│   └── 相似度匹配
└── 运维监控
    ├── 性能监控
    ├── 容量规划
    ├── 异常检测
    └── 自动告警

安全考虑
├── 访问控制
│   ├── 最小权限原则
│   ├── 查询权限分级
│   └── 敏感数据脱敏
├── 数据保护
│   ├── SQL 注入防护
│   ├── 参数化查询
│   └── 审计日志
└── 合规性
    ├── 数据保留政策
    ├── 隐私保护
    └── 审计要求

关键指标
├── 性能指标
│   ├── 查询响应时间
│   ├── 并发处理能力
│   ├── 吞吐量
│   └── 资源利用率
├── 质量指标
│   ├── 查询准确率
│   ├── 数据一致性
│   ├── 系统可用性
│   └── 错误率
└── 体验指标
│   ├── 查询易用性
│   ├── 结果可读性
│   └── 功能完整性

落地建议
├── 阶段一：试点
│   ├── 选择 1-2 个业务场景
│   ├── 实现基础查询功能
│   └── 收集用户反馈
├── 阶段二：推广
│   ├── 扩展更多业务场景
│   ├── 完善功能覆盖
│   └── 建立最佳实践
└── 阶段三：优化
    ├── 性能优化
    ├── 智能化提升
    └── 生态建设
```

---

## 六、参考资源

- [SQLite 文档](https://www.sqlite.org/docs.html) - SQLite 官方文档
- [ChromaDB 文档](https://docs.trychroma.com/) - ChromaDB 官方文档
- [PostgreSQL 文档](https://www.postgresql.org/docs/) - PostgreSQL 官方文档
- [MongoDB 文档](https://docs.mongodb.com/) - MongoDB 官方文档
- [MCP 协议规范](https://spec.modelcontextprotocol.io/) - MCP 协议文档

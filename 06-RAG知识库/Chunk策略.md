<!--
  文件描述: 文档分块策略详解，涵盖分块方法、粒度选择、边界处理与优化实践
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Chunk 策略

> Chunk（分块）是将长文档切分为适合 Embedding 模型处理的文本单元的过程，直接影响检索精度和回答质量

---

## 一、为什么需要分块

### 1.1 分块的必要性

```
分块的核心原因：

模型限制
├── Embedding 模型有最大输入长度（512/1024/8192 tokens）
├── 超出长度会被截断，导致信息丢失
└── 长文本的 Embedding 质量通常不如短文本

检索精度
├── 粗粒度：文档太长，噪声信息多，匹配精度低
├── 细粒度：文档太短，可能丢失上下文
└── 合适的粒度能平衡精度和召回

上下文窗口
├── LLM 有最大上下文限制（4K/8K/128K tokens）
├── 检索结果需要拼接入 Prompt
└── 过大的 Chunk 会占用过多上下文空间

计算成本
├── 向量存储按维度计费
├── 检索按向量数量计算
└── 合理的分块能降低存储和计算成本
```

### 1.2 分块的核心挑战

```
分块的核心矛盾：

粒度矛盾
├── Chunk 太大：包含冗余信息，降低检索精度
├── Chunk 太小：丢失上下文，语义不完整
└── 目标：找到"语义完整"的最小单元

边界矛盾
├── 硬性切分：简单高效，但可能切断语义
├── 智能切分：保留语义，但实现复杂
└── 目标：在语义边界处切分

覆盖矛盾
├── 无重叠：简单，但边界信息丢失
├── 有重叠：保留边界，但存储冗余
└── 目标：平衡覆盖率和存储成本
```

---

## 二、分块方法详解

### 2.1 固定大小分块

```python
"""
固定大小分块（Fixed-size Chunking）

最简单、最常用的分块方法
"""

class FixedSizeChunker:
    """固定大小分块器"""
    
    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        length_function: callable = len
    ):
        """
        初始化分块器
        
        Args:
            chunk_size: 每个块的目标大小（字符/token数）
            chunk_overlap: 相邻块的重叠大小
            length_function: 长度计算函数（len 或 token计数）
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.length_function = length_function
    
    def split(self, text: str) -> list:
        """
        分块主方法
        
        Args:
            text: 输入文本
        
        Returns:
            文本块列表
        """
        chunks = []
        start = 0
        text_len = self.length_function(text)
        
        while start < text_len:
            # 计算当前块的结束位置
            end = start + self.chunk_size
            
            # 提取块内容
            if isinstance(text, str):
                chunk = text[start:end]
            else:
                chunk = text[start:end]
            
            chunks.append({
                "content": chunk,
                "start": start,
                "end": min(end, text_len),
                "index": len(chunks)
            })
            
            # 移动窗口（考虑重叠）
            start += self.chunk_size - self.chunk_overlap
        
        return chunks
    
    def split_by_tokens(self, text: str, tokenizer) -> list:
        """
        按 Token 数分块（更精确）
        
        Args:
            text: 输入文本
            tokenizer: Tokenizer（如 tiktoken）
        """
        tokens = tokenizer.encode(text)
        chunks = []
        start = 0
        
        while start < len(tokens):
            end = start + self.chunk_size
            chunk_tokens = tokens[start:end]
            chunk_text = tokenizer.decode(chunk_tokens)
            
            chunks.append({
                "content": chunk_text,
                "token_range": (start, min(end, len(tokens))),
                "index": len(chunks)
            })
            
            start += self.chunk_size - self.chunk_overlap
        
        return chunks

# 使用示例
"""
chunker = FixedSizeChunker(
    chunk_size=500,      # 每个块 500 字符
    chunk_overlap=50     # 重叠 50 字符
)

text = "这是一段很长的文本..."
chunks = chunker.split(text)

print(f"分块数量: {len(chunks)}")
for chunk in chunks[:3]:
    print(f"块 {chunk['index']}: {chunk['content'][:50]}...")
"""
```

### 2.2 递归字符分块

```python
"""
递归字符分块（Recursive Character Chunking）

LangChain 默认分块策略，优先在语义边界处切分
"""

class RecursiveCharacterChunker:
    """递归字符分块器"""
    
    # 默认分隔符优先级（从高到低）
    DEFAULT_SEPARATORS = ["\n\n", "\n", "。", "；", " ", ""]
    
    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        separators: list = None,
        length_function: callable = len
    ):
        """
        初始化
        
        Args:
            chunk_size: 目标块大小
            chunk_overlap: 重叠大小
            separators: 分隔符列表（按优先级排序）
            length_function: 长度计算函数
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or self.DEFAULT_SEPARATORS
        self.length_function = length_function
    
    def split(self, text: str) -> list:
        """
        递归分块
        
        策略：
        1. 尝试用高优先级分隔符切分
        2. 如果切分后的块仍太大，用低优先级分隔符继续切分
        3. 递归直到所有块都小于 chunk_size
        """
        return self._split_text(text, self.separators)
    
    def _split_text(self, text: str, separators: list) -> list:
        """递归切分文本"""
        # 终止条件：文本已经够短
        if self.length_function(text) <= self.chunk_size:
            return [{"content": text, "level": len(separators)}]
        
        # 没有更多分隔符，强制切分
        if not separators:
            return self._force_split(text)
        
        separator = separators[0]
        remaining_separators = separators[1:]
        
        # 按当前分隔符切分
        if separator:
            splits = text.split(separator)
        else:
            # 空分隔符表示字符级切分
            return self._force_split(text)
        
        # 合并小块，保持不超过 chunk_size
        chunks = []
        current_chunk = ""
        
        for split in splits:
            # 尝试将当前分片加入块
            proposed = current_chunk + separator + split if current_chunk else split
            
            if self.length_function(proposed) <= self.chunk_size:
                current_chunk = proposed
            else:
                # 当前块已满，保存并开始新块
                if current_chunk:
                    chunks.append(current_chunk)
                
                # 如果单个分片就超过限制，递归切分
                if self.length_function(split) > self.chunk_size:
                    sub_chunks = self._split_text(split, remaining_separators)
                    chunks.extend([c["content"] for c in sub_chunks])
                    current_chunk = ""
                else:
                    current_chunk = split
        
        # 保存最后一个块
        if current_chunk:
            chunks.append(current_chunk)
        
        # 添加重叠
        return self._add_overlap(chunks)
    
    def _force_split(self, text: str) -> list:
        """强制按固定大小切分"""
        chunker = FixedSizeChunker(
            self.chunk_size,
            self.chunk_overlap,
            self.length_function
        )
        return chunker.split(text)
    
    def _add_overlap(self, chunks: list) -> list:
        """添加块间重叠"""
        if not self.chunk_overlap or len(chunks) <= 1:
            return [{"content": c} for c in chunks]
        
        result = []
        for i, chunk in enumerate(chunks):
            if i > 0 and isinstance(chunk, str):
                # 从前一块末尾取重叠部分
                prev_chunk = chunks[i - 1]
                if isinstance(prev_chunk, str):
                    overlap_text = prev_chunk[-self.chunk_overlap:]
                    chunk = overlap_text + chunk
            
            result.append({
                "content": chunk,
                "index": i
            })
        
        return result

# 使用示例
"""
chunker = RecursiveCharacterChunker(
    chunk_size=300,
    chunk_overlap=30,
    separators=["\n\n", "\n", "。", "；", "，", " ", ""]
)

text = """
第一章：人工智能概述

人工智能（AI）是计算机科学的一个分支。
它致力于创造能够模拟人类智能的系统。

第二章：机器学习基础

机器学习是 AI 的核心技术之一。
它通过数据训练模型，使其能够做出预测。
"""

chunks = chunker.split(text)
for chunk in chunks:
    print(f"块内容: {chunk['content'][:50]}...")
"""
```

### 2.3 语义分块

```python
"""
语义分块（Semantic Chunking）

基于语义相似度进行分块，在语义转折处切分
"""

from sentence_transformers import SentenceTransformer
import numpy as np

class SemanticChunker:
    """语义分块器"""
    
    def __init__(
        self,
        embedding_model: str = "BAAI/bge-small-zh",
        max_chunk_size: int = 500,
        similarity_threshold: float = 0.7
    ):
        """
        初始化
        
        Args:
            embedding_model: 用于语义判断的轻量模型
            max_chunk_size: 最大块大小
            similarity_threshold: 相似度阈值（低于此值认为语义转折）
        """
        self.model = SentenceTransformer(embedding_model)
        self.max_chunk_size = max_chunk_size
        self.similarity_threshold = similarity_threshold
    
    def split(self, text: str, sentences: list = None) -> list:
        """
        语义分块
        
        策略：
        1. 将文本切分为句子
        2. 计算相邻句子的语义相似度
        3. 在相似度低于阈值的位置切分
        """
        # 切分句子
        if sentences is None:
            sentences = self._split_sentences(text)
        
        if len(sentences) <= 1:
            return [{"content": text, "sentences": sentences}]
        
        # 编码句子
        embeddings = self.model.encode(sentences)
        
        # 计算相邻句子相似度
        similarities = []
        for i in range(len(sentences) - 1):
            sim = np.dot(embeddings[i], embeddings[i + 1])
            similarities.append(sim)
        
        # 确定切分点
        chunks = []
        current_chunk = [sentences[0]]
        
        for i, sim in enumerate(similarities):
            if sim < self.similarity_threshold:
                # 语义转折，保存当前块
                chunks.append({
                    "content": "".join(current_chunk),
                    "sentences": current_chunk,
                    "similarity_break": float(sim)
                })
                current_chunk = [sentences[i + 1]]
            else:
                # 语义连续，继续添加
                proposed_chunk = current_chunk + [sentences[i + 1]]
                proposed_text = "".join(proposed_chunk)
                
                if len(proposed_text) > self.max_chunk_size:
                    # 超过大小限制，强制切分
                    chunks.append({
                        "content": "".join(current_chunk),
                        "sentences": current_chunk
                    })
                    current_chunk = [sentences[i + 1]]
                else:
                    current_chunk = proposed_chunk
        
        # 保存最后一个块
        if current_chunk:
            chunks.append({
                "content": "".join(current_chunk),
                "sentences": current_chunk
            })
        
        return chunks
    
    def _split_sentences(self, text: str) -> list:
        """切分句子"""
        import re
        # 中文句子切分
        sentences = re.split(r'([。！？；\n])', text)
        # 合并分隔符
        result = []
        for i in range(0, len(sentences) - 1, 2):
            if i + 1 < len(sentences):
                result.append(sentences[i] + sentences[i + 1])
            else:
                result.append(sentences[i])
        return [s.strip() for s in result if s.strip()]

# 使用示例
"""
chunker = SemanticChunker(
    similarity_threshold=0.6,
    max_chunk_size=400
)

text = """
人工智能正在改变我们的生活。它应用广泛，从医疗到教育都有涉及。

机器学习是 AI 的核心技术。深度学习是机器学习的一个分支。
神经网络是深度学习的基础结构。

区块链技术是另一种颠覆性技术。它主要用于加密货币。
区块链和 AI 可以结合使用。
"""

chunks = chunker.split(text)
for i, chunk in enumerate(chunks):
    print(f"块 {i}: {chunk['content'][:50]}...")
    if 'similarity_break' in chunk:
        print(f"  转折相似度: {chunk['similarity_break']:.3f}")
"""
```

### 2.4 结构化分块

```python
"""
结构化分块（Structured Chunking）

针对特定文档类型的智能分块
"""

import re
from typing import List, Dict

class StructuredChunker:
    """结构化分块器"""
    
    def chunk_markdown(self, text: str) -> List[Dict]:
        """
        Markdown 文档分块
        
        策略：
        1. 按标题层级切分
        2. 保持标题-内容的层级关系
        """
        chunks = []
        current_chunk = {"headers": [], "content": [], "level": 0}
        
        lines = text.split('\n')
        
        for line in lines:
            header_match = re.match(r'^(#{1,6})\s+(.+)$', line)
            
            if header_match:
                # 保存当前块
                if current_chunk["content"]:
                    chunks.append(self._format_md_chunk(current_chunk))
                
                # 开始新块
                level = len(header_match.group(1))
                title = header_match.group(2)
                
                current_chunk = {
                    "headers": current_chunk["headers"][:level-1] + [title],
                    "content": [line],
                    "level": level
                }
            else:
                current_chunk["content"].append(line)
        
        # 保存最后一个块
        if current_chunk["content"]:
            chunks.append(self._format_md_chunk(current_chunk))
        
        return chunks
    
    def chunk_code(self, code: str, language: str = "python") -> List[Dict]:
        """
        代码文档分块
        
        策略：
        1. 按函数/类切分
        2. 保持代码结构完整
        """
        chunks = []
        
        if language in ["python", "ruby"]:
            # 基于缩进的语言
            pattern = r'((?:def|class)\s+\w+.*?)(?=\n(?:def|class)\s|\Z)'
            matches = re.finditer(pattern, code, re.DOTALL)
            
            for match in matches:
                func_code = match.group(1).strip()
                func_name = re.match(r'(?:def|class)\s+(\w+)', func_code).group(1)
                
                chunks.append({
                    "content": func_code,
                    "type": "function" if "def " in func_code else "class",
                    "name": func_name,
                    "docstring": self._extract_docstring(func_code)
                })
        
        elif language in ["javascript", "typescript", "java", "c", "cpp"]:
            # 基于花括号的语言
            chunks = self._chunk_brace_based(code)
        
        return chunks
    
    def chunk_html(self, html: str) -> List[Dict]:
        """
        HTML 文档分块
        
        策略：
        1. 按语义标签切分（article, section, div）
        2. 提取文本内容
        """
        from bs4 import BeautifulSoup
        
        soup = BeautifulSoup(html, 'html.parser')
        chunks = []
        
        # 按 article 或 section 切分
        for tag in soup.find_all(['article', 'section', 'div']):
            text = tag.get_text(strip=True)
            if len(text) > 50:  # 过滤太短的块
                chunks.append({
                    "content": text,
                    "tag": tag.name,
                    "id": tag.get('id', ''),
                    "classes": tag.get('class', [])
                })
        
        return chunks
    
    def chunk_table(self, table_data: List[Dict], rows_per_chunk: int = 10) -> List[Dict]:
        """
        表格数据分块
        
        策略：
        1. 保留表头
        2. 按行数切分
        """
        if not table_data:
            return []
        
        headers = list(table_data[0].keys())
        chunks = []
        
        for i in range(0, len(table_data), rows_per_chunk):
            chunk_rows = table_data[i:i + rows_per_chunk]
            
            # 将表格转为文本描述
            text = "表格数据：\n"
            text += "列：" + ", ".join(headers) + "\n"
            for row in chunk_rows:
                text += ", ".join(str(row.get(h, "")) for h in headers) + "\n"
            
            chunks.append({
                "content": text,
                "row_range": (i, min(i + rows_per_chunk, len(table_data))),
                "row_count": len(chunk_rows)
            })
        
        return chunks
    
    def _format_md_chunk(self, chunk: Dict) -> Dict:
        """格式化 Markdown 块"""
        content = '\n'.join(chunk["content"])
        return {
            "content": content,
            "headers": chunk["headers"],
            "level": chunk["level"],
            "title": chunk["headers"][-1] if chunk["headers"] else ""
        }
    
    def _extract_docstring(self, code: str) -> str:
        """提取文档字符串"""
        match = re.search(r'["\']{3}(.*?)["\']{3}', code, re.DOTALL)
        return match.group(1).strip() if match else ""
    
    def _chunk_brace_based(self, code: str) -> List[Dict]:
        """处理花括号语言的切分"""
        # 简化实现，实际可用 AST 解析
        chunks = []
        # ... 实现细节
        return chunks

# 使用示例
"""
chunker = StructuredChunker()

# Markdown 分块
md_text = """
# 项目介绍

## 安装

pip install rag-system

## 使用

### 基础用法

from rag import RAG
rag = RAG()

### 高级配置

rag.configure(...)
"""

md_chunks = chunker.chunk_markdown(md_text)
for chunk in md_chunks:
    print(f"标题: {chunk['title']}")
    print(f"层级: {chunk['level']}")
    print(f"内容: {chunk['content'][:100]}...")
    print()
"""
```

---

## 三、分块策略选择指南

### 3.1 策略对比矩阵

```
分块策略对比：

策略              实现复杂度    语义保留    处理速度    适用场景
─────────────────────────────────────────────────────────────────────
固定大小          低           差         极快        简单场景、实时处理
递归字符          中           中         快          通用文本、默认选择
语义分块          高           优         慢          高质量检索、离线处理
结构化分块        高           优         中          结构化文档、代码

选择决策树：

文档是否有明确结构？
├── 是 → 使用结构化分块
│   ├── Markdown/HTML → 按标题/标签切分
│   ├── 代码 → 按函数/类切分
│   └── 表格 → 按行/列切分
└── 否 → 继续判断

    对检索质量要求高？
    ├── 是 → 使用语义分块
    │   └── 可接受较慢速度
    └── 否 → 继续判断

        文本是否有自然段落？
        ├── 是 → 使用递归字符分块
        └── 否 → 使用固定大小分块
```

### 3.2 Chunk 大小选择

```python
"""
Chunk 大小选择指南
"""

class ChunkSizeGuide:
    """Chunk 大小选择指南"""
    
    # 推荐配置
    RECOMMENDATIONS = {
        "qa_system": {
            "chunk_size": 300,
            "overlap": 30,
            "rationale": "问答系统需要精确的上下文，小块更精准"
        },
        "document_search": {
            "chunk_size": 500,
            "overlap": 50,
            "rationale": "文档搜索需要足够上下文理解主题"
        },
        "code_search": {
            "chunk_size": 800,
            "overlap": 100,
            "rationale": "代码需要完整函数/类上下文"
        },
        "long_context_llm": {
            "chunk_size": 1000,
            "overlap": 100,
            "rationale": "长上下文 LLM 可处理更大块"
        },
        "short_context_llm": {
            "chunk_size": 200,
            "overlap": 20,
            "rationale": "短上下文 LLM 需要更小的块"
        }
    }
    
    @classmethod
    def get_recommendation(cls, use_case: str) -> dict:
        """获取推荐配置"""
        return cls.RECOMMENDATIONS.get(use_case, cls.RECOMMENDATIONS["document_search"])
    
    @staticmethod
    def calculate_optimal_size(
        avg_document_length: int,
        embedding_max_tokens: int,
        llm_context_window: int,
        top_k: int = 5
    ) -> dict:
        """
        计算最优 Chunk 大小
        
        公式：
        chunk_size = min(
            embedding_max_tokens * 4,  # 假设 1 token ≈ 4 字符
            llm_context_window / (top_k + 2)  # 预留空间给 Prompt 和回答
        )
        
        overlap = chunk_size * 0.1  # 10% 重叠
        """
        import math
        
        # 基于 Embedding 限制
        embedding_limit = embedding_max_tokens * 4
        
        # 基于 LLM 上下文限制（预留 50% 给系统和回答）
        llm_limit = (llm_context_window * 0.5) / top_k
        
        optimal = min(embedding_limit, llm_limit)
        
        return {
            "chunk_size": int(optimal),
            "overlap": int(optimal * 0.1),
            "embedding_limit": embedding_limit,
            "llm_limit": int(llm_limit),
            "constraint": "embedding" if embedding_limit < llm_limit else "llm"
        }

# 计算示例
"""
guide = ChunkSizeGuide()

# 场景推荐
rec = guide.get_recommendation("qa_system")
print(f"问答系统推荐: {rec}")

# 动态计算
optimal = ChunkSizeGuide.calculate_optimal_size(
    avg_document_length=5000,
    embedding_max_tokens=512,
    llm_context_window=4096,
    top_k=5
)
print(f"最优配置: {optimal}")
"""
```

---

## 四、高级分块技术

### 4.1 父子分块

```python
"""
父子分块（Parent-Child Chunking）

策略：
- 小块用于检索（提高精度）
- 大块用于生成（提供完整上下文）
"""

class ParentChildChunker:
    """父子分块器"""
    
    def __init__(
        self,
        parent_chunk_size: int = 1000,
        child_chunk_size: int = 200,
        child_overlap: int = 20
    ):
        self.parent_chunk_size = parent_chunk_size
        self.child_chunk_size = child_chunk_size
        self.child_overlap = child_overlap
    
    def split(self, text: str) -> list:
        """
        父子分块
        
        Returns:
            块列表，每个块包含 parent 和 children
        """
        # 先切分父块
        parent_chunker = FixedSizeChunker(
            self.parent_chunk_size,
            overlap=0
        )
        parents = parent_chunker.split(text)
        
        result = []
        for parent in parents:
            parent_text = parent["content"]
            
            # 再切分子块
            child_chunker = FixedSizeChunker(
                self.child_chunk_size,
                self.child_overlap
            )
            children = child_chunker.split(parent_text)
            
            result.append({
                "parent": {
                    "content": parent_text,
                    "start": parent["start"],
                    "end": parent["end"]
                },
                "children": [
                    {
                        "content": child["content"],
                        "index": child["index"],
                        "parent_start": parent["start"]
                    }
                    for child in children
                ]
            })
        
        return result
    
    def build_index_mapping(self, chunks: list) -> dict:
        """
        构建索引映射
        
        用于检索时：
        1. 检索子块
        2. 通过 parent_id 获取父块内容
        """
        mapping = {
            "child_to_parent": {},
            "parent_chunks": {}
        }
        
        for i, chunk_group in enumerate(chunks):
            parent_id = f"parent_{i}"
            mapping["parent_chunks"][parent_id] = chunk_group["parent"]
            
            for child in chunk_group["children"]:
                child_id = f"{parent_id}_child_{child['index']}"
                mapping["child_to_parent"][child_id] = parent_id
        
        return mapping

# 使用示例
"""
chunker = ParentChildChunker(
    parent_chunk_size=1000,
    child_chunk_size=200
)

text = "长文档内容..."
chunks = chunker.split(text)

# 索引时：索引子块
# 检索时：返回父块作为上下文
mapping = chunker.build_index_mapping(chunks)
"""
```

### 4.2 上下文增强分块

```python
"""
上下文增强分块（Contextual Chunking）

在每个块前后添加上下文信息
"""

class ContextualChunker:
    """上下文增强分块器"""
    
    def __init__(
        self,
        base_chunker,
        add_document_summary: bool = True,
        add_section_header: bool = True,
        add_surrounding_context: bool = True
    ):
        self.base_chunker = base_chunker
        self.add_document_summary = add_document_summary
        self.add_section_header = add_section_header
        self.add_surrounding_context = add_surrounding_context
    
    def split(
        self,
        text: str,
        document_summary: str = "",
        section_headers: dict = None
    ) -> list:
        """
        上下文增强分块
        """
        # 基础分块
        chunks = self.base_chunker.split(text)
        
        # 增强每个块
        enhanced_chunks = []
        for i, chunk in enumerate(chunks):
            enhanced = self._enhance_chunk(
                chunk,
                i,
                chunks,
                document_summary,
                section_headers
            )
            enhanced_chunks.append(enhanced)
        
        return enhanced_chunks
    
    def _enhance_chunk(
        self,
        chunk: dict,
        index: int,
        all_chunks: list,
        document_summary: str,
        section_headers: dict
    ) -> dict:
        """增强单个块"""
        original = chunk["content"]
        context_parts = []
        
        # 添加文档摘要
        if self.add_document_summary and document_summary:
            context_parts.append(f"[文档摘要] {document_summary}")
        
        # 添加章节标题
        if self.add_section_header and section_headers:
            # 根据 chunk 位置找到对应章节
            section = self._find_section(chunk, section_headers)
            if section:
                context_parts.append(f"[章节] {section}")
        
        # 添加上下文
        if self.add_surrounding_context:
            prev_chunk = all_chunks[index - 1]["content"][-100:] if index > 0 else ""
            next_chunk = all_chunks[index + 1]["content"][:100] if index < len(all_chunks) - 1 else ""
            
            if prev_chunk:
                context_parts.append(f"[上文] ...{prev_chunk}")
            if next_chunk:
                context_parts.append(f"[下文] {next_chunk}...")
        
        # 组合
        if context_parts:
            enhanced_content = "\n".join(context_parts) + f"\n\n[内容] {original}"
        else:
            enhanced_content = original
        
        return {
            "content": enhanced_content,
            "original": original,
            "context": context_parts,
            "index": index
        }
    
    def _find_section(self, chunk: dict, section_headers: dict) -> str:
        """查找块所属章节"""
        # 简化实现
        return section_headers.get(chunk.get("start", 0), "")

# 使用示例
"""
base_chunker = RecursiveCharacterChunker(chunk_size=300)
contextual_chunker = ContextualChunker(
    base_chunker,
    add_document_summary=True,
    add_section_header=True
)

chunks = contextual_chunker.split(
    text="长文档内容...",
    document_summary="本文介绍 RAG 技术",
    section_headers={0: "第一章：RAG概述", 500: "第二章：实现细节"}
)
"""
```

---

## 五、AI产品经理关注点

```
Chunk 策略产品化要点：

核心决策：
├── 精度 vs 成本
│   ├── 小块：检索精度高，但存储和计算成本高
│   ├── 大块：检索精度低，但存储和计算成本低
│   └── 父子分块：平衡方案，实现复杂
├── 延迟 vs 质量
│   ├── 简单分块：速度快，适合实时场景
│   ├── 语义分块：质量好，适合离线场景
│   └── 混合策略：热数据简单分块，冷数据语义分块
└── 通用 vs 专用
    ├── 通用策略：实现简单，效果一般
    ├── 专用策略：效果优秀，维护成本高
    └── 推荐：默认通用 + 关键场景专用

评估指标：
├── 检索质量
│   ├── 相关 Chunk 的召回率
│   └── Top-K 准确率
├── 生成质量
│   ├── 回答完整性
│   └── 幻觉率
└── 系统成本
    ├── 存储成本（Chunk 数量 × 向量维度）
    ├── 索引成本
    └── 检索延迟

优化方向：
├── 动态分块
│   ├── 根据文档类型自动选择策略
│   └── 根据查询历史优化分块参数
├── 智能重叠
│   ├── 在语义边界处重叠
│   └── 避免在关键信息处切断
└── 增量更新
    ├── 文档修改时只更新相关 Chunk
    └── 避免全量重新分块
```

---

## 六、参考资源

- [LangChain Text Splitters](https://python.langchain.com/docs/modules/data_connection/document_transformers/)
- [Chunking Strategies for LLM Applications](https://www.pinecone.io/learn/chunking-strategies/)
- [The Art of Chunking](https://blog.llamaindex.ai/the-art-of-chunking-llm-applications-4f6b1e6b1f34)
- [Semantic Chunking](https://docs.llamaindex.ai/en/stable/examples/node_parsers/semantic_chunking/)

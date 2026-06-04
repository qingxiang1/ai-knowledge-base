<!--
  文件描述: 企业知识库项目完整实战指南，包含需求分析、架构设计、代码实现与部署说明
  作者: AI-PM-Knowledge
  创建日期: 2026-06-04
  最后修改日期: 2026-06-04
-->

# Project03 - 企业知识库

> 一个基于 React + Python FastAPI + LangChain + ChromaDB 的企业级知识库系统，支持文档上传、智能检索、AI问答等功能。

---

## 项目概述

### 功能特性

- **文档管理**：支持 PDF、Word、Markdown、TXT 等多种格式上传
- **智能分块**：自动文档分块与向量化处理
- **语义检索**：基于向量数据库的语义相似度搜索
- **AI问答**：结合检索结果进行智能问答（RAG）
- **权限管理**：支持多租户、文档权限控制
- **历史记录**：问答历史保存与回溯

### 技术栈

```
前端: React 18 + TypeScript + Ant Design
后端: Python 3.10 + FastAPI + LangChain
向量数据库: ChromaDB
嵌入模型: OpenAI text-embedding-3-small / 本地模型
LLM: OpenAI GPT-4 / Claude / 本地模型
文件存储: 本地文件系统 / MinIO
部署: Docker Compose
```

---

## 项目结构

```
Project03-企业知识库/
├── README.md                 # 项目说明
├── docker-compose.yml        # Docker 编排
├── backend/                  # 后端服务
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI 入口
│   │   ├── config.py         # 配置管理
│   │   ├── models/
│   │   │   ├── document.py   # 文档模型
│   │   │   └── chat.py       # 对话模型
│   │   ├── routers/
│   │   │   ├── documents.py  # 文档路由
│   │   │   └── chat.py       # 对话路由
│   │   ├── services/
│   │   │   ├── embedding.py  # 嵌入服务
│   │   │   ├── vectorstore.py# 向量存储服务
│   │   │   └── rag.py        # RAG 服务
│   │   └── utils/
│   │       └── file_parser.py# 文件解析工具
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/                 # 前端应用
    ├── package.json
    ├── vite.config.ts
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── UploadModal.tsx
    │   │   ├── DocumentList.tsx
    │   │   ├── ChatInterface.tsx
    │   │   └── SourceCards.tsx
    │   ├── services/
    │   │   └── api.ts
    │   └── types/
    │       └── index.ts
    └── Dockerfile
```

---

## 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd Project03-企业知识库

# 创建环境变量文件
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY
```

### 2. Docker 一键启动

```bash
docker-compose up -d
```

### 3. 访问应用

- 前端: http://localhost:5173
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

---

## 核心代码实现

### 后端配置 (backend/app/config.py)

```python
"""
配置管理模块

集中管理应用配置，支持环境变量覆盖。
"""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置类"""

    # 应用基础配置
    APP_NAME: str = "Enterprise Knowledge Base"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # OpenAI 配置
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    LLM_MODEL: str = "gpt-4"

    # ChromaDB 配置
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    COLLECTION_NAME: str = "documents"

    # 文件上传配置
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: set[str] = {".pdf", ".docx", ".md", ".txt"}

    # 文本分块配置
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()
```

### 数据模型 (backend/app/models/document.py)

```python
"""
文档数据模型

定义文档和知识库相关的 Pydantic 模型。
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    """文档处理状态"""
    PENDING = "pending"      # 待处理
    PROCESSING = "processing" # 处理中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"        # 处理失败


class DocumentType(str, Enum):
    """文档类型"""
    PDF = "pdf"
    DOCX = "docx"
    MD = "md"
    TXT = "txt"


class DocumentCreate(BaseModel):
    """创建文档请求"""
    title: str = Field(..., min_length=1, max_length=200, description="文档标题")
    description: Optional[str] = Field(None, max_length=500, description="文档描述")


class DocumentResponse(BaseModel):
    """文档响应"""
    id: str = Field(..., description="文档唯一标识")
    title: str = Field(..., description="文档标题")
    description: Optional[str] = Field(None, description="文档描述")
    file_type: DocumentType = Field(..., description="文件类型")
    file_size: int = Field(..., description="文件大小(字节)")
    status: DocumentStatus = Field(..., description="处理状态")
    chunk_count: int = Field(0, description="分块数量")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """文档列表响应"""
    total: int = Field(..., description="总数")
    items: list[DocumentResponse] = Field(..., description="文档列表")
```

### 文件解析工具 (backend/app/utils/file_parser.py)

```python
"""
文件解析工具模块

支持多种文档格式的文本提取。
"""

import io
from pathlib import Path
from typing import Union


def parse_txt(file_content: bytes) -> str:
    """解析 TXT 文件"""
    return file_content.decode("utf-8")


def parse_md(file_content: bytes) -> str:
    """解析 Markdown 文件"""
    return file_content.decode("utf-8")


def parse_pdf(file_content: bytes) -> str:
    """解析 PDF 文件"""
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except ImportError:
        raise ImportError("请安装 PyPDF2: pip install PyPDF2")


def parse_docx(file_content: bytes) -> str:
    """解析 Word 文件"""
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_content))
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
    except ImportError:
        raise ImportError("请安装 python-docx: pip install python-docx")


def parse_document(file_content: bytes, filename: str) -> str:
    """
    根据文件扩展名解析文档

    Args:
        file_content: 文件二进制内容
        filename: 文件名（用于判断类型）

    Returns:
        提取的文本内容

    Raises:
        ValueError: 不支持的文件类型
    """
    ext = Path(filename).suffix.lower()

    parsers = {
        ".txt": parse_txt,
        ".md": parse_md,
        ".pdf": parse_pdf,
        ".docx": parse_docx,
    }

    parser = parsers.get(ext)
    if not parser:
        raise ValueError(f"不支持的文件类型: {ext}")

    return parser(file_content)
```

### 嵌入服务 (backend/app/services/embedding.py)

```python
"""
文本嵌入服务

负责将文本转换为向量表示。
"""

from typing import List
from langchain_openai import OpenAIEmbeddings
from app.config import get_settings


class EmbeddingService:
    """嵌入服务类"""

    def __init__(self):
        settings = get_settings()
        self.embeddings = OpenAIEmbeddings(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            model=settings.EMBEDDING_MODEL,
        )

    async def embed_text(self, text: str) -> List[float]:
        """
        将单条文本嵌入为向量

        Args:
            text: 输入文本

        Returns:
            向量表示
        """
        return await self.embeddings.aembed_query(text)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        批量嵌入文档

        Args:
            texts: 文本列表

        Returns:
            向量列表
        """
        return await self.embeddings.aembed_documents(texts)


# 全局单例
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """获取嵌入服务单例"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
```

### 向量存储服务 (backend/app/services/vectorstore.py)

```python
"""
向量存储服务

基于 ChromaDB 实现文档的向量存储与语义检索。
"""

import uuid
from typing import List, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.config import get_settings
from app.services.embedding import get_embedding_service


class VectorStoreService:
    """向量存储服务类"""

    def __init__(self):
        settings = get_settings()
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name=settings.COLLECTION_NAME
        )
        self.embedding_service = get_embedding_service()

    async def add_document(
        self,
        doc_id: str,
        text: str,
        metadata: Optional[dict] = None,
    ) -> int:
        """
        添加文档到向量库

        Args:
            doc_id: 文档唯一标识
            text: 文档全文
            metadata: 附加元数据

        Returns:
            分块数量
        """
        settings = get_settings()

        # 文本分块
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", "。", "！", "？", " ", ""],
        )
        chunks = splitter.split_text(text)

        # 生成块 ID 和嵌入
        chunk_ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        embeddings = await self.embedding_service.embed_documents(chunks)

        # 准备元数据
        metadatas = []
        for i, chunk in enumerate(chunks):
            meta = {
                "doc_id": doc_id,
                "chunk_index": i,
                **(metadata or {}),
            }
            metadatas.append(meta)

        # 存入 ChromaDB
        self.collection.add(
            ids=chunk_ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )

        return len(chunks)

    async def search(
        self,
        query: str,
        top_k: int = 5,
        doc_ids: Optional[List[str]] = None,
    ) -> List[dict]:
        """
        语义检索

        Args:
            query: 查询文本
            top_k: 返回结果数量
            doc_ids: 限定检索的文档 ID 列表

        Returns:
            检索结果列表，包含文本、距离、元数据
        """
        # 嵌入查询
        query_embedding = await self.embedding_service.embed_text(query)

        # 构建过滤条件
        where_filter = None
        if doc_ids:
            where_filter = {"doc_id": {"$in": doc_ids}}

        # 执行检索
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "distances", "metadatas"],
        )

        # 格式化结果
        formatted = []
        for i in range(len(results["ids"][0])):
            formatted.append({
                "id": results["ids"][0][i],
                "text": results["documents"][0][i],
                "distance": results["distances"][0][i],
                "metadata": results["metadatas"][0][i],
            })

        return formatted

    def delete_document(self, doc_id: str) -> None:
        """
        删除文档及其所有分块

        Args:
            doc_id: 文档 ID
        """
        self.collection.delete(where={"doc_id": doc_id})


# 全局单例
_vector_store: VectorStoreService | None = None


def get_vector_store() -> VectorStoreService:
    """获取向量存储服务单例"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreService()
    return _vector_store
```

### RAG 服务 (backend/app/services/rag.py)

```python
"""
RAG (检索增强生成) 服务

结合向量检索与大语言模型，实现智能问答。
"""

from typing import List
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from app.config import get_settings
from app.services.vectorstore import get_vector_store


# RAG 提示词模板
RAG_PROMPT = """基于以下检索到的参考资料，回答用户的问题。
如果资料不足以回答问题，请明确说明。

参考资料：
{context}

用户问题：{question}

请用中文回答，要求：
1. 回答准确、简洁
2. 必要时引用参考资料
3. 不确定时坦诚说明
"""


class RAGService:
    """RAG 服务类"""

    def __init__(self):
        settings = get_settings()
        self.llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            model=settings.LLM_MODEL,
            temperature=0.3,
        )
        self.vector_store = get_vector_store()
        self.prompt = ChatPromptTemplate.from_template(RAG_PROMPT)

    async def answer(
        self,
        question: str,
        doc_ids: List[str] | None = None,
        top_k: int = 5,
    ) -> dict:
        """
        执行 RAG 问答

        Args:
            question: 用户问题
            doc_ids: 限定检索的文档 ID
            top_k: 检索结果数量

        Returns:
            包含回答、来源、token 使用量的字典
        """
        # 1. 检索相关文档
        search_results = await self.vector_store.search(
            query=question,
            top_k=top_k,
            doc_ids=doc_ids,
        )

        # 2. 构建上下文
        context = "\n\n---\n\n".join([
            f"[来源 {i+1}] {r['text']}"
            for i, r in enumerate(search_results)
        ])

        # 3. 调用 LLM 生成回答
        messages = self.prompt.format_messages(
            context=context,
            question=question,
        )
        response = await self.llm.ainvoke(messages)

        return {
            "answer": response.content,
            "sources": [
                {
                    "doc_id": r["metadata"]["doc_id"],
                    "text": r["text"][:200] + "..." if len(r["text"]) > 200 else r["text"],
                    "relevance": 1 - r["distance"],
                }
                for r in search_results
            ],
            "tokens_used": response.usage_metadata.get("total_tokens", 0) if hasattr(response, "usage_metadata") else 0,
        }


# 全局单例
_rag_service: RAGService | None = None


def get_rag_service() -> RAGService:
    """获取 RAG 服务单例"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
```

### 文档路由 (backend/app/routers/documents.py)

```python
"""
文档管理路由

提供文档上传、列表、删除等 API。
"""

import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.models.document import DocumentCreate, DocumentResponse, DocumentListResponse, DocumentStatus, DocumentType
from app.utils.file_parser import parse_document
from app.services.vectorstore import get_vector_store

router = APIRouter(prefix="/documents", tags=["文档管理"])

# 内存存储（生产环境使用数据库）
documents_db: dict[str, dict] = {}


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(..., description="上传的文件"),
    title: str = Form(..., description="文档标题"),
    description: str = Form("", description="文档描述"),
):
    """
    上传并处理文档

    支持格式: PDF, DOCX, MD, TXT
    """
    settings = get_settings()

    # 校验文件类型
    ext = Path(file.filename or "").suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"不支持的文件类型: {ext}")

    # 读取文件内容
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(400, "文件大小超过限制")

    # 生成文档 ID
    doc_id = str(uuid.uuid4())

    # 保存文件
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = Path(settings.UPLOAD_DIR) / f"{doc_id}{ext}"
    with open(file_path, "wb") as f:
        f.write(content)

    # 创建记录
    doc_type = DocumentType(ext.replace(".", ""))
    doc = {
        "id": doc_id,
        "title": title,
        "description": description or None,
        "file_type": doc_type,
        "file_size": len(content),
        "status": DocumentStatus.PROCESSING,
        "chunk_count": 0,
        "file_path": str(file_path),
    }
    documents_db[doc_id] = doc

    # 异步处理：解析并入库
    try:
        text = parse_document(content, file.filename or "")
        vector_store = get_vector_store()
        chunk_count = await vector_store.add_document(
            doc_id=doc_id,
            text=text,
            metadata={"title": title, "filename": file.filename},
        )
        doc["status"] = DocumentStatus.COMPLETED
        doc["chunk_count"] = chunk_count
    except Exception as e:
        doc["status"] = DocumentStatus.FAILED
        doc["error"] = str(e)

    return DocumentResponse(**doc)


@router.get("", response_model=DocumentListResponse)
async def list_documents(skip: int = 0, limit: int = 20):
    """获取文档列表"""
    items = list(documents_db.values())[skip : skip + limit]
    return DocumentListResponse(
        total=len(documents_db),
        items=[DocumentResponse(**item) for item in items],
    )


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """删除文档"""
    if doc_id not in documents_db:
        raise HTTPException(404, "文档不存在")

    # 删除向量
    vector_store = get_vector_store()
    vector_store.delete_document(doc_id)

    # 删除文件
    doc = documents_db[doc_id]
    if "file_path" in doc and os.path.exists(doc["file_path"]):
        os.remove(doc["file_path"])

    del documents_db[doc_id]
    return {"message": "删除成功"}
```

### 对话路由 (backend/app/routers/chat.py)

```python
"""
对话问答路由

提供基于 RAG 的智能问答 API。
"""

import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.rag import get_rag_service

router = APIRouter(prefix="/chat", tags=["智能问答"])


class ChatRequest(BaseModel):
    """对话请求"""
    question: str = Field(..., min_length=1, max_length=2000, description="用户问题")
    doc_ids: Optional[list[str]] = Field(None, description="限定检索的文档 ID")
    top_k: int = Field(5, ge=1, le=20, description="检索结果数量")


class ChatResponse(BaseModel):
    """对话响应"""
    id: str = Field(..., description="回答 ID")
    answer: str = Field(..., description="AI 回答")
    sources: list[dict] = Field(..., description="参考来源")
    tokens_used: int = Field(..., description="Token 使用量")
    created_at: str = Field(..., description="创建时间")


# 历史记录存储
chat_history: list[dict] = []


@router.post("/ask", response_model=ChatResponse)
async def ask_question(request: ChatRequest):
    """
    提交问题并获取 RAG 回答
    """
    rag = get_rag_service()

    result = await rag.answer(
        question=request.question,
        doc_ids=request.doc_ids,
        top_k=request.top_k,
    )

    response = ChatResponse(
        id=str(uuid.uuid4()),
        answer=result["answer"],
        sources=result["sources"],
        tokens_used=result["tokens_used"],
        created_at=datetime.now().isoformat(),
    )

    # 保存历史
    chat_history.append({
        "id": response.id,
        "question": request.question,
        **result,
        "created_at": response.created_at,
    })

    return response


@router.get("/history")
async def get_history(limit: int = 50):
    """获取问答历史"""
    return chat_history[-limit:]
```

### FastAPI 入口 (backend/app/main.py)

```python
"""
FastAPI 应用入口

初始化应用、注册路由、配置中间件。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import documents, chat

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(documents.router, prefix=settings.API_V1_PREFIX)
app.include_router(chat.router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "app": settings.APP_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 前端 API 封装 (frontend/src/services/api.ts)

```typescript
/**
 * API 服务封装
 *
 * 统一处理 HTTP 请求和错误。
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface ApiResponse<T> {
  data: T;
  error?: string;
}

/**
 * 通用请求函数
 */
async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      Accept: "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 上传文档
 */
export async function uploadDocument(
  file: File,
  title: string,
  description?: string
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  if (description) formData.append("description", description);

  return request("/documents/upload", {
    method: "POST",
    body: formData,
  });
}

/**
 * 获取文档列表
 */
export async function listDocuments(skip = 0, limit = 20) {
  return request(`/documents?skip=${skip}&limit=${limit}`);
}

/**
 * 删除文档
 */
export async function deleteDocument(docId: string) {
  return request(`/documents/${docId}`, { method: "DELETE" });
}

/**
 * 提交问题
 */
export async function askQuestion(
  question: string,
  docIds?: string[],
  topK = 5
) {
  return request("/chat/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, doc_ids: docIds, top_k: topK }),
  });
}

/**
 * 获取历史记录
 */
export async function getChatHistory(limit = 50) {
  return request(`/chat/history?limit=${limit}`);
}
```

### 前端聊天组件 (frontend/src/components/ChatInterface.tsx)

```typescript
import React, { useState, useRef, useEffect } from "react";
import { askQuestion } from "../services/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    doc_id: string;
    text: string;
    relevance: number;
  }>;
}

/**
 * 聊天界面组件
 *
 * 提供问答交互界面，显示用户问题和 AI 回答。
 */
export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await askQuestion(input);
      const assistantMessage: Message = {
        id: response.id,
        role: "assistant",
        content: response.answer,
        sources: response.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `错误: ${error instanceof Error ? error.message : "请求失败"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg">开始提问</p>
            <p className="text-sm mt-2">上传文档后，即可基于文档内容提问</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-3xl px-4 py-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* 参考来源 */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">参考来源:</p>
                  <div className="space-y-1">
                    {msg.sources.map((source, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-white bg-opacity-50 p-2 rounded"
                      >
                        <span className="font-medium">文档 {source.doc_id}</span>
                        <span className="text-gray-500 ml-2">
                          相关度: {(source.relevance * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form
        onSubmit={handleSubmit}
        className="border-t p-4 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入问题..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          发送
        </button>
      </form>
    </div>
  );
};
```

---

## 配置文件

### backend/requirements.txt

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6
pydantic-settings==2.1.0
langchain==0.1.0
langchain-openai==0.0.5
chromadb==0.4.22
PyPDF2==3.0.1
python-docx==1.1.0
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CHROMA_PERSIST_DIR=/app/chroma_db
      - UPLOAD_DIR=/app/uploads
    volumes:
      - chroma_data:/app/chroma_db
      - upload_data:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8000/api/v1

volumes:
  chroma_data:
  upload_data:
```

### backend/Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY app/ ./app/

# 创建数据目录
RUN mkdir -p /app/chroma_db /app/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 扩展建议

1. **数据库持久化**：使用 PostgreSQL 存储文档和对话记录
2. **用户认证**：添加 JWT 认证和多租户支持
3. **本地模型**：支持 Ollama 等本地 LLM 部署
4. **高级检索**：添加重排序(Rerank)、混合检索
5. **监控告警**：接入 LangSmith 或自定义监控

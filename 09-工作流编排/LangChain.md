<!--
  文件描述: LangChain框架详解，涵盖核心概念、组件体系、链式调用、Agent开发及内存管理
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# LangChain

> LangChain 是一个用于开发由语言模型驱动的应用程序的 Python/JS 框架，提供模块化组件和链式调用能力。

---

## 一、LangChain 概述

### 1.1 什么是 LangChain

```
LangChain 定义：

LangChain 框架
├── 本质：LLM 应用开发框架
├── 发起方：Harrison Chase（2022年10月开源）
├── 支持语言：Python / JavaScript(TypeScript)
├── 核心定位：简化 LLM 应用开发复杂度
└── 架构演进：
    ├── LangChain 0.x：链式调用
    ├── LangChain Expression Language (LCEL)
    └── LangGraph：状态机工作流

核心设计哲学
├── 模块化
│   └── 每个功能封装为独立组件
├── 可组合
│   └── 组件可自由组合成复杂流程
├── 可扩展
│   └── 支持自定义组件和集成
└── 生产就绪
    └── 提供监控、调试、部署工具

与 Dify 的区别
├── LangChain：开发框架（面向开发者）
│   ├── 需要编写代码
│   ├── 高度灵活可定制
│   └── 适合复杂业务场景
└── Dify：低代码平台（面向产品经理）
    ├── 可视化配置
    ├── 快速上线
    └── 适合标准场景
```

### 1.2 核心组件体系

```python
"""
LangChain 核心组件

六大核心模块构成完整开发体系
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class LangChainComponent:
    """LangChain 组件定义"""
    name: str
    description: str
    use_cases: List[str]

class LangChainArchitecture:
    """LangChain 架构说明"""
    
    def __init__(self):
        """初始化组件体系"""
        self.components = {
            "Model I/O": LangChainComponent(
                name="模型输入输出",
                description="与语言模型的交互接口",
                use_cases=[
                    "统一模型调用接口",
                    "Prompt 模板管理",
                    "输出解析处理"
                ]
            ),
            "Retrieval": LangChainComponent(
                name="检索",
                description="文档加载、分割、向量化、检索",
                use_cases=[
                    "RAG 知识库构建",
                    "文档问答",
                    "语义搜索"
                ]
            ),
            "Chains": LangChainComponent(
                name="链",
                description="组件的组合和调用序列",
                use_cases=[
                    "多步骤流程编排",
                    "条件分支",
                    "并行执行"
                ]
            ),
            "Memory": LangChainComponent(
                name="记忆",
                description="对话历史和状态管理",
                use_cases=[
                    "多轮对话",
                    "上下文保持",
                    "用户画像"
                ]
            ),
            "Agents": LangChainComponent(
                name="智能体",
                description="自主决策和工具调用",
                use_cases=[
                    "自主任务执行",
                    "工具编排",
                    "复杂问题求解"
                ]
            ),
            "Callbacks": LangChainComponent(
                name="回调",
                description="事件监听和日志记录",
                use_cases=[
                    "调试追踪",
                    "性能监控",
                    "流式输出"
                ]
            )
        }
    
    def get_component(self, name: str) -> LangChainComponent:
        """
        获取组件信息
        
        Args:
            name: 组件名称
        
        Returns:
            组件信息
        """
        return self.components.get(name)

# 组件关系图
"""
LangChain 组件关系：

用户输入 → Prompt Template → LLM → Output Parser → 结果输出
                ↓                ↓
         Memory（历史）    Callbacks（监控）
                ↓                ↓
         Retriever（知识库）  Tools（工具）
                ↓                ↓
              Chain ←────────→ Agent
"""
```

---

## 二、环境搭建

### 2.1 安装 LangChain

```bash
# 基础安装
pip install langchain

# 包含常用依赖
pip install langchain[all]

# 特定模型支持
pip install langchain-openai      # OpenAI
pip install langchain-anthropic   # Anthropic
pip install langchain-google      # Google

# 向量数据库
pip install langchain-chroma      # ChromaDB
pip install langchain-pinecone    # Pinecone

# 文档加载器
pip install langchain-community   # 社区组件

# 完整开发环境
pip install langchain langchain-openai langchain-chroma
```

### 2.2 快速验证

```python
"""
LangChain 快速验证

验证安装是否成功
"""

import langchain
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

def verify_installation():
    """
    验证 LangChain 安装
    
    Returns:
        验证结果
    """
    print(f"LangChain 版本: {langchain.__version__}")
    
    # 验证模型加载
    try:
        llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
        print("模型加载成功")
        
        # 验证基本调用
        response = llm.invoke([HumanMessage(content="Hello")])
        print(f"模型调用成功: {response.content[:50]}...")
        
        return True
    except Exception as e:
        print(f"验证失败: {e}")
        return False

# 运行验证
# verify_installation()
```

---

## 三、Model I/O（模型输入输出）

### 3.1 模型接口

```python
"""
LangChain 模型接口

统一不同模型的调用方式
"""

from langchain_openai import ChatOpenAI, OpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

class ModelInterface:
    """模型接口封装"""
    
    @staticmethod
    def create_chat_model(provider: str, model: str, **kwargs):
        """
        创建聊天模型
        
        Args:
            provider: 提供商（openai/anthropic）
            model: 模型名称
            **kwargs: 额外参数
        
        Returns:
            模型实例
        """
        if provider == "openai":
            return ChatOpenAI(model=model, **kwargs)
        elif provider == "anthropic":
            return ChatAnthropic(model=model, **kwargs)
        else:
            raise ValueError(f"不支持的提供商: {provider}")
    
    @staticmethod
    def chat_example():
        """
        聊天模型调用示例
        
        Returns:
            调用结果
        """
        llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7)
        
        messages = [
            SystemMessage(content="你是一个 helpful 的 AI 助手。"),
            HumanMessage(content="什么是 LangChain？")
        ]
        
        response = llm.invoke(messages)
        return response.content
    
    @staticmethod
    def streaming_example():
        """
        流式输出示例
        
        Returns:
            流式输出结果
        """
        llm = ChatOpenAI(model="gpt-3.5-turbo", streaming=True)
        
        messages = [HumanMessage(content="写一首关于 AI 的诗")]
        
        # 流式输出
        for chunk in llm.stream(messages):
            print(chunk.content, end="", flush=True)

# 模型参数说明
"""
常用参数：
├── temperature: 随机性（0-2）
├── max_tokens: 最大生成 token 数
├── top_p: 核采样
├── frequency_penalty: 频率惩罚
├── presence_penalty: 存在惩罚
└── streaming: 是否流式输出
"""
```

### 3.2 Prompt 模板

```python
"""
LangChain Prompt 模板

结构化 Prompt 管理
"""

from langchain_core.prompts import (
    PromptTemplate,
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    FewShotPromptTemplate
)

class PromptManager:
    """Prompt 管理器"""
    
    @staticmethod
    def create_basic_template():
        """
        创建基础模板
        
        Returns:
            PromptTemplate
        """
        template = PromptTemplate(
            input_variables=["product", "audience"],
            template="""为以下产品撰写营销文案：

产品：{product}
目标受众：{audience}

请生成一段吸引人的文案："""
        )
        return template
    
    @staticmethod
    def create_chat_template():
        """
        创建聊天模板
        
        Returns:
            ChatPromptTemplate
        """
        system_template = "你是一个{role}，擅长{skill}。"
        human_template = "{question}"
        
        chat_prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(system_template),
            HumanMessagePromptTemplate.from_template(human_template)
        ])
        
        return chat_prompt
    
    @staticmethod
    def create_few_shot_template():
        """
        创建 Few-Shot 模板
        
        Returns:
            FewShotPromptTemplate
        """
        examples = [
            {
                "input": "开心",
                "output": "正面"
            },
            {
                "input": "难过",
                "output": "负面"
            },
            {
                "input": "愤怒",
                "output": "负面"
            }
        ]
        
        example_prompt = PromptTemplate(
            input_variables=["input", "output"],
            template="输入：{input}\n输出：{output}"
        )
        
        few_shot_prompt = FewShotPromptTemplate(
            examples=examples,
            example_prompt=example_prompt,
            suffix="输入：{input}\n输出：",
            input_variables=["input"]
        )
        
        return few_shot_prompt

# Prompt 组合示例
"""
模板组合方式：

1. 顺序组合
   prompt1 | prompt2 | llm

2. 并行组合
   {
       "branch1": prompt1 | llm1,
       "branch2": prompt2 | llm2
   }

3. 条件组合
   prompt | llm | output_parser | (条件判断) | (分支执行)
"""
```

### 3.3 输出解析

```python
"""
LangChain 输出解析

将模型输出解析为结构化数据
"""

from langchain_core.output_parsers import (
    StrOutputParser,
    JsonOutputParser,
    PydanticOutputParser,
    CommaSeparatedListOutputParser
)
from pydantic import BaseModel, Field
from typing import List

class ProductInfo(BaseModel):
    """产品信息模型"""
    name: str = Field(description="产品名称")
    price: float = Field(description="产品价格")
    features: List[str] = Field(description="产品特性列表")
    target_audience: str = Field(description="目标受众")

class OutputParserDemo:
    """输出解析示例"""
    
    @staticmethod
    def string_parser():
        """
        字符串解析
        
        Returns:
            解析器
        """
        return StrOutputParser()
    
    @staticmethod
    def json_parser():
        """
        JSON 解析
        
        Returns:
            解析器
        """
        return JsonOutputParser()
    
    @staticmethod
    def pydantic_parser():
        """
        Pydantic 模型解析
        
        Returns:
            解析器
        """
        return PydanticOutputParser(pydantic_object=ProductInfo)
    
    @staticmethod
    def list_parser():
        """
        列表解析
        
        Returns:
            解析器
        """
        return CommaSeparatedListOutputParser()

# 使用示例
"""
# Pydantic 解析流程
parser = PydanticOutputParser(pydantic_object=ProductInfo)

prompt = PromptTemplate(
    template="分析以下产品描述，提取关键信息：\n{description}\n\n{format_instructions}",
    input_variables=["description"],
    partial_variables={"format_instructions": parser.get_format_instructions()}
)

chain = prompt | llm | parser
result = chain.invoke({"description": "iPhone 15 Pro，售价7999元..."})
# result: ProductInfo(name="iPhone 15 Pro", price=7999, ...)
"""
```

---

## 四、Chains（链式调用）

### 4.1 LCEL（LangChain Expression Language）

```python
"""
LangChain Expression Language

声明式链式调用语法
"""

from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from operator import itemgetter

class LCELDemo:
    """LCEL 使用示例"""
    
    @staticmethod
    def basic_chain():
        """
        基础链式调用
        
        Returns:
            链
        """
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        
        llm = ChatOpenAI(model="gpt-3.5-turbo")
        prompt = ChatPromptTemplate.from_template("讲一个关于{topic}的笑话")
        
        # 使用 | 运算符组合
        chain = prompt | llm
        
        return chain
    
    @staticmethod
    def parallel_chain():
        """
        并行链式调用
        
        Returns:
            并行链
        """
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        
        llm = ChatOpenAI(model="gpt-3.5-turbo")
        
        # 定义两个并行的子链
        joke_chain = ChatPromptTemplate.from_template("讲一个关于{topic}的笑话") | llm
        fact_chain = ChatPromptTemplate.from_template("说一个关于{topic}的冷知识") | llm
        
        # 并行执行
        parallel = RunnableParallel(
            joke=joke_chain,
            fact=fact_chain
        )
        
        return parallel
    
    @staticmethod
    def sequential_chain():
        """
        顺序链式调用
        
        Returns:
            顺序链
        """
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        
        llm = ChatOpenAI(model="gpt-3.5-turbo")
        
        # 第一步：生成大纲
        outline_prompt = ChatPromptTemplate.from_template(
            "为'{topic}'生成一个文章大纲"
        )
        outline_chain = outline_prompt | llm
        
        # 第二步：根据大纲写文章
        article_prompt = ChatPromptTemplate.from_template(
            "根据以下大纲写一篇详细文章：\n{outline}"
        )
        article_chain = article_prompt | llm
        
        # 组合：先生成大纲，再写文章
        full_chain = (
            {"outline": outline_chain}
            | article_prompt
            | llm
        )
        
        return full_chain
    
    @staticmethod
    def conditional_chain():
        """
        条件链式调用
        
        Returns:
            条件链
        """
        from langchain_core.runnables import RunnableBranch
        
        # 定义分支条件
        branch = RunnableBranch(
            (lambda x: "代码" in x["topic"], code_chain),
            (lambda x: "设计" in x["topic"], design_chain),
            default_chain
        )
        
        return branch

# LCEL 核心特性
"""
LCEL 核心特性：

1. 流式支持
   ├── 自动支持 stream()
   ├── 中间步骤可观察
   └── 实时输出

2. 异步支持
   ├── ainvoke() 异步调用
   ├── astream() 异步流式
   └── abatch() 异步批量

3. 批处理
   ├── batch() 批量处理
   ├── 自动并行化
   └── 错误处理

4. 可观察性
   ├── 自动追踪
   ├── 中间结果访问
   └── 调试友好
"""
```

### 4.2 预置链

```python
"""
LangChain 预置链

常用场景的预置链实现
"""

from langchain.chains import (
    LLMChain,
    SimpleSequentialChain,
    RetrievalQA,
    ConversationalRetrievalChain
)

class PrebuiltChains:
    """预置链示例"""
    
    @staticmethod
    def qa_chain(retriever, llm):
        """
        问答链
        
        Args:
            retriever: 检索器
            llm: 语言模型
        
        Returns:
            问答链
        """
        qa = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",  # stuff/map_reduce/refine/map_rerank
            retriever=retriever,
            return_source_documents=True
        )
        return qa
    
    @staticmethod
    def conversational_qa_chain(retriever, llm, memory):
        """
        对话式问答链
        
        Args:
            retriever: 检索器
            llm: 语言模型
            memory: 记忆组件
        
        Returns:
            对话问答链
        """
        qa = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=retriever,
            memory=memory,
            return_source_documents=True
        )
        return qa
    
    @staticmethod
    def summarize_chain(llm, chain_type="stuff"):
        """
        摘要链
        
        Args:
            llm: 语言模型
            chain_type: 链类型
        
        Returns:
            摘要链
        """
        from langchain.chains.summarize import load_summarize_chain
        
        chain = load_summarize_chain(
            llm=llm,
            chain_type=chain_type
        )
        return chain

# 链类型说明
"""
链类型对比：

类型          | 说明                  | 适用场景
--------------|----------------------|------------------
stuff         | 直接填充所有文档      | 文档数量少，token 够用
map_reduce    | 先分别摘要再合并      | 文档数量多
refine        | 迭代精炼摘要          | 需要高质量摘要
map_rerank    | 分别回答再排序        | 需要精确答案
"""
```

---

## 五、Retrieval（检索）

### 5.1 RAG 完整流程

```python
"""
LangChain RAG 实现

检索增强生成的完整实现
"""

from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    CSVLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.runnables import RunnablePassthrough

class RAGSystem:
    """RAG 系统实现"""
    
    def __init__(self, collection_name: str = "default"):
        """
        初始化 RAG 系统
        
        Args:
            collection_name: 集合名称
        """
        self.collection_name = collection_name
        self.embeddings = OpenAIEmbeddings()
        self.vectorstore = None
    
    def load_documents(self, file_paths: list) -> list:
        """
        加载文档
        
        Args:
            file_paths: 文件路径列表
        
        Returns:
            文档列表
        """
        documents = []
        
        for path in file_paths:
            if path.endswith(".pdf"):
                loader = PyPDFLoader(path)
            elif path.endswith(".csv"):
                loader = CSVLoader(path)
            else:
                loader = TextLoader(path, encoding="utf-8")
            
            documents.extend(loader.load())
        
        return documents
    
    def split_documents(self, documents: list, chunk_size: int = 1000, 
                       chunk_overlap: int = 200) -> list:
        """
        分割文档
        
        Args:
            documents: 文档列表
            chunk_size: 分块大小
            chunk_overlap: 重叠大小
        
        Returns:
            分割后的文档块
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", "。", " ", ""]
        )
        
        return splitter.split_documents(documents)
    
    def create_vectorstore(self, chunks: list, persist_dir: str = None):
        """
        创建向量数据库
        
        Args:
            chunks: 文档块列表
            persist_dir: 持久化目录
        """
        self.vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            persist_directory=persist_dir,
            collection_name=self.collection_name
        )
    
    def create_qa_chain(self, llm):
        """
        创建问答链
        
        Args:
            llm: 语言模型
        
        Returns:
            问答链
        """
        from langchain_core.prompts import ChatPromptTemplate
        
        template = """基于以下上下文回答问题：

上下文：
{context}

问题：{question}

请用中文回答，如果上下文中没有相关信息，请说明。"""
        
        prompt = ChatPromptTemplate.from_template(template)
        
        retriever = self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 3}
        )
        
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)
        
        chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
        )
        
        return chain

# RAG 优化策略
"""
RAG 优化策略：

1. 文档预处理
   ├── 清洗无关内容
   ├── 统一格式
   └── 添加元数据

2. 分块策略
   ├── 按语义分块
   ├── 设置合适重叠
   └── 保持上下文

3. 检索优化
   ├── 混合检索（向量+关键词）
   ├── Rerank 重排序
   └── 查询扩展

4. 生成优化
   ├── Prompt 工程
   ├── 上下文压缩
   └── 多轮检索
"""
```

---

## 六、Memory（记忆）

### 6.1 记忆类型

```python
"""
LangChain 记忆管理

对话历史和上下文管理
"""

from langchain.memory import (
    ConversationBufferMemory,
    ConversationBufferWindowMemory,
    ConversationSummaryMemory,
    VectorStoreRetrieverMemory
)

class MemoryManager:
    """记忆管理器"""
    
    @staticmethod
    def buffer_memory():
        """
        缓冲区记忆
        
        Returns:
            记忆实例
        """
        return ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
    
    @staticmethod
    def window_memory(k: int = 5):
        """
        窗口记忆
        
        Args:
            k: 保留最近 k 轮对话
        
        Returns:
            记忆实例
        """
        return ConversationBufferWindowMemory(
            k=k,
            memory_key="chat_history",
            return_messages=True
        )
    
    @staticmethod
    def summary_memory(llm):
        """
        摘要记忆
        
        Args:
            llm: 语言模型（用于生成摘要）
        
        Returns:
            记忆实例
        """
        return ConversationSummaryMemory(
            llm=llm,
            memory_key="chat_history",
            return_messages=True
        )
    
    @staticmethod
    def vector_memory(retriever):
        """
        向量记忆
        
        Args:
            retriever: 检索器
        
        Returns:
            记忆实例
        """
        return VectorStoreRetrieverMemory(
            retriever=retriever,
            memory_key="history"
        )

# 记忆使用示例
"""
记忆类型对比：

类型              | 特点                  | 适用场景
------------------|----------------------|------------------
Buffer            | 保存完整历史          | 短对话
Window            | 保留最近 N 轮         | 中等长度对话
Summary           | 生成历史摘要          | 长对话
Vector            | 语义检索历史          | 需要关联历史
Entity            | 提取实体记忆          | 需要记住用户信息
"""
```

---

## 七、Agents（智能体）

### 7.1 Agent 开发

```python
"""
LangChain Agent 开发

构建自主决策的 AI Agent
"""

from langchain.agents import (
    Tool,
    AgentExecutor,
    create_react_agent,
    create_openai_functions_agent
)
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

class AgentBuilder:
    """Agent 构建器"""
    
    @staticmethod
    def create_tools():
        """
        创建工具集
        
        Returns:
            工具列表
        """
        tools = [
            Tool(
                name="search",
                func=lambda x: f"搜索 '{x}' 的结果",
                description="用于搜索信息"
            ),
            Tool(
                name="calculator",
                func=lambda x: str(eval(x)),
                description="用于数学计算，输入应为数学表达式"
            ),
            Tool(
                name="weather",
                func=lambda x: f"{x} 的天气是晴天，25°C",
                description="用于查询天气，输入应为城市名称"
            )
        ]
        return tools
    
    @staticmethod
    def create_react_agent(llm, tools):
        """
        创建 ReAct Agent
        
        Args:
            llm: 语言模型
            tools: 工具列表
        
        Returns:
            Agent 执行器
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个 helpful 的助手，可以使用工具来回答问题。"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        agent = create_react_agent(llm, tools, prompt)
        executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        
        return executor
    
    @staticmethod
    def create_function_agent(llm, tools):
        """
        创建 Function Calling Agent
        
        Args:
            llm: 语言模型
            tools: 工具列表
        
        Returns:
            Agent 执行器
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个 helpful 的助手。"),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        agent = create_openai_functions_agent(llm, tools, prompt)
        executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        
        return executor

# Agent 类型对比
"""
Agent 类型：

类型              | 原理                  | 适用模型
------------------|----------------------|------------------
ReAct             | 推理+行动循环         | 通用
OpenAI Functions  | Function Calling      | OpenAI
Structured Chat   | 结构化输出            | 支持 JSON 的模型
Self-Ask          | 自问自答              | 通用
Plan-and-Execute  | 先规划后执行          | 强推理模型
"""
```

---

## 八、AI 产品经理关注点

```
LangChain 产品化要点：

技术选型
├── 适合场景
│   ├── 需要深度定制的 AI 应用
│   ├── 复杂的多步骤工作流
│   ├── 需要与现有系统集成
│   └── 对性能有精细控制需求
├── 不适合场景
│   ├── 快速原型验证
│   ├── 简单对话应用
│   ├── 无技术团队支持
│   └── 预算有限

团队要求
├── 技术能力
│   ├── Python/JS 开发能力
│   ├── LLM 基础理解
│   └── 系统设计能力
├── 人员配置
│   ├── 1-2 名 AI 工程师
│   ├── 1 名产品经理
│   └── 0.5 名运维

开发成本
├── 初期投入
│   ├── 学习成本：2-4 周
│   ├── 开发周期：1-3 个月
│   └── 基础设施：$500-2000/月
├── 维护成本
│   ├── 模型 API：按量计费
│   ├── 服务器：$200-1000/月
│   └── 人力：2-3 人

关键指标
├── 技术指标
│   ├── 响应延迟 < 2s
│   ├── 吞吐量 > 100 QPS
│   └── 可用性 > 99.9%
├── 业务指标
│   ├── 任务完成率 > 90%
│   ├── 用户满意度 > 4.0/5
│   └── 错误率 < 5%
└── 成本指标
    ├── 单次调用成本
    ├── 开发人天
    └── 维护人天/月

落地建议
├── 阶段一：学习
│   ├── 团队培训 LangChain
│   ├── 完成官方教程
│   └── 搭建开发环境
├── 阶段二：试点
│   ├── 选择简单场景
│   ├── 完成 MVP
│   └── 收集反馈
├── 阶段三：扩展
│   ├── 增加功能模块
│   ├── 优化性能
│   └── 完善监控
└── 阶段四：规模化
    ├── 多应用管理
    ├── 团队协作规范
    └── 持续集成
```

---

## 九、参考资源

- [LangChain 官方文档](https://python.langchain.com/) - LangChain 官方文档
- [LangChain GitHub](https://github.com/langchain-ai/langchain) - 开源仓库
- [LangChain Cookbook](https://github.com/langchain-ai/langchain/blob/master/cookbook/README.md) - 实践案例
- [LCEL 文档](https://python.langchain.com/docs/expression_language/) - LCEL 表达式语言
- [LangGraph 文档](https://langchain-ai.github.io/langgraph/) - 状态机工作流

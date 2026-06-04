<!--
  文件描述: MCP服务端开发指南，涵盖环境搭建、工具注册、请求处理、错误管理及部署运维
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# MCP 服务端开发

> 学习如何开发 MCP Server，将现有能力封装为标准化工具，供 AI 应用调用。

---

## 一、环境准备

### 1.1 开发环境搭建

```bash
# 创建项目目录
mkdir mcp-server-demo && cd mcp-server-demo

# 初始化 Python 项目
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# 安装 MCP SDK
pip install mcp

# 安装开发依赖
pip install pytest black mypy

# 验证安装
python -c "import mcp; print(mcp.__version__)"
```

### 1.2 项目结构

```
MCP Server 项目结构：

mcp-server-demo/
├── src/
│   └── my_mcp_server/
│       ├── __init__.py
│       ├── server.py          # 服务端主入口
│       ├── tools/             # 工具实现
│       │   ├── __init__.py
│       │   ├── search.py      # 搜索工具
│       │   └── calculator.py  # 计算工具
│       ├── resources/         # 资源管理
│       │   ├── __init__.py
│       │   └── file_resource.py
│       └── utils/             # 工具函数
│           ├── __init__.py
│           └── helpers.py
├── tests/                     # 测试目录
│   ├── __init__.py
│   └── test_tools.py
├── pyproject.toml             # 项目配置
├── README.md                  # 项目说明
└── .env                       # 环境变量
```

---

## 二、基础 Server 开发

### 2.1 最小可运行 Server

```python
"""
MCP 最小服务端示例

展示如何创建一个最基本的 MCP Server
"""

from mcp.server import Server
from mcp.types import TextContent
import asyncio

# 创建 Server 实例
app = Server("my-first-server")


@app.list_tools()
async def list_tools() -> list:
    """
    列出可用工具
    
    Returns:
        工具列表
    """
    return [
        {
            "name": "echo",
            "description": "回显用户输入的内容",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "要回显的消息"
                    }
                },
                "required": ["message"]
            }
        }
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list:
    """
    调用工具
    
    Args:
        name: 工具名称
        arguments: 工具参数
    
    Returns:
        调用结果
    """
    if name == "echo":
        message = arguments.get("message", "")
        return [TextContent(type="text", text=f"Echo: {message}")]
    
    raise ValueError(f"未知工具: {name}")


async def main():
    """主函数"""
    from mcp.server.stdio import stdio_server
    
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
```

### 2.2 使用 FastMCP 简化开发

```python
"""
使用 FastMCP 快速开发

FastMCP 是 MCP SDK 提供的高级封装，简化 Server 开发
"""

from mcp.server.fastmcp import FastMCP
import random

# 创建 FastMCP 实例
mcp = FastMCP("fast-demo-server")


@mcp.tool()
def calculate(expression: str) -> str:
    """
    计算数学表达式
    
    Args:
        expression: 数学表达式，如 "1 + 2 * 3"
    
    Returns:
        计算结果
    """
    try:
        # 安全计算：限制可用函数
        allowed_names = {
            "abs": abs,
            "max": max,
            "min": min,
            "pow": pow,
            "round": round,
        }
        
        result = eval(expression, {"__builtins__": {}}, allowed_names)
        return f"计算结果: {result}"
    
    except Exception as e:
        return f"计算错误: {str(e)}"


@mcp.tool()
def random_number(min_val: int = 1, max_val: int = 100) -> str:
    """
    生成随机数
    
    Args:
        min_val: 最小值
        max_val: 最大值
    
    Returns:
        随机数
    """
    number = random.randint(min_val, max_val)
    return f"随机数 ({min_val}-{max_val}): {number}"


@mcp.resource("greeting://{name}")
def get_greeting(name: str) -> str:
    """
    获取问候语
    
    Args:
        name: 用户名称
    
    Returns:
        问候语
    """
    return f"你好，{name}！欢迎使用 MCP Server。"


@mcp.prompt()
def analyze_data_prompt(data: str) -> str:
    """
    数据分析提示模板
    
    Args:
        data: 待分析的数据
    
    Returns:
        提示文本
    """
    return f"""请分析以下数据：

{data}

分析要求：
1. 总结数据的主要特征
2. 识别异常值或趋势
3. 提供 actionable insights
"""


if __name__ == "__main__":
    # 使用 stdio 传输方式运行
    mcp.run(transport='stdio')
```

---

## 三、工具开发进阶

### 3.1 复杂工具实现

```python
"""
复杂工具开发示例

实现一个具有完整功能的搜索工具
"""

from mcp.server.fastmcp import FastMCP
from typing import List, Dict, Optional
from dataclasses import dataclass
import json

mcp = FastMCP("advanced-tools")


@dataclass
class SearchResult:
    """搜索结果"""
    title: str
    content: str
    source: str
    relevance: float


class MockSearchEngine:
    """模拟搜索引擎"""
    
    def __init__(self):
        """初始化搜索引擎"""
        self.documents = [
            {
                "title": "MCP 协议入门",
                "content": "MCP（Model Context Protocol）是 Anthropic 推出的开放协议...",
                "source": "官方文档",
                "tags": ["mcp", "protocol", "ai"]
            },
            {
                "title": "AI 产品经理指南",
                "content": "AI 产品经理需要掌握的核心技能包括...",
                "source": "知识库",
                "tags": ["ai", "product", "manager"]
            },
            {
                "title": "大模型应用开发",
                "content": "构建基于大模型的应用需要考虑...",
                "source": "技术博客",
                "tags": ["llm", "development", "ai"]
            }
        ]
    
    def search(self, query: str, limit: int = 5) -> List[SearchResult]:
        """
        搜索文档
        
        Args:
            query: 搜索关键词
            limit: 返回结果数量
        
        Returns:
            搜索结果列表
        """
        results = []
        query_lower = query.lower()
        
        for doc in self.documents:
            # 简单相关性计算
            relevance = 0.0
            
            if query_lower in doc["title"].lower():
                relevance += 0.5
            if query_lower in doc["content"].lower():
                relevance += 0.3
            if any(query_lower in tag.lower() for tag in doc["tags"]):
                relevance += 0.2
            
            if relevance > 0:
                results.append(SearchResult(
                    title=doc["title"],
                    content=doc["content"],
                    source=doc["source"],
                    relevance=relevance
                ))
        
        # 按相关性排序并限制数量
        results.sort(key=lambda x: x.relevance, reverse=True)
        return results[:limit]


# 初始化搜索引擎
search_engine = MockSearchEngine()


@mcp.tool()
def search_knowledge_base(query: str, limit: int = 5) -> str:
    """
    搜索知识库
    
    Args:
        query: 搜索关键词
        limit: 返回结果数量（默认5条）
    
    Returns:
        搜索结果摘要
    """
    results = search_engine.search(query, limit)
    
    if not results:
        return f"未找到与 '{query}' 相关的内容。"
    
    output = f"找到 {len(results)} 条关于 '{query}' 的结果：\n\n"
    
    for i, result in enumerate(results, 1):
        output += f"{i}. {result.title}\n"
        output += f"   来源: {result.source} | 相关度: {result.relevance:.0%}\n"
        output += f"   {result.content[:100]}...\n\n"
    
    return output


@mcp.tool()
def summarize_text(text: str, max_length: int = 200) -> str:
    """
    文本摘要
    
    Args:
        text: 待摘要的文本
        max_length: 摘要最大长度
    
    Returns:
        文本摘要
    """
    if len(text) <= max_length:
        return text
    
    # 简单摘要：取前 max_length 个字符
    summary = text[:max_length].rsplit(' ', 1)[0]
    return f"{summary}..."


@mcp.tool()
def format_data(data: str, format_type: str = "json") -> str:
    """
    格式化数据
    
    Args:
        data: 待格式化的数据
        format_type: 目标格式（json/markdown/table）
    
    Returns:
        格式化后的数据
    """
    try:
        # 尝试解析为 JSON
        parsed = json.loads(data)
        
        if format_type == "json":
            return json.dumps(parsed, ensure_ascii=False, indent=2)
        
        elif format_type == "markdown":
            return _to_markdown(parsed)
        
        elif format_type == "table":
            return _to_table(parsed)
        
        else:
            return f"不支持的格式: {format_type}"
    
    except json.JSONDecodeError:
        return "输入数据不是有效的 JSON 格式"


def _to_markdown(data: dict) -> str:
    """转换为 Markdown"""
    lines = []
    for key, value in data.items():
        lines.append(f"## {key}\n")
        lines.append(f"{value}\n")
    return "\n".join(lines)


def _to_table(data: dict) -> str:
    """转换为表格"""
    lines = ["| 键 | 值 |", "|---|---|"]
    for key, value in data.items():
        lines.append(f"| {key} | {value} |")
    return "\n".join(lines)


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 3.2 工具参数验证

```python
"""
工具参数验证

使用 Pydantic 进行参数校验
"""

from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field, validator
from typing import Literal
from datetime import datetime

mcp = FastMCP("validated-tools")


class SearchParams(BaseModel):
    """搜索参数模型"""
    query: str = Field(..., min_length=1, max_length=200, description="搜索关键词")
    category: Literal["all", "tech", "business", "design"] = Field(
        default="all",
        description="搜索类别"
    )
    date_range: str = Field(
        default="",
        description="日期范围，格式: YYYY-MM-DD,YYYY-MM-DD"
    )
    
    @validator('date_range')
    def validate_date_range(cls, v):
        """验证日期范围格式"""
        if not v:
            return v
        
        try:
            dates = v.split(',')
            if len(dates) != 2:
                raise ValueError("日期范围格式错误")
            
            datetime.strptime(dates[0], "%Y-%m-%d")
            datetime.strptime(dates[1], "%Y-%m-%d")
            
            return v
        except ValueError:
            raise ValueError("日期格式应为: YYYY-MM-DD,YYYY-MM-DD")


class CalculateParams(BaseModel):
    """计算参数模型"""
    expression: str = Field(..., min_length=1, description="数学表达式")
    precision: int = Field(default=2, ge=0, le=10, description="结果精度")


@mcp.tool()
def advanced_search(params: SearchParams) -> str:
    """
    高级搜索（带参数验证）
    
    Args:
        params: 搜索参数
    
    Returns:
        搜索结果
    """
    return f"""搜索参数验证通过：
- 关键词: {params.query}
- 类别: {params.category}
- 日期范围: {params.date_range or '不限'}

（此处执行实际搜索逻辑）
"""


@mcp.tool()
def precise_calculate(params: CalculateParams) -> str:
    """
    精确计算（带参数验证）
    
    Args:
        params: 计算参数
    
    Returns:
        计算结果
    """
    try:
        result = eval(params.expression)
        formatted = f"{result:.{params.precision}f}"
        return f"表达式: {params.expression}\n结果: {formatted}"
    except Exception as e:
        return f"计算错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 四、资源与提示

### 4.1 资源管理

```python
"""
MCP 资源管理

提供文件、数据等资源的访问能力
"""

from mcp.server.fastmcp import FastMCP
from pathlib import Path
import json

mcp = FastMCP("resource-server")


@mcp.resource("file://{path}")
def read_file(path: str) -> str:
    """
    读取文件内容
    
    Args:
        path: 文件路径
    
    Returns:
        文件内容
    """
    try:
        file_path = Path(path)
        
        if not file_path.exists():
            return f"文件不存在: {path}"
        
        if not file_path.is_file():
            return f"路径不是文件: {path}"
        
        # 安全检查：限制访问范围
        allowed_extensions = ['.txt', '.md', '.json', '.csv', '.py']
        if file_path.suffix not in allowed_extensions:
            return f"不支持的文件类型: {file_path.suffix}"
        
        content = file_path.read_text(encoding='utf-8')
        return content
    
    except Exception as e:
        return f"读取文件失败: {str(e)}"


@mcp.resource("data://users/{user_id}")
def get_user_data(user_id: str) -> str:
    """
    获取用户数据
    
    Args:
        user_id: 用户ID
    
    Returns:
        用户数据 JSON
    """
    # 模拟用户数据
    users = {
        "1": {"name": "张三", "role": "管理员", "department": "技术部"},
        "2": {"name": "李四", "role": "用户", "department": "产品部"},
        "3": {"name": "王五", "role": "用户", "department": "设计部"}
    }
    
    user = users.get(user_id)
    if not user:
        return json.dumps({"error": "用户不存在"}, ensure_ascii=False)
    
    return json.dumps(user, ensure_ascii=False, indent=2)


@mcp.resource("config://app")
def get_app_config() -> str:
    """
    获取应用配置
    
    Returns:
        配置信息
    """
    config = {
        "app_name": "MCP Demo Server",
        "version": "1.0.0",
        "features": ["search", "calculate", "format"],
        "limits": {
            "max_query_length": 200,
            "max_results": 50
        }
    }
    
    return json.dumps(config, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 4.2 提示模板

```python
"""
MCP 提示模板

预定义常用提示，提升 AI 交互质量
"""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("prompt-server")


@mcp.prompt()
def code_review(code: str, language: str = "python") -> str:
    """
    代码审查提示
    
    Args:
        code: 待审查的代码
        language: 编程语言
    
    Returns:
        代码审查提示
    """
    return f"""请对以下 {language} 代码进行审查：

```{language}
{code}
```

审查要点：
1. 代码风格和可读性
2. 潜在的错误和异常处理
3. 性能优化建议
4. 安全漏洞检查
5. 最佳实践符合度

请按以下格式输出：
- 总体评分（1-10）
- 主要问题（如有）
- 改进建议
- 正面评价
"""


@mcp.prompt()
def requirement_analysis(requirement: str) -> str:
    """
    需求分析提示
    
    Args:
        requirement: 产品需求描述
    
    Returns:
        需求分析提示
    """
    return f"""请对以下产品需求进行专业分析：

需求描述：
{requirement}

分析维度：
1. 需求清晰度评估
2. 用户价值分析
3. 技术可行性初步判断
4. 潜在风险和挑战
5. 建议的 MVP 范围
6. 成功指标建议

输出格式：
## 需求摘要
## 用户价值
## 技术可行性
## 风险分析
## MVP 建议
## 成功指标
"""


@mcp.prompt()
def data_analysis_report(data: str, chart_type: str = "auto") -> str:
    """
    数据分析报告提示
    
    Args:
        data: 数据内容
        chart_type: 建议的图表类型
    
    Returns:
        数据分析提示
    """
    return f"""请对以下数据进行深入分析并生成报告：

数据内容：
{data}

分析要求：
1. 数据概览和统计特征
2. 趋势分析和异常检测
3. 关键洞察和发现
4. 建议的图表类型: {chart_type}
5. Actionable recommendations

报告结构：
# 数据分析报告

## 1. 数据概览
## 2. 关键指标
## 3. 趋势分析
## 4. 异常发现
## 5. 洞察与建议
## 6. 下一步行动
"""


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 五、部署与运维

### 5.1 部署方式

```python
"""
MCP Server 部署配置

不同场景的部署方案
"""

# stdio 方式（本地进程）
# 适合：本地开发、桌面应用
"""
# claude_desktop_config.json
{
    "mcpServers": {
        "my-server": {
            "command": "python",
            "args": ["/path/to/server.py"]
        }
    }
}
"""

# SSE 方式（HTTP 服务）
# 适合：Web 应用、远程访问
"""
# server_sse.py
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.routing import Route

sse = SseServerTransport("/messages")

async def handle_sse(request):
    async with sse.connect_sse(
        request.scope, request.receive, request._send
    ) as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

app_starlette = Starlette(
    routes=[Route("/sse", endpoint=handle_sse)]
)
"""

# Docker 部署
"""
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY src/ ./src/
EXPOSE 8000

CMD ["python", "-m", "src.server"]
"""
```

### 5.2 监控与日志

```python
"""
MCP Server 监控

添加日志和监控能力
"""

from mcp.server.fastmcp import FastMCP
import logging
import time
from functools import wraps

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("mcp-server")

mcp = FastMCP("monitored-server")


def monitor_tool(func):
    """
    工具监控装饰器
    
    记录工具调用次数、耗时、成功率
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        tool_name = func.__name__
        
        logger.info(f"工具调用开始: {tool_name}")
        
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            logger.info(
                f"工具调用成功: {tool_name}, "
                f"耗时: {duration:.3f}s"
            )
            
            return result
        
        except Exception as e:
            duration = time.time() - start_time
            
            logger.error(
                f"工具调用失败: {tool_name}, "
                f"耗时: {duration:.3f}s, "
                f"错误: {str(e)}"
            )
            
            raise
    
    return wrapper


@mcp.tool()
@monitor_tool
def monitored_search(query: str) -> str:
    """
    受监控的搜索工具
    
    Args:
        query: 搜索关键词
    
    Returns:
        搜索结果
    """
    # 模拟搜索耗时
    time.sleep(0.5)
    
    return f"搜索 '{query}' 完成"


@mcp.tool()
@monitor_tool
def monitored_calculate(expression: str) -> str:
    """
    受监控的计算工具
    
    Args:
        expression: 数学表达式
    
    Returns:
        计算结果
    """
    try:
        result = eval(expression)
        return f"{expression} = {result}"
    except Exception as e:
        logger.error(f"计算错误: {expression} - {str(e)}")
        return f"计算错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 六、AI 产品经理关注点

```
MCP Server 产品化要点：

工具设计原则
├── 原子性
│   ├── 每个工具只做一件事
│   ├── 工具之间可组合
│   └── 避免过度封装
├── 可发现性
│   ├── 清晰的工具名称
│   ├── 详细的描述说明
│   └── 直观的参数命名
├── 安全性
│   ├── 输入验证
│   ├── 权限控制
│   └── 操作审计
└── 稳定性
    ├── 错误处理
    ├── 超时控制
    └── 降级策略

开发流程
├── 需求分析
│   ├── 识别可工具化的能力
│   ├── 定义输入输出规范
│   └── 评估技术可行性
├── 工具设计
│   ├── 设计参数结构
│   ├── 编写描述文档
│   └── 确定错误处理策略
├── 开发实现
│   ├── 核心逻辑开发
│   ├── 参数验证
│   └── 单元测试
├── 集成测试
│   ├── 与 Client 联调
│   ├── 端到端测试
│   └── 性能测试
└── 发布运维
    ├── 版本管理
    ├── 监控告警
    └── 文档更新

关键指标
├── 技术指标
│   ├── 工具响应时间 < 2s
│   ├── 调用成功率 > 99%
│   ├── 错误率 < 1%
│   └── 资源占用合理
├── 业务指标
│   ├── 工具使用频次
│   ├── 用户满意度
│   └── 功能覆盖率
└── 生态指标
    ├── Server 接入数
    ├── 工具复用率
    └── 开发者活跃度
```

---

## 七、参考资源

- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) - 官方 Python SDK
- [MCP Server 示例](https://github.com/modelcontextprotocol/servers) - 官方示例集合
- [FastMCP 文档](https://github.com/modelcontextprotocol/python-sdk#fastmcp) - 高级封装说明
